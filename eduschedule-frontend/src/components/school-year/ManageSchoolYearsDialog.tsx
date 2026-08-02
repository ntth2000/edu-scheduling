"use client";

import { useState } from "react";
import { Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { schoolYearApi, type SchoolYearResponse } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolYears: SchoolYearResponse[];
  onDeleted: (id: number) => void;
}

export function ManageSchoolYearsDialog({ open, onOpenChange, schoolYears, onDeleted }: Props) {
  const [yearToDelete, setYearToDelete] = useState<SchoolYearResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!yearToDelete) return;
    setIsDeleting(true);
    try {
      await schoolYearApi.delete(yearToDelete.id);
      window.dispatchEvent(new CustomEvent("schoolyear:deleted", { detail: yearToDelete.id }));
      onDeleted(yearToDelete.id);
      toast.success(`Đã xóa năm học ${yearToDelete.name}`);
      setYearToDelete(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không thể xóa năm học");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Quản lý năm học</DialogTitle>
          </DialogHeader>

          <div className="max-h-80 space-y-1 overflow-y-auto py-1">
            {schoolYears.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500">Chưa có năm học nào</p>
            )}
            {schoolYears.map((y) => (
              <div
                key={y.id}
                className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {y.name}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Xóa năm học ${y.name}`}
                  onClick={() => setYearToDelete(y)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!yearToDelete} onOpenChange={(open) => !open && setYearToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa năm học {yearToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Năm học chỉ có thể xóa khi chưa có lớp học hoặc thời khóa biểu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
