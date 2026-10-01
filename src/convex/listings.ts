import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { toEnglishDigits, type Listing as ListingRow } from "../lib/parser";
import { OFFICE_ROLES, PRIVILEGED_ROLES, type OfficeRole } from "./schema";

/**
 * کمکی‌های زیر هم در query و هم در mutation استفاده می‌شوند؛ پس فقط به
 * خواندن نیاز دارند و ساخت پروفایل در mutation به نام ensureProfile انجام می‌گیرد.
 */
type Ctx = { db: QueryCtx["db"]; auth: QueryCtx["auth"] };

/** نقش کاربر جاری؛ اگر پروفایلی نباشد، مهمان در نظر گرفته می‌شود. */
async function resolve(ctx: Ctx): Promise<{
  role: OfficeRole;
  privileged: boolean;
} | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;

  const prof = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  // پروفایل ندارد ⇒ هنوز ensureProfile صدا زده نشده ⇒ فعلاً غیرمجاز
  const role = (prof?.officeRole ?? OFFICE_ROLES.GUEST) as OfficeRole;
  return { role, privileged: PRIVILEGED_ROLES.includes(role) };
}

async function managerPhone(ctx: Ctx): Promise<string> {
  const s = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
  return s?.managerPhone ?? "";
}

async function byKey(ctx: Ctx, key: string): Promise<Doc<"listings"> | null> {
  return await ctx.db
    .query("listings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

/** یک سند آگهی را به شکل قابل استفاده در UI (نوع Listing) تبدیل می‌کند. */
function toListing(row: Doc<"listings">, contactPhone: string): ListingRow {
  return {
    id: row.key,
    radarCode: row.radarCode ?? "",
    city: row.city ?? "نامشخص",
    cityLabel: row.city ?? "نامشخص",
    neighborhood: row.neighborhood ?? "",
    area: row.area ?? null,
    rooms: row.rooms ?? null,
    priceMillion: row.priceMillion ?? 0,
    priceRaw: "",
    depositMillion: row.depositMillion ?? null,
    rentMillion: row.rentMillion ?? null,
    pricePerMeter: row.pricePerMeter ?? null,
    dealType: (row.dealType ?? "سایر") as ListingRow["dealType"],
    propertyType: (row.propertyType ?? "سایر") as ListingRow["propertyType"],
    title: row.title ?? "",
    description: row.description ?? "",
    phone: contactPhone,
    divarUrl: row.divarUrl ?? "",
    mapsUrl: row.mapsUrl ?? "",
    date: row.date ?? "",
    dateRaw: row.dateRaw ?? "",
    poster: row.poster ?? "",
    address: row.address ?? "",
    notes: row.notes,
    folderIds: row.folderIds,
    contactPhone,
  };
}

/**
 * خواندن آگهی‌ها از سرور.
 *
 * نکتهٔ امنیتی: برای نقش‌های غیرمجاز، فیلد `phone` اصلاً در پاسخ قرار نمی‌گیرد
 * و به‌جای آن شمارهٔ تماس دفتر برگردانده می‌شود — یعنی شمارهٔ آگهی هرگز به
 * مرورگر کاربر عادی یا مهمان نمی‌رسد.
 */
export const listListings = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const r = await resolve(ctx);
    if (!r) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const page = await ctx.db
      .query("listings")
      .order("desc")
      .paginate(args.paginationOpts);
    // شمارهٔ آگهی فقط برای نقش‌های مجاز؛ بقیه شمارهٔ دفتر را می‌بینند
    const fallback = r.privileged ? "" : await managerPhone(ctx);
    return {
      ...page,
      page: page.page.map((row) =>
        toListing(row, r.privileged ? (row.phone ?? "") : fallback),
      ),
    };
  },
});

const listingFields = {
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
};

/**
 * ذخیرهٔ آگهی‌ها روی سرور — برای افزودن روزانهٔ آگهی‌های تازه.
 * فقط مدیر و مشاور اجازهٔ نوشتن دارند. آگهی تکراری (همان key) بروزرسانی می‌شود.
 */
