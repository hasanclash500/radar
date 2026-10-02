import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { OFFICE_ROLES, PRIVILEGED_ROLES } from "./schema";

/** نقش کاربر جاری؛ اگر وارد نشده باشد null. */
async function resolveRole(ctx: {
  db: import("./_generated/server").QueryCtx["db"];
  auth: import("./_generated/server").QueryCtx["auth"];
}): Promise<string | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const prof = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(2);
  return prof[0]?.officeRole ?? null;
}

/** همهٔ زونکن‌های بایگانی. */
export const listFolders = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("folders").order("asc").collect();
  },
});

/** ساخت زونکن جدید — فقط مدیر و مشاور. */
export const createFolder = mutation({
  args: { name: v.string(), color: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const role = await resolveRole(ctx);
    if (!role || !PRIVILEGED_ROLES.includes(role as never)) {
      throw new Error("فقط مدیر یا مشاور اجازهٔ ساخت زونکن را دارد.");
    }
    const count = await ctx.db.query("folders").take(500);
    return await ctx.db.insert("folders", {
      name: args.name,
      color: args.color,
      order: count.length,
      createdAt: Date.now(),
    });
  },
});

/** حذف زونکن — فقط مدیر و مشاور. */
export const deleteFolder = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const role = await resolveRole(ctx);
    if (!role || !PRIVILEGED_ROLES.includes(role as never)) {
      throw new Error("فقط مدیر یا مشاور اجازهٔ حذف زونکن را دارد.");
    }
    await ctx.db.delete(args.folderId);
    return args.folderId;
  },
});

/** تنظیمات دفتر: نام، شمارهٔ تماس، متن پایانی پیام‌ها و دسته‌های سفارشی. */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    // take به‌جای unique: اگر دو ردیف تنظیمات موجود باشد، کوئری کرش نکند
    const rows = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .take(2);
    return rows[0] ?? null;
  },
});

/** ذخیرهٔ تنظیمات. */
export const updateSettings = mutation({
  args: {
    officeName: v.optional(v.string()),
    managerPhone: v.optional(v.string()),
    shareFooter: v.optional(v.string()),
    customCities: v.optional(v.array(v.string())),
    customDeals: v.optional(v.array(v.string())),
    customPropertyTypes: v.optional(v.array(v.string())),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await resolveRole(ctx);
    if (role !== OFFICE_ROLES.ADMIN) {
      throw new Error("فقط مدیر اجازهٔ تغییر تنظیمات دفتر را دارد.");
    }
    const rows = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .take(2);
    const existing = rows[0];
    const data = { ...args, key: "global", updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("appSettings", data);
  },
});
