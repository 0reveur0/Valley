import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BookOpen, Upload, LayoutDashboard, LogOut, User, Star } from "lucide-react";

export default function Navbar() {
  const { data: user } = useAuth();
  const logout = useLogout();
  const [loc] = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-emerald-600 hover:text-emerald-700">
            <BookOpen className="w-6 h-6" />
            <span>Valley</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/explore">
              <Button variant={loc.startsWith("/explore") ? "default" : "ghost"} size="sm">
                Khám phá
              </Button>
            </Link>

            {user ? (
              <>
                <Link href="/upload">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Đăng tải</span>
                  </Button>
                </Link>
                <Link href="/earn-credits">
                  <Button variant="ghost" size="sm" className="gap-1 text-amber-600 hover:text-amber-700">
                    <Star className="w-4 h-4" />
                    <span className="hidden sm:inline">Kiếm điểm</span>
                  </Button>
                </Link>
                <Link href="/workspace">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Workspace</span>
                  </Button>
                </Link>
                {user.role === "Admin" && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="text-red-600 gap-1">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {user.credits} điểm
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout.mutate()}
                    className="gap-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Đăng nhập</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Đăng ký</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
