"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { schoolYearApi, type SchoolYearResponse } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (year: SchoolYearResponse) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 1 + i);

export function CreateSchoolYearDialog({ open, onOpenChange, onCreated }: Props) {
  const [startYear, setStartYear] = useState(String(CURRENT_YEAR - 1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStartYear(String(CURRENT_YEAR - 1));
      setError("");
    }
  }, [open]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const created = await schoolYearApi.create(parseInt(startYear));
      onCreated(created);
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">Tạo năm học mới</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <Select
            value={startYear}
            onValueChange={(v) => { setStartYear(v); setError(""); }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}–{y + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Đang tạo..." : "Tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
