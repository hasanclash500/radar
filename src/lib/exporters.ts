import type { Listing } from "./parser";

/** سرفصل‌های فارسی خروجی CSV و اکسل. */
export const CSV_HEADERS = [
  "کد رادار",
  "شهر",
  "متراژ (متر)",
  "تعداد اتاق",
  "قیمت (میلیون تومان)",
  "نوع معامله",
  "نوع ملک",
  "عنوان",
  "توضیحات",
  "شماره تلفن",
  "لینک دیوار",
  "لینک گوگل مپ",
  "تاریخ ثبت",
] as const;

function toCells(l: Listing): (string | number)[] {
  return [
    l.radarCode,
    l.city,
    l.area ?? "",
    l.rooms ?? "",
    l.priceMillion || "",
    l.dealType,
    l.propertyType,
    l.title,
    l.description.replace(/\n+/g, " ").trim(),
    l.phone,
    l.divarUrl,
    l.mapsUrl,
    l.dateRaw || l.date,
  ];
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(value: string | number): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

/** خروجی CSV با BOM (نمایش درست حروف فارسی در اکسل). */
export function exportCsv(listings: Listing[]): void {
  const lines = [
    CSV_HEADERS.map(csvEscape).join(","),
    ...listings.map((l) => toCells(l).map(csvEscape).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  download(blob, `melak-radar-${stamp()}.csv`);
}

/** خروجی JSON با کلیدهای استاندارد لاتین. */
export function exportJson(listings: Listing[]): void {
  const data = listings.map((l) => ({
    radar_code: l.radarCode,
    city: l.city,
    area_m2: l.area,
    rooms: l.rooms,
    price_million_toman: l.priceMillion,
    price_raw: l.priceRaw,
    deal_type: l.dealType,
    property_type: l.propertyType,
    title: l.title,
    description: l.description,
    phone: l.phone,
    divar_url: l.divarUrl,
    maps_url: l.mapsUrl,
    date: l.date,
    date_raw: l.dateRaw,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  download(blob, `melak-radar-${stamp()}.json`);
}

/** خروجی اکسل (xlsx) با سرفصل‌های فارسی و عرض ستون‌های مناسب. */
export async function exportExcel(listings: Listing[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = listings.map(toCells);
  const sheet = XLSX.utils.aoa_to_sheet([[...CSV_HEADERS], ...rows]);
  sheet["!cols"] = [
    { wch: 14 }, // کد رادار
    { wch: 14 }, // شهر
    { wch: 10 }, // متراژ
    { wch: 9 }, // اتاق
    { wch: 18 }, // قیمت
    { wch: 13 }, // نوع معامله
    { wch: 11 }, // نوع ملک
    { wch: 40 }, // عنوان
    { wch: 60 }, // توضیحات
    { wch: 14 }, // تلفن
    { wch: 40 }, // دیوار
    { wch: 45 }, // مپ
    { wch: 12 }, // تاریخ
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "آگهی‌ها");
  XLSX.writeFile(book, `melak-radar-${stamp()}.xlsx`);
}
