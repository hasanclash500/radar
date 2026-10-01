/**
 * ساخت متن دیزاین‌شدهٔ آگهی برای انتشار در شبکه‌های اجتماعی و پیام‌رسان‌ها.
 *
 * متن پایانی و شمارهٔ تماس قابل تغییر است؛ امضای پیش‌فرض دفتر ثابت می‌ماند
 * مگر مدیر آن را در تنظیمات عوض کند.
 */

export interface ShareSettings {
  officeName: string;
  managerPhone: string;
  shareFooter: string;
}

export const DEFAULT_SHARE_SETTINGS: ShareSettings = {
  officeName: "دپارتمان املاک",
  managerPhone: "",
  shareFooter: "",
};

/** فیلدهای قابل ویرایش در هر آگهی هنگام ساخت متن. */
export interface ShareableListing {
  key: string;
  title: string;
  city: string;
  neighborhood: string;
  area: number | null;
  rooms: number | null;
  priceMillion: number;
  depositMillion: number | null;
  rentMillion: number | null;
  dealType: string;
  propertyType: string;
  description: string;
  address: string;
  divarUrl: string;
  mapsUrl: string;
  /** شماره‌ای که باید در متن قرار گیرد (شمارهٔ آگهی یا شمارهٔ مدیر). */
  contactPhone: string;
}

const fa = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
const faDigits = (s: string) =>
  s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

function priceText(l: ShareableListing): string {
  if (l.dealType === "رهن و اجاره") {
    const parts: string[] = [];
    if (l.depositMillion) parts.push(`ودیعه ${fa(l.depositMillion)} میلیون`);
    if (l.rentMillion) parts.push(`اجاره ${fa(l.rentMillion)} میلیون`);
    if (parts.length) return parts.join(" • ");
  }
  if (!l.priceMillion) return "توافقی";
  if (l.priceMillion >= 1000)
    return `${fa(Math.round((l.priceMillion / 1000) * 10) / 10)} میلیارد تومان`;
  return `${fa(l.priceMillion)} میلیون تومان`;
}

const TYPE_EMOJI: Record<string, string> = {
  مسکونی: "🏢",
  ویلا: "🏡",
  مغازه: "🏪",
  زمین: "🌾",
  صنعتی: "🏭",
  اداری: "💼",
  سایر: "🏠",
};

const DEAL_EMOJI: Record<string, string> = {
  فروش: "💰",
  "رهن و اجاره": "🔑",
  "پیش فروش": "🗓️",
  سایر: "📌",
};

/** متن دیزاین‌شده و مرتب یک آگهی. */
export function buildShareText(
  l: ShareableListing,
  s: ShareSettings,
): string {
  const typeEmoji = TYPE_EMOJI[l.propertyType] ?? "🏠";
  const dealEmoji = DEAL_EMOJI[l.dealType] ?? "📌";
  const where = l.neighborhood
    ? `${l.city}، ${l.neighborhood}`
    : l.city;

  const lines: string[] = [];

  lines.push(`${typeEmoji} ${l.title || `${l.propertyType} در ${where}`}`);
  lines.push("");
  lines.push(`${dealEmoji} ${l.dealType}`);
  lines.push(`📍 موقعیت: ${where}`);
  if (l.area !== null) lines.push(`📐 متراژ: ${fa(l.area)} متر`);
  if (l.rooms !== null)
    lines.push(`🛏️ ${l.rooms === 0 ? "بدون خواب" : `${fa(l.rooms)} خواب`}`);
  lines.push(`💵 ${priceText(l)}`);

  if (l.address) {
    lines.push("");
    lines.push(`🗺 آدرس: ${l.address}`);
  }

  const desc = l.description?.trim();
  if (desc) {
    lines.push("");
    lines.push(desc.slice(0, 500));
  }

  const links: string[] = [];
  if (l.divarUrl) links.push(l.divarUrl);
  if (l.mapsUrl) links.push(l.mapsUrl);
  if (links.length) {
    lines.push("");
    lines.push("🔗 لینک‌ها:");
    for (const url of links) lines.push(url);
  }

  // امضا و پانویس قابل ویرایش
  const footer = s.shareFooter?.trim();
  const phone = l.contactPhone?.trim() || s.managerPhone?.trim();

  lines.push("");
  lines.push("━━━━━━━━━━━━━━");
  lines.push(`🏛 ${s.officeName}`);
  if (footer) lines.push(footer);
  if (phone) lines.push(`📞 ${faDigits(phone)}`);

  return lines.join("\n");
}

