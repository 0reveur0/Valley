import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Download, Eye, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { StarRating } from "@/components/document/StarRating";
import { CommentSection } from "@/components/document/CommentSection";
import { ReportDialog } from "@/components/document/ReportDialog";
import { BookmarkButton } from "@/components/document/BookmarkButton";

function useDocument(id: string) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/documents/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("not_found");
        throw new Error("fetch_error");
      }
      return res.json();
    },
    retry: false,
    enabled: !!id,
  });
}

function useRating(docId: string) {
  return useQuery({
    queryKey: ["rating", docId],
    queryFn: async () => {
      const res = await apiFetch(`/api/documents/${docId}/rating`);
      if (!res.ok) return { avg: 0, total: 0, userRating: null };
      return res.json() as Promise<{ avg: number; total: number; userRating: number | null }>;
    },
    enabled: !!docId,
  });
}

function useComments(docId: string) {
  return useQuery({
    queryKey: ["comments", docId],
    queryFn: async () => {
      const res = await apiFetch(`/api/documents/${docId}/comments`);
      if (!res.ok) return { comments: [] };
      return res.json();
    },
    enabled: !!docId,
  });
}

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: user } = useAuth();
  const { data: doc, isLoading, error } = useDocument(id ?? "");
  const { data: ratingData, refetch: refetchRating } = useRating(id ?? "");
  const { data: commentsData } = useComments(id ?? "");
  const qc = useQueryClient();
  const [downloadMsg, setDownloadMsg] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/documents/${id}/download-request`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "INSUFFICIENT_CREDITS") throw new Error("insufficient");
        throw new Error(data.error ?? "Download failed");
      }
      return data;
    },
    onSuccess: (data) => {
      setDownloadMsg("Đang tải xuống...");
      setDownloadError("");
      window.open(data.downloadUrl, "_blank");
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (err: any) => {
      if (err.message === "insufficient") {
        setDownloadError("Bạn không đủ điểm để tải tài liệu này. Hãy tải lên thêm tài liệu hoặc điểm danh hàng ngày!");
      } else {
        setDownloadError(err.message);
      }
    },
  });

  const rateMutation = useMutation({
    mutationFn: async (stars: number) => {
      const res = await apiFetch(`/api/documents/${id}/rate`, {
        method: "POST",
        body: JSON.stringify({ stars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi đánh giá");
      return data;
    },
    onSuccess: () => refetchRating(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Không tìm thấy tài liệu</h2>
          <Link href="/explore"><Button variant="outline">← Quay lại khám phá</Button></Link>
        </div>
      </div>
    );
  }

  const rating = ratingData ?? { avg: 0, total: 0, userRating: null };
  const comments = commentsData?.comments ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/explore" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: doc info + viewer + interactions */}
          <div className="md:col-span-2 space-y-5">
            <Card>
              <CardContent className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{doc.title}</h1>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{doc.viewCount} lượt xem</span>
                  <span className="flex items-center gap-1"><Download className="w-4 h-4" />{doc.downloadCount} lượt tải</span>
                  <span>{doc.totalPages} trang</span>
                  {doc.uploaderEmail && <span>bởi <strong>{doc.uploaderEmail}</strong></span>}
                </div>

                {/* Star rating display */}
                <div className="mb-4">
                  <StarRating
                    avg={Number(rating.avg)}
                    total={rating.total}
                    userRating={rating.userRating}
                    onRate={(stars) => rateMutation.mutate(stars)}
                    isPending={rateMutation.isPending}
                    canRate={!!user}
                  />
                </div>

                {/* PDF preview placeholder */}
                <div className="w-full h-64 bg-emerald-50 rounded-lg flex flex-col items-center justify-center gap-3">
                  <BookOpen className="w-20 h-20 text-emerald-200" />
                  <p className="text-sm text-emerald-400">Tải xuống để xem toàn bộ nội dung</p>
                </div>

                {/* Bookmark & Report row */}
                {user && (
                  <div className="mt-4 flex items-center justify-between">
                    <BookmarkButton docId={id ?? ""} />
                    <ReportDialog docId={id ?? ""} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardContent className="p-6">
                <CommentSection
                  docId={id ?? ""}
                  comments={comments}
                  isLoggedIn={!!user}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: download card */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-emerald-600">{doc.pointsRequired}</div>
                  <div className="text-sm text-gray-500">điểm cần thiết</div>
                </div>

                {!user ? (
                  <div className="space-y-2">
                    <Link href="/login">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Đăng nhập để tải</Button>
                    </Link>
                    <Link href="/register">
                      <Button variant="outline" className="w-full">Đăng ký miễn phí</Button>
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-gray-600 mb-3 text-center">
                      Số dư của bạn: <strong className="text-emerald-600">{user.credits} điểm</strong>
                    </div>
                    {downloadMsg && (
                      <div className="flex items-center gap-2 text-emerald-600 text-sm mb-3">
                        <CheckCircle className="w-4 h-4" /> {downloadMsg}
                      </div>
                    )}
                    {downloadError && (
                      <div className="flex items-start gap-2 text-red-500 text-sm mb-3">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {downloadError}
                      </div>
                    )}
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                      onClick={() => downloadMutation.mutate()}
                      disabled={downloadMutation.isPending}
                    >
                      <Download className="w-4 h-4" />
                      {downloadMutation.isPending ? "Đang xử lý..." : "Tải xuống"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {user?.membershipType === "Free" && doc.pointsRequired > 0 && (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 text-sm text-emerald-800">
                  <strong>Mẹo:</strong> Tải lên tài liệu để kiếm điểm, hoặc điểm danh mỗi ngày để nhận +2 điểm!
                </CardContent>
              </Card>
            )}

            {/* Rating summary card */}
            {rating.total > 0 && (
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-4xl font-bold text-amber-500 mb-1">{rating.avg}</div>
                  <div className="flex justify-center mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`text-lg ${s <= Math.round(Number(rating.avg)) ? "text-amber-400" : "text-gray-200"}`}>★</span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">{rating.total} đánh giá</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
