import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen, Folder, Eye, Download, Crown,
  Calendar, FileText, LayoutDashboard, Globe, ChevronRight,
} from "lucide-react";

interface PublicDoc {
  id: string;
  title: string;
  totalPages: number;
  viewCount: number;
  downloadCount: number;
  pointsRequired: number;
  createdAt: string;
}

interface PublicCollection {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

interface ProfileData {
  user: {
    id: string;
    displayName: string;
    membershipType: "Free" | "Premium";
    role: "Admin" | "User";
    createdAt: string;
    totalApprovedDocs: number;
  };
  documents: PublicDoc[];
  collections: PublicCollection[];
}

function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${userId}/profile`);
      if (res.status === 404) throw new Error("not_found");
      if (!res.ok) throw new Error("fetch_error");
      return res.json() as Promise<ProfileData>;
    },
    retry: false,
    enabled: !!userId,
  });
}

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(id: string) {
  const palette = [
    "from-emerald-400 to-emerald-600",
    "from-blue-400 to-blue-600",
    "from-violet-400 to-violet-600",
    "from-amber-400 to-amber-600",
    "from-rose-400 to-rose-600",
    "from-cyan-400 to-cyan-600",
  ];
  return palette[id.charCodeAt(0) % palette.length];
}

function DocCard({ doc }: { doc: PublicDoc }) {
  return (
    <Link href={`/documents/${doc.id}`}>
      <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-4">
          <div className="w-full h-24 bg-emerald-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
            <BookOpen className="w-9 h-9 text-emerald-200" />
          </div>
          <p className="font-medium text-sm text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-emerald-700 transition-colors">
            {doc.title}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
            <span>{doc.totalPages} trang</span>
            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{doc.viewCount}</span>
            <span className="flex items-center gap-0.5"><Download className="w-3 h-3" />{doc.downloadCount}</span>
          </div>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {doc.pointsRequired} điểm
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function CollectionCard({ col }: { col: PublicCollection }) {
  return (
    <Link href={`/collections/${col.id}`}>
      <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
            <Folder className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate group-hover:text-amber-700 transition-colors">
              {col.name}
            </p>
            {col.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{col.description}</p>
            )}
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
              <Globe className="w-3 h-3" />
              <span>Công khai</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5 group-hover:text-amber-400 transition-colors" />
        </CardContent>
      </Card>
    </Link>
  );
}

type Tab = "documents" | "collections";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: me } = useAuth();
  const { data, isLoading, error } = usePublicProfile(id ?? "");
  const [tab, setTab] = useState<Tab>("documents");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {(error as any).message === "not_found" ? "404 — Không tìm thấy người dùng" : "Lỗi tải hồ sơ"}
          </h2>
          <p className="text-gray-500 mb-4">
            {(error as any).message === "not_found"
              ? "Người dùng này không tồn tại trong hệ thống."
              : "Vui lòng thử lại sau."}
          </p>
          <Link href="/explore">
            <Button variant="outline">← Quay lại khám phá</Button>
          </Link>
        </div>
      </div>
    );
  }

  const profile = data!;
  const isOwner = me?.id === profile.user.id;
  const isPremium = profile.user.membershipType === "Premium";
  const isAdmin = profile.user.role === "Admin";
  const joinDate = new Date(profile.user.createdAt).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 space-y-6">

        {/* Hero / Bio card */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500" />
          <CardContent className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 mb-5">
              {/* Avatar */}
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarColor(profile.user.id)} flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-white shrink-0`}>
                {getInitials(profile.user.displayName)}
              </div>

              <div className="flex-1 min-w-0 sm:mb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 truncate">{profile.user.displayName}</h1>
                  {isPremium && (
                    <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      <Crown className="w-3 h-3" /> Premium
                    </span>
                  )}
                  {isAdmin && (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">Admin</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Tham gia {joinDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {profile.user.totalApprovedDocs} tài liệu đóng góp
                  </span>
                </div>
              </div>

              {isOwner && (
                <Link href="/workspace">
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                    <LayoutDashboard className="w-4 h-4" /> Chỉnh sửa Workspace
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Tài liệu đã chia sẻ", value: profile.documents.length, color: "text-emerald-600" },
                { label: "Bộ sưu tập công khai", value: profile.collections.length, color: "text-amber-600" },
                {
                  label: "Tổng lượt xem",
                  value: profile.documents.reduce((s, d) => s + d.viewCount, 0),
                  color: "text-blue-600",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center bg-gray-50 rounded-xl py-3 px-2">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1">
            {(
              [
                { key: "documents", label: "Tài liệu đã chia sẻ", icon: BookOpen, count: profile.documents.length },
                { key: "collections", label: "Bộ sưu tập công khai", icon: Folder, count: profile.collections.length },
              ] as const
            ).map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === key
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab === key ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === "documents" ? (
          profile.documents.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p className="font-medium text-gray-500 mb-1">Chưa có tài liệu công khai</p>
              <p className="text-sm">Người dùng này chưa chia sẻ tài liệu nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {profile.documents.map((doc) => <DocCard key={doc.id} doc={doc} />)}
            </div>
          )
        ) : (
          profile.collections.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Folder className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p className="font-medium text-gray-500 mb-1">Chưa có bộ sưu tập công khai</p>
              <p className="text-sm">Người dùng này chưa chia sẻ bộ sưu tập nào.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {profile.collections.map((col) => <CollectionCard key={col.id} col={col} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