/** متن ترکیبی برای ارسال چند آگهی با هم. */
export function buildBulkText(
  listings: ShareableListing[],
  s: ShareSettings,
): string {
  if (listings.length === 0) return "";
  if (listings.length === 1) return buildShareText(listings[0], s);

  const header = `📢 ${fa(listings.length)} آگهی منتخب از ${s.officeName}`;
  const body = listings
    .map((l, i) => {
      const where = l.neighborhood
        ? `${l.city}، ${l.neighborhood}`
        : l.city;
      const bits = [
        `${fa(i + 1)}. ${l.title || l.propertyType}`,
        `   📍 ${where}`,
        l.area !== null ? `   📐 ${fa(l.area)} متر` : null,
        l.rooms !== null ? `   🛏️ ${l.rooms === 0 ? "بدون خواب" : `${fa(l.rooms)} خواب`}` : null,
        `   💵 ${priceText(l)}`,
      ]
        .filter(Boolean)
        .join("\n");
      const link = l.divarUrl ? `\n   🔗 ${l.divarUrl}\n` : "\n";
      return bits + link;
    })
    .join("\n")
    .concat("\n");

  const phone = s.managerPhone?.trim();
  const footer = s.shareFooter?.trim();

  const tail = [
    "",
    "━━━━━━━━━━━━━━",
    `🏛 ${s.officeName}`,
    footer || "",
    phone ? `📞 ${faDigits(phone)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}\n\n${body}${tail}`;
}

export type ShareChannel =
  | "telegram"
  | "whatsapp"
  | "bale"
  | "clipboard"
  | "native"
  | "sms";

export const SHARE_CHANNELS: {
  id: ShareChannel;
  label: string;
  hint: string;
}[] = [
  { id: "telegram", label: "تلگرام", hint: "ارسال به کانال یا گروه" },
  { id: "whatsapp", label: "واتس‌اپ", hint: "ارسال مستقیم متن" },
  { id: "bale", label: "بله", hint: "باز شدن بله برای ارسال" },
  { id: "clipboard", label: "کپی متن", hint: "رفتن به کلیپ‌بورد" },
  { id: "native", label: "اشتراک‌گذاری بومی", hint: "منوی Share گوشی" },
  { id: "sms", label: "پیامک / تماس", hint: "شمارهٔ تماس آگهی" },
];

/**
 * باز کردن کانال انتخابی. برای کانال‌هایی که عمق لینک ندارند (بله، نوسانیک)
 * فقط متن کپی می‌شود تا کاربر خودش در برنامه بچسباند.
 */
export async function shareToChannel(
  channel: ShareChannel,
  text: string,
  contactPhone?: string,
): Promise<{ ok: boolean; fallback?: "clipboard" }> {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  };

  switch (channel) {
    case "clipboard":
      await copy();
      return { ok: true };

    case "telegram": {
      const url = `https://t.me/share/url?url=${encodeURIComponent(
        "",
      )}&text=${encodeURIComponent(text)}`;
      window.open(url, "_blank", "noopener");
      return { ok: true };
    }

    case "whatsapp": {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank", "noopener");
      return { ok: true };
    }

    case "bale": {
      // بله عمق لینک استاندارد ندارد؛ متن کپی و برنامه باز می‌شود.
      await copy();
      window.open("ble://", "_blank");
      return { ok: true, fallback: "clipboard" };
    }

    case "sms": {
      const body = encodeURIComponent(text);
      const tel = contactPhone?.trim();
      if (tel) {
        window.location.href = `sms:${tel}?body=${body}`;
      } else {
        window.location.href = `sms:?&body=${body}`;
      }
      return { ok: true };
    }

    case "native": {
      if (navigator.share) {
        try {
          await navigator.share({ text });
          return { ok: true };
        } catch {
          // کاربر اشتراک را لغو کرد
          return { ok: false };
        }
      }
      await copy();
      return { ok: true, fallback: "clipboard" };
    }

    default:
      await copy();
      return { ok: true };
  }
}

/** شمارهٔ تماس قابل استفاده برای تماس مستقیم. */
export function callUrl(phone?: string): string | null {
  const p = phone?.replace(/\D/g, "");
  return p && p.length >= 10 ? `tel:${p}` : null;
}
