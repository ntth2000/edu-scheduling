"use client";

import { useEffect, useState } from "react";
import {
  specialRoomApi,
  subjectApi,
  type SpecialRoomResponse,
  type SubjectResponse,
} from "@/lib/api";
import { emitSpecialRoomsChanged } from "@/lib/special-room-events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FormState {
  name: string;
  quantity: string;
  subjectId: string;
}

const EMPTY_FORM: FormState = { name: "", quantity: "1", subjectId: "none" };

export function SpecialRoomTable() {
  const [rooms, setRooms] = useState<SpecialRoomResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<SpecialRoomResponse | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<SpecialRoomResponse | null>(null);

  useEffect(() => {
    Promise.all([specialRoomApi.getAll(), subjectApi.getAll()])
      .then(([r, s]) => {
        setRooms(r);
        setSubjects(s);
      })
      .catch(() => toast.error("Không thể tải dữ liệu"))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditingRoom(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (room: SpecialRoomResponse) => {
    setEditingRoom(room);
    setForm({
      name: room.name,
      quantity: String(room.quantity),
      subjectId: room.subjectId != null ? String(room.subjectId) : "none",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) { toast.error("Tên phòng không được để trống"); return; }
    const quantity = parseInt(form.quantity, 10);
    if (!quantity || quantity < 1) { toast.error("Số lượng phải >= 1"); return; }

    const body = {
      name,
      quantity,
      subjectId: form.subjectId !== "none" ? Number(form.subjectId) : null,
    };

    setSaving(true);
    try {
      if (editingRoom) {
        const updated = await specialRoomApi.update(editingRoom.id, body);
        setRooms((prev) => prev.map((r) => (r.id === editingRoom.id ? updated : r)));
        toast.success("Đã cập nhật phòng chức năng");
      } else {
        const created = await specialRoomApi.create(body);
        setRooms((prev) => [...prev, created]);
        toast.success("Đã thêm phòng chức năng mới");
      }
      emitSpecialRoomsChanged();
      setIsModalOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không thể lưu phòng chức năng");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    try {
      await specialRoomApi.delete(roomToDelete.id);
      setRooms((prev) => prev.filter((r) => r.id !== roomToDelete.id));
      emitSpecialRoomsChanged();
      toast.success(`Đã xóa phòng ${roomToDelete.name}`);
    } catch {
      toast.error("Không thể xóa phòng chức năng");
    }
    setRoomToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-md-surface-container-lowest rounded-xl overflow-hidden shadow-md border border-slate-200">
        {/* Toolbar */}
        <div className="px-6 py-4 flex justify-between items-center bg-md-surface-container-low/30">
          <p className="text-sm text-slate-500">{rooms.length} phòng chức năng</p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Thêm phòng chức năng
          </Button>
        </div>

        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <DoorOpen className="h-7 w-7 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-600">Chưa có phòng chức năng nào</p>
              <p className="text-sm text-slate-400 mt-1">Thêm phòng để giới hạn số lớp học đồng thời khi xếp thời khóa biểu.</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm phòng chức năng
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-md-surface-container-low/30">
                <TableRow>
                  <TableHead className="px-6">Tên phòng</TableHead>
                  <TableHead className="px-4 text-center">Số lượng</TableHead>
                  <TableHead className="px-4">Môn học áp dụng</TableHead>
                  <TableHead className="px-4 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="px-6 font-medium text-md-on-surface">{room.name}</TableCell>
                    <TableCell className="px-4 text-center">
                      <Badge variant="secondary" className="font-semibold">{room.quantity}</Badge>
                    </TableCell>
                    <TableCell className="px-4 text-sm text-slate-600">
                      {room.subjectName ?? (
                        <span className="text-slate-400 italic">Không giới hạn môn</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-md-primary"
                        onClick={() => openEdit(room)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-md-error"
                        onClick={() => setRoomToDelete(room)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) setIsModalOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRoom ? "Chỉnh sửa phòng chức năng" : "Thêm phòng chức năng"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="room-name">Tên phòng <span className="text-red-500">*</span></Label>
              <Input
                id="room-name"
                placeholder="VD: Phòng máy tính"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-qty">Số lượng phòng <span className="text-red-500">*</span></Label>
              <Input
                id="room-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
              <p className="text-xs text-slate-400">
                Tối đa bao nhiêu lớp có thể sử dụng phòng này cùng lúc khi xếp thời khóa biểu.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Môn học áp dụng</Label>
              <Select
                value={form.subjectId}
                onValueChange={(v) => setForm((f) => ({ ...f, subjectId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-slate-400 italic">Chọn môn học</span>
                  </SelectItem>
                  {subjects.map((s) => {
                    const usedByOtherRoom = rooms.some(
                      (r) => r.subjectId === s.id && r.id !== editingRoom?.id
                    );
                    return (
                      <SelectItem key={s.id} value={String(s.id)} disabled={usedByOtherRoom}>
                        {s.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                Chỉ áp dụng giới hạn khi xếp tiết của môn học này. Để trống nếu phòng dùng chung cho mọi môn.
                Mỗi môn chỉ được gắn với một phòng chức năng.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Huỷ</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : editingRoom ? "Lưu thay đổi" : "Thêm phòng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!roomToDelete} onOpenChange={(open) => !open && setRoomToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa phòng "{roomToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Phòng chức năng sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
