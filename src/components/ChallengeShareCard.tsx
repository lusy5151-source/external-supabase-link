import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Award, Download, Share2, X } from "lucide-react";
import { toast } from "sonner";

type RecentMountain = {
  id: number;
  name: string;
  region?: string | null;
};

interface ChallengeShareCardProps {
  challengeName: string;
  completedCount: number;
  totalCount: number;
  recentMountains: RecentMountain[];
}

export default function ChallengeShareCard({
  challengeName,
  completedCount,
  totalCount,
  recentMountains,
}: ChallengeShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const percent = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
  const dateText = useMemo(
    () => new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
    [],
  );

  const makeBlob = async () => {
    if (!cardRef.current) throw new Error("공유 카드를 찾지 못했어요");
    const html2canvas = (await import("html2canvas")).default;
    const rect = cardRef.current.getBoundingClientRect();
    const scale = 1080 / rect.width;
    const canvas = await html2canvas(cardRef.current, {
      scale,
      useCORS: true,
      backgroundColor: null,
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("이미지를 만들지 못했어요");
    return blob;
  };

  const handleDownload = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await makeBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `완등_${challengeName}_${completedCount}of${totalCount}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("이미지로 저장했어요");
    } catch (error) {
      console.error(error);
      toast.error("이미지 저장에 실패했어요");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await makeBlob();
      const { Capacitor } = await import("@capacitor/core");

      if (Capacitor.isNativePlatform()) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
          reader.readAsDataURL(blob);
        });
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const fileName = `wandeung-challenge-${Date.now()}.png`;
        await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
        const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: `${challengeName} 진행 중`,
          text: `완등에서 ${challengeName} ${completedCount}/${totalCount} 도전 중이에요.`,
          files: [uri],
          dialogTitle: "챌린지 공유",
        });
      } else {
        const file = new File([blob], `완등_${challengeName}.png`, { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `${challengeName} 진행 중`,
            text: `완등에서 ${challengeName} ${completedCount}/${totalCount} 도전 중이에요.`,
            files: [file],
          });
        } else {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `완등_${challengeName}_${completedCount}of${totalCount}.png`;
          anchor.click();
          URL.revokeObjectURL(url);
          toast("공유가 어려워 이미지로 저장했어요");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("공유를 시작하지 못했어요");
    } finally {
      setExporting(false);
    }
  };

  const Card = () => (
    <div
      ref={cardRef}
      style={{
        width: "100%",
        aspectRatio: "9 / 16",
        borderRadius: 22,
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(160deg, #013F92 0%, #2F403A 52%, #C7D66D 100%)",
        color: "#F8FAED",
        boxShadow: "0 18px 45px rgba(1,63,146,0.28)",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(1,63,146,0.12), rgba(47,64,58,0.72))" }} />
      <div style={{ position: "absolute", left: "-20%", right: "-20%", bottom: "-6%", height: "34%", borderRadius: "50% 50% 0 0", background: "rgba(248,250,237,0.22)" }} />
      <div style={{ position: "absolute", left: "7%", bottom: "20%", width: "36%", height: "20%", borderRadius: "60% 60% 0 0", background: "#C6DBF0", opacity: 0.88 }} />
      <div style={{ position: "absolute", right: "5%", bottom: "16%", width: "48%", height: "28%", borderRadius: "60% 60% 0 0", background: "#F8FAED", opacity: 0.72 }} />
      <div style={{ position: "absolute", top: "8%", right: "10%", width: 58, height: 58, borderRadius: "50%", background: "#C7D66D", opacity: 0.9 }} />

      <div style={{ position: "relative", zIndex: 1, height: "100%", padding: "9% 7%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800 }}>
            <Award size={20} color="#C7D66D" />
            완등
          </div>
          <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 999, background: "rgba(248,250,237,0.16)" }}>
            정상 챌린지
          </span>
        </div>

        <div style={{ marginTop: "18%" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#C6DBF0", fontWeight: 700 }}>나의 도전 기록</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 34, lineHeight: 1.08, fontWeight: 900, letterSpacing: 0 }}>
            {challengeName}
          </h2>
        </div>

        <div style={{ marginTop: "12%" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 58, fontWeight: 900, lineHeight: 1 }}>{completedCount}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#C7D66D" }}>/ {totalCount}</span>
          </div>
          <div style={{ marginTop: 12, height: 12, borderRadius: 999, background: "rgba(248,250,237,0.22)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${percent}%`, borderRadius: 999, background: "linear-gradient(90deg, #C7D66D, #FF696C)" }} />
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#F8FAED", opacity: 0.86 }}>{percent}% 진행 중</p>
        </div>

        <div style={{ marginTop: "auto" }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#C6DBF0", fontWeight: 800 }}>최근 완등</p>
          <div style={{ display: "grid", gap: 7 }}>
            {(recentMountains.length ? recentMountains : [{ id: 0, name: "첫 정상에 도전 중", region: "완등에서 기록하기" }]).slice(0, 3).map((mountain) => (
              <div key={mountain.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 12, background: "rgba(248,250,237,0.14)" }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{mountain.name}</span>
                <span style={{ fontSize: 10, opacity: 0.76 }}>{mountain.region || ""}</span>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "rgba(248,250,237,0.28)", margin: "18px 0 10px" }} />
          <p style={{ margin: 0, fontSize: 10, lineHeight: 1.45, opacity: 0.78 }}>
            {dateText}<br />
            완등으로 기록하기 · wandeung.com
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={completedCount === 0}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          border: "none",
          borderRadius: 999,
          padding: "8px 12px",
          background: completedCount === 0 ? "rgba(47,64,58,0.12)" : "#2F403A",
          color: completedCount === 0 ? "rgba(47,64,58,0.45)" : "#F8FAED",
          fontSize: 12,
          fontWeight: 700,
          cursor: completedCount === 0 ? "not-allowed" : "pointer",
        }}
      >
        <Share2 size={14} />
        챌린지 공유
      </button>

      {open && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            paddingTop: "calc(16px + env(safe-area-inset-top))",
            paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
            aria-label="닫기"
            style={{
              position: "absolute",
              top: "calc(12px + env(safe-area-inset-top))",
              right: 14,
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.16)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>

          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(86vw, 360px)" }}>
            <Card />
          </div>

          <div onClick={(event) => event.stopPropagation()} style={{ display: "flex", gap: 8, marginTop: 14, width: "min(86vw, 360px)" }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={exporting}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                border: "none",
                background: "#C7D66D",
                color: "#2F403A",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 800,
                opacity: exporting ? 0.7 : 1,
              }}
            >
              <Download size={15} />
              저장
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={exporting}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                border: "none",
                background: "#F8FAED",
                color: "#2F403A",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 800,
                opacity: exporting ? 0.7 : 1,
              }}
            >
              <Share2 size={15} />
              공유
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
