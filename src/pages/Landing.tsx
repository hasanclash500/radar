import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowUpDown,
  BedDouble,
  Building2,
  CheckCircle2,
  Coins,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  MapPin,
  Moon,
  Phone,
  Ruler,
  Search,
  Sparkles,
  UploadCloud,
  Wand2,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: "easeOut" },
} as const;

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div {...fadeUp} className="mx-auto mb-10 max-w-2xl text-center">
      <span className="mb-3 inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
        {eyebrow}
      </span>
      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
        {description}
      </p>
    </motion.div>
  );
}

const STEPS: { icon: typeof UploadCloud; title: string; body: string }[] = [
  {
    icon: UploadCloud,
    title: "فایل HTML را آپلود کنید",
    body: "خروجی HTML خام کانال تلگرامی ملک‌رادار را درگ‌انداخته یا انتخاب کنید. خبری از کپی‌پیست دستی نیست.",
  },
  {
    icon: Wand2,
    title: "استخراج خودکار با regex",
    body: "هر آگهی با الگوی [▫️](divar.ir/...) پیدا شده و کد رادار، شهر، متراژ، اتاق، قیمت، تاریخ و تلفن آن جدا می‌شود.",
  },
  {
    icon: Filter,
    title: "فیلتر، مرتب‌سازی، خروجی",
    body: "فیلتر شهر/معامله/ملک/اتاق/قیمت/متراژ، مرتب‌سازی و خروجی CSV، اکسل و JSON از همان دسته‌ای که می‌بینید.",
  },
];

const FEATURES: { icon: typeof Search; title: string; body: string }[] = [
  {
    icon: Search,
    title: "جستجوی متنی سریع",
    body: "جستجو در شهر، عنوان، توضیحات، کد رادار و شماره تلفن با اعمال فوری روی کل مجموعه.",
  },
  {
    icon: Filter,
    title: "۶ فیلتر تخصصی",
    body: "شهر، نوع معامله (فروش / رهن و اجاره / پیش فروش)، نوع ملک، تعداد اتاق، بازه قیمت و بازه متراژ.",
  },
  {
    icon: ArrowUpDown,
    title: "مرتب‌سازی کامل",
    body: "بر اساس تاریخ ثبت، قیمت و متراژ — صعودی و نزولی — برای پیدا کردن بهترین فرصت‌ها.",
  },
  {
    icon: FileSpreadsheet,
    title: "خروجی سه‌گانه",
    body: "CSV با BOM برای اکسل فارسی، فایل اکسل واقعی xlsx و JSON با کلیدهای استاندارد.",
  },
  {
    icon: Moon,
    title: "حالت تاریک و روشن",
    body: "تم دلخواه شما با گرادیانت سبز-طلایی، انیمیشن‌های نرم و فونت وزیرمتن.",
  },
  {
    icon: Zap,
    title: "بهینه برای فایل بزرگ",
    body: "پردازش دسته‌ای با نوار پیشرفت و رندر صفحه‌بندی‌شده تا رابط حتی با هزاران آگهی روان بماند.",
  },
];

const RAW_SAMPLE = `[▫️](https://divar.ir/v/AbCdEf123&mode=preview)
[#تهران_شمالی]()، ۱۲۰ متر، [#۳_خواب]()
💲 ۲۵ میلیارد تومان
[#فروش]()
[#مسکونی]()
[#رادار_کد_1002345]()

〰️〰️〰️〰️〰️〰️
آپارتمان نوساز در بهترین لوکیشن شمال تهران
〰️〰️〰️〰️〰️〰️

📆 تاریخ ثبت: 1404/7/10
[09121234567](tel:09121234567)`;

const PARSED_FIELDS: { label: string; value: string }[] = [
  { label: "کد رادار", value: "۱۰۰۲۳۴۵" },
  { label: "شهر", value: "تهران شمالی" },
  { label: "متراژ", value: "۱۲۰ متر" },
  { label: "تعداد اتاق", value: "۳ خواب" },
  { label: "قیمت", value: "۲۵ میلیارد تومان" },
  { label: "نوع معامله", value: "فروش" },
  { label: "نوع ملک", value: "مسکونی" },
  { label: "شماره تلفن", value: "09121234567" },
  { label: "تاریخ ثبت", value: "1404/7/10" },
  { label: "لینک دیوار", value: "divar.ir/v/AbCdEf123" },
  { label: "لینک گوگل مپ", value: "Google Maps" },
  { label: "عنوان و توضیحات", value: "استخراج‌شده از بین دو خط موج‌دار" },
];

