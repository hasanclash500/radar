import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  SHARE_CHANNELS,
  buildBulkText,
  buildShareText,
  shareToChannel,
  type ShareChannel,
  type ShareSettings,
  type ShareableListing,
} from "@/lib/share";
import { faNum } from "@/lib/format";
import { Copy, MessageCircle, Phone, Send, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: ShareableListing[];
  settings: ShareSettings;
  onSettingsChange: (patch: Partial<ShareSettings>) => void;
  onShared?: () => void;
}

const CHANNEL_ICONS: Record<ShareChannel, typeof Send> = {
  telegram: Send,
  whatsapp: MessageCircle,
  bale: MessageCircle,
  clipboard: Copy,
  native: Share2,
  sms: Phone,
};

/** دیالوگ آماده‌سازی و ارسال متن آگهی به شبکه‌های اجتماعی و پیام‌رسان‌ها. */
export default function ShareDialog({
  open,
  onOpenChange,
  listings,
  settings,
  onSettingsChange,
  onShared,
}: ShareDialogProps) {
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState<ShareChannel | null>(null);

  const limit = listings.length;
  const effective = Math.max(1, Math.min(count, limit));
  const chosen = useMemo(
    () => listings.slice(0, effective),
    [listings, effective],
  );

  const text = useMemo(() => {
    if (chosen.length === 0) return "";
    if (chosen.length === 1)
      return buildShareText(chosen[0], settings);
    return buildBulkText(chosen, settings);
  }, [chosen, settings]);

  const handleShare = async (channel: ShareChannel) => {
    if (!text) return;
    setBusy(channel);
    try {
      const res = await shareToChannel(
        channel,
        text,
        chosen[0]?.contactPhone,
      );
      if (!res.ok) {
        toast("اشتراک‌گذاری لغو شد");
        return;
      }
      toast.success(
        channel === "clipboard"
          ? "متن آگهی کپی شد"
          : `آگهی برای «${SHARE_CHANNELS.find((c) => c.id === channel)?.label}» آماده شد`,
        {
          description:
            res.fallback === "clipboard"
              ? "متن کپی شد؛ آن را داخل برنامه بچسبانید."
              : undefined,
        },
      );
      onShared?.();
    } catch {
      toast.error("ارسال انجام نشد");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-4 text-primary" />
            ارسال آگهی
          </DialogTitle>
          <DialogDescription>
            متن آگهی به‌صورت خودکار و مرتب آماده می‌شود. تعداد و متن پایانی
            قابل تغییر است.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 overflow-hidden sm:grid-cols-[1fr_260px]">
          {/* پیش‌نمایش متن */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              پیش‌نمایش متن ({faNum(chosen.length)} آگهی)
            </Label>
            <ScrollArea className="h-56 rounded-xl border bg-muted/40">
              <pre
                dir="auto"
                className="whitespace-pre-wrap px-3 py-3 text-[13px] leading-7"
              >
                {text || "آگهی‌ای برای ارسال انتخاب نشده است."}
              </pre>
            </ScrollArea>
          </div>

          {/* تنظیمات ارسال */}
          <div className="space-y-3 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                تعداد آگهی ارسالی
              </Label>
              <Input
                type="number"
                min={1}
                max={limit}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 1)}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[1, 3, 5, 10, 20].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant={effective === n ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() => setCount(n)}
                    disabled={n > limit}
                  >
                    {faNum(n)}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setCount(limit)}
                  disabled={limit <= 1}
                >
                  همه
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground" htmlFor="sd-name">
                نام دفتر
              </Label>
              <Input
                id="sd-name"
                value={settings.officeName}
                onChange={(e) =>
                  onSettingsChange({ officeName: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label
                className="text-xs text-muted-foreground"
                htmlFor="sd-phone"
              >
                شمارهٔ تماس در متن
              </Label>
              <Input
                id="sd-phone"
                dir="ltr"
                placeholder="09120858095"
                value={settings.managerPhone}
                onChange={(e) =>
                  onSettingsChange({ managerPhone: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground" htmlFor="sd-foot">
                متن پایانی
              </Label>
              <Input
                id="sd-foot"
                placeholder="توضیحات اضافه…"
                value={settings.shareFooter}
                onChange={(e) =>
                  onSettingsChange({ shareFooter: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="text-xs text-muted-foreground">
            متن پایانی و شماره در همهٔ پیام‌ها اعمال می‌شود.
          </p>
          <div className="flex flex-wrap gap-2">
            {SHARE_CHANNELS.map((c) => {
              const Icon = CHANNEL_ICONS[c.id];
              return (
                <Button
                  key={c.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={busy !== null || chosen.length === 0}
                  onClick={() => void handleShare(c.id)}
                >
                  <Icon className="size-4" />
                  {c.label}
                </Button>
              );
            })}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
