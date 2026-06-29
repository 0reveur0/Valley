import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bookmark, BookmarkCheck, FolderPlus, Plus, Check } from "lucide-react";

interface Collection {
  id: string;
  name: string;
}

interface BookmarkButtonProps {
  docId: string;
}

export function BookmarkButton({ docId }: BookmarkButtonProps) {
  const qc = useQueryClient();
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [colSuccess, setColSuccess] = useState<string | null>(null);

  const { data: saveStatus } = useQuery({
    queryKey: ["save-status", docId],
    queryFn: async () => {
      const res = await apiFetch(`/api/documents/${docId}/save-status`);
      if (!res.ok) return { saved: false };
      return res.json() as Promise<{ saved: boolean }>;
    },
  });

  const { data: collectionsData } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const res = await apiFetch("/api/collections");
      if (!res.ok) return { collections: [] };
      return res.json() as Promise<{ collections: Collection[] }>;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/documents/${docId}/save`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["save-status", docId] });
      qc.invalidateQueries({ queryKey: ["user-library"] });
    },
  });

  const addToColMutation = useMutation({
    mutationFn: async (colId: string) => {
      setAddingToCol(colId);
      const res = await apiFetch(`/api/collections/${colId}/documents`, {
        method: "POST",
        body: JSON.stringify({ documentId: docId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return { ...data, colId };
    },
    onSuccess: (data) => {
      setAddingToCol(null);
      setColSuccess(data.colId);
      setTimeout(() => setColSuccess(null), 2000);
      qc.invalidateQueries({ queryKey: ["user-library"] });
    },
    onError: () => setAddingToCol(null),
  });

  const isSaved = saveStatus?.saved ?? false;
  const collections = collectionsData?.collections ?? [];

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        className={`gap-1.5 transition-all ${isSaved ? "border-emerald-500 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : ""}`}
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        {isSaved ? (
          <BookmarkCheck className="w-4 h-4 fill-emerald-500 text-emerald-500" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
        {isSaved ? "Đã lưu" : "Lưu"}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm vào</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {collections.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">Chưa có bộ sưu tập nào</div>
          ) : (
            collections.map((col) => (
              <DropdownMenuItem
                key={col.id}
                onClick={() => addToColMutation.mutate(col.id)}
                disabled={addingToCol === col.id}
                className="gap-2 cursor-pointer"
              >
                {colSuccess === col.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <FolderPlus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                )}
                <span className="truncate text-sm">{col.name}</span>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/workspace?tab=library" className="gap-2 cursor-pointer text-emerald-600">
              <Plus className="w-3.5 h-3.5" />
              <span className="text-sm">Tạo bộ sưu tập mới</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
