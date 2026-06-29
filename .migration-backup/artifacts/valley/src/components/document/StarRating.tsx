import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  avg: number;
  total: number;
  userRating: number | null;
  onRate: (stars: number) => void;
  isPending: boolean;
  canRate: boolean;
}

export function StarRating({ avg, total, userRating, onRate, isPending, canRate }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-5 h-5 transition-colors ${
                s <= Math.round(avg) ? "text-amber-400 fill-amber-400" : "text-gray-300"
              }`}
            />
          ))}
        </div>
        <span className="font-semibold text-gray-800">{avg > 0 ? avg : "—"}</span>
        <span className="text-sm text-gray-400">({total} đánh giá)</span>
      </div>

      {canRate && (
        <div>
          <p className="text-xs text-gray-500 mb-1">
            {userRating ? `Bạn đã đánh giá ${userRating} sao. Nhấn để thay đổi:` : "Đánh giá tài liệu này:"}
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                disabled={isPending}
                onClick={() => onRate(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                className="p-0.5 rounded transition-transform hover:scale-110 disabled:opacity-50"
                aria-label={`${s} sao`}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    s <= (hovered || userRating || 0)
                      ? "text-amber-400 fill-amber-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
