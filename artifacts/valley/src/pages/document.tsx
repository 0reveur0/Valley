import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Download, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
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

function buildPreviewUrl(pattern: string, page: number) {
  return pattern.replace("{{page}}", String(page));
}

function DocumentPreview({
  previewPattern,
  totalPages,
  isUnlocked,
  onUnlock,
  unlockPending,
  pointsRequired,
  user,
}: {
  previewPattern?: string;
  totalPages: number;
  isUnlocked: boolean;
  onUnlock: () => void;
  unlockPending: boolean;
  pointsRequired: number;
  user: { id: string } | null;
}) {
  const previewPageCount = Math.min(totalPages, isUnlocked ? totalPages : 4);
  const pageNumbers = Array.from({ length: previewPageCount }, (_, index) => index + 1);

  return (
    <div className="rounded-[32px] border border-zinc-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50 px-6 py-5 border-b border-zinc-100">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">Đọc thử tài liệu</p>
          <p className="mt-2 text-sm text-zinc-700">
            {isUnlocked ? `${totalPages} trang đầy đủ` : `Xem trước 3 trang đầu`}
          </p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-500">
          {totalPages} trang
        </span>
      </div>

      <div className="space-y-5 p-6">
        {previewPattern ? (
          pageNumbers.map((page) => {
            const isMaskPage = !isUnlocked && page === 4;
            return (
              <div key={page} className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-slate-50">
                <img
                  src={buildPreviewUrl(previewPattern, page)}
                  alt={`Trang ${page}`}
                  className={`w-full object-cover transition duration-300 ${isMaskPage ? "brightness-90 blur-sm" : ""}`}
                />
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
                  Trang {page}
                </div>
                {isMaskPage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl bg-white/85 px-5 text-center backdrop-blur-sm">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-zinc-900">Bạn muốn xem tiếp phần còn lại của tài liệu này?</p>
                      <p className="text-sm leading-6 text-zinc-500">
                        Tài liệu này gồm {totalPages} trang. Hãy sử dụng điểm thưởng của bạn để mở khóa toàn bộ nội dung và tải file chất lượng cao về máy.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                      {user ? (
                        <Button
                          className="rounded-full bg-zinc-900 px-6 py-3 text-sm text-white hover:bg-zinc-800"
                          onClick={onUnlock}
                          disabled={unlockPending}
                        >
                          {unlockPending ? "Đang mở khóa..." : `Mở khóa toàn bộ (${pointsRequired} credits)`}
                        </Button>
                      ) : (
                        <Link href="/login">
                          <Button className="rounded-full bg-zinc-900 px-6 py-3 text-sm text-white hover:bg-zinc-800">
                            Đăng nhập để mở khóa
                          </Button>
                        </Link>
                      )}
                      <Link href="/earn-credits" className="w-full sm:w-auto">
                        <Button variant="outline" className="rounded-full px-6 py-3 text-sm text-zinc-700 hover:border-zinc-300">
                          Kiếm thêm credits
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-slate-50 p-10 text-center text-sm text-zinc-500">
            Không có bản xem trước trang sẵn sàng cho tài liệu này.
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useAuth();
  const { data: doc, isLoading, error } = useDocument(id ?? "");
  const { data: ratingData, refetch: refetchRating } = useRating(id ?? "");
  const { data: commentsData } = useComments(id ?? "");
  const qc = useQueryClient();
  const [downloadMsg, setDownloadMsg] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [viewerUnlocked, setViewerUnlocked] = useState(false);

  const hasUnlocked = useMemo(() => {
    if (!doc) return false;
    return doc.hasUnlocked || viewerUnlocked;
  }, [doc, viewerUnlocked]);

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
      setDownloadMsg("Mở khóa thành công. Đang tải file... ");
      setDownloadError("");
      setViewerUnlocked(true);
      window.open(data.downloadUrl, "_blank");
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: ["document", id] });
    },
    onError: (err: any) => {
      if (err.message === "insufficient") {
        setDownloadError("Bạn không đủ điểm để tải tài liệu này. Hãy kiếm thêm hoặc mời bạn bè!");
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
  const canOpenOriginal = hasUnlocked && !!doc.fileUrl;
  const canUnlock = !!user && !hasUnlocked && doc.pointsRequired > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/explore" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-5">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900">{doc.title}</h1>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1">{doc.viewCount} lượt xem</span>
                    <span className="inline-flex items-center gap-1">{doc.downloadCount} lượt tải</span>
                    <span>{doc.totalPages} trang</span>
                    {doc.uploaderEmail && (
                      <span>
                        bởi{' '}
                        <Link href={`/profile/${doc.uploaderId}`} className="font-semibold text-emerald-600 hover:underline">
                          {doc.uploaderEmail.split("@")[0]}
                        </Link>
                      </span>
                    )}
                  </div>
                </div>

                <DocumentPreview
                  previewPattern={doc.previewPattern}
                  totalPages={doc.totalPages}
                  isUnlocked={hasUnlocked}
                  onUnlock={() => downloadMutation.mutate()}
                  unlockPending={downloadMutation.isPending}
                  pointsRequired={doc.pointsRequired}
                  user={user ?? null}
                />

                {canOpenOriginal && (
                  <div className="rounded-3xl border border-zinc-100 bg-white p-5 text-center shadow-sm">
                    <p className="text-sm text-zinc-600 mb-4">Bạn đã mở khóa toàn bộ tài liệu. Tải bản PDF gốc chất lượng cao để đọc offline.</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 sm:w-auto"
                      >
                        Tải File Gốc (PDF)
                      </a>
                      {canUnlock && (
                        <Button
                          variant="outline"
                          className="w-full rounded-full px-6 py-3 text-sm text-zinc-700 sm:w-auto"
                          onClick={() => downloadMutation.mutate()}
                          disabled={downloadMutation.isPending}
                        >
                          {downloadMutation.isPending ? "Đang xử lý..." : `Mở khóa toàn bộ (${doc.pointsRequired} credits)`}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <StarRating
                    avg={Number(rating.avg)}
                    total={rating.total}
                    userRating={rating.userRating}
                    onRate={(stars) => rateMutation.mutate(stars)}
                    isPending={rateMutation.isPending}
                    canRate={!!user}
                  />
                  {user && (
                    <div className="text-sm text-zinc-500">Bạn có thể đánh giá tài liệu này sau khi đọc thử.</div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  {user && <BookmarkButton docId={id ?? ""} />}
                  <ReportDialog docId={id ?? ""} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <CommentSection docId={id ?? ""} comments={comments} isLoggedIn={!!user} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="text-center mb-5">
                  <div className="text-3xl font-bold text-emerald-600">{doc.pointsRequired}</div>
                  <div className="text-sm text-gray-500">credit cần để mở khóa</div>
                </div>

                {!user ? (
                  <div className="space-y-3">
                    <Link href="/login">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Đăng nhập để mở khóa</Button>
                    </Link>
                    <Link href="/register">
                      <Button variant="outline" className="w-full">Đăng ký miễn phí</Button>
                    </Link>
                  </div>
                ) : canUnlock ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 text-center">
                      Số dư hiện tại: <strong className="text-emerald-600">{user.credits} điểm</strong>
                    </div>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                      onClick={() => downloadMutation.mutate()}
                      disabled={downloadMutation.isPending}
                    >
                      <Download className="w-4 h-4" />
                      {downloadMutation.isPending ? "Đang mở khóa..." : `Mở khóa toàn bộ (${doc.pointsRequired} credits)`}
                    </Button>
                    <Link href="/earn-credits">
                      <Button variant="outline" className="w-full">Kiếm thêm credits</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 text-center">
                    {hasUnlocked ? (
                      "Bạn đã mở khóa tài liệu này."
                    ) : (
                      "Tài liệu này miễn phí hoặc đã được mở khóa tự động."
                    )}
                  </div>
                )}

                {downloadMsg && (
                  <div className="mt-4 rounded-3xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {downloadMsg}
                  </div>
                )}
                {downloadError && (
                  <div className="mt-4 rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {downloadError}
                  </div>
                )}
              </CardContent>
            </Card>

            {user?.membershipType === "Free" && doc.pointsRequired > 0 && (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 text-sm text-emerald-800">
                  <strong>Mẹo:</strong> Điểm danh mỗi ngày hoặc mời bạn bè để nhận thêm credits và mở khóa tài liệu nhanh hơn.
                </CardContent>
              </Card>
            )}

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
