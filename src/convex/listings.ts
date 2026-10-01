import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
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

/**
 * خواندن آگهی‌ها از سرور.
 *
 * نکتهٔ امنیتی: برای نقش‌های غیرمجاز، فیلد `phone` اصلاً در پاسخ قرار نمی‌گیرد
 * و به‌جای آن شمارهٔ تماس دفتر برگردانده می‌شود — یعنی شمارهٔ آگهی هرگز به
 * مرورگر کاربر عادی یا مهمان نمی‌رسد.
 */
export const listListings = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const r = await resolve(ctx);
    if (!r) return [];

    const rows = await ctx.db
      .query("listings")
      .order("desc")
      .take(args.limit ?? 500);
    if (r.privileged) {
      return rows.map((row) => ({
        ...row,
        contactPhone: row.phone ?? null,
      }));
    }
    const fallback = await managerPhone(ctx);
    return rows.map(({ phone: _phone, ...rest }) => ({
      ...rest,
      contactPhone: fallback,
    }));
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
