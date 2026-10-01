import type { Listing } from "./parser";

export type SortKey =
  | "date-desc"
  | "date-asc"
  | "price-desc"
  | "price-asc"
  | "area-desc"
  | "area-asc";

export interface Filters {
  query: string;
  city: string;
  deal: string;
  property: string;
  rooms: string;
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  query: "",
  city: "همه",
  deal: "همه",
  property: "همه",
  rooms: "همه",
  priceMin: "",
  priceMax: "",
  areaMin: "",
  areaMax: "",
  sort: "date-desc",
};

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "جدیدترین تاریخ" },
  { value: "date-asc", label: "قدیمی‌ترین تاریخ" },
  { value: "price-desc", label: "گران‌ترین قیمت" },
  { value: "price-asc", label: "ارزان‌ترین قیمت" },
  { value: "area-desc", label: "بزرگ‌ترین متراژ" },
  { value: "area-asc", label: "کوچک‌ترین متراژ" },
];

export const ROOMS_OPTIONS: { value: string; label: string }[] = [
  { value: "همه", label: "همه تعداد اتاق‌ها" },
  { value: "0", label: "بدون خواب" },
  { value: "1", label: "۱ خواب" },
  { value: "2", label: "۲ خواب" },
  { value: "3", label: "۳ خواب" },
  { value: "4+", label: "۴ خواب و بیشتر" },
];

function num(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function matchesRooms(listing: Listing, rooms: string): boolean {
  if (rooms === "همه") return true;
  if (listing.rooms === null) return false;
  if (rooms === "4+") return listing.rooms >= 4;
  return listing.rooms === Number(rooms);
}

/** اعمال جستجو، فیلترها و مرتب‌سازی روی لیست آگهی‌ها. */
export function applyFilters(listings: Listing[], f: Filters): Listing[] {
  const q = f.query.trim().toLowerCase();
  const pMin = num(f.priceMin);
  const pMax = num(f.priceMax);
  const aMin = num(f.areaMin);
  const aMax = num(f.areaMax);

  const filtered = listings.filter((l) => {
    if (f.city !== "همه" && l.city !== f.city) return false;
    if (f.deal !== "همه" && l.dealType !== f.deal) return false;
    if (f.property !== "همه" && l.propertyType !== f.property) return false;
    if (!matchesRooms(l, f.rooms)) return false;
    if (pMin !== null && l.priceMillion < pMin) return false;
    if (pMax !== null && l.priceMillion > pMax) return false;
    if (aMin !== null && (l.area === null || l.area < aMin)) return false;
    if (aMax !== null && (l.area === null || l.area > aMax)) return false;
    if (q) {
      const haystack = `${l.city} ${l.title} ${l.description} ${l.radarCode} ${l.phone} ${l.dealType} ${l.propertyType}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const dir = f.sort.endsWith("asc") ? 1 : -1;
  const key = f.sort.split("-")[0];

  filtered.sort((a, b) => {
    if (key === "price") return (a.priceMillion - b.priceMillion) * dir;
    if (key === "area")
      return ((a.area ?? -1) - (b.area ?? -1)) * dir;
    // تاریخ: خالی‌ها همیشه انتها
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date) * dir;
  });

  return filtered;
}

/** آیا فیلتری غیر از پیش‌فرض فعال است؟ */
export function hasActiveFilters(f: Filters): boolean {
  return (
    f.query.trim() !== "" ||
    f.city !== "همه" ||
    f.deal !== "همه" ||
    f.property !== "همه" ||
    f.rooms !== "همه" ||
    f.priceMin !== "" ||
    f.priceMax !== "" ||
    f.areaMin !== "" ||
    f.areaMax !== ""
  );
}
