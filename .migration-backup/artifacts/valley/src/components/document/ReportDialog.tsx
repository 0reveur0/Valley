import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Flag, CheckCircle } from "lucide-react";

const REASONS = [
  "Bản quyền",
  "File lỗi",
  "Nội dung sai lệch",
  "Nội dung không phù hợp",
  "Khác",
] as const;

type Reason = (typeof REASONS)[number];

interface ReportDialogProps {
  docId: string;
}

export function ReportDialog({ docId }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const report = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/documents/${docId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gửi báo cáo thất bại");
      return data;
    },
    onSuccess: () => {
      setDone(true);
      setError("");
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setReason("");
        setNote("");
      }, 2500);
    },
    onError: (err: any) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    report.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors py-1">
          <Flag className="w-3.5 h-3.5" />
          Báo cáo vi phạm
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            Báo cáo tài liệu
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="font-medium text-gray-800">Báo cáo đã được ghi nhận!</p>
            <p className="text-sm text-gray-500">Cảm ơn bạn đã giúp cộng đồng Valley an toàn hơn.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Lý do báo cáo <span className="text-red-500">*</span></p>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-emerald-600"
                    />
                    <span className="text-sm text-gray-700">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">Mô tả thêm (tuỳ chọn)</p>
              <Textarea
                placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={!reason || report.isPending}
              >
                {report.isPending ? "Đang gửi..." : "Gửi báo cáo"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
