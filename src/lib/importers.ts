/**
 * خواندن آگهی‌ها از فایل‌های خروجی خود برنامه: CSV، JSON و اکسل (.xlsx).
 *
 * CSV و اکسل با سرفصل‌های فارسیِ همان ماژول exporters ساخته می‌شوند و JSON
 * با کلیدهای اسنپ‌کیس لاتین. برای انعطاف، کلیدهای رایج دیگر هم پذیرفته
 * می‌شوند (فارسی/لاتین، فاصله/زیرخط). ارقام فارسی/عربی خودکار تبدیل می‌شوند.
 */

import * as XLSX from "xlsx";
import { CSV_HEADERS } from "./exporters";
import { toEnglishDigits, type Listing } from "./parser";
import type { DealType, PropertyType } from "./parser";

export type ImportSource = "csv" | "json" | "excel";

export const IMPORT_ACCEPT = ".csv,.json,.xlsx,.xls,text/csv,application/json";

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

/** کلیدهای استاندارد JSON و هم‌معنی‌های فارسی/لاتین هر فیلد. */
const FIELD_ALIASES: Record<string, string[]> = {
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
  pricePerMeter: ["قیمت هر متر", "price_per_meter", "قیمت هر متر (میلیون تومان)", "pricepermeter"],
  dealType: ["نوع معامله", "deal_type", "معامله", "deal"],
  propertyType: ["نوع ملک", "property_type", "type"],
  title: ["عنوان", "title"],
  description: ["توضیحات", "description", "توضیحات کامل", "desc", "fullText"],
  phone: ["شماره تلفن", "تلفن", "phone", "موبایل"],
  divarUrl: ["لینک دیوار", "divar_url", "لینک", "divar"],
  mapsUrl: ["لینک گوگل مپ", "maps_url", "نقشه", "map"],
  date: ["تاریخ ثبت", "date", "تاریخ"],
  dateRaw: ["date_raw", "تاریخ خام"],
  poster: ["آگهی‌دهنده", "poster", "آگهی دهنده", "منبع"],
  address: ["آدرس", "ادرس", "address", "نشانی"],
};

function normalizeKey(key: string): string {
  const latin = key
    .toLowerCase()
    .replace(/[\s_\-\u200c]+/g, "")
    .trim();
  if (/[a-z]/.test(latin)) return latin;
  // کلید فارسی: حذف پرانتز، نیم‌فاصله، فاصله و زیرخط
  return key
    .replace(/\([^)]*\)/g, "")
    .replace(/[\s_\-\u200c]+/g, "")
    .trim();
}

