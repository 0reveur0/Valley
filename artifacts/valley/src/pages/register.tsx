import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useRegister } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Gift } from "lucide-react";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const register = useRegister();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, [search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    register.mutate(
      { email, password, referralCode: referralCode || undefined },
      {
        onSuccess: () => navigate("/"),
        onError: (err: any) => setError(err.message),
      }
    );
  }

  const hasReferral = !!referralCode;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Tạo tài khoản Valley</CardTitle>
          {hasReferral ? (
            <div className="flex items-center justify-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              <Gift className="w-4 h-4 text-amber-500" />
              <p className="text-amber-700 text-sm font-medium">
                Bạn được mời! Nhận <strong>+30 điểm</strong> khi đăng ký
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mt-1">Nhận 10 điểm chào mừng ngay khi đăng ký!</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Ít nhất 8 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="referralCode">
                Mã giới thiệu <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
              </Label>
              <Input
                id="referralCode"
                type="text"
                autoComplete="off"
                placeholder="Ví dụ: NAMAB1C2D"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="font-mono tracking-widest"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={register.isPending}
            >
              {register.isPending ? "Đang tạo tài khoản..." : "Đăng ký"}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-emerald-600 hover:underline font-medium">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
