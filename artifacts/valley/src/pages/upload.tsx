import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { BASE } from "@/lib/api";
import { Link } from "wouter";

type UploadState = "idle" | "uploading" | "approved" | "pending" | "rejected" | "error";

export default function UploadPage() {
  const { data: user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <p className="text-gray-600 mb-4">Bạn cần đăng nhập để đăng tải tài liệu.</p>
          <Link href="/login"><Button className="bg-emerald-600 hover:bg-emerald-700">Đăng nhập</Button></Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMessage("Vui lòng chọn tệp PDF."); return; }
    setState("uploading");
    setMessage("");
    setRejectionReason("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name.replace(/\.pdf$/i, ""));
    formData.append("description", description);

    try {
      const res = await fetch(`${BASE}/api/documents/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();

      if (res.status === 201) {
        setState("approved");
        setMessage(data.message ?? "Tài liệu đã được duyệt!");
        qc.invalidateQueries({ queryKey: ["auth", "me"] });
      } else if (res.status === 202) {
        setState("pending");
        setMessage(data.message ?? "Tài liệu đang chờ kiểm duyệt.");
      } else if (res.status === 422) {
        setState("rejected");
        setMessage(data.error ?? "Tài liệu bị từ chối.");
        setRejectionReason(data.rejectionReason ?? "");
      } else {
        setState("error");
        setMessage(data.error ?? "Đã xảy ra lỗi, vui lòng thử lại.");
      }
    } catch {
      setState("error");
      setMessage("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              Đăng tải tài liệu
            </CardTitle>
            <p className="text-sm text-gray-500">Chia sẻ PDF và kiếm <strong className="text-emerald-600">+10 điểm</strong> khi được duyệt</p>
          </CardHeader>
          <CardContent>
            {(state === "approved" || state === "pending" || state === "rejected") ? (
              <div className="text-center py-8">
                {state === "approved" && <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />}
                {state === "pending" && <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />}
                {state === "rejected" && <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />}
                <p className="text-lg font-semibold text-gray-900 mb-2">{message}</p>
                {rejectionReason && <p className="text-sm text-red-500 mb-4">{rejectionReason}</p>}
                <div className="flex gap-3 justify-center mt-4">
                  <Button variant="outline" onClick={() => { setState("idle"); setFile(null); setTitle(""); setDescription(""); if (fileRef.current) fileRef.current.value = ""; }}>
                    Đăng tải thêm
                  </Button>
                  <Link href="/workspace"><Button className="bg-emerald-600 hover:bg-emerald-700">Xem Workspace</Button></Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label>Tệp PDF</Label>
                  <div
                    className="mt-1 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    {file ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-600">
                        <FileText className="w-5 h-5" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-gray-400">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Nhấn để chọn tệp PDF (tối đa 20MB)</p>
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Tiêu đề (tuỳ chọn)</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên tài liệu sẽ hiển thị..." />
                </div>

                <div>
                  <Label htmlFor="description">Mô tả (tuỳ chọn)</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn về nội dung tài liệu..." rows={3} />
                </div>

                {(state === "error") && <p className="text-red-500 text-sm">{message}</p>}

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2" disabled={state === "uploading" || !file}>
                  {state === "uploading" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang tải lên & kiểm duyệt...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Đăng tải tài liệu
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
