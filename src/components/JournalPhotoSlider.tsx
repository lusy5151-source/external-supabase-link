import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera } from "lucide-react";

interface Props {
  photos: string[];
}

export function JournalPhotoSlider({ photos }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lbStartX, setLbStartX] = useState(0);
  const [lbDragging, setLbDragging] = useState(false);
  const [lbTranslateX, setLbTranslateX] = useState(0);

  const openLightbox = (idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  };
  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  if (!photos || photos.length === 0) {
    return (
      <div style={{
        width: "100%", aspectRatio: "4/3",
        background: "#f1efe8", borderRadius: 12,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <Camera size={32} color="#bbb" />
        <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>등록된 사진이 없어요</p>
      </div>
    );
  }

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateX < -60 && currentIndex < photos.length - 1) {
      setCurrentIndex((p) => p + 1);
    } else if (translateX > 60 && currentIndex > 0) {
      setCurrentIndex((p) => p - 1);
    }
    setTranslateX(0);
  };

  const handleLbTouchEnd = () => {
    setLbDragging(false);
    if (lbTranslateX < -60 && lightboxIndex < photos.length - 1) {
      setLightboxIndex((p) => p + 1);
    } else if (lbTranslateX > 60 && lightboxIndex > 0) {
      setLightboxIndex((p) => p - 1);
    }
    setLbTranslateX(0);
  };

  return (
    <>
      <div style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: 12, background: "#000" }}>
        <div
          ref={sliderRef}
          style={{
            display: "flex",
            transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            transform: `translateX(calc(-${currentIndex * 100}% + ${translateX}px))`,
            willChange: "transform",
          }}
          onTouchStart={(e) => { setStartX(e.touches[0].clientX); setIsDragging(true); }}
          onTouchMove={(e) => { if (isDragging) setTranslateX(e.touches[0].clientX - startX); }}
          onTouchEnd={handleTouchEnd}
        >
          {photos.map((url, idx) => (
            <div
              key={idx}
              style={{ flex: "0 0 100%", width: "100%", aspectRatio: "4/3", position: "relative", overflow: "hidden" }}
              onClick={() => { if (Math.abs(translateX) < 5) openLightbox(idx); }}
            >
              <img
                src={url}
                style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none", pointerEvents: "none" }}
                loading={idx === 0 ? "eager" : "lazy"}
                alt={`등산 사진 ${idx + 1}`}
              />
            </div>
          ))}
        </div>

        {photos.length > 1 && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            borderRadius: 20, padding: "3px 10px",
            color: "white", fontSize: 12, fontWeight: 500,
          }}>
            {currentIndex + 1} / {photos.length}
          </div>
        )}

        {photos.length > 1 && currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex((p) => p - 1)}
            style={navBtnStyle("left")}
          >‹</button>
        )}
        {photos.length > 1 && currentIndex < photos.length - 1 && (
          <button
            onClick={() => setCurrentIndex((p) => p + 1)}
            style={navBtnStyle("right")}
          >›</button>
        )}

        {photos.length > 1 && photos.length <= 5 && (
          <div style={{
            position: "absolute", bottom: 10, left: "50%",
            transform: "translateX(-50%)", display: "flex", gap: 5,
          }}>
            {photos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  width: idx === currentIndex ? 16 : 6,
                  height: 6, borderRadius: 3,
                  background: idx === currentIndex ? "#c6d56c" : "rgba(255,255,255,0.5)",
                  border: "none", padding: 0, cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 썸네일 스트립 */}
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 0", scrollbarWidth: "none" }}>
          {photos.map((url, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                flex: "0 0 56px", height: 56,
                borderRadius: 8, overflow: "hidden",
                border: idx === currentIndex ? "2px solid #c6d56c" : "2px solid transparent",
                cursor: "pointer", opacity: idx === currentIndex ? 1 : 0.6,
                transition: "all 0.15s",
              }}
            >
              <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            </div>
          ))}
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxOpen && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.95)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(255,255,255,0.1)", border: "none", color: "white",
              width: 36, height: 36, borderRadius: "50%", fontSize: 20, cursor: "pointer",
              zIndex: 2,
            }}
          >✕</button>

          <div style={{
            position: "absolute", top: 24,
            color: "rgba(255,255,255,0.7)", fontSize: 13,
          }}>
            {lightboxIndex + 1} / {photos.length}
          </div>

          <img
            src={photos[lightboxIndex]}
            style={{
              maxWidth: "100vw", maxHeight: "85vh", objectFit: "contain",
              transform: `translateX(${lbTranslateX}px)`,
              transition: lbDragging ? "none" : "transform 0.3s",
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { setLbStartX(e.touches[0].clientX); setLbDragging(true); }}
            onTouchMove={(e) => { if (lbDragging) setLbTranslateX(e.touches[0].clientX - lbStartX); }}
            onTouchEnd={handleLbTouchEnd}
            alt=""
          />

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((p) => p - 1); }}
              style={lbNavStyle("left")}
            >‹</button>
          )}
          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((p) => p + 1); }}
              style={lbNavStyle("right")}
            >›</button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

function navBtnStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", [side]: 8, top: "50%",
    transform: "translateY(-50%)",
    width: 32, height: 32, borderRadius: "50%",
    background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
    border: "none", color: "white", fontSize: 16, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  } as React.CSSProperties;
}

function lbNavStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", [side]: 16, top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.15)", border: "none", color: "white",
    width: 44, height: 44, borderRadius: "50%", fontSize: 22, cursor: "pointer",
  } as React.CSSProperties;
}