function MockCard() {
  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="glass w-full max-w-sm rounded-3xl border border-border/70 p-5 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            فروش
          </span>
          <span className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
            مسکونی
          </span>
        </div>
        <span className="rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
          رادار ۱۰۰۲۳۴۵
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <MapPin className="size-4 text-primary" />
        <h3 className="text-lg font-extrabold">تهران شمالی</h3>
      </div>
      <p className="text-gradient-brand mt-1 text-2xl font-extrabold">
        ۲۵ میلیارد تومان
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Ruler className="size-4 text-primary/80" /> ۱۲۰ متر
        </span>
        <span className="flex items-center gap-1.5">
          <BedDouble className="size-4 text-primary/80" /> ۳ خواب
        </span>
        <span className="flex items-center gap-1.5">
          <Building2 className="size-4 text-primary/80" /> 1404/7/10
        </span>
      </div>        <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs">
            <Phone className="size-4" />
            <span dir="ltr">09121234567</span>
          </div>
          <span className="text-xs text-muted-foreground">کپی با یک کلیک</span>
        </div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const goApp = () => navigate("/auth?returnTo=/dashboard");

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* پس‌زمینه هدر: گرادیانت + شبکه رادار */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px]">
        <div className="absolute inset-0 grid-overlay opacity-70" />
        <div className="absolute inset-0 glow-emerald" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
        <div className="absolute end-[12%] top-24 size-64">
          <span className="animate-radar-ping absolute inset-0 rounded-full border-2 border-primary/40" />
          <span
            className="animate-radar-ping absolute inset-0 rounded-full border-2 border-gold/40"
            style={{ animationDelay: "1.4s" }}
          />
        </div>
      </div>

      {/* ناوبری */}
      <header className="glass sticky top-0 z-40 border-b border-border/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
              <Sparkles className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-extrabold">ملک‌رادار</p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                تحلیل‌گر آگهی‌های املاک
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-foreground">
              نحوه کار
            </a>
            <a
              href="#features"
              className="transition-colors hover:text-foreground"
            >
              امکانات
            </a>
            <a href="#sample" className="transition-colors hover:text-foreground">
              نمونه خروجی
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" className="gap-1.5" onClick={goApp}>
              ورود به پنل
              <ArrowLeft className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* هیرو */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-bold text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              استخراج خودکار از کانال تلگرامی ملک‌رادار
            </span>

            <h1 className="mt-5 text-3xl font-extrabold leading-[1.35] tracking-tight sm:text-5xl">
              فایل HTML خام را بده،
              <br />
              <span className="text-gradient-brand">
                آگهی‌های ساختاریافته بگیر.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-8 text-muted-foreground sm:text-base">
              کافی است خروجی HTML کانال را آپلود کنید؛ هر آگهی با عبارت
              باقاعده پیدا شده و کد رادار، شهر، متراژ، تعداد اتاق، قیمت، نوع
              معامله و ملک، تاریخ و تلفن آن — همراه با لینک دیوار و نقشه —
              استخراج و در کارت‌های زیبا نمایش داده می‌شود.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" className="gap-2" onClick={goApp}>
                شروع رایگان تحلیل
                <ArrowLeft className="size-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a href="#features">
                  <Zap className="size-4" />
                  امکانات کامل
                </a>
              </Button>
            </div>

            <div className="mt-9 grid max-w-lg grid-cols-3 gap-3">
              {[
                { value: "۱۲", label: "فیلد استخراجی" },
                { value: "۶", label: "فیلتر پیشرفته" },
                { value: "۳", label: "خروجی CSV/اکسل/JSON" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-border/70 bg-card/70 p-3 text-center"
                >
                  <p className="text-xl font-extrabold text-gradient-brand">
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/25 via-transparent to-gold/25 blur-2xl" />
              <div className="relative">
                <MockCard />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5 }}
                  className="glass absolute -bottom-8 -start-6 hidden rounded-2xl border border-border/70 px-4 py-3 shadow-xl sm:block"
                >
                  <p className="text-[11px] text-muted-foreground">
                    از فایل خام تا کارت آماده
                  </p>
                  <p className="text-sm font-extrabold text-gradient-brand">
                    کمتر از چند ثانیه ⚡
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* نحوه کار */}
      <section id="how" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="نحوه کار"
          title="سه قدم تا تحلیل کامل آگهی‌ها"
          description="از آپلود تا خروجی، همه‌چیز در مرورگر و بدون اتلاف وقت انجام می‌شود."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="relative rounded-3xl border border-border/70 bg-card/70 p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                  <step.icon className="size-5" />
                </div>
                <span className="text-3xl font-extrabold text-muted/40 dark:text-muted-foreground/25">
                  {["۱", "۲", "۳"][i]}
                </span>
              </div>
              <h3 className="mb-2 text-base font-extrabold">{step.title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* امکانات */}
      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="امکانات"
          title="هر چیزی که برای تحلیل بازار لازم دارید"
          description="جستجو، فیلتر، مرتب‌سازی و خروجی — با طراحی مدرن، ریسپانسیو و حالت تاریک/روشن."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: (i % 3) * 0.08 }}
              className="group rounded-3xl border border-border/70 bg-card/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25 transition-colors group-hover:bg-primary/20">
                <f.icon className="size-5" />
              </div>
              <h3 className="mb-2 text-base font-extrabold">{f.title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* نمونه خروجی */}
      <section id="sample" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="نمونه خروجی"
          title="پیام خام تلگرام → کارت ساختاریافته"
          description="الگوی هر آگهی شناسایی شده و فیلدهای خواسته‌شده یکی‌یکی پر می‌شوند؛ آگهی‌های بدون شماره تلفن کنار گذاشته می‌شوند."
        />
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <motion.div {...fadeUp} className="rounded-3xl border border-border/70 bg-card/70 p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <FileText className="size-4" />
              پیام خام کانال
            </div>
            <pre className="max-h-96 overflow-auto rounded-2xl bg-muted/50 p-4 text-[12px] leading-6 text-foreground/80">
              <code>{RAW_SAMPLE}</code>
            </pre>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.12 }}
            className="rounded-3xl border border-primary/30 bg-card/70 p-5"
          >
            <div className="mb-4 flex items-center gap-2 text-xs font-bold text-primary">
              <CheckCircle2 className="size-4" />
              فیلدهای استخراج‌شده
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {PARSED_FIELDS.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/60 px-3 py-2.5"
                >
                  <span className="text-xs text-muted-foreground">
                    {f.label}
                  </span>
                  <span dir="auto" className="truncate text-xs font-bold">
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: FileText, label: "CSV" },
                { icon: FileSpreadsheet, label: "اکسل" },
                { icon: FileJson, label: "JSON" },
              ].map((x) => (
                <div
                  key={x.label}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-muted/40 py-2 text-xs font-bold"
                >
                  <x.icon className="size-4 text-primary" />
                  {x.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-gold/15 p-8 text-center sm:p-14"
        >
          <div className="pointer-events-none absolute inset-0 glow-emerald opacity-70" />
          <div className="relative">
            <Coins className="mx-auto mb-4 size-10 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              آگهی‌های کانال را همین حالا تحلیل کنید
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              وارد شوید، فایل HTML را بارگذاری کنید و در کمتر از چند ثانیه
              کل مجموعه را فیلتر و خروجی بگیرید.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" className="gap-2" onClick={goApp}>
                ورود و شروع
                <ArrowLeft className="size-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={goApp}>
                امتحان با داده نمونه
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* فوتر */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-bold text-foreground">ملک‌رادار</span>
            <span className="text-xs">
              — تحلیل‌گر آگهی‌های املاک کانال تلگرام
            </span>
          </div>
          <p className="text-xs">
            ساخته‌شده با فونت وزیرمتن · طراحی ریسپانسیو موبایل و دسکتاپ
          </p>
        </div>
      </footer>
    </div>
  );
}
