/**
 * موتور استخراج آگهی‌های املاک از فایل HTML خام کانال تلگرامی «ملک‌رادار».
 *
 * هر آگهی با یک لینک دیوار شروع می‌شود:
 *   [▫️](https://divar.ir/v/XXXXX&mode=preview)
 * و شامل تگ‌های [#شهر]()، متراژ، [#N_خواب]()، 💲 قیمت، [#نوع_معامله]()،
 * [#نوع_ملک]()، [#رادار_کد_X]()، توضیحات بین دو خط موج‌دار، تاریخ و تلفن است.
 *
 * آگهی‌های بدون شماره تلفن استخراج نمی‌شوند.
 */

export type DealType = "فروش" | "رهن و اجاره" | "پیش فروش" | "سایر";
export type PropertyType =
  | "مسکونی"
  | "ویلا"
  | "مغازه"
  | "زمین"
  | "صنعتی"
  | "اداری"
  | "سایر";

export const DEAL_TYPES: DealType[] = ["فروش", "رهن و اجاره", "پیش فروش"];
export const PROPERTY_TYPES: PropertyType[] = [
  "مسکونی",
  "ویلا",
  "مغازه",
  "زمین",
  "صنعتی",
  "اداری",
];

export interface Listing {
  id: string;
  radarCode: string;
  city: string;
  /** محله (اگر در آگهی ذکر شده باشد). */
  neighborhood: string;
  /** متراژ به متر مربع؛ null اگر در آگهی ذکر نشده باشد. */
  area: number | null;
  /** تعداد اتاق؛ null اگر ذکر نشده باشد (بدون خواب = 0). */
  rooms: number | null;
  /** قیمت کل/رهن به میلیون تومان؛ 0 اگر ذکر نشده باشد. */
  priceMillion: number;
  /** ودیعه به میلیون تومان (برای رهن و اجاره). */
  depositMillion: number | null;
  /** اجاره ماهانه به میلیون تومان (برای رهن و اجاره). */
  rentMillion: number | null;
  /** قیمت هر متر به میلیون تومان (اگر محاسبه شده باشد). */
  pricePerMeter: number | null;
  /** متن خام خط قیمت برای نمایش. */
  priceRaw: string;
  dealType: DealType;
  propertyType: PropertyType;
  cityLabel: string;
  title: string;
  description: string;
  phone: string;
  divarUrl: string;
  mapsUrl: string;
  /** تاریخ ثبت به شکل YYYY-MM-DD (تقویم شمسی) برای مرتب‌سازی. */
  date: string;
  /** تاریخ خام مانند 1404/7/10 برای نمایش. */
  dateRaw: string;
  /** آگهی‌دهنده: «شخصی» یا «مشاور املاک». */
  poster: string;
  /** آدرس متنی (از فیلد ادرس/extra). */
  address: string;
  /** یادداشت روی پرونده (فقط برای مدیر/مشاور). */
  notes?: string;
  /** شناسهٔ زونکن‌هایی که آگهی در آن‌ها بایگانی شده است. */
  folderIds?: string[];
  /** شماره‌ای که باید در متن اشتراک‌گذاری بیاید (آگهی یا دفتر). */
  contactPhone?: string;
}

/** فیلدهای عددی/اختیاری پیش‌فرض برای ساخت آگهی. */
export function emptyExtras() {
  return {
    neighborhood: "",
    depositMillion: null,
    rentMillion: null,
    pricePerMeter: null,
    poster: "",
    address: "",
  };
}

export interface ParseResult {
  listings: Listing[];
  /** آگهی‌هایی که شماره تلفن نداشتند یا ساختارشان ناقص بود. */
  skipped: number;
  /** تعداد کل بلوک‌های پیدا شده. */
  total: number;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** ارقام فارسی و عربی را به لاتین تبدیل می‌کند. */
export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) =>
      String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&amp;/gi, "&");
}

/**
 * HTML خام را به متن ساده تبدیل می‌کند؛ لینک‌های دیوار (چه به صورت تگ a
 * و چه به صورت مارک‌داون) حفظ می‌شوند.
 */
export function htmlToText(html: string): string {
  let s = html.replace(/<!--[\s\S]*?-->/g, "");

  // <a href="https://divar.ir/v/...">▫️</a>  →  [▫️](https://divar.ir/v/...)
  s = s.replace(
    /<a\b[^>]*href\s*=\s*["']([^"']*divar\.ir\/v\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, inner: string) =>
      `\n[${inner.trim() || "▫️"}](${String(href).replace(/&amp;/gi, "&")})\n`,
  );

  s = s.replace(
    /<br\s*\/?>|<\/(?:p|div|li|h[1-6]|tr|td|th|section|article|blockquote|pre|ul|ol)>/gi,
    "\n",
  );
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  s = s
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");
  return s;
}

interface RawChunk {
  url: string;
  text: string;
}

/**
 * متن را به بلوک‌های آگهی می‌شکند؛ هر بلوک از لینک دیوار شروع می‌شود.
 * هم فرمت مارک‌داون [متن](لینک) و هم لینک خام پشتیبانی می‌شود.
 */
export function splitAdChunks(text: string): RawChunk[] {
  const pattern =
    /\[[^\]\n]*\]\(\s*(https?:\/\/divar\.ir\/v\/[^)\s]+)\)|https?:\/\/divar\.ir\/v\/[^\s<>"')\]]+/g;
  const re = new RegExp(pattern.source, "g");
  const matches: { start: number; url: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const url = (m[1] ?? m[0]).replace(/[.,،؛]+$/, "");
    matches.push({ start: m.index, url });
  }

  const chunks: RawChunk[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].start;
    const end = i + 1 < matches.length ? matches[i + 1].start : text.length;
    chunks.push({ url: matches[i].url, text: text.slice(start, end) });
  }
  return chunks;
}

