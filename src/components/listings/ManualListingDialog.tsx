import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEAL_TYPES, PROPERTY_TYPES, toEnglishDigits } from "@/lib/parser";
import type { DealType, PropertyType } from "@/lib/parser";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const EMPTY = {
  city: "",
  neighborhood: "",
  area: "",
  rooms: "",
  priceMillion: "",
  depositMillion: "",
  rentMillion: "",
  dealType: DEAL_TYPES[0],
  propertyType: PROPERTY_TYPES[0],
  title: "",
  description: "",
  address: "",
  divarUrl: "",
  mapsUrl: "",
  phone: "",
};

/** تاریخ امروز به شکل YYYY-MM-DD برای مقدار پیش‌فرض. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ManualListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ذخیره روی سرور؛ فقط مدیر و مشاور می‌توانند. */
  onSave: (values: {
    city: string;
    neighborhood?: string;
    area?: number;
    rooms?: number;
    priceMillion?: number;
    depositMillion?: number;
    rentMillion?: number;
    dealType: string;
    propertyType: string;
    title?: string;
    description?: string;
    address?: string;
    divarUrl?: string;
    mapsUrl?: string;
    date: string;
    dateRaw: string;
    phone: string;
  }) => Promise<void>;
}

/** فرم افزودن دستی یک آگهی، بدون نیاز به فایل ورودی. */
export default function ManualListingDialog({
  open,
  onOpenChange,
  onSave,
}: ManualListingDialogProps) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    const phone = toEnglishDigits(form.phone).replace(/\D/g, "");
    if (!/^09\d{9}$/.test(phone)) {
      toast.error("شمارهٔ تلفن باید ۱۱ رقم و با 09 شروع شود.");
      return;
    }
    if (!form.city.trim()) {
      toast.error("نام شهر را وارد کنید.");
      return;
    }
    const num = (v: string) => {
      const n = Number(toEnglishDigits(v).replace(/[^\d.]/g, ""));
      return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
    };
    const date = today();
    setSaving(true);
    try {
      await onSave({
        city: form.city.trim(),
        neighborhood: form.neighborhood.trim() || undefined,
        area: num(form.area),
        rooms: num(form.rooms),
        priceMillion: num(form.priceMillion),
        depositMillion: num(form.depositMillion),
        rentMillion: num(form.rentMillion),
        dealType: form.dealType,
        propertyType: form.propertyType,
        title: form.title.trim() || undefined,
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        divarUrl: form.divarUrl.trim() || undefined,
        mapsUrl: form.mapsUrl.trim() || undefined,
        date,
        dateRaw: date.replace(/-/g, "/"),
        phone,
      });
      setForm(EMPTY);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "ثبت آگهی ناموفق بود.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Plus className="size-4" />
          <span className="hidden sm:inline">ثبت دستی</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>ثبت دستی آگهی</DialogTitle>
          <DialogDescription>
            آگهی را بدون فایل وارد کنید. شمارهٔ تلفن اجباری است و آگهی بلافاصله
            روی سرور ذخیره می‌شود.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="شهر" required>
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="شهریار"
            />
          </Field>
          <Field label="محله">
            <Input
              value={form.neighborhood}
              onChange={(e) => set("neighborhood", e.target.value)}
              placeholder="شهرک عتیق‌آباد"
            />
          </Field>

          <Field label="متراژ (متر)">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
            />
          </Field>
          <Field label="تعداد اتاق">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.rooms}
              onChange={(e) => set("rooms", e.target.value)}
            />
          </Field>

          <Field label="نوع معامله">
            <Select
              value={form.dealType}
              onValueChange={(v) => set("dealType", v as DealType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_TYPES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="نوع ملک">
            <Select
              value={form.propertyType}
              onValueChange={(v) => set("propertyType", v as PropertyType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="قیمت کل (میلیون تومان)">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.priceMillion}
              onChange={(e) => set("priceMillion", e.target.value)}
            />
          </Field>
          <Field label="ودیعه (میلیون تومان)">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.depositMillion}
              onChange={(e) => set("depositMillion", e.target.value)}
            />
          </Field>

          <Field label="اجاره ماهانه (میلیون تومان)">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.rentMillion}
              onChange={(e) => set("rentMillion", e.target.value)}
            />
          </Field>
          <Field label="شمارهٔ تلفن" required>
            <Input
              dir="ltr"
              inputMode="tel"
              placeholder="09120858095"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">عنوان</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="سوله ۲۰۰ متری در شهریار"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">توضیحات</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">آدرس</Label>
            <Input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">لینک دیوار</Label>
            <Input
              dir="ltr"
              value={form.divarUrl}
              onChange={(e) => set("divarUrl", e.target.value)}
              placeholder="https://divar.ir/v/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">لینک نقشه</Label>
            <Input
              dir="ltr"
              value={form.mapsUrl}
              onChange={(e) => set("mapsUrl", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            ثبت آگهی
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
