import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle2, Clock3, Lock } from "lucide-react";

const features = [
  {
    emoji: "🎯",
    title: "Mastery Learning",
    desc: "Hoàn thành bài kiểm tra đạt 80% để mở khóa bài tiếp theo. Bạn tự chủ lộ trình, chỉ so sánh với chính mình của hôm qua.",
  },
  {
    emoji: "📝",
    title: "Ghi chú thông minh",
    desc: "Xem tài liệu, video và ghi chú cùng lúc, tự động bắt mốc thời gian.",
  },
  {
    emoji: "💬",
    title: "Không gian thảo luận",
    desc: "Góc thảo luận kiểu Notion Docs, nơi mentor và AI luôn sẵn sàng đồng hành cùng bạn.",
  },
  {
    emoji: "✨",
    title: "Phản hồi AI chi tiết",
    desc: "Sau mỗi bài nộp, nhận phản hồi cụ thể từ AI — không chấm điểm, chỉ chỉ ra điểm mạnh và hướng cải thiện.",
  },
  {
    emoji: "📋",
    title: "Kanban Workspace",
    desc: "Quản lý bài tập kiểu Kanban nhẹ nhàng: Chưa làm → Đang làm → Chờ chấm → Hoàn thành.",
  },
];

const lessons = [
  { status: "done", label: "TypeScript Fundamentals", note: "Đã hoàn thành" },
  { status: "active", label: "Microservices Architecture", note: "Đang học" },
  { status: "locked", label: "Advanced AI Prompting", note: "Chưa mở khóa" },
];

export default function HomePage() {
  const { data: user } = useAuth();

  return (
    <div
      className="min-h-screen bg-zinc-50 text-zinc-800"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Hero ── */}
      <section className="max-w-3xl mx-auto px-6 pt-28 pb-20 text-center">
        <p className="text-xs tracking-widest uppercase text-zinc-400 mb-8 font-medium">
          Valley · Học tập bình yên
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-zinc-900 leading-tight mb-6">
          Thong thả học,{" "}
          <span className="italic font-light text-zinc-500">thực chất master.</span>
        </h1>
        <p className="text-base sm:text-lg text-zinc-500 leading-relaxed max-w-xl mx-auto mb-10 font-light">
          Không gian học tập và chia sẻ tài liệu bình yên, nơi bạn có thể đi theo cách riêng của
          mình. Không áp lực, không bảng xếp hạng — chỉ có bạn và tri thức.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href={user ? "/explore" : "/register"}>
            <button className="px-6 py-3 bg-zinc-900 text-zinc-50 text-sm font-medium rounded-xl hover:bg-zinc-700 transition-colors shadow-sm">
              Bắt đầu ngay
            </button>
          </Link>
          <Link href="/explore">
            <button className="px-6 py-3 text-zinc-500 text-sm font-medium rounded-xl border border-zinc-200 hover:border-zinc-300 hover:text-zinc-700 transition-colors">
              Xem giới thiệu
            </button>
          </Link>
        </div>
      </section>

      {/* ── Workspace Preview ── */}
      <section className="max-w-2xl mx-auto px-6 pb-24">
        <div className="border border-zinc-100 rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-100">
            <span className="w-3 h-3 rounded-full bg-zinc-200" />
            <span className="w-3 h-3 rounded-full bg-zinc-200" />
            <span className="w-3 h-3 rounded-full bg-zinc-200" />
            <span className="ml-3 text-xs text-zinc-400 font-medium">workspace / của tôi</span>
          </div>
          {/* Lesson list */}
          <div className="divide-y divide-zinc-50">
            {lessons.map(({ status, label, note }) => (
              <div
                key={label}
                className={`flex items-center gap-4 px-6 py-4 ${
                  status === "active" ? "bg-zinc-50" : ""
                }`}
              >
                {status === "done" && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                {status === "active" && <Clock3 className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />}
                {status === "locked" && <Lock className="w-5 h-5 text-zinc-300 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      status === "locked" ? "text-zinc-300" : "text-zinc-700"
                    }`}
                  >
                    {label}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                    status === "done"
                      ? "bg-emerald-50 text-emerald-500"
                      : status === "active"
                      ? "bg-amber-50 text-amber-500"
                      : "bg-zinc-100 text-zinc-300"
                  }`}
                >
                  {note}
                </span>
              </div>
            ))}
          </div>
          {/* Caption */}
          <div className="px-6 py-5 border-t border-zinc-100">
            <p className="text-xs text-zinc-400 leading-relaxed font-light">
              Thiết kế cho người học, không phải cho điểm số. Mỗi tính năng đều giúp bạn thực sự
              hiểu bài — không hơn không kém.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-3xl mx-auto px-6 pb-28">
        <p className="text-xs tracking-widest uppercase text-zinc-400 text-center mb-10 font-medium">
          Tính năng cốt lõi
        </p>
        <div className="grid sm:grid-cols-2 gap-px bg-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden">
          {features.map(({ emoji, title, desc }, i) => (
            <div
              key={title}
              className={`bg-white px-7 py-7 ${
                i === features.length - 1 && features.length % 2 !== 0
                  ? "sm:col-span-2"
                  : ""
              }`}
            >
              <span className="text-2xl mb-3 block">{emoji}</span>
              <h3 className="text-sm font-semibold text-zinc-800 mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-light">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quote ── */}
      <section className="max-w-2xl mx-auto px-6 pb-28 text-center">
        <div className="border-t border-b border-zinc-100 py-16">
          <blockquote className="text-2xl sm:text-3xl font-light text-zinc-700 leading-snug mb-5">
            "Không có học sinh chậm — chỉ có hệ thống{" "}
            <span className="italic">chưa đủ kiên nhẫn.</span>"
          </blockquote>
          <cite className="text-sm text-zinc-400 not-italic tracking-wide">— Valley</cite>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="text-center pb-16 px-6">
        <p className="text-sm text-zinc-400 font-light">
          Miễn phí. Không quảng cáo. Không điểm số phán xét.{" "}
          <span className="text-zinc-500">Thong thả học nhé. ☕</span>
        </p>
      </footer>
    </div>
  );
}
