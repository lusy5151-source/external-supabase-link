import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  photos: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export default function PhotoLightbox({ photos, initialIndex = 0, open, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, prev, next]);

  if (!open || photos.length === 0) return null;

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="사진 보기"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 z-10 rounded-full bg-background/80 p-2 text-foreground shadow-lg hover:bg-background transition-colors"
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 p-2 text-foreground shadow-lg hover:bg-background transition-colors"
            aria-label="이전 사진"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 p-2 text-foreground shadow-lg hover:bg-background transition-colors"
            aria-label="다음 사진"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <img
        src={photos[index]}
        alt={`사진 ${index + 1} / ${photos.length}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
      />

      {photos.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg">
          <span>{index + 1}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{photos.length}</span>
        </div>
      )}
    </div>
  );

  return createPortal(node, document.body);
}
