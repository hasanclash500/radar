import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * افزودن روزانهٔ آگهی‌ها: هر روز ساعت ۶ صبح به وقت تهران، منبع تنظیم‌شده
 * خوانده می‌شود و آگهی‌های جدید روی سرور ذخیره می‌شوند.
 * آگهی‌های تکراری با کلید پایدار ادغام (بروزرسانی) می‌شوند.
 */
const crons = cronJobs();

// ساعت ۶:۰۰ صبح به وقت تهران = ۲:۳۰ UTC
crons.daily(
  "daily listings import",
  { hourUTC: 2, minuteUTC: 30 },
  internal.ingest.runDailyImport,
);

export default crons;
