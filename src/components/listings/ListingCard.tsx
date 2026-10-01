import { Button } from "@/components/ui/button";
import EditPanel, { type Folder } from "@/components/listings/EditPanel";
import { faDigits, formatArea, formatPrice, formatRooms } from "@/lib/format";
import type { DealType, Listing } from "@/lib/parser";
import { cn } from "@/lib/utils";import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  EyeOff,
  MapPin,
  Phone,
  Ruler,
  Send,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DEAL_STYLES: Record<DealType, string> = {
  فروش: "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  "رهن و اجاره": "border-sky-500/35 bg-sky-500/12 text-sky-700 dark:text-sky-400",
  "پیش فروش": "border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-400",
  سایر: "border-border bg-muted text-muted-foreground",
};

interface ListingCardProps {
  listing: Listing;
  /** نقش کاربر: آیا شمارهٔ آگهی قابل نمایش است؟ */
  canSeePhone: boolean;
  /** شمارهٔ دفتر برای نمایش به کاربران غیرمجاز */
  managerPhone?: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  onShare?: () => void;
  // ویرایش و بایگانی (فقط برای نقش‌های مجاز)
  folders?: Folder[];
  onSaveNotes?: (notes: string) => Promise<void>;
  onToggleFolder?: (folderId: string) => Promise<void>;
  onSaveLocation?: (patch: { address: string; divarUrl: string; mapsUrl: string }) => Promise<void>;
}

/** کارت نمایش یک آگهی با اکشن‌های کپی تلفن، تماس، دیوار، نقشه و ارسال. */
export default function ListingCard({
  listing: l, canSeePhone, managerPhone, selected, onToggleSelect,
  onShare, folders = [], onSaveNotes, onToggleFolder, onSaveLocation,
}: ListingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const rest = l.description.startsWith(l.title)
    ? l.description.slice(l.title.length).trim()
    : l.description;
  const longEnough = rest.length > 110;
  const contact = canSeePhone ? l.phone : (managerPhone ?? "");
  const isRestricted = !canSeePhone;

  const copyPhone = async () => {
    if (!contact) return;
    try {
      await navigator.clipboard.writeText(contact);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success("شماره تماس کپی شد", { description: contact });
    } catch {
      toast.error("کپی شماره ممکن نشد");
    }
  };

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        selected ? "border-primary ring-2 ring-primary/25" : "border-border/70 hover:border-primary/45",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-primary via-gold to-transparent opacity-70" />

      {/* انتخاب + برچسب‌ها */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {onToggleSelect && (
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
              <input type="checkbox" checked={!!selected} onChange={onToggleSelect}
                className="size-3.5 accent-[var(--primary)]" />
              انتخاب
            </label>
          )}
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
            DEAL_STYLES[l.dealType] ?? DEAL_STYLES["سایر"])}>{l.dealType}</span>
          <span className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
            {l.propertyType}</span>
        </div>
        {l.radarCode && (
          <span dir="auto" className="shrink-0 rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
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
          {l.depositMillion !== null && <span>رهن: {formatPrice(l.depositMillion)}</span>}
          {l.rentMillion !== null && <span>اجاره: {formatPrice(l.rentMillion)}</span>}
        </p>
      )}
      {l.pricePerMeter !== null && l.pricePerMeter > 0 && (
        <p className="-mt-1 text-xs text-muted-foreground">هر متر: {formatPrice(l.pricePerMeter)}</p>
      )}

      {/* مشخصات */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><Ruler className="size-4 text-primary/80" />{formatArea(l.area)}</span>
        <span className="flex items-center gap-1.5"><BedDouble className="size-4 text-primary/80" />{formatRooms(l.rooms)}</span>
        {l.dateRaw && (
          <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-primary/80" />{l.dateRaw}</span>
        )}
        {l.poster && (
          <span className="flex items-center gap-1.5"><UserRound className="size-4 text-primary/80" />{l.poster}</span>
        )}
      </div>

      {/* عنوان و توضیحات */}
      <div className="space-y-1 border-t border-border/60 pt-3">
        <p className="text-sm font-bold leading-6">{l.title}</p>
        {rest && (
          <>
            <p className={cn("whitespace-pre-line text-[13px] leading-6 text-muted-foreground",
              !expanded && "line-clamp-3")}>{rest}</p>
            {longEnough && (
              <button type="button" onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80">
                {expanded ? (<><ChevronUp className="size-3.5" /> بستن</>) : (<><ChevronDown className="size-3.5" /> نمایش کامل</>)}
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

      {/* ویرایش و بایگانی */}
      {onSaveNotes && onToggleFolder && onSaveLocation && (
        <EditPanel notes={l.notes ?? ""} onSaveNotes={onSaveNotes}
          folderIds={l.folderIds ?? []} folders={folders} onToggleFolder={onToggleFolder}
          currentAddress={l.address ?? ""} currentDivarUrl={l.divarUrl ?? ""}
          currentMapsUrl={l.mapsUrl ?? ""} onSaveLocation={onSaveLocation}
          canEdit={canSeePhone} />
      )}

      {/* اکشن‌ها */}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button type="button" variant="outline" size="sm"
          className="min-w-0 flex-1 gap-1.5 font-mono text-xs"
          onClick={copyPhone} title={isRestricted ? "شماره تماس دفتر" : "کپی شماره"}>
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          <span dir="ltr">{contact || "—"}</span>
        </Button>
        {isRestricted && <EyeOff className="size-4 shrink-0 text-muted-foreground" />}
        {onShare && (
          <Button type="button" variant="outline" size="icon" className="size-9"
            title="ارسال آگهی" onClick={onShare}>
            <Send className="size-4" />
          </Button>
        )}
        {contact && (
          <a href={`tel:${contact}`} title="تماس"
            className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background transition-colors hover:border-primary/50 hover:text-primary">
            <Phone className="size-4" />
          </a>
        )}
        {l.divarUrl && (
          <a href={l.divarUrl} target="_blank" rel="noopener noreferrer" title="مشاهده در دیوار"
            className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background transition-colors hover:border-primary/50 hover:text-primary">
            <ExternalLink className="size-4" />
          </a>
        )}
        {l.mapsUrl && (
          <a href={l.mapsUrl} target="_blank" rel="noopener noreferrer" title="موقعیت در نقشه"
            className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background transition-colors hover:border-primary/50 hover:text-primary">
            <MapPin className="size-4" />
          </a>
        )}
      </div>
    </article>
  );
}