const PROPERTY_KEYWORDS: [PropertyType, RegExp][] = [
  ["ویلا", /ویلا|باغ/],
  ["مغازه", /مغازه|تجاری|پاساژ|واحد\s*تجاری|بقالی|سوپرمارکت|رستوران|کافه/],
  ["صنعتی", /صنعتی|کارگاه|سوله|انبار|کارخانه|مرغداری|گاوداری|تولیدی|صنف/],
  ["اداری", /اداری|دفتر|دفاتر/],
  ["مسکونی", /مسکونی|آپارتمان|خانه|مسکن|مجتمع|خوابه/],
  ["زمین", /زمین|کلنگی|زراعی|مزروعی/],
];

export function classifyDeal(token?: string): DealType {
  if (!token) return "سایر";
  const t = token.replace(/\s+/g, " ");
  if (/پیش/.test(t) && /فروش/.test(t)) return "پیش فروش";
  if (/فروش/.test(t)) return "فروش";
  if (/رهن|اجاره/.test(t)) return "رهن و اجاره";
  return "سایر";
}

export function classifyProperty(token?: string): PropertyType {
  if (!token) return "سایر";
  for (const [type, re] of PROPERTY_KEYWORDS) {
    if (re.test(token)) return type;
  }
  return "سایر";
}

/**
 * قیمت را از متن خط 💲 به میلیون تومان تبدیل می‌کند.
 * مثال‌ها: «۲۵ میلیارد تومان» → 25000 | «۴,۵۰۰,۰۰۰,۰۰۰ تومان» → 4500
 * «رهن ۲۰۰ میلیون + اجاره ۸ میلیون» → 208
 */
export function parsePriceMillion(input: string): {
  value: number;
  raw: string;
} {
  const raw = input.trim();
  if (!raw || /مجانی|توافقی|قابل\s*توافق/.test(raw)) {
    return { value: 0, raw };
  }
  const normalized = toEnglishDigits(raw)
    .replace(/٬/g, ",")
    .replace(/٫/g, ".");

  const re = /(\d+(?:[.,]\d+)*)\s*(میلیارد|میلیون|هزار|تومان|تومن)?/g;
  let total = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const numStr = m[1];
    const unit = m[2];
    let value: number;
    let million: number;

    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(numStr)) {
      // جداکننده هزارگان بدون واحد → تومان
      value = parseFloat(numStr.replace(/,/g, ""));
      million = value / 1e6;
    } else {
      value = parseFloat(numStr.replace(/,/g, ""));
      if (unit === "میلیارد") million = value * 1000;
      else if (unit === "میلیون") million = value;
      else if (unit === "هزار") million = value / 1000;
      else if (unit === "تومان" || unit === "تومن")
        million = value >= 10_000 ? value / 1e6 : value;
      else if (value >= 1e6) million = value / 1e6;
      else if (value < 100) million = value * 1000; // مثلاً «۲٫۵» یعنی میلیارد
      else million = value;
    }
    if (Number.isFinite(million)) total += million;
  }
  return { value: Math.round(total * 100) / 100, raw };
}

