import { useState, useEffect, useCallback } from "react";
import { MagazinePost, MagazineSlide, useMagazine } from "@/hooks/useMagazine";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import MountainMascot from "@/components/MountainMascot";

interface Props {
  post: MagazinePost;
  onClose: () => void;
  initialSlide?: number;
}

const MagazineSlideViewer = ({ post, onClose, initialSlide = 0 }: Props) => {
  const { fetchSlides } = useMagazine();
  const [slides, setSlides] = useState<MagazineSlide[]>([]);
  const [current, setCurrent] = useState(initialSlide);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    fetchSlides(post.id).then((s) => {
      setSlides(s);
      setLoading(false);
    });
  }, [post.id]);

  const goNext = useCallback(() => setCurrent((c) => Math.min(c + 1, slides.length - 1)), [slides.length]);
  const goPrev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">{post.title}</h2>
          <p className="text-[10px] text-white/60">{post.category}</p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Slide Progress */}
      {slides.length > 0 && (
        <div className="flex gap-1 px-4 mb-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                i <= current ? "bg-white" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <div className="flex flex-col items-center text-white/60">
            <MountainMascot size={48} />
            <p className="mt-2 text-xs">슬라이드 불러오는 중...</p>
          </div>
        ) : slides.length === 0 ? (
          <div className="flex flex-col items-center text-white/60">
            <MountainMascot size={48} />
            <p className="mt-2 text-xs">슬라이드가 없습니다</p>
          </div>
        ) : (
          <>
            <img
              src={slides[current].image_url}
              alt={`Slide ${current + 1}`}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />

            {/* Navigation Arrows */}
            {current > 0 && (
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {current < slides.length - 1 && (
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Slide Counter */}
      {slides.length > 0 && (
        <div className="py-3 text-center text-xs text-white/50">
          {current + 1} / {slides.length}
        </div>
      )}
    </div>
  );
};

export default MagazineSlideViewer;
