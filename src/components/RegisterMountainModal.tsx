import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserMountains, type CreateMountainInput } from "@/hooks/useUserMountains";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Mountain, MapPin, Upload, Navigation, Plus } from "lucide-react";
import { toast } from "sonner";
import { IMAGE_ACCEPT } from "@/lib/imageUpload";

const REGIONS = ["서울·경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주", "기타"];
const DIFFICULTIES: { value: string; label: string }[] = [
  { value: "쉬움", label: "쉬움" },
  { value: "보통", label: "보통" },
  { value: "어려움", label: "어려움" },
];

export default function RegisterMountainModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createMountain, uploadMountainImage } = useUserMountains();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [nameKo, setNameKo] = useState("");
  const [height, setHeight] = useState("");
  const [region, setRegion] = useState("");
  const [difficulty, setDifficulty] = useState("보통");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const resetForm = () => {
    setNameKo("");
    setHeight("");
    setRegion("");
    setDifficulty("보통");
    setDescription("");
    setLat("");
    setLng("");
    setImageFile(null);
    setImagePreview(null);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("GPS를 지원하지 않는 기기입니다");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(4));
        setLng(pos.coords.longitude.toFixed(4));
        toast.success("현재 위치가 입력되었습니다");
      },
      () => toast.error("위치를 가져올 수 없습니다")
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    if (!nameKo.trim()) {
      toast.error("산 이름을 입력해주세요");
      return;
    }
    if (!height || isNaN(Number(height)) || Number(height) <= 0) {
      toast.error("올바른 높이를 입력해주세요");
      return;
    }
    if (!region) {
      toast.error("지역을 선택해주세요");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadMountainImage(imageFile);
      }

      const input: CreateMountainInput = {
        name_ko: nameKo.trim(),
        height: Number(height),
        region,
        difficulty,
        description: description.trim() || undefined,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        image_url: imageUrl || undefined,
      };

      const result = await createMountain.mutateAsync(input);
      const mountainId = (result as any).mountain_id;
      resetForm();
      setOpen(false);
      if (mountainId) {
        navigate(`/mountains/${mountainId}`);
      }
    } catch {
      // error handled by mutation
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
          <Plus className="h-4 w-4" />
          산이 없나요? 직접 등록하기
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5 text-primary" />
            새로운 산 등록
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Name */}
          <div>
            <Label htmlFor="mountain-name">산 이름 *</Label>
            <Input
              id="mountain-name"
              value={nameKo}
              onChange={(e) => setNameKo(e.target.value)}
              placeholder="예: 앞산"
              maxLength={50}
            />
          </div>

          {/* Height */}
          <div>
            <Label htmlFor="mountain-height">높이 (m) *</Label>
            <Input
              id="mountain-height"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="예: 660"
              min={1}
              max={10000}
            />
          </div>

          {/* Region */}
          <div>
            <Label>지역 *</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="지역 선택" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty */}
          <div>
            <Label>난이도 *</Label>
            <div className="flex gap-2 mt-1">
              {DIFFICULTIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDifficulty(value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    difficulty === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="mountain-desc">설명 (선택)</Label>
            <Textarea
              id="mountain-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="산에 대한 간단한 설명..."
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Location */}
          <div>
            <Label className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              위치 (선택)
            </Label>
            <div className="mt-1 space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetLocation}
                className="w-full gap-1.5"
              >
                <Navigation className="h-3.5 w-3.5" />
                현재 위치 가져오기
              </Button>
              {(lat || lng) && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="위도"
                    step="0.0001"
                  />
                  <Input
                    type="number"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="경도"
                    step="0.0001"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Image */}
          <div>
            <Label className="flex items-center gap-1">
              <Upload className="h-3.5 w-3.5" />
              대표 사진 (선택)
            </Label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="미리보기"
                    className="h-40 w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex h-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50 transition-colors">
                  <div className="text-center text-xs">
                    <Upload className="mx-auto h-5 w-5 mb-1" />
                    사진 선택
                  </div>
                  <input
                    type="file"
                    accept={IMAGE_ACCEPT}
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !nameKo.trim() || !height || !region}
            className="w-full"
          >
            {submitting ? "등록 중..." : "산 등록하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
