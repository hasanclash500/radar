import { ThemeToggle } from "@/components/ThemeToggle";
import FilterBar from "@/components/listings/FilterBar";
import ListingCard from "@/components/listings/ListingCard";
import UploadZone from "@/components/listings/UploadZone";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { exportCsv, exportExcel, exportJson } from "@/lib/exporters";
import {
  DEFAULT_FILTERS,
  applyFilters,
  hasActiveFilters,
  type Filters,
} from "@/lib/filters";
import { faNum, formatPrice } from "@/lib/format";
import {
  DEAL_TYPES,
  PROPERTY_TYPES,
  parseHtmlFile,
  type DealType,
  type Listing,
  type PropertyType,
} from "@/lib/parser";
import { SAMPLE_HTML } from "@/lib/sample";
import {
  Building2,
  Coins,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  LogOut,
  MapPinned,
  Radar,
  RotateCcw,
  Ruler,
  SearchX,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const PAGE_SIZE = 24;

const HINTS = [
  {
    icon: FileCode2,
    title: "استخراج خودکار",
    body: "هر آگهی با یک عبارت باقاعده (regex) از دل فایل HTML خام بیرون کشیده می‌شود؛ کد رادار، قیمت، متراژ، اتاق، تاریخ و تلفن.",
  },
  {
    icon: SearchX,
    title: "جستجو و فیلتر دقیق",
    body: "فیلتر بر اساس شهر، نوع معامله، نوع ملک، تعداد اتاق، بازه قیمت و بازه متراژ به‌همراه مرتب‌سازی.",
  },
  {
    icon: FileSpreadsheet,
    title: "خروجی سه‌گانه",
    body: "CSV با حروف فارسی، اکسل واقعی (.xlsx) و JSON — از همان مجموعه‌ای که روی صفحه می‌بینید.",
  },
];

export default function Dashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const headerInputRef = useRef<HTMLInputElement>(null);

  const [listings, setListings] = useState<Listing[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const deferredFilters = useDeferredValue(filters);

  const parseText = useCallback(async (text: string, name: string) => {
    setParsing(true);
    setError(null);
    setProgress({ done: 0, total: 0 });
    try {
      const result = await parseHtmlFile(text, (done, total) =>
        setProgress({ done, total }),
      );
      if (result.total === 0) {
        setListings([]);
        setSkipped(0);
        setFileName(null);
        setError(
          "هیچ لینک دیواری در فایل پیدا نشد. مطمئن شوید فایل HTML خام همین کانال را بارگذاری کرده‌اید.",
        );
        return;
      }
      setListings(result.listings);
      setSkipped(result.skipped);
      setFileName(name);
      setFilters(DEFAULT_FILTERS);
      setVisibleCount(PAGE_SIZE);
      if (result.listings.length === 0) {
        setError(
          "هیچ آگهی معتبری با شماره تلفن پیدا نشد. آگهی‌های بدون تلفن طبق قانون، استخراج نمی‌شوند.",
        );
      } else {
        toast.success(`${faNum(result.listings.length)} آگهی استخراج شد`, {
          description:
            result.skipped > 0
              ? `${faNum(result.skipped)} آگهی بدون شماره تلفن نادیده گرفته شد`
              : undefined,
        });
      }
    } catch (e) {
      console.error(e);
      setError("پردازش فایل با خطا مواجه شد. فایل باید HTML خام کانال باشد.");
    } finally {
      setParsing(false);
      setProgress(null);
    }
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        await parseText(text, file.name);
      } catch (e) {
        console.error(e);
        setError("خواندن فایل ممکن نشد. دوباره تلاش کنید.");
      }
    },
    [parseText],
  );

  const handleSample = useCallback(() => {
    void parseText(SAMPLE_HTML, "نمونه-داده.html");
  }, [parseText]);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setVisibleCount(PAGE_SIZE);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const filtered = useMemo(
    () => applyFilters(listings, deferredFilters),
    [listings, deferredFilters],
  );
  const visible = filtered.slice(0, visibleCount);

  const cities = useMemo(() => {
    const set = new Set(listings.map((l) => l.city));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fa"));
  }, [listings]);

  const dealTypes = useMemo(() => {
    const present = new Set(listings.map((l) => l.dealType));
    const extras = Array.from(present).filter(
      (d) => !DEAL_TYPES.includes(d as DealType),
    );
    return [...DEAL_TYPES.filter((d) => present.has(d)), ...extras];
  }, [listings]);

  const propertyTypes = useMemo(() => {
    const present = new Set(listings.map((l) => l.propertyType));
    const extras = Array.from(present).filter(
      (p) => !PROPERTY_TYPES.includes(p as PropertyType),
    );
    return [...PROPERTY_TYPES.filter((p) => present.has(p)), ...extras];
  }, [listings]);

  const stats = useMemo(() => {
    const withPrice = listings.filter((l) => l.priceMillion > 0);
    const withArea = listings.filter((l) => l.area !== null);
    const avgPrice = withPrice.length
      ? Math.round(
          withPrice.reduce((s, l) => s + l.priceMillion, 0) / withPrice.length,
        )
      : 0;
    const avgArea = withArea.length
      ? Math.round(
          withArea.reduce((s, l) => s + (l.area ?? 0), 0) / withArea.length,
        )
      : 0;
    return {
      count: listings.length,
      cities: new Set(listings.map((l) => l.city)).size,
      avgPrice,
      avgArea,
    };
  }, [listings]);

  const doExport = useCallback(
    async (kind: "csv" | "json" | "excel") => {
      if (!filtered.length) return;
      try {
        if (kind === "csv") exportCsv(filtered);
        else if (kind === "json") exportJson(filtered);
        else await exportExcel(filtered);
        toast.success(`خروجی ${faNum(filtered.length)} آگهی تهیه شد`);
      } catch (e) {
        console.error(e);
        toast.error("تهیه خروجی با خطا مواجه شد");
      }
    },
    [filtered],
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const filtersActive = hasActiveFilters(filters);
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : 0;

  return (
    <main className="min-h-screen">
      {/* هدر برنامه */}
      <header className="glass sticky top-0 z-40 border-b border-border/60">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
              <Radar className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold leading-tight">
                ملک‌رادار
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                تحلیل‌گر آگهی‌های املاک کانال تلگرام
              </p>
            </div>
            {fileName && (
              <span
                dir="ltr"
                className="hidden max-w-52 truncate rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground md:inline-block"
                title={fileName}
              >
                {fileName}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <input
              ref={headerInputRef}
              type="file"
              accept=".html,.htm,.txt,text/html,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => headerInputRef.current?.click()}
              disabled={parsing}
            >
              <Upload className="size-4" />
              <span className="hidden sm:inline">فایل جدید</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={parsing || filtered.length === 0}
                >
                  <FileSpreadsheet className="size-4" />
                  <span className="hidden sm:inline">خروجی</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  خروجی از {faNum(filtered.length)} آگهی نمایش‌داده‌شده
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => void doExport("csv")}>
                  <FileText className="size-4" />
                  فایل CSV (مخصوص اکسل)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void doExport("excel")}>
                  <FileSpreadsheet className="size-4" />
                  فایل اکسل (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void doExport("json")}>
                  <FileJson className="size-4" />
                  فایل JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              title="خروج از حساب"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* در حال پردازش */}
        {parsing && (
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2.5">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="font-bold">
                در حال استخراج آگهی‌ها از فایل…
                {progress && progress.total > 0 && (
                  <span className="mr-1 text-sm font-normal text-muted-foreground">
                    {faNum(pct)}٪
                  </span>
                )}
              </p>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-l from-primary to-gold transition-all duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
            {progress && progress.total > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {faNum(progress.done)} از {faNum(progress.total)} بلوک آگهی
              </p>
            )}
          </div>
        )}

        {/* خطا */}
        {!parsing && error && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400">
            {error}
          </div>
        )}

        {/* حالت خالی */}
        {!parsing && listings.length === 0 && (
          <section className="space-y-6">
            <UploadZone
              onFile={(f) => void handleFile(f)}
              onSample={handleSample}
              loading={parsing}
              progress={progress}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              {HINTS.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border/70 bg-card/70 p-4"
                >
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/25">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="mb-1 text-sm font-extrabold">{title}</h3>
                  <p className="text-xs leading-6 text-muted-foreground">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* نتایج */}
        {!parsing && listings.length > 0 && (
          <>
            {/* آمار */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  icon: Building2,
                  label: "کل آگهی‌ها",
                  value: faNum(stats.count),
                },
                { icon: MapPinned, label: "شهرها", value: faNum(stats.cities) },
                {
                  icon: Coins,
                  label: "میانگین قیمت",
                  value: stats.avgPrice ? formatPrice(stats.avgPrice) : "—",
                },
                {
                  icon: Ruler,
                  label: "میانگین متراژ",
                  value: stats.avgArea ? `${faNum(stats.avgArea)} متر` : "—",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/70 p-3.5 shadow-sm"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-extrabold leading-tight">
                      {value}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              ))}
            </section>

            <FilterBar
              filters={filters}
              onChange={updateFilters}
              onReset={resetFilters}
              cities={cities}
              dealTypes={dealTypes}
              propertyTypes={propertyTypes}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-extrabold text-foreground">
                  {faNum(filtered.length)}
                </span>{" "}
                آگهی از {faNum(listings.length)} مورد
                {filtersActive && " (با اعمال فیلترها)"}
              </p>
              <div className="flex items-center gap-3">
                {skipped > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {faNum(skipped)} آگهی بدون شماره تلفن نادیده گرفته شد
                  </p>
                )}
                {filtersActive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="size-3.5" />
                    حذف فیلترها
                  </Button>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
                <SearchX className="size-8 text-muted-foreground" />
                <p className="font-bold">آگهی‌ای با این فیلترها پیدا نشد</p>
                <p className="text-sm text-muted-foreground">
                  بازه قیمت یا متراژ را تغییر دهید و دوباره امتحان کنید.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  <RotateCcw className="size-4" />
                  پاک‌کردن فیلترها
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
                {filtered.length > visibleCount && (
                  <div className="flex justify-center pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                    >
                      {`نمایش آگهی‌های بیشتر (${faNum(
                        Math.min(PAGE_SIZE, filtered.length - visibleCount),
                      )} مورد دیگر)`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
