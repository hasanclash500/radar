import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  CheckCircle2,
  CloudDownload,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  UserCog,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدیر",
  consultant: "مشاور",
  user: "کاربر",
  guest: "مهمان",
};

function Stamp({ value }: { value: number | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">هنوز اجرا نشده</span>;
  return (
    <span suppressHydrationWarning>
      {new Date(value).toLocaleString("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    </span>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const access = useQuery(api.ingest.myAccess, {});
  const settings = useQuery(api.folders.getSettings, {});
  const status = useQuery(api.ingest.importStatus, {});
  const users = useQuery(api.roles.listUsers, {});
  const folders = useQuery(api.folders.listFolders, {});

  const updateSettings = useMutation(api.folders.updateSettings);
  const setUserRole = useMutation(api.roles.setUserRole);
  const ensureProfile = useMutation(api.roles.ensureProfile);
  const createFolder = useMutation(api.folders.createFolder);
  const deleteFolder = useMutation(api.folders.deleteFolder);
  const importNow = useAction(api.ingest.importNow);

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newCity, setNewCity] = useState("");
  const [newDeal, setNewDeal] = useState("");
  const [newType, setNewType] = useState("");
  const [newFolder, setNewFolder] = useState("");
  // مقدار اولیهٔ فرم از تنظیمات خوانده می‌شود؛ بعد از آن کاربر خودش ویرایش می‌کند.
  const [hydrated, setHydrated] = useState(false);
  const [sourceDraft, setSourceDraft] = useState<{
    sourceUrl: string;
    officeName: string;
    managerPhone: string;
    shareFooter: string;
  } | null>(null);
  const draft = sourceDraft ?? {
    sourceUrl: "",
    officeName: "",
    managerPhone: "",
    shareFooter: "",
  };

  // ساخت پروفایل در اولین بازدید تا نقش کاربر مشخص شود
  const role = access?.role ?? null;
  useEffect(() => {
    if (user && role === null) {
      ensureProfile().catch(() => undefined);
    }
  }, [user, role, ensureProfile]);

  // بارگذاری مقادیر ذخیره‌شده فقط یک‌بار (بدون setState در چرخهٔ رندر)
  if (settings && !hydrated) {
    setHydrated(true);
    setSourceDraft({
      sourceUrl: settings.sourceUrl ?? "",
      officeName: settings.officeName ?? "",
      managerPhone: settings.managerPhone ?? "",
      shareFooter: settings.shareFooter ?? "",
    });
  }

  const sourceUrl = draft.sourceUrl;
  const officeName = draft.officeName;
  const managerPhone = draft.managerPhone;
  const shareFooter = draft.shareFooter;

  const isAdmin = access?.isAdmin ?? false;
  const isPrivileged = access?.isPrivileged ?? false;

  async function save() {
    setSaving(true);
    try {
      await updateSettings({
        sourceUrl: sourceUrl.trim(),
        officeName: officeName.trim(),
        managerPhone: managerPhone.trim(),
        shareFooter,
      });
      toast.success("تنظیمات ذخیره شد.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ذخیره ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  async function runImport() {
    setImporting(true);
    try {
      const result = await importNow({ url: sourceUrl.trim() || undefined });
      if (result && "skipped" in result && result.skipped) {
        toast.error(result.reason);
        return;
      }
      if (result && "added" in result) {
        toast.success(
          `${result.added} آگهی جدید ذخیره شد و ${result.updated} آگهی بروزرسانی شد.`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "افزودن آگهی ناموفق بود.");
    } finally {
      setImporting(false);
    }
  }

  async function addToList(
    field: "customCities" | "customDeals" | "customPropertyTypes",
    value: string,
    clear: () => void,
  ) {
    const v = value.trim();
    if (!v) return;
    const current = settings?.[field] ?? [];
    if (current.includes(v)) {
      toast.error("قبلاً اضافه شده است.");
      return;
    }
    await updateSettings({ [field]: [...current, v] });
    clear();
  }

  async function removeFromList(
    field: "customCities" | "customDeals" | "customPropertyTypes",
    value: string,
  ) {
    const current = settings?.[field] ?? [];
    await updateSettings({ [field]: current.filter((c) => c !== value) });
  }

  if (!isPrivileged) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="size-5" />
                دسترسی محدود
              </CardTitle>
              <CardDescription>
                این صفحه فقط برای مدیر و مشاوران دفتر است. با حساب کاربری خود وارد
                شوید یا از مدیر بخواهید نقش شما را تغییر دهد.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">
                  بازگشت به پنل آگهی‌ها
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">مدیریت دفتر</h1>
            <p className="text-sm text-muted-foreground">
              منبع آگهی‌های روزانه، متن پیام‌ها، شهرها و دسته‌ها و نقش کاربران
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{ROLE_LABELS[role ?? "guest"] ?? "مهمان"}</Badge>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">
                <ArrowRight className="size-4" />
                پنل آگهی‌ها
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {/* افزودن روزانهٔ آگهی‌ها */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CloudDownload className="size-5" />
              افزودن روزانهٔ آگهی‌ها
            </CardTitle>
            <CardDescription>
              نشانی فایل خروجی روزانه (HTML، JSON یا CSV) را وارد کنید. هر روز ساعت ۶
              صبح به وقت تهران، آگهی‌های تازه به‌صورت خودکار روی سرور ذخیره می‌شوند و
              آگهی‌های تکراری فقط بروزرسانی می‌شوند.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">نشانی فایل منبع</Label>
              <Input
                id="sourceUrl"
                dir="ltr"
                placeholder="https://example.com/listings.json"
                value={sourceUrl}
                onChange={(e) =>
                  setSourceDraft({ ...draft, sourceUrl: e.target.value })
                }
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                ذخیرهٔ منبع
              </Button>
              <Button
                onClick={runImport}
                disabled={importing || !sourceUrl.trim()}
                variant="secondary"
              >
                {importing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CloudDownload className="size-4" />
                )}
                همین حالا اضافه کن
              </Button>
            </div>

            <dl className="grid gap-2 rounded-lg border border-border/60 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">آخرین اجرا</dt>
                <dd>
                  <Stamp value={status?.lastImportAt} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">نتیجه</dt>
                <dd>
                  {status?.lastImportError ? (
                    <span className="flex items-center gap-1 text-destructive">
                      <TriangleAlert className="size-4" />
                      {status.lastImportError}
                    </span>
                  ) : status?.lastImportAt ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-4" />
                      {status.lastImportAdded ?? 0} جدید، {status.lastImportUpdated ?? 0}{" "}
                      بروزرسانی
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* متن پیام‌ها */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">اطلاعات دفتر و متن پیام‌ها</CardTitle>
            <CardDescription>
              این مقادیر در انتهای متن اشتراک‌گذاری آگهی‌ها قرار می‌گیرند.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="officeName">نام دفتر</Label>
                <Input
                  id="officeName"
                  value={officeName}
                  onChange={(e) =>
                    setSourceDraft({ ...draft, officeName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="managerPhone">شمارهٔ تماس دفتر</Label>
                <Input
                  id="managerPhone"
                  dir="ltr"
                  placeholder="09120858095"
                  value={managerPhone}
                  onChange={(e) =>
                    setSourceDraft({ ...draft, managerPhone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shareFooter">متن پایانی پیام‌ها</Label>
              <Textarea
                id="shareFooter"
                rows={3}
                value={shareFooter}
                onChange={(e) =>
                  setSourceDraft({ ...draft, shareFooter: e.target.value })
                }
              />
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              ذخیرهٔ اطلاعات دفتر
            </Button>
          </CardContent>
        </Card>

        {/* شهر، دسته و نوع ملک */}
        <div className="grid gap-6 md:grid-cols-3">
          <CategoryList
            title="شهرها"
            values={settings?.customCities ?? []}
            draft={newCity}
            setDraft={setNewCity}
            onAdd={() => addToList("customCities", newCity, () => setNewCity(""))}
            onRemove={(v) => removeFromList("customCities", v)}
          />
          <CategoryList
            title="نوع معامله"
            values={settings?.customDeals ?? []}
            draft={newDeal}
            setDraft={setNewDeal}
            onAdd={() => addToList("customDeals", newDeal, () => setNewDeal(""))}
            onRemove={(v) => removeFromList("customDeals", v)}
          />
          <CategoryList
            title="نوع ملک"
            values={settings?.customPropertyTypes ?? []}
            draft={newType}
            setDraft={setNewType}
            onAdd={() => addToList("customPropertyTypes", newType, () => setNewType(""))}
            onRemove={(v) => removeFromList("customPropertyTypes", v)}
          />
        </div>

        {/* زونکن‌ها */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">زونکن‌ها (پرونده‌های بایگانی)</CardTitle>
            <CardDescription>
              آگهی‌ها را داخل زونکن دسته‌بندی کنید تا مثل دفتر فایلینگ کار کند.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(folders ?? []).map((f) => (
                <span
                  key={f._id}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm"
                >
                  {f.name}
                  <button
                    type="button"
                    aria-label={`حذف ${f.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteFolder({ folderId: f._id })}
                  >
                    ×
                  </button>
                </span>
              ))}
              {(folders ?? []).length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  هنوز زونکنی ساخته نشده است.
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Input
                value={newFolder}
                placeholder="نام زونکن جدید"
                onChange={(e) => setNewFolder(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={async () => {
                  const name = newFolder.trim();
                  if (!name) return;
                  await createFolder({ name });
                  setNewFolder("");
                }}
              >
                افزودن
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* کاربران و نقش‌ها */}
        {isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCog className="size-5" />
                کاربران و نقش‌ها
              </CardTitle>
              <CardDescription>
                فقط مدیر و مشاور شمارهٔ تلفن آگهی‌ها را می‌بینند؛ بقیه شمارهٔ تماس
                دفتر را دریافت می‌کنند.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(users ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">کاربری یافت نشد.</p>
              ) : null}
              {(users ?? []).map((u) => (
                <div
                  key={u.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {u.name || u.email || "کاربر بی‌نام"}
                    </p>
                    <p dir="ltr" className="truncate text-xs text-muted-foreground">
                      {u.email || u.userId}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <Button
                        key={value}
                        size="sm"
                        variant={u.role === value ? "default" : "outline"}
                        onClick={() => setUserRole({ userId: u.userId, role: value })}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function CategoryList({
  title,
  values,
  draft,
  setDraft,
  onAdd,
  onRemove,
}: {
  title: string;
  values: string[];
  draft: string;
  setDraft: (v: string) => void;
  onAdd: () => void;
  onRemove: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm"
            >
              {v}
              <button
                type="button"
                aria-label={`حذف ${v}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(v)}
              >
                ×
              </button>
            </span>
          ))}
          {values.length === 0 ? (
            <span className="text-sm text-muted-foreground">—</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder={`${title} جدید`}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button size="sm" variant="secondary" onClick={onAdd}>
            افزودن
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
