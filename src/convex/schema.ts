import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/** نقش‌های دفتر املاک: فقط مدیر و مشاور به شمارهٔ آگهی دسترسی دارند. */
export const OFFICE_ROLES = {
  /** مدیر دفتر: دسترسی کامل */
  ADMIN: "admin",
  /** مشاور: دسترسی کامل */
  CONSULTANT: "consultant",
  /** کاربر عادی: فقط شمارهٔ مدیر */
  USER: "user",
  /** مهمان: فقط شمارهٔ مدیر */
  GUEST: "guest",
} as const;

export type OfficeRole =
  (typeof OFFICE_ROLES)[keyof typeof OFFICE_ROLES];

export const officeRoleValidator = v.union(
  v.literal(OFFICE_ROLES.ADMIN),
  v.literal(OFFICE_ROLES.CONSULTANT),
  v.literal(OFFICE_ROLES.USER),
  v.literal(OFFICE_ROLES.GUEST),
);

/** نقش‌هایی که شمارهٔ تلفن آگهی را می‌بینند. */
export const PRIVILEGED_ROLES: OfficeRole[] = [
  OFFICE_ROLES.ADMIN,
  OFFICE_ROLES.CONSULTANT,
];

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /**
     * نقش کاربر در دفتر املاک. جدول جدا از users است تا بتوان نقش را
     * بدون دست‌زدن به جدول auth تغییر داد. اولین کاربرِ ثبت‌نام‌شده مدیر می‌شود.
     */
    userProfiles: defineTable({
      userId: v.string(),
      officeRole: v.optional(officeRoleValidator),
      displayName: v.optional(v.string()),
      createdAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_role", ["officeRole"]),

    /**
     * آگهی‌ها روی سرور ذخیره می‌شوند تا هر روز بتوان آگهی تازه اضافه کرد و
     * دسترسی شمارهٔ تلفن واقعاً کنترل شود: فیلد phone فقط برای مدیر/مشاور
     * در پاسخ query برگردانده می‌شود و بقیه شمارهٔ مدیر را می‌بینند.
     */
    listings: defineTable({
      /** کلید پایدار برای ادغام آگهی‌های تکراری و یادداشت‌گذاری */
      key: v.string(),
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
      /** حساس: فقط برای نقش‌های مجاز برگردانده می‌شود */
      phone: v.optional(v.string()),
      /** یادداشت‌های دفتر (مثل یادداشت روی پرونده) */
      notes: v.optional(v.string()),
      /** شناسهٔ زونکن‌هایی که آگهی در آن‌ها بایگانی شده است */
      folderIds: v.optional(v.array(v.string())),
      /** عکس‌ها: شناسهٔ فایل در Convex Storage */
      images: v.optional(v.array(v.string())),
      /** تعداد دفعات ارسال‌شده در شبکه‌های اجتماعی */
      sentCount: v.optional(v.number()),
      lastSharedAt: v.optional(v.number()),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
    })
      .index("by_key", ["key"])
      .index("by_date", ["date"])
      .index("by_city", ["city"]),

    /** زونکن/پرونده‌های بایگانی برای دسته‌بندی آگهی‌ها */
    folders: defineTable({
      name: v.string(),
      color: v.optional(v.string()),
      order: v.optional(v.number()),
      createdBy: v.optional(v.string()),
      createdAt: v.optional(v.number()),
    }).index("by_order", ["order"]),

    /** تنظیمات عمومی: شمارهٔ تماس دفتر، متن پایانی پیام‌ها، شهرها و دسته‌های سفارشی */
    appSettings: defineTable({
      key: v.string(),
      officeName: v.optional(v.string()),
      managerPhone: v.optional(v.string()),
      shareFooter: v.optional(v.string()),
      /** شهر/دسته/نوع ملک‌های افزوده‌شده توسط مدیر */
      customCities: v.optional(v.array(v.string())),
      customDeals: v.optional(v.array(v.string())),
      customPropertyTypes: v.optional(v.array(v.string())),
      /**
       * نشانی فایل منبع آگهی‌های روزانه (HTML/JSON/CSV). هر روز ساعت ۶ صبح
       * توسط cron خوانده و آگهی‌های تازه روی سرور ذخیره می‌شوند.
       */
      sourceUrl: v.optional(v.string()),
      /** گزارش آخرین اجرای افزودن روزانه */
      lastImportAt: v.optional(v.number()),
      lastImportAdded: v.optional(v.number()),
      lastImportUpdated: v.optional(v.number()),
      lastImportError: v.optional(v.string()),
      updatedAt: v.optional(v.number()),
    }).index("by_key", ["key"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
