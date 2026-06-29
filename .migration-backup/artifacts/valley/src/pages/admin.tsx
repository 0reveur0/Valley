import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, BookOpen, Users, Clock, BarChart2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function AdminPage() {
  const { data: user, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Record<string, string>>({});

  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/admin/stats");
      if (!res.ok) throw new Error("forbidden");
      return res.json();
    },
    enabled: user?.role === "Admin",
    retry: false,
  });

  const { data: pending, isLoading } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: async () => {
      const res = await apiFetch("/api/admin/pending-documents");
      if (!res.ok) throw new Error("forbidden");
      return res.json();
    },
    enabled: user?.role === "Admin",
    retry: false,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "APPROVE" | "REJECT" }) => {
      const res = await apiFetch(`/api/admin/documents/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");
      return { id, data };
    },
    onSuccess: ({ id, data }) => {
      setMessages((m) => ({ ...m, [id]: data.message ?? "Đã xử lý" }));
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err: any, { id }) => {
      setMessages((m) => ({ ...m, [id]: err.message }));
    },
  });

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!user || user.role !== "Admin") {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <XCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Không có quyền truy cập</h2>
          <Link href="/"><Button variant="outline">Về trang chủ</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-red-500" /> Trang quản trị
        </h1>

        {stats && (
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { icon: BookOpen, label: "Tổng tài liệu", value: stats.totalDocuments, color: "blue" },
              { icon: Clock, label: "Chờ duyệt", value: stats.pendingDocuments, color: "amber" },
              { icon: CheckCircle, label: "Đã duyệt", value: stats.approvedDocuments, color: "emerald" },
              { icon: Users, label: "Người dùng", value: stats.totalUsers, color: "purple" },
            ].map(({ icon: Icon, label, value, color }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 bg-${color}-100 rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 text-${color}-600`} />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{value}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Tài liệu chờ duyệt
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Đang tải...</div>
            ) : !pending?.documents?.length ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p>Không có tài liệu nào chờ duyệt</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pending.documents.map((doc: any) => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {doc.totalPages} trang • bởi {doc.uploaderEmail} • {new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                        {messages[doc.id] && (
                          <p className="text-xs text-emerald-600 mt-1">{messages[doc.id]}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                          disabled={reviewMutation.isPending}
                          onClick={() => reviewMutation.mutate({ id: doc.id, action: "APPROVE" })}
                        >
                          <CheckCircle className="w-3 h-3" /> Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                          disabled={reviewMutation.isPending}
                          onClick={() => reviewMutation.mutate({ id: doc.id, action: "REJECT" })}
                        >
                          <XCircle className="w-3 h-3" /> Từ chối
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
