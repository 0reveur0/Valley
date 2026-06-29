import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: string;
}

interface CommentSectionProps {
  docId: string;
  comments: Comment[];
  isLoggedIn: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function getAvatarColor(email: string) {
  const colors = [
    "bg-emerald-500", "bg-blue-500", "bg-violet-500",
    "bg-amber-500", "bg-rose-500", "bg-cyan-500",
  ];
  const idx = email.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function CommentSection({ docId, comments, isLoggedIn }: CommentSectionProps) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const postComment = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiFetch(`/api/documents/${docId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi gửi bình luận");
      return data;
    },
    onSuccess: () => {
      setText("");
      setError("");
      qc.invalidateQueries({ queryKey: ["comments", docId] });
    },
    onError: (err: any) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    postComment.mutate(text.trim());
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900">
          Bình luận <span className="text-gray-400 font-normal">({comments.length})</span>
        </h3>
      </div>

      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Chia sẻ nhận xét của bạn về tài liệu này..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={3}
            className="resize-none text-sm"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{text.length}/2000</span>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              disabled={!text.trim() || postComment.isPending}
            >
              <Send className="w-3.5 h-3.5" />
              {postComment.isPending ? "Đang gửi..." : "Gửi"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
          <a href="/login" className="text-emerald-600 font-medium hover:underline">Đăng nhập</a> để bình luận.
        </p>
      )}

      <div className="space-y-4">
        {comments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getAvatarColor(c.userEmail)}`}>
              {getInitials(c.userEmail)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {c.userEmail.split("@")[0]}
                </span>
                <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