export const upsertListings = mutation({
  args: { items: v.array(v.object({ key: v.string(), ...listingFields })) },
  handler: async (ctx, args) => {
    const r = await resolve(ctx);
    if (!r || !r.privileged) {
      throw new Error("فقط مدیر یا مشاور اجازهٔ افزودن آگهی را دارد.");
    }

    let added = 0;
    let updated = 0;
    for (const item of args.items) {
      const existing = await byKey(ctx, item.key);
      if (existing) {
        await ctx.db.patch(existing._id, { ...item, updatedAt: Date.now() });
        updated++;
      } else {
        await ctx.db.insert("listings", {
          ...item,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        added++;
      }
    }
    return { added, updated, total: args.items.length };
  },
});

/** ذخیرهٔ یادداشت روی پروندهٔ آگهی. */
export const saveNotes = mutation({
  args: { key: v.string(), notes: v.string() },
  handler: async (ctx, args) => {
    const r = await resolve(ctx);
    if (!r || !r.privileged) {
      throw new Error("فقط مدیر یا مشاور اجازهٔ یادداشت‌گذاری را دارد.");
    }
    const row = await byKey(ctx, args.key);
    if (!row) throw new Error("آگهی یافت نشد.");
    await ctx.db.patch(row._id, { notes: args.notes, updatedAt: Date.now() });
    return args.notes;
  },
});

/** افزودن یا برداشتن آگهی از یک زونکن. */
export const toggleFolder = mutation({
  args: { key: v.string(), folderId: v.string() },
  handler: async (ctx, args) => {
    const r = await resolve(ctx);
    if (!r || !r.privileged) {
      throw new Error("فقط مدیر یا مشاور اجازهٔ بایگانی را دارد.");
    }
    const row = await byKey(ctx, args.key);
    if (!row) throw new Error("آگهی یافت نشد.");
    const current: string[] = row.folderIds ?? [];
    const next = current.includes(args.folderId)
      ? current.filter((f) => f !== args.folderId)
      : [...current, args.folderId];
    await ctx.db.patch(row._id, { folderIds: next, updatedAt: Date.now() });
    return next;
  },
});

/** ثبت ارسال آگهی برای شمارش در داشبورد. */
export const markShared = mutation({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, args) => {
    const r = await resolve(ctx);
    if (!r) throw new Error("ورود لازم است.");
    const now = Date.now();
    for (const key of args.keys) {
      const row = await byKey(ctx, key);
      if (!row) continue;
      await ctx.db.patch(row._id, {
        sentCount: (row.sentCount ?? 0) + 1,
        lastSharedAt: now,
      });
    }
    return args.keys.length;
  },
});

/** ویرایش آدرس، لینک دیوار، لینک نقشه و عنوان آگهی. */
export const updateListing = mutation({
  args: {
    key: v.string(),
    patch: v.object({
      address: v.optional(v.string()),
      mapsUrl: v.optional(v.string()),
      divarUrl: v.optional(v.string()),
      title: v.optional(v.string()),
      priceMillion: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const r = await resolve(ctx);
    if (!r || !r.privileged) {
      throw new Error("فقط مدیر یا مشاور اجازهٔ ویرایش را دارد.");
    }
    const row = await byKey(ctx, args.key);
    if (!row) throw new Error("آگهی یافت نشد.");
    await ctx.db.patch(row._id, { ...args.patch, updatedAt: Date.now() });
    return args.patch;
  },
});

/** شمارش کل آگهی‌های ذخیره‌شده روی سرور. */
export const countListings = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("listings").take(2000);
    return { count: rows.length };
  },
});

/**
 * افزودن دستی یک آگهی توسط مدیر یا مشاور — بدون نیاز به فایل.
 * مثل قانون واردکردن فایل، شمارهٔ تلفن اجباری است.
 */
export const createListing = mutation({
  args: {
    key: v.optional(v.string()),
    radarCode: v.optional(v.string()),
    city: v.optional(v.string()),
    neighborhood: v.optional(v.string()),
    area: v.optional(v.number()),
    rooms: v.optional(v.number()),
    priceMillion: v.optional(v.number()),
    depositMillion: v.optional(v.number()),
    rentMillion: v.optional(v.number()),
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
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const r = await resolve(ctx);
    if (!r || !r.privileged) {
      throw new Error("فقط مدیر یا مشاور اجازهٔ افزودن آگهی را دارد.");
    }
    const phone = toEnglishDigits(args.phone).replace(/\D/g, "");
    if (!/^09\d{9}$/.test(phone)) {
      throw new Error("شمارهٔ تلفن باید ۱۱ رقم و با 09 شروع شود.");
    }
    const { key, ...rest } = args;
    delete (rest as { phone?: string }).phone;
    const stableKey = (key ?? "").trim() || rest.divarUrl || rest.radarCode || phone;
    if (await byKey(ctx, stableKey)) {
      throw new Error("آگهی با این لینک یا کد رادار قبلاً ثبت شده است.");
    }
    const now = Date.now();
    await ctx.db.insert("listings", {
      ...rest,
      key: stableKey,
      phone,
      createdAt: now,
      updatedAt: now,
    });
    return stableKey;
  },
});
