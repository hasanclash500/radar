import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { parseHtmlFile } from "../lib/parser";
import {
  listingKey,
  parseCsvText,
  rowsFromJson,
  rowsToListings,
  type IngestResult,
  type IngestSource,
} from "../lib/ingest";
import { OFFICE_ROLES, PRIVILEGED_ROLES, type OfficeRole } from "./schema";

/** نگاشت آگهی به رکورد قابل ذخیره در جدول listings. */

/** فیلدهای ذخیره‌سازی آگهی روی سرور. */
const FIELDS = {
  radarCode: v.optional(v.string()),
  city: v.optional(v.string()),
  neighborhood: v.optional(v.string()),
  area: v.optional(v.number()),
  rooms: v.optional(v.number()),
  priceMillion: v.optional(v.number()),
  depositMillion: v.optional(v.number()),
  rentMillion: v.optional(v.number()),
  pricePerMeter: v.optional(v.number()),
  dealType: v.optional(v.string()),
  propertyType: v.optional(v.string()),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  address: v.optional(v.string()),
  mapsUrl: v.optional(v.string()),
  divarUrl: v.optional(v.string()),
  date: v.optional(v.string()),
  dateRaw: v.optional(v.string()),
  poster: v.optional(v.string()),
  phone: v.optional(v.string()),
} as const;

const itemValidator = v.object({ key: v.string(), ...FIELDS });

type SaveResult = { added: number; updated: number; total: number };
type ImportOutcome =
  | ({ skipped: true; reason: string } & Partial<SaveResult>)
  | (SaveResult & { skippedRows: number; source: string });

/**
 * نوشتن آگهی‌ها روی سرور — فقط از سمت داخلی (cron یا اکشن) قابل فراخوانی است.
 * آگهی تکراری (همان key) بروزرسانی می‌شود و بقیه اضافه می‌شوند.
 * گزارش آخرین اجرای روزانه داخل تنظیمات ذخیره می‌شود.
 */
export const saveIngested = internalMutation({
  args: { items: v.array(itemValidator) },
  handler: async (ctx, args): Promise<SaveResult> => {
    let added = 0;
    let updated = 0;
    const now = Date.now();

    for (const item of args.items) {
      const existing = await ctx.db
        .query("listings")
        .withIndex("by_key", (q) => q.eq("key", item.key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { ...item, updatedAt: now });
        updated++;
      } else {
        await ctx.db.insert("listings", { ...item, createdAt: now, updatedAt: now });
        added++;
      }
    }

    const rows = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .take(2);
    const settings = rows[0];
    if (settings) {
      await ctx.db.patch(settings._id, {
        lastImportAt: now,
        lastImportAdded: added,
        lastImportUpdated: updated,
        lastImportError: undefined,
      });
    } else {
      await ctx.db.insert("appSettings", {
        key: "global",
        lastImportAt: now,
        lastImportAdded: added,
        lastImportUpdated: updated,
      });
    }

    return { added, updated, total: args.items.length };
  },
});

/** ثبت خطای افزودن روزانه در تنظیمات. */
export const recordImportError = internalMutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .take(2);
    const settings = rows[0];
    const now = Date.now();
    if (settings) {
      await ctx.db.patch(settings._id, { lastImportError: args.message, lastImportAt: now });
    } else {
      await ctx.db.insert("appSettings", {
        key: "global",
        lastImportError: args.message,
        lastImportAt: now,
      });
    }
    return true;
  },
});

/** خواندن نشانی منبع آگهی‌های روزانه از تنظیمات. */
export const getSource = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .take(2);
    return rows[0]?.sourceUrl ?? "";
  },
});

/** نقش کاربر جاری برای بررسی دسترسی در اکشن. */
export const currentRole = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const profs = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(2);
    return profs[0]?.officeRole ?? null;
  },
});

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { accept: "*/*" } });
  if (!res.ok) throw new Error(`دریافت فایل ناموفق بود (${res.status}).`);
  return await res.text();
}

