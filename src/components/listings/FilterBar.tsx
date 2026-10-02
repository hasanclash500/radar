import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROOMS_OPTIONS,
  SORT_OPTIONS,
  type Filters,
  type SortKey,
} from "@/lib/filters";
import { RotateCcw, Search } from "lucide-react";
import { normalizeDateInput } from "@/lib/filters";

interface FilterBarProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  cities: string[];
  dealTypes: string[];
  propertyTypes: string[];
}

/** نوار جستجو، فیلترها و مرتب‌سازی. */
export default function FilterBar({
  filters,
  onChange,
  onReset,
  cities,
  dealTypes,
  propertyTypes,
}: FilterBarProps) {
  const all = "همه";

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* جستجو */}
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
          <Label className="text-xs text-muted-foreground">جستجو</Label>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="auto"
              placeholder="نام شهر، توضیحات، کد رادار، شماره تلفن…"
              value={filters.query}
              onChange={(e) => onChange({ query: e.target.value })}
              className="ps-9"
            />
          </div>
        </div>

        {/* شهر */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">شهر</Label>
          <Select
            value={filters.city}
            onValueChange={(v) => onChange({ city: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={all}>همه شهرها</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* نوع معامله */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">نوع معامله</Label>
          <Select
            value={filters.deal}
            onValueChange={(v) => onChange({ deal: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={all}>همه معاملات</SelectItem>
              {dealTypes.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* نوع ملک */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">نوع ملک</Label>
          <Select
            value={filters.property}
            onValueChange={(v) => onChange({ property: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={all}>همه املاک</SelectItem>
              {propertyTypes.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* تعداد اتاق */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">تعداد اتاق</Label>
          <Select
            value={filters.rooms}
            onValueChange={(v) => onChange({ rooms: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROOMS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* بازه قیمت */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            بازه قیمت (میلیون تومان)
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="حداقل"
              value={filters.priceMin}
              onChange={(e) => onChange({ priceMin: e.target.value })}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="حداکثر"
              value={filters.priceMax}
              onChange={(e) => onChange({ priceMax: e.target.value })}
            />
          </div>
        </div>

        {/* بازه متراژ */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            بازه متراژ (متر)
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="حداقل"
              value={filters.areaMin}
              onChange={(e) => onChange({ areaMin: e.target.value })}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="حداکثر"
              value={filters.areaMax}
              onChange={(e) => onChange({ areaMax: e.target.value })}
            />
          </div>
        </div>

        {/* بازه تاریخ ثبت (شمسی) */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            بازه تاریخ ثبت (شمسی، مثل ۱۴۰۴/۰۷/۰۱)
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="text"
              inputMode="numeric"
              dir="ltr"
              placeholder="1404/07/01"
              aria-label="از تاریخ"
              value={filters.dateFrom}
              onChange={(e) => onChange({ dateFrom: normalizeDateInput(e.target.value) })}
            />
            <Input
              type="text"
              inputMode="numeric"
              dir="ltr"
              placeholder="1404/07/31"
              aria-label="تا تاریخ"
              value={filters.dateTo}
              onChange={(e) => onChange({ dateTo: normalizeDateInput(e.target.value) })}
            />
          </div>
        </div>

        {/* مرتب‌سازی */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">مرتب‌سازی</Label>
          <Select
            value={filters.sort}
            onValueChange={(v) => onChange({ sort: v as SortKey })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* پاک‌کردن */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">&nbsp;</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onReset}
          >
            <RotateCcw className="size-4" />
            پاک‌کردن فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
}
