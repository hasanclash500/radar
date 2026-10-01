import { ThemeToggle } from "@/components/ThemeToggle";
import FilterBar from "@/components/listings/FilterBar";
import ListingCard from "@/components/listings/ListingCard";
import ShareDialog from "@/components/listings/ShareDialog";
import UploadZone from "@/components/listings/UploadZone";
import ManualListingDialog from "@/components/listings/ManualListingDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { exportCsv, exportExcel, exportJson } from "@/lib/exporters";
import { IMPORT_ACCEPT, importListingsFile } from "@/lib/importers";
import { listingKey } from "@/lib/ingest";
import { DEFAULT_FILTERS, applyFilters, hasActiveFilters, type Filters } from "@/lib/filters";
import { faNum, formatPrice } from "@/lib/format";
import { DEAL_TYPES, PROPERTY_TYPES, parseHtmlFile, type DealType, type Listing, type PropertyType } from "@/lib/parser";
import { SAMPLE_HTML } from "@/lib/sample";
import { DEFAULT_SHARE_SETTINGS, type ShareableListing } from "@/lib/share";
import {
  Building2, Coins, FileCode2, FileJson, FileSpreadsheet, FileText, Loader2,
  LogOut, MapPinned, Radar, RotateCcw, Ruler, SearchX, Send, Settings, Upload, X,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

const PAGE_SIZE = 24;

const HINTS = [
  { icon: FileCode2, title: "استخراج خودکار",
    body: "هر آگهی با یک عبارت باقاعده از فایل HTML خام یا خروجی JSON بیرون کشیده می‌شود." },
  { icon: SearchX, title: "جستجو و فیلتر دقیق",
    body: "فیلتر بر اساس شهر، نوع معامله، نوع ملک، تعداد اتاق، بازه قیمت و متراژ همراه مرتب‌سازی." },
  { icon: FileSpreadsheet, title: "خروجی سه‌گانه",
    body: "CSV با حروف فارسی، اکسل واقعی و JSON از همان مجموعه‌ای که روی صفحه می‌بینید." },
];

export default function Dashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const headerInputRef = useRef<HTMLInputElement>(null);

  // نقش کاربر و منابع سرور
  const roleData = useQuery(api.roles.myRole);
  const settingsRow = useQuery(api.folders.getSettings);
  const folders = useQuery(api.folders.listFolders);
  const saveNotes = useMutation(api.listings.saveNotes);
  const toggleFolder = useMutation(api.listings.toggleFolder);
  const updateListing = useMutation(api.listings.updateListing);
  const markShared = useMutation(api.listings.markShared);
  const syncListings = useMutation(api.listings.upsertListings);
  const createListing = useMutation(api.listings.createListing);
  const ensureProfile = useMutation(api.roles.ensureProfile);

  // آگهی‌های ذخیره‌شدهٔ سرور؛ صفحه‌های بعدی هنگام اسکرول خوانده می‌شوند
  const { results: serverPages, status, loadMore } = usePaginatedQuery(
    api.listings.listListings,
    { initialNumItems: 60 },
    { initialNumItems: 60 },
  );
  const serverItems = useMemo(
    () => serverPages.flat() as Listing[],
    [serverPages],
  );
  const loadingServer = status === "LoadingFirstPage" || status === "LoadingMore";

  // ساخت پروفایل در اولین بازدید تا نقش کاربر مشخص شود
  useEffect(() => {
    if (roleData !== undefined && roleData === null) {
      ensureProfile().catch(() => undefined);
    }
  }, [roleData, ensureProfile]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore(60);
    }, { rootMargin: "500px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const role = roleData?.role ?? "guest";
  const canSeePhone = roleData?.isPrivileged ?? false;

  const [listings, setListings] = useState<Listing[]>([]);
  const [localTouched, setLocalTouched] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [busyLabel, setBusyLabel] = useState("در حال پردازش فایل…");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);

  const deferredFilters = useDeferredValue(filters);

  // منبع نمایش: دادهٔ محلی تازه‌وارد، وگرنه آگهی‌های ذخیره‌شدهٔ سرور
  const displayListings = localTouched ? listings : serverItems;

  const settings = useMemo(
    () => ({
      officeName: settingsRow?.officeName || DEFAULT_SHARE_SETTINGS.officeName,
      managerPhone: settingsRow?.managerPhone || "",
      shareFooter: settingsRow?.shareFooter || "",
    }),
    [settingsRow],
  );

  const afterLoad = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setVisibleCount(PAGE_SIZE);
    setSelected(new Set());
  }, []);

  /** ذخیرهٔ آگهی‌ها روی سرور برای اضافه‌کردن روزانه. */
  const syncToServer = useCallback(async (
    items: Listing[],
    options: { silent?: boolean } = {},
  ) => {
    if (!canSeePhone || items.length === 0) return;
    setSyncing(true);
    try {
      const BATCH = 400;
      let added = 0; let updated = 0;
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH).map((l) => ({
          key: listingKey(l),
          radarCode: l.radarCode || undefined,
          city: l.city, neighborhood: l.neighborhood || undefined,
          area: l.area ?? undefined, rooms: l.rooms ?? undefined,
          priceMillion: l.priceMillion || undefined,
          depositMillion: l.depositMillion ?? undefined,
          rentMillion: l.rentMillion ?? undefined,
          pricePerMeter: l.pricePerMeter ?? undefined,
          dealType: l.dealType, propertyType: l.propertyType,
          title: l.title || undefined, description: l.description || undefined,
          address: l.address || undefined, mapsUrl: l.mapsUrl || undefined,
          divarUrl: l.divarUrl || undefined, date: l.date || undefined,
          dateRaw: l.dateRaw || undefined, poster: l.poster || undefined,
          phone: l.phone,
        }));
        const res = await syncListings({ items: batch });
        added += res.added; updated += res.updated;
        setSyncProgress({ done: Math.min(i + BATCH, items.length), total: items.length });
      }
      if (!options.silent) {
        toast.success("آگهی‌ها روی سرور ذخیره شد", {
          description: `${faNum(added)} جدید • ${faNum(updated)} بروزرسانی`,
        });
      }
    } catch (e) {
      console.error(e);
      if (!options.silent) toast.error("ذخیره روی سرور ناموفق بود");
    } finally {
      setSyncing(false); setSyncProgress(null);
    }
  }, [canSeePhone, syncListings]);

  /** پس از هر ورود فایل، آگهی‌ها بی‌درنگ روی سرور ذخیره می‌شوند. */
  const persist = useCallback(async (items: Listing[]) => {
    if (!canSeePhone || items.length === 0) return;
    await syncToServer(items, { silent: true });
  }, [canSeePhone, syncToServer]);

  const handleManualSave = useCallback(async (
    values: Parameters<typeof createListing>[0],
  ) => {
    await createListing(values);
    // نمایش به دادهٔ سرور برمی‌گردد تا آگهی تازه بلافاصله دیده شود
    setLocalTouched(false);
    toast.success("آگهی دستی ثبت شد");
  }, [createListing]);

  const parseText = useCallback(async (text: string, name: string) => {
    setParsing(true); setError(null); setProgress({ done: 0, total: 0 });
    try {
      const result = await parseHtmlFile(text, (done, total) => setProgress({ done, total }));
      if (result.total === 0) {
        setListings([]); setSkipped(0); setFileName(null); setLocalTouched(true);
        setError("هیچ لینک دیواری در فایل پیدا نشد. مطمئن شوید فایل HTML خام همین کانال را بارگذاری کرده‌اید.");
        return;
      }
      setListings(result.listings); setSkipped(result.skipped); setFileName(name);
      setLocalTouched(true);
      afterLoad();
      if (result.listings.length === 0) {
        setError("هیچ آگهی معتبری با شماره تلفن پیدا نشد.");
      } else {
        toast.success(`${faNum(result.listings.length)} آگهی استخراج شد`, {
          description: result.skipped > 0 ? `${faNum(result.skipped)} آگهی بدون شماره تلفن نادیده گرفته شد` : undefined,
        });
        void persist(result.listings);
      }
    } catch (e) {
      console.error(e);
      setError("پردازش فایل با خطا مواجه شد.");
    } finally {
      setParsing(false); setProgress(null);
    }
  }, [afterLoad, persist]);

  const handleFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    try {
      if (/\.(csv|json|xlsx|xls)$/.test(name)) {
        setParsing(true); setError(null);
        setBusyLabel(`در حال خواندن ${name.endsWith(".csv") ? "CSV" : name.endsWith(".json") ? "JSON" : "اکسل"}…`);
        setProgress({ done: 0, total: 0 });
        const result = await importListingsFile(file, (done, total) => setProgress({ done, total }));
        if (result.total === 0) { setError("هیچ ردیفی در فایل پیدا نشد."); return; }
        if (result.listings.length === 0) { setError("هیچ ردیف معتبری با شماره تلفن پیدا نشد."); return; }
        setListings(result.listings); setSkipped(result.skipped); setFileName(file.name);
        setLocalTouched(true);
        afterLoad();
        toast.success(`${faNum(result.listings.length)} آگهی وارد شد`);
        void persist(result.listings);
      } else {
        const text = await file.text();
        await parseText(text, file.name);
      }
    } catch (e) {
      console.error(e);
      setError("خواندن فایل ممکن نشد.");
    } finally {
      setParsing(false); setProgress(null);
    }
  }, [afterLoad, parseText, persist]);

  const handleSample = useCallback(() => { void parseText(SAMPLE_HTML, "نمونه-داده.html"); }, [parseText]);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch })); setVisibleCount(PAGE_SIZE);
  }, []);
  const resetFilters = useCallback(() => { setFilters(DEFAULT_FILTERS); setVisibleCount(PAGE_SIZE); }, []);

  const filtered = useMemo(
    () => applyFilters(displayListings, deferredFilters),
    [displayListings, deferredFilters],
  );
  const visible = filtered.slice(0, visibleCount);

  const cities = useMemo(() => {
    const set = new Set(displayListings.map((l) => l.city));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fa"));
  }, [displayListings]);
  const dealTypes = useMemo(() => {
    const present = new Set(displayListings.map((l) => l.dealType));
    return [...DEAL_TYPES.filter((d) => present.has(d)), ...Array.from(present).filter((d) => !DEAL_TYPES.includes(d as DealType))];
  }, [displayListings]);
  const propertyTypes = useMemo(() => {
    const present = new Set(displayListings.map((l) => l.propertyType));
    return [...PROPERTY_TYPES.filter((p) => present.has(p)), ...Array.from(present).filter((p) => !PROPERTY_TYPES.includes(p as PropertyType))];
  }, [displayListings]);

  const stats = useMemo(() => {
    const withPrice = displayListings.filter((l) => l.priceMillion > 0);
    const withArea = displayListings.filter((l) => l.area !== null);
    return {
      count: displayListings.length,
      cities: new Set(displayListings.map((l) => l.city)).size,
      avgPrice: withPrice.length ? Math.round(withPrice.reduce((s, l) => s + l.priceMillion, 0) / withPrice.length) : 0,
      avgArea: withArea.length ? Math.round(withArea.reduce((s, l) => s + (l.area ?? 0), 0) / withArea.length) : 0,
    };
  }, [displayListings]);

  const doExport = useCallback(async (kind: "csv" | "json" | "excel") => {
    if (!filtered.length) return;
    try {
      if (kind === "csv") exportCsv(filtered);
      else if (kind === "json") exportJson(filtered);
      else await exportExcel(filtered);
      toast.success(`خروجی ${faNum(filtered.length)} آگهی تهیه شد`);
    } catch { toast.error("تهیه خروجی با خطا مواجه شد"); }
  }, [filtered]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const filtersActive = hasActiveFilters(filters);
  const pct = progress && progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  const shareList: ShareableListing[] = useMemo(
    () => (selected.size > 0 ? filtered : filtered.slice(0, 1))
      .filter((l) => selected.size === 0 || selected.has(listingKey(l)))
      .map((l) => ({
        key: listingKey(l),
        title: l.title, city: l.city, neighborhood: l.neighborhood,
        area: l.area, rooms: l.rooms, priceMillion: l.priceMillion,
        depositMillion: l.depositMillion, rentMillion: l.rentMillion,
        dealType: l.dealType, propertyType: l.propertyType,
        description: l.description, address: l.address,
        divarUrl: l.divarUrl, mapsUrl: l.mapsUrl,
        contactPhone: canSeePhone ? l.phone : settings.managerPhone,
      })),
    [filtered, selected, canSeePhone, settings.managerPhone],
  );

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const folderList = (folders ?? []) as { _id: string; name: string; color?: string }[];

  return (
    <main className="min-h-screen">
      <header className="glass sticky top-0 z-40 border-b border-border/60">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
              <Radar className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold leading-tight">ملک‌رادار</h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                نقش: {role === "admin" ? "مدیر" : role === "consultant" ? "مشاور" : role === "user" ? "کاربر" : "مهمان"}
              </p>
            </div>
            {fileName && (
              <span dir="ltr" title={fileName}
                className="hidden max-w-52 truncate rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground md:inline-block">
                {fileName}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/admin" title="مدیریت دفتر و افزودن روزانهٔ آگهی">
                <Settings className="size-4" />
                <span className="hidden sm:inline">مدیریت</span>
              </Link>
            </Button>
            <ThemeToggle />
            <input ref={headerInputRef} type="file"
              accept={".html,.htm,.txt," + IMPORT_ACCEPT + ",text/html,text/plain"}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }} />
            <Button type="button" variant="outline" size="sm" className="gap-1.5"
              onClick={() => headerInputRef.current?.click()} disabled={parsing}>
              <Upload className="size-4" /><span className="hidden sm:inline">فایل جدید</span>
            </Button>
            {canSeePhone && (
              <ManualListingDialog open={manualOpen} onOpenChange={setManualOpen}
                onSave={handleManualSave} />
            )}
            {canSeePhone && localTouched && listings.length > 0 && (
              <Button type="button" variant="outline" size="sm" className="gap-1.5"
                onClick={() => void syncToServer(listings)} disabled={syncing}>
                {syncing ? <Loader2 className="size-4 animate-spin" /> : <Building2 className="size-4" />}
                <span className="hidden sm:inline">{syncing ? "ذخیره…" : "ذخیره روی سرور"}</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-1.5"
                  disabled={parsing || filtered.length === 0}>
                  <FileSpreadsheet className="size-4" /><span className="hidden sm:inline">خروجی</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  خروجی از {faNum(filtered.length)} آگهی
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => void doExport("csv")}><FileText className="size-4" />فایل CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void doExport("excel")}><FileSpreadsheet className="size-4" />فایل اکسل (.xlsx)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void doExport("json")}><FileJson className="size-4" />فایل JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="button" variant="ghost" size="icon" className="size-9"
              title="خروج از حساب" onClick={handleSignOut}><LogOut className="size-4" /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {parsing && (
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2.5">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="font-bold">{busyLabel}
                {progress && progress.total > 0 && (
                  <span className="mr-1 text-sm font-normal text-muted-foreground">{faNum(pct)}٪</span>
                )}
              </p>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-l from-primary to-gold transition-all duration-200"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {syncing && syncProgress && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm font-medium">
            ذخیره روی سرور: {faNum(syncProgress.done)} از {faNum(syncProgress.total)}
          </div>
        )}

        {!parsing && error && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400">{error}</div>
        )}

        {!parsing && displayListings.length === 0 && !loadingServer && (
          <section className="space-y-6">
            <UploadZone onFile={(f) => void handleFile(f)} onSample={handleSample}
              loading={parsing} progress={progress} busyLabel={busyLabel} />
            <div className="grid gap-4 sm:grid-cols-3">
              {HINTS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-border/70 bg-card/70 p-4">
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/25">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="mb-1 text-sm font-extrabold">{title}</h3>
                  <p className="text-xs leading-6 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!parsing && displayListings.length > 0 && (
          <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { icon: Building2, label: "کل آگهی‌ها", value: faNum(stats.count) },
                { icon: MapPinned, label: "شهرها", value: faNum(stats.cities) },
                { icon: Coins, label: "میانگین قیمت", value: stats.avgPrice ? formatPrice(stats.avgPrice) : "—" },
                { icon: Ruler, label: "میانگین متراژ", value: stats.avgArea ? `${faNum(stats.avgArea)} متر` : "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/70 p-3.5 shadow-sm">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-extrabold leading-tight">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              ))}
            </section>

            <FilterBar filters={filters} onChange={updateFilters} onReset={resetFilters}
              cities={cities} dealTypes={dealTypes} propertyTypes={propertyTypes} />

            {/* نوار انتخاب و ارسال */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card/70 px-4 py-2.5">
              <p className="text-sm text-muted-foreground">
                <span className="font-extrabold text-foreground">{faNum(filtered.length)}</span> آگهی از {faNum(displayListings.length)} مورد
                {filtersActive && " (با اعمال فیلترها)"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {selected.size > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-bold text-primary">
                    {faNum(selected.size)} انتخاب‌شده
                    <button type="button" onClick={() => setSelected(new Set())}
                      className="rounded-full p-0.5 hover:bg-primary/20">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                <Button type="button" size="sm" className="gap-1.5"
                  disabled={filtered.length === 0}
                  onClick={() => setShareOpen(true)}>
                  <Send className="size-4" />
                  ارسال آگهی
                </Button>
                {skipped > 0 && (
                  <p className="text-xs text-muted-foreground">{faNum(skipped)} آگهی بدون شماره تلفن</p>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
                <SearchX className="size-8 text-muted-foreground" />
                <p className="font-bold">آگهی‌ای با این فیلترها پیدا نشد</p>
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  <RotateCcw className="size-4" />پاک‌کردن فیلترها
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((l) => {
                    const key = listingKey(l);
                    return (
                      <ListingCard key={key} listing={l} canSeePhone={canSeePhone}
                        managerPhone={settings.managerPhone}
                        selected={selected.has(key)}
                        onToggleSelect={() => toggleSelect(key)}
                        onShare={() => { setSelected(new Set([key])); setShareOpen(true); }}
                        folders={folderList}
                        onSaveNotes={canSeePhone ? async (notes) => { await saveNotes({ key, notes }); } : undefined}
                        onToggleFolder={canSeePhone ? async (fid) => { await toggleFolder({ key, folderId: fid }); } : undefined}
                        onSaveLocation={canSeePhone ? async (patch) => { await updateListing({ key, patch }); } : undefined} />
                    );
                  })}
                </div>
                <div ref={sentinelRef} className="h-px w-full" aria-hidden />
                {status === "LoadingMore" && (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    در حال خواندن آگهی‌های بیشتر…
                  </p>
                )}
                {status === "CanLoadMore" && (
                  <div className="flex justify-center pt-1">
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => loadMore(60)}>
                      نمایش آگهی‌های بیشتر از سرور
                    </Button>
                  </div>
                )}
                {filtered.length > visibleCount && (
                  <div className="flex justify-center pt-1">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                      نمایش آگهی‌های بیشتر ({faNum(Math.min(PAGE_SIZE, filtered.length - visibleCount))} مورد دیگر)
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen}
        listings={shareList} settings={settings} onSettingsChange={() => {}}
        onShared={() => { if (selected.size > 0) void markShared({ keys: Array.from(selected) }); }} />
    </main>
  );
}