function detectSource(url: string, body: string): IngestSource {
  const lower = url.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  const head = body.trimStart().slice(0, 200);
  if (head.startsWith("[") || head.startsWith("{")) return "json";
  if (/divar\.ir\/v\//.test(body)) return "html";
  return "csv";
}

async function ingestBody(url: string, body: string): Promise<IngestResult> {
  const source = detectSource(url, body);
  if (source === "html") {
    const parsed = await parseHtmlFile(body);
    return { ...parsed, source };
  }
  if (source === "json") return rowsToListings(rowsFromJson(body), "json");
  return rowsToListings(parseCsvText(body), "csv");
}

function toItems(result: IngestResult) {
  return result.listings.map((l) => ({
    key: listingKey(l),
    radarCode: l.radarCode,
    city: l.city,
    neighborhood: l.neighborhood,
    area: l.area ?? undefined,
    rooms: l.rooms ?? undefined,
    priceMillion: l.priceMillion,
    depositMillion: l.depositMillion ?? undefined,
    rentMillion: l.rentMillion ?? undefined,
    pricePerMeter: l.pricePerMeter ?? undefined,
    dealType: l.dealType,
    propertyType: l.propertyType,
    title: l.title,
    description: l.description,
    address: l.address,
    mapsUrl: l.mapsUrl,
    divarUrl: l.divarUrl,
    date: l.date,
    dateRaw: l.dateRaw,
    poster: l.poster,
    phone: l.phone,
  }));
}

/**
 * افزودن روزانهٔ آگهی‌ها — توسط cron هر روز صبح اجرا می‌شود.
 * منبع از تنظیمات (sourceUrl) خوانده می‌شود؛ اگر تنظیم نشده باشد، کاری انجام نمی‌شود.
 */
export const runDailyImport = internalAction({
  args: {},
  handler: async (ctx): Promise<ImportOutcome> => {
    const url = (await ctx.runQuery(internal.ingest.getSource, {})).trim();
    if (!url) {
      return { skipped: true, reason: "منبع آگهی تنظیم نشده است." };
    }
    try {
      const body = await fetchText(url);
      const result = await ingestBody(url, body);
      const saved = await ctx.runMutation(internal.ingest.saveIngested, {
        items: toItems(result),
      });
      return { ...saved, skippedRows: result.skipped, source: result.source };
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای نامشخص";
      await ctx.runMutation(internal.ingest.recordImportError, { message });
      return { skipped: true, reason: message };
    }
  },
});

/**
 * اجرای دستی افزودن آگهی — فقط مدیر یا مشاور.
 * همان کاری که cron روزانه انجام می‌دهد، ولی با فشار دکمه.
 */
export const importNow = action({
  args: { url: v.optional(v.string()) },
  handler: async (ctx, args): Promise<ImportOutcome> => {
    const role = await ctx.runQuery(internal.ingest.currentRole, {});
    if (!role || !PRIVILEGED_ROLES.includes(role as never)) {
      throw new Error("فقط مدیر یا مشاور اجازهٔ افزودن آگهی را دارد.");
    }

    const url = (args.url ?? "").trim() || (await ctx.runQuery(internal.ingest.getSource, {}));
    if (!url) throw new Error("نشانی فایل منبع وارد نشده است.");

    const body = await fetchText(url);
    const result = await ingestBody(url, body);
    const saved = await ctx.runMutation(internal.ingest.saveIngested, {
      items: toItems(result),
    });
    return { ...saved, skippedRows: result.skipped, source: result.source };
  },
});

/** نقش و دسترسی کاربر جاری برای رابط کاربری. */
export const myAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { role: OFFICE_ROLES.GUEST, isPrivileged: false, isAdmin: false };
    }
    const profs = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(2);
    const prof = profs[0];
    const role = (prof?.officeRole ?? OFFICE_ROLES.GUEST) as OfficeRole;
    return {
      role,
      isPrivileged: PRIVILEGED_ROLES.includes(role),
      isAdmin: role === OFFICE_ROLES.ADMIN,
    };
  },
});

/** وضعیت آخرین افزودن روزانه و نشانی منبع. */
export const importStatus = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .take(2);
    const settings = rows[0];
    return {
      sourceUrl: settings?.sourceUrl ?? "",
      lastImportAt: settings?.lastImportAt ?? null,
      lastImportAdded: settings?.lastImportAdded ?? null,
      lastImportUpdated: settings?.lastImportUpdated ?? null,
      lastImportError: settings?.lastImportError ?? null,
    };
  },
});

/** آیا کاربر فعلی اجازهٔ دیدن شمارهٔ آگهی را دارد؟ */
export const canSeePhones = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    const profs = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(2);
    const prof = profs[0];
    const role = (prof?.officeRole ?? OFFICE_ROLES.GUEST) as never;
    return PRIVILEGED_ROLES.includes(role);
  },
});
