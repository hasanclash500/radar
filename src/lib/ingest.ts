/**
 * هستهٔ خالص تبدیل دادهٔ خام به آگهی.
 *
 * این ماژول هیچ وابستگی مرورگری ندارد تا هم در UI و هم در اکشن‌های سرور Convex
 * (برای افزودن روزانهٔ آگهی) قابل استفاده باشد. منطق از importers.ts استخراج شده.
 */

import { toEnglishDigits, type Listing } from "./parser";
import type { DealType, PropertyType } from "./parser";
import { CSV_HEADERS } from "./exporters";

export type IngestSource = "json" | "csv" | "excel" | "html";

const DEALS: DealType[] = ["فروش", "رهن و اجاره", "پیش فروش", "سایر"];
const PROPS: PropertyType[] = [
  "مسکونی",
  "ویلا",
  "مغازه",
  "زمین",
  "صنعتی",
  "اداری",
  "سایر",
];

/** ترتیب فیلدهای خروجی CSV؛ برای نگاشت سرفصل‌های فارسی به فیلد داخلی. */
const CSV_FIELD_ORDER = [
  "radarCode",
  "city",
  "neighborhood",
  "area",
  "rooms",
  "priceMillion",
  "deposit",
  "rent",
  "pricePerMeter",
  "dealType",
  "propertyType",
  "title",
  "description",
  "phone",
  "divarUrl",
  "mapsUrl",
  "date",
  "poster",
  "address",
] as const;

/** کلیدهای استاندارد و هم‌معنی‌های فارسی/لاتین هر فیلد. */
export const FIELD_ALIASES: Record<string, string[]> = {
  radarCode: ["رادار_کد", "کد رادار", "radar_code", "radarcode", "کدرادار", "code", "کد"],
  city: ["شهر", "شهرستان", "city"],
  neighborhood: ["محله", "neighborhood"],
  area: ["متراژ", "متراژ (متر)", "area_m2", "متراژ (متر مربع)", "area"],
  rooms: ["تعداد اتاق", "اتاق", "rooms", "تعداد خواب"],
  priceMillion: [
    "قیمت (میلیون تومان)",
    "قیمت",
    "price_million_toman",
    "قیمت (تومان)",
    "price",
  ],
  deposit: ["ودیعه", "رهن", "deposit"],
  rent: ["اجاره", "rent"],
  pricePerMeter: [
    "قیمت هر متر",
    "price_per_meter",
    "قیمت هر متر (میلیون تومان)",
    "pricepermeter",
  ],
  dealType: ["نوع معامله", "deal_type", "معامله", "deal"],
  propertyType: ["نوع ملک", "property_type", "type"],
  title: ["عنوان", "title"],
  description: ["توضیحات", "description", "توضیحات کامل", "desc", "fulltext"],
  phone: ["شماره تلفن", "تلفن", "phone", "موبایل"],
  divarUrl: ["لینک دیوار", "divar_url", "لینک", "divar"],
  mapsUrl: ["لینک گوگل مپ", "maps_url", "نقشه", "map"],
  date: ["تاریخ ثبت", "date", "تاریخ"],
  dateRaw: ["date_raw", "تاریخ خام"],
  poster: ["آگهی‌دهنده", "poster", "آگهی دهنده", "منبع"],
  address: ["آدرس", "ادرس", "address", "نشانی"],
};

function normalizeKey(key: string): string {
  const strip = (s: string) => s.replace(/[\s_\u200c-]+/g, "").trim();
  const latin = strip(key.toLowerCase());
  if (/[a-z]/.test(latin)) return latin;
  return strip(key.replace(/\([^)]*\)/g, ""));
}

/** نگاشت کلیدهای یک ردیف به نام فیلدهای داخلی. */
export function mapKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const nk = normalizeKey(key);
    let field: string | null = null;
    for (const [f, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((a) => normalizeKey(a) === nk)) {
        field = f;
        break;
      }
    }
    // سرفصل فارسی دقیق خروجی CSV/اکسل
    if (!field) {
      const idx = (CSV_HEADERS as readonly string[]).indexOf(key);
      if (idx >= 0) field = CSV_FIELD_ORDER[idx] ?? null;
    }
    if (field && (value !== undefined || !(field in out))) {
      out[field] = value;
    }
  }
  return out;
}

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = toEnglishDigits(String(value))
    .replace(/[،٬,\s]/g, "")
    .replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** تعداد اتاق: «بدون»/«بدون خواب»/«استودیو» → 0. */
function parseRooms(value: unknown): number | null {
  if (typeof value === "string" && /بدون|استودیو/.test(value)) return 0;
  const n = toNumber(value);
  return n === null ? null : Math.round(n);
}

