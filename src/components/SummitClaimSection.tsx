import { useState, useRef, useMemo } from "react";
import { useSummits, type Summit, type SummitClaim } from "@/hooks/useSummits";
import { useAuth } from "@/contexts/AuthContext";
import { useHikingGroups } from "@/hooks/useHikingGroups";
import { mountains as mountainsData } from "@/data/mountains";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import MountainMascot from "@/components/MountainMascot";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Camera,
  Crown,
  Mountain,
  Flag,
  Loader2,
  Navigation,
  Users,
  Clock,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  mountainId: number;
  mountainName: string;
}

export function SummitClaimSection({ mountainId, mountainName }: Props) {
  const { user } = useAuth();
  const { summits, claims, loading, getSummitOwner, getMountainLeader, claimSummit } = useSummits(mountainId);
  const { myGroups } = useHikingGroups();
  const { toast } = useToast();

  // Get mountain data for fallback coordinates
  const mountainData = useMemo(() => {
    return mountainsData.find((m) => m.id === mountainId);
  }, [mountainId]);

  // Create fallback summit when no summits exist
  const displaySummits = useMemo(() => {
    if (summits.length > 0) return summits;
    if (!mountainData) return [];
    return [{
      id: `fallback-${mountainId}`,
      mountain_id: mountainId,
      summit_name: `${mountainName} 정상`,
      latitude: mountainData.lat,
      longitude: mountainData.lng,
      elevation: mountainData.height,
    }] as Summit[];
  }, [summits, mountainId, mountainName, mountainData]);

  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [selectedSummit, setSelectedSummit] = useState<Summit | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedSummit, setExpandedSummit] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const leader = getMountainLeader();

  const handleStartClaim = (summit: Summit) => {
    setSelectedSummit(summit);
    setPhotoFile(null);
    setPhotoPreview(null);
    setGpsStatus("idle");
    setUserLocation(null);
    setSelectedGroupId("");
    setShowClaimDialog(true);
  };

  const handleGetLocation = () => {
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("success");
      },
      () => {
        setGpsStatus("error");
        toast({ title: "위치를 가져올 수 없습니다", description: "GPS를 활성화해주세요", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitClaim = async () => {
    if (!selectedSummit || !userLocation || !photoFile) return;
    setClaiming(true);
    const isFallback = selectedSummit.id.startsWith("fallback-");
    const result = await claimSummit(
      selectedSummit.id,
      userLocation.lat,
      userLocation.lng,
      photoFile,
      selectedGroupId || undefined,
      isFallback ? {
        mountain_id: mountainId,
        summit_name: selectedSummit.summit_name,
        latitude: selectedSummit.latitude,
        longitude: selectedSummit.longitude,
        elevation: selectedSummit.elevation,
      } : undefined
    );
    setClaiming(false);
    if (result.success) {
      setShowClaimDialog(false);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    } else {
      toast({ title: "인증 실패", description: result.error, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm flex flex-col items-center gap-3">
        <MountainMascot size={80} mood="loading" />
        <span className="text-sm text-muted-foreground">정상 정보 불러오는 중...</span>
      </div>
    );
  }

  if (displaySummits.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Summit Claim Celebration */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm">
          <div className="rounded-3xl bg-card p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <MountainMascot size={120} mood="celebrating" />
            <h2 className="mt-3 text-xl font-bold text-foreground">정상 정복! 🏔️</h2>
            <p className="text-sm text-muted-foreground mt-1">{selectedSummit?.summit_name} 정복을 축하합니다!</p>
            <Badge className="mt-3 bg-primary/10 text-primary border-0 gap-1">
              <Flag className="h-3 w-3" /> Summit Claimed!
            </Badge>
          </div>
        </div>
      )}
      {/* Mountain Leader */}
      {leader && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 dark:border-amber-800/30 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200/60 dark:bg-amber-800/40">
              <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{mountainName} 대장</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Avatar className="h-5 w-5">
                  {leader.avatar_url && <AvatarImage src={leader.avatar_url} />}
                  <AvatarFallback className="text-[8px] bg-amber-200">{(leader.nickname || "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-bold text-foreground">{leader.nickname || "알 수 없음"}</span>
                <Badge variant="secondary" className="text-[10px] gap-0.5">
                  <Flag className="h-2.5 w-2.5" /> {leader.claim_count}회 인증
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summit List */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">🏔️ 정상 정복</h2>
            <p className="text-xs text-muted-foreground">정상에 도달하면 인증하세요</p>
          </div>
        </div>

        <div className="space-y-3">
          {displaySummits.map((summit) => {
            const owner = getSummitOwner(summit.id);
            const summitClaims = claims.filter((c) => c.summit_id === summit.id);

            return (
              <div key={summit.id} className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Mountain className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">{summit.summit_name}</span>
                      <span className="text-xs text-muted-foreground">{summit.elevation}m</span>
                    </div>
                  </div>
                  {user && (
                    <Button
                      size="sm"
                      onClick={() => handleStartClaim(summit)}
                      className="rounded-full gap-1.5 text-xs"
                    >
                      <Flag className="h-3.5 w-3.5" /> 정복 인증
                    </Button>
                  )}
                </div>

                {/* Current Owner */}
                {owner && (
                  <div className="flex items-center gap-2 rounded-lg bg-card p-2.5 border border-border/50">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">현재 주인</span>
                    <Avatar className="h-5 w-5">
                      {owner.profile?.avatar_url && <AvatarImage src={owner.profile.avatar_url} />}
                      <AvatarFallback className="text-[8px]">{(owner.profile?.nickname || "?").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-foreground">{owner.profile?.nickname || "알 수 없음"}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(owner.claimed_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                )}

                {/* Claim Timeline */}
                {summitClaims.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedSummit(expandedSummit === summit.id ? null : summit.id);
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Clock className="h-3 w-3" />
                      정복 히스토리 ({summitClaims.length}회)
                      <span className="text-[10px]">{expandedSummit === summit.id ? "▲" : "▼"}</span>
                    </button>

                    {expandedSummit === summit.id && (
                      <div className="relative ml-2 space-y-0">
                        {/* Timeline line */}
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                        {summitClaims.map((claim, idx) => (
                          <div key={claim.id} className="relative flex gap-3 pb-3 last:pb-0">
                            {/* Timeline dot */}
                            <div className={cn(
                              "relative z-10 mt-1.5 h-[15px] w-[15px] rounded-full border-2 shrink-0",
                              idx === 0
                                ? "border-primary bg-primary/20"
                                : "border-border bg-card"
                            )} />

                            {/* Claim card */}
                            <div className="flex-1 rounded-xl border border-border bg-card p-3 shadow-sm space-y-2">
                              {/* Header */}
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  {claim.profile?.avatar_url && <AvatarImage src={claim.profile.avatar_url} />}
                                  <AvatarFallback className="text-[9px] bg-muted">
                                    {(claim.profile?.nickname || "?").charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-semibold text-foreground block truncate">
                                    {claim.profile?.nickname || "알 수 없음"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(claim.claimed_at).toLocaleString("ko-KR", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {idx === 0 && (
                                  <Badge variant="secondary" className="text-[9px] gap-0.5 shrink-0">
                                    <Crown className="h-2.5 w-2.5" /> 현재 주인
                                  </Badge>
                                )}
                              </div>

                              {/* Photo */}
                              <div className="overflow-hidden rounded-lg">
                                <img
                                  src={claim.photo_url}
                                  alt={`${summit.summit_name} 정복 사진`}
                                  className="w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Claim Dialog */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              {selectedSummit?.summit_name} 정복 인증
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Anti-cheat info */}
            <div className="rounded-xl bg-muted/50 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Shield className="h-3.5 w-3.5" /> 인증 조건
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-0.5 ml-5 list-disc">
                <li>정상 50m 이내 GPS 위치 확인</li>
                <li>정상 사진 업로드 필수</li>
                <li>같은 정상 12시간 쿨다운</li>
              </ul>
            </div>

            {/* Step 1: GPS */}
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Navigation className="h-3.5 w-3.5" /> GPS 위치 확인
              </label>
              <Button
                variant={gpsStatus === "success" ? "secondary" : "outline"}
                className={cn("w-full rounded-xl gap-2", gpsStatus === "success" && "border-primary/30 bg-primary/5")}
                onClick={handleGetLocation}
                disabled={gpsStatus === "loading"}
              >
                {gpsStatus === "loading" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> 위치 확인 중...</>
                ) : gpsStatus === "success" ? (
                  <><MapPin className="h-4 w-4 text-primary" /> 위치 확인 완료</>
                ) : (
                  <><MapPin className="h-4 w-4" /> 현재 위치 가져오기</>
                )}
              </Button>
              {gpsStatus === "error" && (
                <p className="text-[11px] text-destructive">GPS를 활성화하고 다시 시도해주세요</p>
              )}
            </div>

            {/* Step 2: Photo */}
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Camera className="h-3.5 w-3.5" /> 정상 사진
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <p className="text-[10px] text-muted-foreground">정상 도달을 인증하기 위해 현장 사진이 필요합니다. 사진은 인증 용도로만 사용됩니다.</p>
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Summit" className="w-full h-40 object-cover rounded-xl" />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-2 right-2 rounded-full text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    다시 촬영
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-28 flex-col gap-2 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">사진 촬영 또는 선택</span>
                </Button>
              )}
            </div>

            {/* Step 3: Optional club */}
            {myGroups.length > 0 && (
              <div className="space-y-2">
                <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> 산악회 (선택)
                </label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="산악회 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택 안 함</SelectItem>
                    {myGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full rounded-xl gap-2"
              disabled={!userLocation || !photoFile || claiming}
              onClick={handleSubmitClaim}
            >
              {claiming ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> 인증 중...</>
              ) : (
                <><Flag className="h-4 w-4" /> 정상 정복 인증하기</>
              )}
            </Button>

            {/* Cooldown note */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center">
              <Clock className="h-3 w-3" />
              같은 정상은 12시간 후 재인증 가능
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
