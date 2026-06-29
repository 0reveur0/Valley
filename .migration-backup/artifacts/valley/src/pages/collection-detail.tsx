import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ChevronRight, Folder, Trash2, Pencil, Check,
  X, Eye, Download, ArrowLeft, Lock, Globe,
} from "lucide-react";

interface Doc {
  id: string;
  title: string;
  slug: string;
  totalPages: number;
  viewCount: number;
  downloadCount: number;
  pointsRequired: number;
}

interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  isPublic: number;
  createdAt: string;
}

function useCollectionDetail(colId: string) {
  return useQuery({
    queryKey: ["col-detail", colId],
    queryFn: async () => {
      const res = await apiFetch(`/api/collections/${colId}/documents`);
      if (res.status === 404) throw new Error("not_found");
      if (res.status === 403) throw new Error("forbidden");
      if (!res.ok) throw new Error("fetch_error");
      return res.json() as Promise<{ collection: Collection; documents: Doc[] }>;
    },
    retry: false,
    enabled: !!colId,
  });
}

function RenameForm({
  colId,
  current,
  currentDesc,
  onDone,
}: {
  colId: string;
  current: string;
  currentDesc?: string | null;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(current);
  const [desc, setDesc] = useState(currentDesc ?? "");
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/collections/${colId}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description: desc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi đổi tên");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["col-detail", colId] });
      qc.invalidateQueries({ queryKey: ["user-library"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
      onDone();
    },
    onError: (err: any) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-2 bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-md">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tên bộ sưu tập"
        maxLength={100}
        autoFocus
      />
      <Input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Mô tả (tuỳ chọn)"
        maxLength={200}
      />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 gap-1"
          onClick={() => save.mutate()}
          disabled={!name.trim() || save.isPending}
        >
          <Check className="w-3.5 h-3.5" />
          {save.isPending ? "Lưu..." : "Lưu"}
        </Button>
        <Button size="sm" variant="outline" onClick={onDone} className="gap-1">
          <X className="w-3.5 h-3.5" /> Huỷ
        </Button>
      </div>
    </div>
  );
}

function DocCard({ doc, colId, onRemoved }: { doc: Doc; colId: string; onRemoved: () => void }) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: async () => {
      await apiFetch(`/api/collections/${colId}/documents/${doc.id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["col-detail", colId] });
      qc.invalidateQueries({ queryKey: ["col-docs", colId] });
      onRemoved();
    },
  });

  return (
    <Card className="group relative border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <Link href={`/documents/${doc.id}`}>
          <div className="w-full h-28 bg-emerald-50 rounded-lg flex items-center justify-center mb-3 cursor-pointer hover:bg-emerald-100 transition-colors">
            <BookOpen className="w-10 h-10 text-emerald-200" />
          </div>
        </Link>

        <Link href={`/documents/${doc.id}`} className="block hover:text-emerald-700 transition-colors">
          <p className="font-medium text-sm text-gray-900 line-clamp-2 leading-snug mb-2">{doc.title}</p>
        </Link>

        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span>{doc.totalPages} trang</span>
          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{doc.viewCount}</span>
          <span className="flex items-center gap-0.5"><Download className="w-3 h-3" />{doc.downloadCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {doc.pointsRequired} điểm
          </span>
          <button
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Xoá khỏi bộ sưu tập"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {remove.isPending ? "Đang xoá..." : "Xoá"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data, isLoading, error } = useCollectionDetail(id ?? "");

  const deleteCollection = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/collections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xoá thất bại");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-library"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
      navigate("/workspace?tab=library");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    const msg =
      (error as any).message === "not_found"
        ? { title: "404 — Không tìm thấy", body: "Bộ sưu tập này không tồn tại hoặc đã bị xoá." }
        : (error as any).message === "forbidden"
        ? { title: "403 — Không có quyền truy cập", body: "Bộ sưu tập này ở chế độ riêng tư." }
        : { title: "Lỗi tải dữ liệu", body: "Vui lòng thử lại." };
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <Folder className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">{msg.title}</h2>
          <p className="text-gray-500 mb-4">{msg.body}</p>
          <Link href="/workspace?tab=library">
            <Button variant="outline" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Về Thư viện
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const col = data!.collection;
  const docs = data!.documents;
  const isOwner = user?.id === col.userId;
  const isPublic = col.isPublic === 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400">
          <Link href="/workspace" className="hover:text-gray-600 transition-colors">Workspace</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/workspace?tab=library" className="hover:text-gray-600 transition-colors">Thư viện của tôi</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium truncate max-w-48">{col.name}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <Folder className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <RenameForm
                  colId={col.id}
                  current={col.name}
                  currentDesc={col.description}
                  onDone={() => setEditing(false)}
                />
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900">{col.name}</h1>
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        isPublic
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {isPublic ? "Công khai" : "Riêng tư"}
                    </span>
                  </div>
                  {col.description && (
                    <p className="text-gray-500 mt-1 text-sm">{col.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {docs.length} tài liệu •{" "}
                    {new Date(col.createdAt).toLocaleDateString("vi-VN", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                    })}
                  </p>
                </>
              )}
            </div>
          </div>

          {isOwner && !editing && (
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setEditing(true)}
              >
                <Pencil className="w-3.5 h-3.5" /> Đổi tên
              </Button>
              {deleteConfirm ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 gap-1"
                    onClick={() => deleteCollection.mutate()}
                    disabled={deleteCollection.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleteCollection.isPending ? "Đang xoá..." : "Xác nhận xoá"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(false)}>
                    Huỷ
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xoá
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Documents grid */}
        {docs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BookOpen className="w-14 h-14 mx-auto mb-4 text-gray-200" />
            <p className="font-medium text-gray-500 mb-1">Bộ sưu tập đang trống</p>
            <p className="text-sm mb-4">Thêm tài liệu từ trang chi tiết bằng nút "Thêm vào".</p>
            <Link href="/explore">
              <Button className="bg-emerald-600 hover:bg-emerald-700">Khám phá tài liệu</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {docs.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                colId={col.id}
                onRemoved={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
