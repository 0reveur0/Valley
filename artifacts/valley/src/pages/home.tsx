import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

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
  { status: "active", label: "Microservices Architecture", note: "Đang làm" },
  { status: "locked", label: "Advanced AI Prompting", note: "Chưa mở" },
];

export default function HomePage() {
  const { data: user } = useAuth();

  return (
    <div
      className="min-h-screen bg-slate-50 text-zinc-800 antialiased"
      style={{ fontFamily: "'Elms Sans', ui-sans-serif, system-ui" }}
    >
      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs tracking-[0.35em] uppercase text-zinc-400 mb-8 font-medium">
            Valley · Học tập bình yên
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold text-zinc-900 leading-tight sm:leading-tight">
            Thong thả học, <span className="italic font-light text-zinc-700">thực chất master.</span>
          </h1>
          <p className="mt-8 text-base sm:text-lg text-zinc-500 leading-relaxed sm:px-4">
            Không gian học tập và chia sẻ tài liệu bình yên, nơi bạn có thể đi theo cách riêng của mình.
            Không áp lực, không bảng xếp hạng — chỉ có bạn và tri thức.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href={user ? "/explore" : "/register"}>
              <button className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-colors hover:bg-zinc-800">
                Bắt đầu ngay
              </button>
            </Link>
            <Link href="/explore">
              <button className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-7 py-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900">
                Xem giới thiệu
              </button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-[32px] border border-zinc-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2 rounded-[24px] border border-zinc-100 bg-slate-50 px-4 py-3 text-xs text-zinc-500">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
            <span className="ml-3 font-medium">Workspace xem trước</span>
          </div>

          <div className="mt-6 divide-y divide-zinc-100">
            {lessons.map(({ status, label, note }) => (
              <div
                key={label}
                className={`flex flex-col gap-4 rounded-[24px] px-5 py-5 sm:flex-row sm:items-center ${
                  status === "active" ? "bg-slate-50" : ""
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-zinc-100 text-lg text-zinc-600">
                  {status === "done" ? "✓" : status === "active" ? "⏳" : "🔒"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${status === "locked" ? "text-zinc-400" : "text-zinc-800"}`}>
                    {label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{note}</p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                    status === "done"
                      ? "bg-zinc-100 text-zinc-600"
                      : status === "active"
                      ? "bg-zinc-100 text-zinc-600"
                      : "bg-zinc-50 text-zinc-400"
                  }`}
                >
                  {note}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-zinc-100 bg-slate-50 px-5 py-5 text-sm text-zinc-500">
            Thiết kế cho người học, không phải cho điểm số. Mỗi tính năng đều giúp bạn thực sự hiểu bài — không hơn không kém.
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-28">
        <p className="text-xs tracking-[0.35em] uppercase text-zinc-400 text-center mb-10 font-medium">
          Tính năng cốt lõi
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ emoji, title, desc }) => (
            <div key={title} className="rounded-[32px] border border-zinc-100 bg-white p-6 shadow-sm">
              <div className="mb-4 text-2xl leading-none">{emoji}</div>
              <h3 className="text-base font-semibold text-zinc-900 mb-2">{title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-[36px] border border-zinc-100 bg-white px-8 py-16 text-center shadow-sm sm:px-12">
          <blockquote className="text-2xl sm:text-3xl font-light text-zinc-900 leading-tight">
            “Không có học sinh chậm — chỉ có hệ thống <span className="italic font-medium">chưa đủ kiên nhẫn.</span>”
          </blockquote>
          <p className="mt-8 text-sm text-zinc-500 uppercase tracking-[0.2em]">— Valley</p>
        </div>
      </section>

      <footer className="text-center pb-16 px-6">
        <p className="text-sm text-zinc-500 font-light">
          Miễn phí. Không quảng cáo. Không điểm số phán xét. <span className="text-zinc-600">Thong thả học nhé. ☕</span>
        </p>
      </footer>
    </div>
  );
}
