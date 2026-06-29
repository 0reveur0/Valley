import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Eye, Download } from "lucide-react";

function useSearch(q: string, category: string, sort: string, page: number) {
  return useQuery({
    queryKey: ["documents", "search", q, category, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({ q, category, sort, page: String(page) });
      const res = await apiFetch(`/api/documents/search?${params}`);
      if (!res.ok) return { documents: [], categories: [], pagination: { page: 1, totalPages: 1, total: 0, pageSize: 12 } };
      return res.json();
    },
    staleTime: 30_000,
  });
}

export default function ExplorePage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSearch(search, category, sort, page);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(q);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Khám phá tài liệu</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm tài liệu..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Tìm kiếm</Button>
          </form>
          <div className="flex gap-3 mt-4 flex-wrap">
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Mới nhất</SelectItem>
                <SelectItem value="most_viewed">Nhiều lượt xem</SelectItem>
              </SelectContent>
            </Select>

            {data?.categories?.length > 0 && (
              <Select value={category} onValueChange={(v) => { setCategory(v === "_all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Tất cả danh mục</SelectItem>
                  {data.categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-40 bg-white rounded-lg animate-pulse" />
            ))}
          </div>
        ) : data?.documents?.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Không tìm thấy tài liệu nào</p>
            <p className="text-sm mt-1">Thử tìm với từ khóa khác</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{data?.pagination?.total ?? 0} tài liệu</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {data?.documents?.map((doc: any) => (
                <Link key={doc.id} href={`/documents/${doc.slug ?? doc.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="w-full h-28 bg-emerald-50 rounded-md flex items-center justify-center mb-3">
                        <BookOpen className="w-10 h-10 text-emerald-300" />
                      </div>
                      <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 mb-1">{doc.title}</h3>
                      {doc.categoryName && (
                        <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mb-2">
                          {doc.categoryName}
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mb-2">{doc.totalPages} trang</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.viewCount}</span>
                        <span className="flex items-center gap-1"><Download className="w-3 h-3" />{doc.downloadCount}</span>
                        <span className="ml-auto text-emerald-600 font-semibold">{doc.pointsRequired} điểm</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {data?.pagination?.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Trước</Button>
                <span className="flex items-center px-4 text-sm text-gray-600">
                  Trang {page} / {data.pagination.totalPages}
                </span>
                <Button variant="outline" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Sau →</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
