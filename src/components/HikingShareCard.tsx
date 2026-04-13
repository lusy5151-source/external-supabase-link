import { useRef, useState, useCallback } from "react";
import { Mountain } from "@/data/mountains";
import { CompletionRecord } from "@/hooks/useMountainStore";
import { SharedCompletion } from "@/hooks/useSharedCompletions";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, Download, Share2 } from "lucide-react";
import MountainMascot from "@/components/MountainMascot";
import html2canvas from "html2canvas";

interface HikingShareCardProps {
  mountain: Mountain;
  record?: CompletionRecord;
  sharedCompletion?: SharedCompletion;
  photoUrl?: string;
}

const HikingShareCard = ({ mountain, record, sharedCompletion, photoUrl }: HikingShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(photoUrl || null);
  const [exporting, setExporting] = useState(false);

  const completionDate = record?.completedAt || sharedCompletion?.completed_at;
  const formattedDate = completionDate
    ? new Date(completionDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : "";
  const duration = record?.duration || "";

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSelectedPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  };

  const handleExport = async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        width: 1080 / 2,
        height: 1920 / 2,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "wandeung-story.png", { type: "image/png" })] })) {
        await navigator.share({
          title: `${mountain.nameKo} 완등`,
          text: `${mountain.nameKo} 정상에 올랐습니다! 🏔`,
          files: [new File([blob], "wandeung-story.png", { type: "image/png" })],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${mountain.nameKo}-story.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* Photo selection buttons */}
      {!selectedPhoto && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-xl" onClick={handleCameraCapture}>
            <Camera className="h-4 w-4" /> 카메라
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-xl" onClick={handleGallerySelect}>
            <ImageIcon className="h-4 w-4" /> 갤러리
          </Button>
        </div>
      )}

      {/* Story Card Preview (9:16) */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[360px] mx-auto rounded-2xl overflow-hidden shadow-xl"
        style={{ aspectRatio: "9 / 16" }}
      >
        {/* Background */}
        {selectedPhoto ? (
          <img
            src={selectedPhoto}
            alt="summit"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--nature-600))] to-[hsl(var(--sky-600))]" />
        )}

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        {/* Content layer */}
        <div className="relative h-full flex flex-col justify-between p-6">
          {/* Top area */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                {mountain.nameKo}
              </h2>
              <p className="text-sm text-white/80 font-medium drop-shadow">
                {mountain.height}m
              </p>
              {duration && (
                <p className="text-xs text-white/70 drop-shadow">
                  🥾 {duration}
                </p>
              )}
            </div>
            {/* Mascot top-right */}
            <div className="opacity-80">
              <MountainMascot size={48} />
            </div>
          </div>

          {/* Bottom area */}
          <div className="space-y-2">
            {formattedDate && (
              <p className="text-sm text-white/90 font-medium drop-shadow">
                📅 {formattedDate}
              </p>
            )}
            <p className="text-xs text-white/60 drop-shadow">
              {mountain.region}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white">
                {sharedCompletion?.participants?.length ? "👥 함께 완등" : "⛰ 완등"}
              </span>
              {mountain.is_baekdu && (
                <span className="rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white">
                  백대명산
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change photo button */}
      {selectedPhoto && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={handleGallerySelect}>
            <ImageIcon className="h-3.5 w-3.5" /> 사진 변경
          </Button>
        </div>
      )}

      {/* Sticky save button area */}
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-[400px] mx-auto flex gap-2">
          <Button
            className="flex-1 gap-2 rounded-xl h-12 text-sm font-semibold shadow-lg"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              "저장 중..."
            ) : (
              <>
                <Download className="h-4 w-4" /> 이미지 저장
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            className="gap-2 rounded-xl h-12 px-5 shadow-lg"
            onClick={handleExport}
            disabled={exporting}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HikingShareCard;