function buildMapsUrl(city: string, description: string): string {
  const addr = description.match(
    /(?:خیابان|بلوار|بزرگراه|کوچه|کوی|شهرک|محله|پهنه|تقاطع|باغ|مجتمع)[^\n،,]{2,50}/,
  );
  const query = [city, addr?.[0].trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function makeTitle(description: string, fallback: string): string {
  const line =
    description
      .split("\n")
      .map((l) => l.replace(/^[#*>•\-\s]+/, "").trim())
      .find((l) => l.length > 0) ?? "";
  if (!line) return fallback;
  if (line.length <= 90) return line;
  const cut = line.slice(0, 90);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : 90)}…`;
}

const WAVE = "(?:〰\uFE0F?)";

function parseChunk(chunk: RawChunk): Listing | null {
  const body = chunk.text;

  // تلفن: اول لینک tel، بعد هر شماره ۱۱ رقمی. بدون تلفن → استخراج نمی‌شود.
  const telMatch = body.match(/\[?(09\d{9})\]?\(\s*tel:[^)]*\)/);
  const phone = telMatch?.[1] ?? body.match(/\b09\d{9}\b/)?.[0];
  if (!phone) return null;

  // توضیحات بین دو خط موج‌دار
  const descRe = new RegExp(`${WAVE}{2,}\\s*([\\s\\S]*?)\\s*${WAVE}{2,}`);
  const descMatch = body.match(descRe);
  const description = (descMatch?.[1] ?? "").trim();

  const head = body.slice(0, descMatch?.index ?? 500);

  // تگ‌های [#مقدار]()
  const tokens = Array.from(head.matchAll(/\[#([^\]]+)\]\(\)/g), (m) =>
    m[1].trim(),
  );

  let radarTok: string | null = null;
  let roomsTok: string | null = null;
  let dealTok: string | null = null;
  let city = "";
  let propTok: string | null = null;

  for (const t of tokens) {
    if (!radarTok && /رادار/.test(t)) radarTok = t;
    else if (!roomsTok && /خواب|استودیو/.test(t)) roomsTok = t;
    else if (!dealTok && /فروش|رهن|اجاره|معاوضه|مشارکت/.test(t)) dealTok = t;
    else if (!city) city = t;
    else if (!propTok) propTok = t;
  }

  const radarCode = radarTok
    ? toEnglishDigits(radarTok).match(/\d+/)?.[0] ?? ""
    : "";

  let rooms: number | null = null;
  if (roomsTok) {
    const digits = toEnglishDigits(roomsTok).match(/\d+/);
    if (digits) rooms = parseInt(digits[0], 10);
    else if (/بدون|استودیو/.test(roomsTok)) rooms = 0;
  }

  // متراژ: اولین عدد قبل از «متر» در سرآیند
  const areaMatch = toEnglishDigits(head).match(/(\d{1,4}(?:\.\d{1,2})?)\s*متر/);
  const area = areaMatch ? parseFloat(areaMatch[1]) : null;

  // قیمت
  const priceLine =
    body.match(/💲\s*([^\n]*)/)?.[1] ??
    body.match(/قیمت\s*[:：]\s*([^\n]*)/)?.[1] ??
    "";
  const { value: priceMillion, raw: priceRaw } = parsePriceMillion(priceLine);

  // تاریخ ثبت
  const dateMatch = body.match(
    /📆\s*تاریخ\s*ثبت\s*[:：]?\s*([\d۰-۹]{4}\s*[/-]\s*[\d۰-۹]{1,2}\s*[/-]\s*[\d۰-۹]{1,2})/,
  );
  const fallbackDate = body.match(/تاریخ[^\d\n]{0,12}([\d۰-۹]{4}[/-][\d۰-۹]{1,2}[/-][\d۰-۹]{1,2})/);
  const rawDate = dateMatch?.[1] ?? fallbackDate?.[1] ?? "";
  let date = "";
  let dateRaw = "";
  if (rawDate) {
    const parts = toEnglishDigits(rawDate)
      .split(/[/-]/)
      .map((p) => p.trim());
    if (parts.length === 3) {
      const [y, mo, d] = parts;
      date = `${y.padStart(4, "0")}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
      dateRaw = `${Number(y)}/${Number(mo)}/${Number(d)}`;
    }
  }

  const cityLabel = city.replace(/_/g, " ").trim() || "نامشخص";
  const propertyType = classifyProperty(propTok ?? undefined);
  const fallbackTitle = `${cityLabel}، ${propertyType}${area ? ` ${area} متر` : ""}`;

  // آدرس از بخش توضیحات (خط ادرس:) یا extra
  const addrFromDesc = body.match(/(?:ا.?درس|آ.?درس|نشانی)\s*[:：]\s*([^\n]+)/)?.[1]?.trim() ?? "";
  const address = addrFromDesc || "";

  return {
    id: radarCode || chunk.url,
    radarCode,
    city: cityLabel,
    area,
    rooms,
    priceMillion,
    priceRaw,
    dealType: classifyDeal(dealTok ?? undefined),
    propertyType,
    cityLabel,
    title: makeTitle(description, fallbackTitle),
    description,
    phone,
    divarUrl: chunk.url,
    mapsUrl: buildMapsUrl(cityLabel, description),
    date,
    dateRaw,
    ...emptyExtras(),
    address,
  };
}

/**
 * فایل HTML خام را پردازش می‌کند. برای فایل‌های بزرگ، پردازش به صورت
 * دسته‌ای انجام می‌شود تا رابط کاربری قفل نشود.
 */
export async function parseHtmlFile(
  html: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ParseResult> {
  const text = htmlToText(html);
  const chunks = splitAdChunks(text);

  const listings: Listing[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  const BATCH = 120;

  for (let i = 0; i < chunks.length; i++) {
    const listing = parseChunk(chunks[i]);
    if (listing) {
      const key = listing.divarUrl || listing.radarCode;
      if (!seen.has(key)) {
        seen.add(key);
        listings.push(listing);
      }
    } else {
      skipped++;
    }
    if (onProgress && (i + 1) % BATCH === 0) {
      onProgress(i + 1, chunks.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  onProgress?.(chunks.length, chunks.length);

  return { listings, skipped, total: chunks.length };
}
