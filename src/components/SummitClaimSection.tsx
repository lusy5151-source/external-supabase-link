import { useState, useRef, useMemo } from "react";
import { useSummits, type Summit, type SummitClaim } from "@/hooks/useSummits";
import { useAuth } from "@/contexts/AuthContext";
import { useHikingGroups } from "@/hooks/useHikingGroups";
import { useMountains } from "@/contexts/MountainsContext";
import { supabase } from "@/integrations/supabase/client";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  ShieldCheck,
  ShieldX,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AiVerification {
  status: "idle" | "verifying" | "approved" | "rejected" | "error" | "blocked" | "cooldown";
  confidence: number;
  reason: string;
  detected_elements: string[];
  remaining?: number;
  waitSeconds?: number;
}

interface Props {
  mountainId: number;
  mountainName: string;
}

export function SummitClaimSection({ mountainId, mountainName }: Props) {
  const { mountains: mountainsData } = useMountains();
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
  const [aiVerification, setAiVerification] = useState<AiVerification>({
    status: "idle", confidence: 0, reason: "", detected_elements: [],
  });
  const [showRejectWarning, setShowRejectWarning] = useState(false);

  const leader = getMountainLeader();

  const verifyPhotoWithAI = async (imageDataUrl: string) => {
    setAiVerification({ status: "verifying", confidence: 0, reason: "", detected_elements: [] });
    try {
      const { data, error } = await supabase.functions.invoke("verify-summit-photo", {
        body: {
          imageBase64: imageDataUrl,
          mountainName: mountainName || "",
          summitName: selectedSummit?.summit_name || "",
        },
      });
      if (error) throw error;
      setAiVerification({
        status: data.approved ? "approved" : "rejected",
        confidence: data.confidence || 0,
        reason: data.reason || "",
        detected_elements: data.detected_elements || [],
      });
    } catch (err) {
      console.error("AI verification error:", err);
      setAiVerification({ status: "error", confidence: 0, reason: "AI 검증을 수행할 수 없습니다", detected_elements: [] });
    }
  };

  const handleStartClaim = (summit: Summit) => {
    setSelectedSummit(summit);
    setPhotoFile(null);
    setPhotoPreview(null);
    setGpsStatus("idle");
    setUserLocation(null);
    setSelectedGroupId("");
    setAiVerification({ status: "idle", confidence: 0, reason: "", detected_elements: [] });
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const { compressImageToDataUrl, resizeImageForAI } = await import("@/lib/imageUpload");
      const dataUrl = await compressImageToDataUrl(file, "summit");
      if (!dataUrl) return;
      setPhotoFile(file);
      setAiVerification({ status: "idle", confidence: 0, reason: "", detected_elements: [] });
      setPhotoPreview(dataUrl);
      try {
        const aiDataUrl = await resizeImageForAI(file);
        verifyPhotoWithAI(aiDataUrl);
      } catch {
        verifyPhotoWithAI(dataUrl);
      }
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
      } : undefined,
      aiVerification.status === "approved" ? true : aiVerification.status === "rejected" ? false : null,
      aiVerification.confidence || null
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

            {/* AI Verification Result */}
            {aiVerification.status === "verifying" && (
              <div className="rounded-xl border border-border bg-muted/50 p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">AI가 정상석을 분석하고 있습니다...</span>
              </div>
            )}
            {aiVerification.status === "approved" && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">AI 인증 통과</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    신뢰도 {aiVerification.confidence}%
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{aiVerification.reason}</p>
                {aiVerification.detected_elements.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {aiVerification.detected_elements.map((el, i) => (
                      <Badge key={i} variant="outline" className="text-[9px]">{el}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            {aiVerification.status === "rejected" && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldX className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-medium text-destructive">AI 인증 미통과</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    신뢰도 {aiVerification.confidence}%
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{aiVerification.reason}</p>
                <p className="text-[10px] text-muted-foreground">* AI 판별과 무관하게 인증 제출은 가능합니다</p>
              </div>
            )}
            {aiVerification.status === "error" && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">AI 검증을 건너뜁니다. 인증은 계속 가능합니다.</span>
              </div>
            )}

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
              onClick={() => {
                if (aiVerification.status === "rejected") {
                  setShowRejectWarning(true);
                } else {
                  handleSubmitClaim();
                }
              }}
            >
              {claiming ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> 인증 중...</>
              ) : (
                <><Flag className="h-4 w-4" /> 정상 정복 인증하기</>
              )}
            </Button>

            <AlertDialog open={showRejectWarning} onOpenChange={setShowRejectWarning}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <ShieldX className="h-5 w-5 text-destructive" />
                    AI 인증 경고
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2 text-left">
                    <p>AI가 이 사진에서 정상석을 인식하지 못했습니다.</p>
                    {aiVerification.reason && (
                      <p className="text-xs bg-destructive/10 rounded-lg p-2 border border-destructive/20">
                        사유: {aiVerification.reason}
                      </p>
                    )}
                    <p>그래도 인증을 제출하시겠습니까?</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setShowRejectWarning(false);
                      handleSubmitClaim();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    그래도 제출
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
