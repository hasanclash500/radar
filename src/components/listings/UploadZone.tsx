import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileCode2, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

interface UploadZoneProps {
  onFile: (file: File) => void;
  onSample: () => void;
  loading: boolean;
  progress: { done: number; total: number } | null;
}

/** ناحیه درگ‌انداختن و انتخاب فایل HTML خام. */
export default function UploadZone({
  onFile,
  onSample,
  loading,
  progress,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files);
  };

  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : 0;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !loading) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "relative flex w-full cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 sm:p-14",
        dragging
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-border hover:border-primary/60 hover:bg-primary/5",
      )}
    >
      <div className="pointer-events-none absolute inset-0 glow-emerald opacity-60" />

      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,.txt,text/html,text/plain"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="relative flex size-16 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
        {loading ? (
          <Loader2 className="size-7 animate-spin" />
        ) : (
          <UploadCloud className="size-7" />
        )}
      </div>

      <div className="relative space-y-1.5">
        {loading ? (
          <>
            <p className="text-base font-bold">در حال استخراج آگهی‌ها…</p>
            <p className="text-sm text-muted-foreground">
              {progress && progress.total > 0
                ? `${progress.done.toLocaleString("fa-IR")} از ${progress.total.toLocaleString("fa-IR")} بلوک پردازش شد`
                : "خواندن و تجزیه فایل"}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold">
              فایل HTML خام کانال را اینجا رها کنید
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              یا برای انتخاب فایل کلیک کنید — فرمت‌های{" "}
              <span className="font-medium text-foreground/80">
                .html، .htm و .txt
              </span>{" "}
              پشتیبانی می‌شوند.
            </p>
            <p className="text-xs text-muted-foreground/80">
              آگهی‌های بدون شماره تلفن به‌صورت خودکار نادیده گرفته می‌شوند.
            </p>
          </>
        )}
      </div>

      {loading && (
        <div className="relative h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-l from-primary to-gold transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {!loading && (
        <div className="relative flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            size="sm"
            className="pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <FileCode2 className="size-4" />
            انتخاب فایل
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onSample();
            }}
          >
            <Sparkles className="size-4" />
            آزمایش با داده نمونه
          </Button>
        </div>
      )}
    </div>
  );
}
