import { Button } from "@/components/ui/button";
import { faDigits, formatArea, formatPrice, formatRooms } from "@/lib/format";
import type { DealType, Listing } from "@/lib/parser";
import { cn } from "@/lib/utils";
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  Ruler,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DEAL_STYLES: Record<DealType, string> = {
  فروش: "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  "رهن و اجاره":
    "border-sky-500/35 bg-sky-500/12 text-sky-700 dark:text-sky-400",
  "پیش فروش":
    "border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-400",
  سایر: "border-border bg-muted text-muted-foreground",
};

interface ListingCardProps {
  listing: Listing;
}

/** کارت نمایش یک آگهی با اکشن‌های کپی تلفن، تماس، دیوار و نقشه. */
export default function ListingCard({ listing: l }: ListingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const rest = l.description.startsWith(l.title)
    ? l.description.slice(l.title.length).trim()
    : l.description;
  const longEnough = rest.length > 110;

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(l.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success("شماره تلفن کپی شد", { description: l.phone });
    } catch {
      toast.error("کپی شماره تلفن ممکن نشد");
    }
  };

  return (
    <article className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-primary via-gold to-transparent opacity-70 transition-opacity group-hover:opacity-100" />

      {/* ردیف برچسب‌ها */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
              DEAL_STYLES[l.dealType] ?? DEAL_STYLES["سایر"],
            )}
          >
            {l.dealType}
          </span>
          <span className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
            {l.propertyType}
          </span>
        </div>
        {l.radarCode && (
          <span
            dir="auto"
            className="shrink-0 rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-bold text-muted-foreground"
          >
            رادار {faDigits(l.radarCode)}
          </span>
        )}
      </div>

      {/* شهر و قیمت */}
      <div className="flex items-center gap-1.5">
        <MapPin className="size-4 shrink-0 text-primary" />
        <h3 className="truncate text-lg font-extrabold leading-tight">
          {l.neighborhood ? `${l.city}، ${l.neighborhood}` : l.city}
        </h3>
      </div>
      <p className="text-gradient-brand text-2xl font-extrabold tracking-tight">
        {formatPrice(l.priceMillion)}
      </p>
      {(l.depositMillion !== null || l.rentMillion !== null) && (
        <p className="-mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {l.depositMillion !== null && (
            <span>رهن: {formatPrice(l.depositMillion)}</span>
          )}
          {l.rentMillion !== null && <span>اجاره: {formatPrice(l.rentMillion)}</span>}
        </p>
      )}
      {l.priceRaw && !l.depositMillion && !l.rentMillion && l.dealType !== "فروش" && (
        <p className="-mt-2 text-xs text-muted-foreground" dir="auto">
          {l.priceRaw}
        </p>
      )}
      {l.pricePerMeter !== null && l.pricePerMeter > 0 && (
        <p className="-mt-1 text-xs text-muted-foreground">
          هر متر: {formatPrice(l.pricePerMeter)}
        </p>
      )}

      {/* مشخصات */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Ruler className="size-4 text-primary/80" />
          {formatArea(l.area)}
        </span>
        <span className="flex items-center gap-1.5">
          <BedDouble className="size-4 text-primary/80" />
          {formatRooms(l.rooms)}
        </span>
        {l.dateRaw && (
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-primary/80" />
            {l.dateRaw}
          </span>
        )}
        {l.poster && (
          <span className="flex items-center gap-1.5">
            <UserRound className="size-4 text-primary/80" />
            {l.poster}
          </span>
        )}
      </div>

      {/* عنوان و توضیحات */}
      <div className="space-y-1 border-t border-border/60 pt-3">
        <p className="text-sm font-bold leading-6">{l.title}</p>
        {rest && (
          <>
            <p
              className={cn(
                "whitespace-pre-line text-[13px] leading-6 text-muted-foreground",
                !expanded && "line-clamp-3",
              )}
            >
              {rest}
            </p>
            {longEnough && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-3.5" /> بستن
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" /> نمایش کامل
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {l.address && (
        <p className="flex items-start gap-1.5 border-t border-border/60 pt-3 text-[13px] leading-6 text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
          <span dir="auto">{l.address}</span>
        </p>
      )}

      {/* اکشن‌ها */}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-w-0 flex-1 gap-1.5 font-mono text-xs"
          onClick={copyPhone}
          title="کپی شماره تلفن"
        >
          {copied ? (
            <Check className="size-4 text-emerald-600" />
          ) : (
            <Copy className="size-4" />
          )}
          <span dir="ltr">{l.phone}</span>
        </Button>
        <a
          href={`tel:${l.phone}`}
          title="تماس"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Phone className="size-4" />
        </a>
        <a
          href={l.divarUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="مشاهده در دیوار"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background transition-colors hover:border-primary/50 hover:text-primary"
        >
          <ExternalLink className="size-4" />
        </a>
        <a
          href={l.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="موقعیت در نقشه گوگل"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background transition-colors hover:border-primary/50 hover:text-primary"
        >
          <MapPin className="size-4" />
        </a>
      </div>
    </article>
  );
}
