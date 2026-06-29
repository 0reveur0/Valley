import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, Gift, Upload, Calendar, Star, Users } from "lucide-react";
import { Link } from "wouter";

export default function EarnCreditsPage() {
  const { data: user } = useAuth();
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.referralCode) {
      const origin = window.location.origin;
      setReferralLink(`${origin}${BASE}/register?ref=${user.referralCode}`);
    }
  }, [user?.referralCode]);

  function handleCopy() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const ways = [
    {
      icon: Gift,
      color: "emerald",
      title: "Chào mừng tân thành viên",
      points: "+10 điểm",
      desc: "Nhận ngay khi đăng ký tài khoản",
    },
    {
      icon: Upload,
      color: "blue",
      title: "Đăng tải tài liệu",
      points: "+10 điểm",
      desc: "Mỗi tài liệu được AI duyệt thành công",
    },
    {
      icon: Calendar,
      color: "amber",
      title: "Điểm danh hàng ngày",
      points: "+2 điểm",
      desc: "Check-in mỗi ngày không bỏ lỡ",
    },
    {
      icon: Users,
      color: "purple",
      title: "Giới thiệu bạn bè",
      points: "+20 điểm",
      desc: "Khi bạn bè đăng ký qua link của bạn",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kiếm điểm thưởng</h1>
          <p className="text-gray-500">Dùng điểm để tải tài liệu miễn phí từ cộng đồng Valley</p>
          {user && (
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2 mt-4">
              <Star className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Số dư của bạn: {user.credits} điểm</span>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {ways.map(({ icon: Icon, color, title, points, desc }) => (
            <Card key={title} className="border-0 shadow-sm">
              <CardContent className="p-5 flex gap-4 items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-${color}-100`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{title}</div>
                  <div className="text-emerald-600 font-bold text-lg">{points}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <Users className="w-5 h-5" />
              Link giới thiệu của bạn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-3 text-sm">Đăng nhập để xem link giới thiệu cá nhân</p>
                <Link href="/login">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Đăng nhập</Button>
                </Link>
              </div>
            ) : !user.referralCode ? (
              <p className="text-sm text-gray-500">Đang tạo mã giới thiệu...</p>
            ) : (
              <>
                <p className="text-sm text-emerald-800">
                  Mỗi người bạn đăng ký qua link này, <strong>cả hai</strong> sẽ nhận <strong>+20 điểm</strong>.
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono truncate select-all">
                    {referralLink || "Đang tải..."}
                  </div>
                  <Button
                    onClick={handleCopy}
                    className={`shrink-0 gap-1 transition-all ${copied ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                    disabled={!referralLink}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Đã sao chép!" : "Sao chép"}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100 rounded-lg px-3 py-2">
                  <span className="font-medium">Mã của bạn:</span>
                  <span className="font-mono font-bold tracking-wider">{user.referralCode}</span>
                </div>
                <p className="text-xs text-gray-500">
                  💡 Link tự động thích nghi với môi trường — localhost khi phát triển, domain thật khi deploy.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {user && (
          <div className="flex gap-3 justify-center">
            <Link href="/upload">
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Upload className="w-4 h-4" /> Đăng tải tài liệu
              </Button>
            </Link>
            <Link href="/workspace">
              <Button variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" /> Điểm danh ngay
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
