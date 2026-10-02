import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { OFFICE_ROLES, PRIVILEGED_ROLES, type OfficeRole } from "./schema";

export const isPrivileged = (role: OfficeRole) =>
  PRIVILEGED_ROLES.includes(role);

/** پروفایل کاربر؛ به‌جای unique تا رکورد تکراری، کوئری را نترکانَد. */
async function myProfile(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string,
) {
  const profs = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(2);
  return profs[0] ?? null;
}

/** نقش کاربر جاری. اگر پروفایل نداشته باشد null برمی‌گرداند. */
export const myRole = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const prof = await myProfile(ctx, userId);
    if (!prof) return null;
    const role = (prof.officeRole ?? OFFICE_ROLES.GUEST) as OfficeRole;
    return { role, isPrivileged: isPrivileged(role) };
  },
});

/**
 * ساخت پروفایل کاربر در اولین ورود.
 * اولین کاربر مدیر می‌شود و بقیه مهمان.
 */
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("ورود لازم است.");

    const existing = await myProfile(ctx, userId);
    if (existing) {
      const role = (existing.officeRole ?? OFFICE_ROLES.GUEST) as OfficeRole;
      return { role, isPrivileged: isPrivileged(role) };
    }

    const any = await ctx.db.query("userProfiles").take(1);
    const role: OfficeRole =
      any.length === 0 ? OFFICE_ROLES.ADMIN : OFFICE_ROLES.GUEST;
    await ctx.db.insert("userProfiles", {
      userId,
      officeRole: role,
      createdAt: Date.now(),
    });
    return { role, isPrivileged: isPrivileged(role) };
  },
});

/** فهرست کاربران با نقش (فقط مدیر). */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const me = await myProfile(ctx, userId);
    if (me?.officeRole !== OFFICE_ROLES.ADMIN) return null;

    const profiles = await ctx.db.query("userProfiles").collect();
    const users = await ctx.db.query("users").collect();
    return users.map((u) => {
      const prof = profiles.find((pr) => pr.userId === u._id);
      return {
        userId: u._id as string,
        name: u.name ?? "",
        email: u.email ?? "",
        isAnonymous: u.isAnonymous ?? false,
        role: (prof?.officeRole ?? OFFICE_ROLES.GUEST) as OfficeRole,
      };
    });
  },
});

/** تغییر نقش کاربر (فقط مدیر). */
export const setUserRole = mutation({
  args: { userId: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("ورود لازم است.");
    const me = await myProfile(ctx, userId);
    if (me?.officeRole !== OFFICE_ROLES.ADMIN) {
      throw new Error("فقط مدیر اجازهٔ تغییر نقش را دارد.");
    }
    if (!(Object.values(OFFICE_ROLES) as string[]).includes(args.role)) {
      throw new Error("نقش نامعتبر است.");
    }

    const prof = await myProfile(ctx, args.userId);
    if (prof) {
      await ctx.db.patch(prof._id, { officeRole: args.role as OfficeRole });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: args.userId,
        officeRole: args.role as OfficeRole,
        createdAt: Date.now(),
      });
    }
    return args.role;
  },
});
