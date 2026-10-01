/** قالب‌بندی اعداد و مقادیر برای نمایش فارسی. */

const faFormatter = new Intl.NumberFormat("fa-IR");
const faDecimal = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 2,
});

export function faNum(value: number): string {
  return faFormatter.format(value);
}

/** ارقام داخل یک رشته را به فارسی تبدیل می‌کند (حفظ صفرهای پیشرو). */
export function faDigits(value: string): string {
  return value.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function faDecimalNum(value: number): string {
  return faDecimal.format(value);
}

/** «۲۵٬۰۰۰ میلیون تومان» یا «۲۵ میلیارد تومان» بسته به بزرگی عدد. */
export function formatPrice(priceMillion: number): string {
  if (!priceMillion) return "قیمت درج نشده";
  if (priceMillion >= 1000) {
    const milliard = priceMillion / 1000;
    return `${faDecimalNum(milliard)} میلیارد تومان`;
  }
  return `${faDecimalNum(priceMillion)} میلیون تومان`;
}

export function formatArea(area: number | null): string {
  if (area === null || Number.isNaN(area)) return "—";
  return `${faDecimalNum(area)} متر`;
}

export function formatRooms(rooms: number | null): string {
  if (rooms === null) return "—";
  if (rooms === 0) return "بدون خواب";
  return `${faNum(rooms)} خواب`;
}
