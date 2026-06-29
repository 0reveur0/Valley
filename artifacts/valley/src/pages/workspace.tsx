import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Upload, Star, Calendar, Coins } from "lucide-react";
import { useState } from "react";

function statusBadge(status: string) {
  if (status === "Approved") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Đã duyệt</Badge>;
  if (status === "Pending") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Chờ duyệt</Badge>;
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Bị từ chối</Badge>;
}

export default function WorkspacePage() {
  const { data: user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [checkinMsg, setCheckinMsg] = useState("");
  const [checkinErr, setCheckinErr] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["workspace"],
    queryFn: async () => {
      const res = await apiFetch("/api/user/workspace");
      if (!res.ok) throw new Error("Failed to load workspace");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: checkinStatus } = useQuery({
    queryKey: ["checkin-status"],
    queryFn: async () => {
      const res = await apiFetch("/api/user/daily-checkin");
      if (!res.ok) return { checkedInToday: false };
      return res.json();
    },
    enabled: !!user,
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/user/daily-checkin", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Checkin failed");
      return d;
    },
    onSuccess: (d) => {
      setCheckinMsg(d.message ?? "Điểm danh thành công! +2 điểm");
      setCheckinErr("");
      qc.invalidateQueries({ queryKey: ["checkin-status"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (err: any) => setCheckinErr(err.message),
  });

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <p className="text-gray-600 mb-4">Bạn cần đăng nhập để xem workspace.</p>
          <Link href="/login"><Button className="bg-emerald-600 hover:bg-emerald-700">Đăng nhập</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Workspace của bạn</h1>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{data?.user?.credits ?? user.credits}</div>
                <div className="text-sm text-gray-500">Điểm hiện tại</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{data?.documents?.length ?? 0}</div>
                <div className="text-sm text-gray-500">Tài liệu đã đăng</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Điểm danh hàng ngày</div>
                  <div className="text-xs text-gray-500">+2 điểm / ngày</div>
                </div>
              </div>
              {checkinStatus?.checkedInToday ? (
                <div className="flex items-center gap-1 text-emerald-600 text-sm">
                  <CheckCircle className="w-4 h-4" /> Đã điểm danh hôm nay
                </div>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-amber-500 hover:bg-amber-600 gap-1"
                  onClick={() => checkinMutation.mutate()}
                  disabled={checkinMutation.isPending}
                >
                  <Calendar className="w-3 h-3" />
                  {checkinMutation.isPending ? "Đang xử lý..." : "Điểm danh ngay"}
                </Button>
              )}
              {checkinMsg && <p className="text-xs text-emerald-600 mt-1">{checkinMsg}</p>}
              {checkinErr && <p className="text-xs text-red-500 mt-1">{checkinErr}</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">Tài liệu của bạn</CardTitle>
            <Link href="/upload">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                <Upload className="w-3 h-3" /> Đăng tải
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!data?.documents?.length ? (
              <div className="text-center py-12 text-gray-400">
                <Upload className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p>Bạn chưa đăng tải tài liệu nào</p>
                <Link href="/upload">
                  <Button variant="outline" size="sm" className="mt-3">Đăng tải ngay</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{doc.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{doc.totalPages} trang • {doc.viewCount} lượt xem</p>
                      {doc.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1">{doc.rejectionReason}</p>
                      )}
                    </div>
                    {statusBadge(doc.status)}
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
