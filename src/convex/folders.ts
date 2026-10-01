import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** همهٔ زونکن‌های بایگانی. */
export const listFolders = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("folders").order("asc").collect();
  },
});

/** ساخت زونکن جدید. */
export const createFolder = mutation({
  args: { name: v.string(), color: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const count = await ctx.db.query("folders").take(500);
    return await ctx.db.insert("folders", {
      name: args.name,
      color: args.color,
      order: count.length,
      createdAt: Date.now(),
    });
  },
});

/** حذف زونکن. */
export const deleteFolder = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.folderId);
    return args.folderId;
  },
});

/** تنظیمات دفتر: نام، شمارهٔ تماس، متن پایانی پیام‌ها و دسته‌های سفارشی. */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
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
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    const data = { ...args, key: "global", updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("appSettings", data);
  },
});
