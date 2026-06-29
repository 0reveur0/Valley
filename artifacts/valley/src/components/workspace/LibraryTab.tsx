import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Folder, FolderOpen, Bookmark, Plus, Trash2, ChevronRight, ArrowLeft, X } from "lucide-react";
import { Link } from "wouter";

interface Doc { id: string; title: string; totalPages: number; viewCount: number; slug: string; }
interface Collection { id: string; name: string; description?: string; isPublic: number; createdAt: string; }

function DocCard({ doc }: { doc: Doc }) {
  return (
    <Link href={`/documents/${doc.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="w-full h-20 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
            <BookOpen className="w-8 h-8 text-emerald-200" />
          </div>
          <p className="font-medium text-sm text-gray-900 line-clamp-2 leading-snug">{doc.title}</p>
          <p className="text-xs text-gray-400 mt-1">{doc.totalPages} trang • {doc.viewCount} lượt xem</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function CreateCollectionForm({ onSuccess }: { onSuccess: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/collections", {
        method: "POST",
        body: JSON.stringify({ name, description: desc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi tạo bộ sưu tập");
      return data;
    },
    onSuccess: () => {
      setName(""); setDesc(""); setShow(false); setError("");
      qc.invalidateQueries({ queryKey: ["user-library"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
      onSuccess();
    },
    onError: (err: any) => setError(err.message),
  });

  if (!show) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShow(true)}>
        <Plus className="w-4 h-4" /> Tạo bộ sưu tập mới
      </Button>
    );
  }

  return (
    <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm text-gray-800">Bộ sưu tập mới</p>
        <button onClick={() => setShow(false)}><X className="w-4 h-4 text-gray-400" /></button>
      </div>
      <Input placeholder="Tên bộ sưu tập *" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      <Input placeholder="Mô tả (tuỳ chọn)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={200} />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
          {create.isPending ? "Đang tạo..." : "Tạo"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShow(false)}>Huỷ</Button>
      </div>
    </div>
  );
}

function CollectionFolder({
  col, onDelete,
}: {
  col: Collection;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["col-docs", col.id],
    queryFn: async () => {
      const res = await apiFetch(`/api/collections/${col.id}/documents`);
      if (!res.ok) return { documents: [] };
      return res.json() as Promise<{ documents: Doc[] }>;
    },
    enabled: open,
  });

  const removeDoc = useMutation({
    mutationFn: async (docId: string) => {
      await apiFetch(`/api/collections/${col.id}/documents/${docId}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["col-docs", col.id] }),
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          {open ? <FolderOpen className="w-5 h-5 text-amber-500 shrink-0" /> : <Folder className="w-5 h-5 text-amber-400 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">{col.name}</p>
            {col.description && <p className="text-xs text-gray-400 truncate">{col.description}</p>}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/collections/${col.id}`}>
            <button className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors rounded" title="Mở trang chi tiết">
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(col.id); }}
            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded"
            title="Xoá bộ sưu tập"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data?.documents?.length ? (
            <p className="text-sm text-gray-400 text-center py-2">Bộ sưu tập trống. Thêm tài liệu từ trang chi tiết!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.documents.map((doc) => (
                <div key={doc.id} className="relative group">
                  <DocCard doc={doc} />
                  <button
                    onClick={() => removeDoc.mutate(doc.id)}
                    className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Xoá khỏi bộ sưu tập"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LibraryTab() {
  const qc = useQueryClient();
  const [section, setSection] = useState<"saved" | "collections">("saved");

  const { data, isLoading } = useQuery({
    queryKey: ["user-library"],
    queryFn: async () => {
      const res = await apiFetch("/api/user/saved-items");
      if (!res.ok) throw new Error("Lỗi tải thư viện");
      return res.json() as Promise<{ savedDocuments: Doc[]; collections: Collection[] }>;
    },
  });

  const deleteCol = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/collections/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-library"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const savedDocs = data?.savedDocuments ?? [];
  const collections = data?.collections ?? [];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSection("saved")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            section === "saved" ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          Đã lưu
          {savedDocs.length > 0 && (
            <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full">{savedDocs.length}</span>
          )}
        </button>
        <button
          onClick={() => setSection("collections")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            section === "collections" ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Folder className="w-4 h-4" />
          Bộ sưu tập
          {collections.length > 0 && (
            <span className="ml-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{collections.length}</span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : section === "saved" ? (
        savedDocs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bookmark className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-500 mb-1">Chưa có tài liệu nào được lưu</p>
            <p className="text-sm">Bấm icon <Bookmark className="inline w-3.5 h-3.5" /> trên trang tài liệu để lưu vào đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {savedDocs.map((doc) => <DocCard key={doc.id} doc={doc} />)}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <CreateCollectionForm onSuccess={() => {}} />
          {collections.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Folder className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="font-medium text-gray-500 mb-1">Chưa có bộ sưu tập nào</p>
              <p className="text-sm">Tạo bộ sưu tập để tổ chức tài liệu theo chủ đề.</p>
            </div>
          ) : (
            collections.map((col) => (
              <CollectionFolder key={col.id} col={col} onDelete={(id) => deleteCol.mutate(id)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
