"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getPublicTimetableUrl,
  timetableApi,
  type TimetableResponse,
  type WeekPublishStatusResponse,
} from "@/lib/api";

interface PublishTimetableDialogProps {
  timetableId: number;
  isPublic: boolean;
  publicToken: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (updated: TimetableResponse) => void;
}

export function PublishTimetableDialog({
  timetableId,
  isPublic,
  publicToken,
  open,
  onOpenChange,
  onChanged,
}: PublishTimetableDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [weeks, setWeeks] = useState<WeekPublishStatusResponse[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setLoading(true);
    timetableApi
      .getPublishStatus(timetableId)
      .then((statuses) => {
        setWeeks(statuses);
        setSelected(new Set(statuses.filter((w) => w.isPublished).map((w) => w.weekId)));
      })
      .catch(() => toast.error("Không thể tải trạng thái công khai"))
      .finally(() => setLoading(false));
  }, [open, timetableId]);

  const toggleWeek = (weekId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const updated = await timetableApi.publish(timetableId, [...selected]);
      onChanged(updated);
      setWeeks((prev) => prev.map((w) => ({ ...w, isPublished: selected.has(w.weekId) })));
      toast.success(selected.size > 0 ? "Đã cập nhật công khai" : "Đã thu hồi công khai");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể cập nhật");
    } finally {
      setSubmitting(false);
    }
  };

  const url = isPublic && publicToken ? getPublicTimetableUrl(publicToken) : null;

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const confirmLabel =
    selected.size > 0 ? `${isPublic ? "Cập nhật" : "Công khai"} (${selected.size})` : "Thu hồi công khai";
  const confirmDisabled = submitting || loading || (selected.size === 0 && !isPublic);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Công khai thời khoá biểu</DialogTitle>
        </DialogHeader>

        {url && (
          <div className="min-w-0 w-full flex items-center gap-2 rounded-lg border border-md-outline-variant bg-md-surface-container-low px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate" title={url}>{url}</span>
            <Button variant="ghost" size="icon-sm" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 text-md-on-surface-variant">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-80 overflow-y-auto sm:grid-cols-3">
              {weeks.map((w) => {
                const checkbox = (
                  <label
                    key={w.weekId}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      w.eligible ? "cursor-pointer hover:bg-md-surface-container-low" : "cursor-not-allowed opacity-50"
                    }`}
                  >
                    <Checkbox
                      checked={selected.has(w.weekId)}
                      disabled={!w.eligible}
                      onCheckedChange={() => toggleWeek(w.weekId)}
                    />
                    Tuần {w.weekNumber}
                  </label>
                );
                if (w.eligible) return checkbox;
                return (
                  <Tooltip key={w.weekId}>
                    <TooltipTrigger asChild>{checkbox}</TooltipTrigger>
                    <TooltipContent>{w.reason}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmDisabled}
            variant={selected.size === 0 ? "destructive" : "default"}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
