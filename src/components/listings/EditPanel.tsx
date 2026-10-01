import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FolderPlus, NotebookPen, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface Folder {
  _id: string;
  name: string;
  color?: string;
}

interface EditPanelProps {
  notes: string;
  onSaveNotes: (notes: string) => Promise<void>;
  folderIds: string[];
  folders: Folder[];
  onToggleFolder: (folderId: string) => Promise<void>;
  currentAddress: string;
  currentDivarUrl: string;
  currentMapsUrl: string;
  onSaveLocation: (patch: {
    address: string;
    divarUrl: string;
    mapsUrl: string;
  }) => Promise<void>;
  /** فقط مدیر و مشاور این ابزارها را می‌بینند. */
  canEdit: boolean;
}

/** یادداشت، بایگانی در زونکن و ویرایش لوکیشن/لینک برای یک آگهی. */
export default function EditPanel({
  notes,
  onSaveNotes,
  folderIds,
  folders,
  onToggleFolder,
  currentAddress,
  currentDivarUrl,
  currentMapsUrl,
  onSaveLocation,
  canEdit,
}: EditPanelProps) {
  const [open, setOpen] = useState(false);
  const [draftNotes, setDraftNotes] = useState(notes);
  const [address, setAddress] = useState(currentAddress);
  const [divar, setDivar] = useState(currentDivarUrl);
  const [map, setMap] = useState(currentMapsUrl);
  const [saving, setSaving] = useState(false);

  const toggleOpen = () => {
    setDraftNotes(notes);
    setAddress(currentAddress);
    setDivar(currentDivarUrl);
    setMap(currentMapsUrl);
    setOpen((v) => !v);
  };

  if (!canEdit) return null;

  const saveAll = async () => {
    setSaving(true);
    try {
      if (draftNotes !== notes) await onSaveNotes(draftNotes);
      if (
        address !== currentAddress ||
        divar !== currentDivarUrl ||
        map !== currentMapsUrl
      ) {
        await onSaveLocation({
          address,
          divarUrl: divar,
          mapsUrl: map,
        });
      }
      toast.success("تغییرات ذخیره شد");
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("ذخیرهٔ تغییرات ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={toggleOpen}
        >
          {open ? (
            <X className="size-3.5" />
          ) : (
            <Pencil className="size-3.5" />
          )}
          یادداشت و بایگانی
        </Button>

        {folders.map((f) => {
          const active = folderIds.includes(f._id);
          return (
            <button
              key={f._id}
              type="button"
              onClick={() => void onToggleFolder(f._id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors",
                active
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {active && <NotebookPen className="size-3" />}
              {f.name}
            </button>
          );
        })}

        {folders.length === 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <FolderPlus className="size-3" />
            زونکنی ساخته نشده — از بخش بایگانی بسازید
          </span>
        )}
      </div>

      {!open && notes && (
        <p className="line-clamp-2 whitespace-pre-line text-[13px] leading-6 text-muted-foreground">
          {notes}
        </p>
      )}

      {open && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              یادداشت روی پرونده
            </Label>
            <Textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="مثلاً: تماس گرفته شد، قیمت قابل مذاکره…"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">آدرس</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="آدرس دقیق ملک"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                لینک دیوار
              </Label>
              <Input
                dir="ltr"
                value={divar}
                onChange={(e) => setDivar(e.target.value)}
                placeholder="https://divar.ir/v/..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                لینک گوگل‌مپ
              </Label>
              <Input
                dir="ltr"
                value={map}
                onChange={(e) => setMap(e.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={saving}
              onClick={() => void saveAll()}
            >
              <Save className="size-4" />
              {saving ? "در حال ذخیره…" : "ذخیره"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