function normalizeDate(value: unknown): { date: string; dateRaw: string } {
  const raw = str(value);
  if (!raw) return { date: "", dateRaw: "" };
  const m = toEnglishDigits(raw).match(
    /(\d{4})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{1,2})/,
  );
  if (m) {
    const [, y, mo, d] = m;
    return {
      date: `${y.padStart(4, "0")}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`,
      dateRaw: `${Number(y)}/${Number(mo)}/${Number(d)}`,
    };
  }
  return { date: "", dateRaw: raw };
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // آگهی‌هایی که شماره موبایل ندارند (مثل «اجاره») رد می‌شوند
  if (!/09\d{9}/.test(value)) return null;
  const digits = toEnglishDigits(value).replace(/\D/g, "");
  const m = digits.match(/09\d{9}/);
  return m ? m[0] : null;
}

/** یک ردیف خام (JSON/CSV/Excel) را به آگهی تبدیل می‌کند؛ بدون تلفن → null. */
export function rowToListing(row: Record<string, unknown>): Listing | null {
  const mapped = mapKeys(row);
  const phone = normalizePhone(mapped.phone);
  if (!phone) return null; // قانون اصلی: آگهی بدون تلفن استخراج نمی‌شود

  const radarCode = str(mapped.radarCode);
  // دادهٔ خام کانال گاهی مقدار غیر‌شهر در ستون city دارد
  const cityRaw = str(mapped.city);
  const city =
    cityRaw && !/^(اجاره|فروش|رهن|مناسب|قیمت)$/.test(cityRaw) ? cityRaw : "نامشخص";
  const deposit = toNumber(mapped.deposit);
  const rent = toNumber(mapped.rent);
  const propertyType = PROPS.includes(
    str(mapped.propertyType) as PropertyType,
  )
    ? (str(mapped.propertyType) as PropertyType)
    : "سایر";

  // قیمت کل: برای رهن و اجاره ترکیب ودیعه+اجاره؛ در غیر این‌صورت فیلد price
  const deal = str(mapped.dealType);
  const priceMillion =
    /رهن|اجاره/.test(deal) && (deposit !== null || rent !== null)
      ? (deposit ?? 0) + (rent ?? 0)
      : (toNumber(mapped.priceMillion) ?? 0);

  // تاریخ ممکن است YYYY-MM-DD (خروجی JSON) یا YYYY/M/D (خروجی CSV) باشد
  const { date, dateRaw } = normalizeDate(mapped.date ?? mapped.dateRaw);
  const divarUrl = str(mapped.divarUrl);

  return {
    id: radarCode || `${phone}-${divarUrl || city}`,
    radarCode,
    city,
    neighborhood: str(mapped.neighborhood),
    area: toNumber(mapped.area),
    rooms: parseRooms(mapped.rooms),
    priceMillion,
    depositMillion: deposit,
    rentMillion: rent,
    pricePerMeter: toNumber(mapped.pricePerMeter),
    priceRaw: str(mapped.priceRaw) || str(mapped.priceMillion),
    dealType: DEALS.includes(str(mapped.dealType) as DealType)
      ? (str(mapped.dealType) as DealType)
      : "سایر",
    propertyType,
    cityLabel: city,
    title: str(mapped.title) || `${city}، ${propertyType}`,
    description: str(mapped.description),
    phone,
    divarUrl,
    mapsUrl:
      str(mapped.mapsUrl) ||
      (city
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`
        : ""),
    date,
    dateRaw,
    poster: str(mapped.poster),
    address: str(mapped.address),
  };
}

/** کلید پایدار هر آگهی برای ادغام با دادهٔ موجود روی سرور. */
export function listingKey(l: Listing): string {
  return l.divarUrl || l.radarCode || l.phone;
}

/** CSV ساده با درنظرگرفتن نقل‌قول‌ها را به ردیف‌های شیءای تبدیل می‌کند. */
export function parseCsvText(text: string): Record<string, unknown>[] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === "," || ch === ";" || ch === "\t") {
      cur.push(field);
      field = "";
    } else if (ch === "\n") {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = "";
    } else {
      field += ch;
    }
  }
  cur.push(field);
  rows.push(cur);

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length < 2) return [];

  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((cells) => {
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
}

/** آرایهٔ رکوردهای JSON (مستقیم یا زیر یکی از کلیدهای شناخته‌شده) را بیرون می‌کشد. */
export function rowsFromJson(text: string): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    for (const key of ["listings", "items", "data", "messages", "ads", "results"]) {
      const value = obj[key];
      if (Array.isArray(value)) return value as Record<string, unknown>[];
    }
  }
  return [];
}

export interface IngestResult {
  listings: Listing[];
  skipped: number;
  total: number;
  source: IngestSource;
}

/**
 * تبدیل ردیف‌های خام به آگهی با حذف تکراری‌ها.
 * قانون اصلی حفظ می‌شود: ردیف‌های بدون شماره تلفن وارد نمی‌شوند.
 */
export function rowsToListings(
  rows: Record<string, unknown>[],
  source: IngestSource,
): IngestResult {
  const listings: Listing[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const row of rows) {
    const listing = rowToListing(row);
    if (!listing) {
      skipped++;
      continue;
    }
    const key = `${listing.phone}|${listing.divarUrl}|${listing.radarCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    listings.push(listing);
  }

  return { listings, skipped, total: rows.length, source };
}
