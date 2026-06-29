import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Upload, Star, Users, TrendingUp, CheckCircle } from "lucide-react";

function useSiteStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/stats");
      if (!res.ok) return { totalDocs: 0, totalUsers: 0 };
      return res.json();
    },
    staleTime: 60_000,
  });
}

function useFeaturedDocs() {
  return useQuery({
    queryKey: ["documents", "featured"],
    queryFn: async () => {
      const res = await apiFetch("/api/documents");
      if (!res.ok) return { documents: [] };
      return res.json();
    },
    staleTime: 60_000,
  });
}

export default function HomePage() {
  const { data: user } = useAuth();
  const { data: stats } = useSiteStats();
  const { data: featured } = useFeaturedDocs();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          <Star className="w-4 h-4" />
          <span>Nền tảng chia sẻ tài liệu học thuật #1</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Chia sẻ tri thức,<br />
          <span className="text-emerald-600">Lan rộng học vấn</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Valley là nơi sinh viên và giảng viên chia sẻ tài liệu học tập chất lượng.
          Tải lên — kiếm điểm — tải xuống tài liệu bạn cần.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/explore">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <BookOpen className="w-5 h-5" />
              Khám phá tài liệu
            </Button>
          </Link>
          {!user && (
            <Link href="/register">
              <Button size="lg" variant="outline" className="gap-2">
                <Upload className="w-5 h-5" />
                Đăng ký miễn phí
              </Button>
            </Link>
          )}
        </div>
      </section>

      <section className="bg-white py-12 border-y">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { icon: BookOpen, label: "Tài liệu", value: stats?.totalDocs ?? "..." },
            { icon: Users, label: "Thành viên", value: stats?.totalUsers ?? "..." },
            { icon: TrendingUp, label: "Điểm thưởng / tài liệu", value: "10" },
            { icon: CheckCircle, label: "Kiểm duyệt AI", value: "100%" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <Icon className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {featured?.documents?.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Tài liệu nổi bật</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.documents.map((doc: any) => (
              <Link key={doc.id} href={`/documents/${doc.slug ?? doc.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{doc.title}</h3>
                    <p className="text-sm text-gray-500 mb-3">bởi {doc.uploaderEmail}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{doc.totalPages} trang</span>
                      <span>{doc.viewCount} lượt xem</span>
                      <span className="ml-auto text-emerald-600 font-medium">{doc.pointsRequired} điểm</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/explore">
              <Button variant="outline">Xem tất cả tài liệu →</Button>
            </Link>
          </div>
        </section>
      )}

      <section className="bg-emerald-600 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Cách thức hoạt động</h2>
          <div className="grid sm:grid-cols-3 gap-8 mt-10">
            {[
              { step: "1", title: "Đăng ký", desc: "Tạo tài khoản miễn phí và nhận 10 điểm chào mừng" },
              { step: "2", title: "Đăng tải", desc: "Chia sẻ tài liệu PDF và kiếm 10 điểm mỗi tài liệu" },
              { step: "3", title: "Tải xuống", desc: "Dùng điểm để tải tài liệu chất lượng từ cộng đồng" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-emerald-100 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