/** نگاشت کلیدهای یک ردیف به نام فیلدهای داخلی. */
function mapKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const nk = normalizeKey(String(key));
    let field: string | null = null;
    for (const [f, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((a) => normalizeKey(a) === nk)) {
        field = f;
        break;
      }
    }
    if (!field && CSV_HEADERS.includes(key as never)) {
      // سرفصل فارسی دقیق از خروجی CSV/اکسل
      const idx = CSV_HEADERS.indexOf(key as never);
      field = [
        "radarCode",
        "city",
        "area",
        "rooms",
        "priceMillion",
        "dealType",
        "propertyType",
        "title",
        "description",
        "phone",
        "divarUrl",
        "mapsUrl",
        "date",
      ][idx] ?? null;
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

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = toEnglishDigits(String(value))
    .replace(/[،٬,\s]/g, "")
    .replace(/[^\d.\-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** تعداد اتاق: «بدون»/«بدون خواب»/«استودیو» → 0. */
function parseRooms(value: unknown): number | null {
  if (typeof value === "string" && /بدون|استودیو/.test(value)) return 0;
  const n = num(value);
  return n === null ? null : Math.round(n);
}

function normalizeDate(value: unknown): { date: string; dateRaw: string } {
  const raw = str(value);
  if (!raw) return { date: "", dateRaw: "" };
  const m = toEnglishDigits(raw).match(/(\d{4})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{1,2})/);
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
  // آگهی‌های غیر از شماره موبایل (مثل «اجاره») را رد کن
  if (!/09\d{9}/.test(value)) return null;
  const digits = toEnglishDigits(value).replace(/\D/g, "");
  const m = digits.match(/09\d{9}/);
  return m ? m[0] : null;
}

function rowToListing(row: Record<string, unknown>): Listing | null {
  const mapped = mapKeys(row);
  const phone = normalizePhone(mapped.phone);
  if (!phone) return null; // قانون اصلی: آگهی بدون تلفن استخراج نمی‌شود

  const radarCode = str(mapped.radarCode);
  // داده خام کانال گاهی مقدار غیر-شهر در ستون city دارد
  const cityRaw = str(mapped.city);
  const city = cityRaw && !/^(اجاره|فروش|رهن|مناسب|قیمت)$/.test(cityRaw) ? cityRaw : "نامشخص";
  const neighborhood = str(mapped.neighborhood);
  const deposit = num(mapped.deposit);
  const rent = num(mapped.rent);
  const pricePerMeter = num(mapped.pricePerMeter);

  // قیمت کل: برای رهن و اجاره ترکیب ودیعه+اجاره؛ در غیر این‌صورت فیلد price
  const deal = str(mapped.dealType);
  const priceField = num(mapped.priceMillion) ?? 0;
  const priceMillion =
    /رهن|اجاره/.test(deal) && (deposit !== null || rent !== null)
      ? (deposit ?? 0) + (rent ?? 0)
      : priceField;

  // تاریخ ممکن است YYYY-MM-DD (خروجی JSON) یا YYYY/M/D (خروجی CSV) باشد
  const { date, dateRaw } = normalizeDate(mapped.date ?? mapped.dateRaw);

  const divarUrl = str(mapped.divarUrl);
  const cityLabel = city;
  const fallbackTitle =
    str(mapped.title) || `${cityLabel}، ${str(mapped.propertyType) || "ملک"}`;

  return {
    id: radarCode || `${phone}-${divarUrl || city}`,
    radarCode,
    city,
    neighborhood,
    area: num(mapped.area),
    rooms: parseRooms(mapped.rooms),
    priceMillion,
    depositMillion: deposit,
    rentMillion: rent,
    pricePerMeter,
    priceRaw: "",
    dealType: (DEALS.includes(str(mapped.dealType) as DealType)
      ? str(mapped.dealType)
      : "سایر") as DealType,
    propertyType: (PROPS.includes(str(mapped.propertyType) as PropertyType)
      ? str(mapped.propertyType)
      : "سایر") as PropertyType,
    cityLabel,
    title: fallbackTitle,
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

async function rowsFromFile(file: File): Promise<{
  rows: Record<string, unknown>[];
  source: ImportSource;
}> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json")) {
    const parsed: unknown = JSON.parse(await file.text());
    const arr = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { listings?: unknown }).listings)
        ? (parsed as { listings: Record<string, unknown>[] }).listings
        : [];
    return { rows: arr, source: "json" };
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return {
      rows: XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      }),
      source: "excel",
    };
  }
  // CSV یا TXT
  return {
    rows: parseCsvText(await file.text()),
    source: name.endsWith(".json") ? "json" : "csv",
  };
}

export interface ImportResult {
  listings: Listing[];
  skipped: number;
  total: number;
  source: ImportSource;
}

/**
 * فایل CSV/JSON/اکسل خروجیِ خود برنامه را می‌خواند.
 * برای فایل‌های بزرگ، پردازش دسته‌ای و بدون قفل‌شدن رابط انجام می‌شود.
 */
export async function importListingsFile(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const { rows, source } = await rowsFromFile(file);

  const listings: Listing[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  const BATCH = 200;

  for (let i = 0; i < rows.length; i++) {
    const listing = rowToListing(rows[i]);
    if (listing) {
      const key = `${listing.phone}|${listing.divarUrl}|${listing.radarCode}`;
      if (!seen.has(key)) {
        seen.add(key);
        listings.push(listing);
      }
    } else {
      skipped++;
    }
    if (onProgress && (i + 1) % BATCH === 0) {
      onProgress(i + 1, rows.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  onProgress?.(rows.length, rows.length);

  return { listings, skipped, total: rows.length, source };
}
