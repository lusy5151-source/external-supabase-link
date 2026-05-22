import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMountains } from "@/contexts/MountainsContext";
import { getMockWeather } from "@/data/mockWeather";
import { useHikingPlans, type PlanWaypoint } from "@/hooks/useHikingPlans";
import { useTrails, type Trail } from "@/hooks/useTrails";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Mountain, CalendarIcon, Clock, Cloud, Sun, CloudRain, CloudSnow, CloudSun,
  Wind, Droplets, ArrowLeft, MapPin, ChevronDown, Search, Users, AlertCircle,
  Route, Plus, Trash2, Flag,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import InviteFriendsSheet from "@/components/InviteFriendsSheet";

const conditionIcons: Record<string, any> = {
  "맑음": Sun, "구름": CloudSun, "흐림": Cloud, "비": CloudRain, "눈": CloudSnow,
};

const CreatePlanPage = () => {
  const { mountains } = useMountains();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createPlan } = useHikingPlans();

  const [mountainId, setMountainId] = useState<number | null>(null);
  const [trailName, setTrailName] = useState("");
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [estDistance, setEstDistance] = useState<number | null>(null);
  const [estDuration, setEstDuration] = useState<number | null>(null);
  const [routeNotes, setRouteNotes] = useState("");
  const [waypoints, setWaypoints] = useState<PlanWaypoint[]>([]);
  const [newWpName, setNewWpName] = useState("");
  const [newWpNote, setNewWpNote] = useState("");
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mountainSearch, setMountainSearch] = useState("");
  const [showMountainList, setShowMountainList] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);

  // Sort mountains by Korean name
  const sortedMountains = useMemo(
    () => [...mountains].sort((a, b) => a.nameKo.localeCompare(b.nameKo, "ko")),
    [mountains]
  );

  const selectedMountain = useMemo(
    () => mountains.find((m) => m.id === mountainId),
    [mountainId, mountains]
  );

  const { trails: dbTrails, loading: trailsLoading } = useTrails(mountainId ?? 0);

  // Reset trail/route state when the mountain changes
  useEffect(() => {
    setSelectedTrailId(null);
    setEstDistance(null);
    setEstDuration(null);
    setWaypoints([]);
    setRouteNotes("");
  }, [mountainId]);

  const selectedTrail: Trail | undefined = useMemo(
    () => dbTrails.find((t) => t.id === selectedTrailId),
    [dbTrails, selectedTrailId]
  );

  const handleSelectTrail = (t: Trail) => {
    setSelectedTrailId(t.id);
    setTrailName(t.name);
    setEstDistance(t.distance_km ?? null);
    setEstDuration(t.duration_minutes ?? null);
  };

  const addWaypoint = () => {
    const name = newWpName.trim();
    if (!name) return;
    setWaypoints((prev) => [...prev, { name, note: newWpNote.trim() || null }]);
    setNewWpName("");
    setNewWpNote("");
  };

  const removeWaypoint = (idx: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== idx));
  };

  const weather = selectedMountain ? getMockWeather(selectedMountain.id) : null;
  const CondIcon = weather ? conditionIcons[weather.condition] || Cloud : Cloud;

  const filteredMountains = useMemo(() => {
    if (!mountainSearch.trim()) return sortedMountains.slice(0, 20);
    const q = mountainSearch.toLowerCase();
    return sortedMountains.filter((m) =>
      m.nameKo.includes(q) || m.name.toLowerCase().includes(q) || (m.province || m.region).includes(q)
    ).slice(0, 20);
  }, [mountainSearch, sortedMountains]);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const canSubmit = !!mountainId && !!date && !submitting;

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!mountainId || !date) {
      const msg = "산과 등산 날짜를 선택해주세요";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    // Validate max participants
    let maxP: number | null = null;
    if (maxParticipants.trim()) {
      const n = Number(maxParticipants);
      if (!Number.isFinite(n) || n < 2 || n > 50) {
        const msg = "최대 참여 인원은 2~50명 사이여야 합니다";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
      maxP = Math.floor(n);
    }

    setSubmitting(true);
    const { data, error } = await createPlan({
      mountain_id: mountainId,
      trail_name: trailName || undefined,
      trail_id: selectedTrailId,
      waypoints,
      route_notes: routeNotes || null,
      estimated_distance_km: estDistance,
      estimated_duration_minutes: estDuration,
      planned_date: format(date, "yyyy-MM-dd"),
      start_time: startTime || undefined,
      notes: notes || undefined,
      meeting_location: meetingLocation || undefined,
      is_public: true,
      max_participants: maxP as any,
    } as any);
    setSubmitting(false);

    if (error) {
      console.error("Plan create error:", JSON.stringify(error));
      const msg = `계획 생성 실패: ${error.message || "알 수 없는 오류"}`;
      setErrorMsg(msg);
      toast.error(msg);
    } else {
      toast.success("등산 계획이 생성됐어요! 🏔");
      if (data) {
        setCreatedPlanId(data.id);
        setShowInviteSheet(true);
      } else {
        navigate("/plans");
      }
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">등산 계획 만들기</h1>
      </div>

      {/* Mountain Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">산 선택 *</label>
        <div className="relative">
          <div
            onClick={() => setShowMountainList(!showMountainList)}
            className="flex items-center gap-2 rounded-xl border border-input bg-card p-3 cursor-pointer"
          >
            <Mountain className="h-4 w-4 text-primary" />
            <span className={cn("flex-1 text-sm", selectedMountain ? "text-foreground" : "text-muted-foreground")}>
              {selectedMountain
                ? `${selectedMountain.nameKo} (${selectedMountain.height}m · ${selectedMountain.province || selectedMountain.region})`
                : "산을 선택하세요"}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>

          {showMountainList && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border bg-card shadow-lg max-h-72 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={mountainSearch}
                  onChange={(e) => setMountainSearch(e.target.value)}
                  placeholder="산 이름 검색..."
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto max-h-56">
                {filteredMountains.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMountainId(m.id);
                      setTrailName("");
                      setShowMountainList(false);
                      setMountainSearch("");
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm hover:bg-secondary/60 transition-colors",
                      m.id === mountainId && "bg-primary/10"
                    )}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{m.nameKo}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.height}m · {m.province || m.region}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredMountains.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    검색 결과가 없습니다
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Course / Trail selection */}
      {mountainId && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Route className="h-4 w-4 text-primary" /> 등산 코스 선택 (선택)
          </label>
          {trailsLoading ? (
            <p className="text-xs text-muted-foreground">코스를 불러오는 중...</p>
          ) : dbTrails.length === 0 ? (
            <p className="text-xs text-muted-foreground">등록된 코스가 없습니다. 코스 이름을 직접 입력할 수 있어요.</p>
          ) : (
            <div className="space-y-1.5">
              {dbTrails.map((t) => {
                const active = selectedTrailId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTrail(t)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "border-input bg-card hover:bg-secondary/50"
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.distance_km != null && <>📏 {t.distance_km}km</>}
                      {t.duration_minutes != null && <> · ⏱ {Math.floor(t.duration_minutes / 60)}시간 {t.duration_minutes % 60}분</>}
                      {t.difficulty && <> · 🥾 {t.difficulty}</>}
                    </p>
                    {t.starting_point && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">📍 {t.starting_point}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <Input
            value={trailName}
            onChange={(e) => { setTrailName(e.target.value); if (selectedTrailId) setSelectedTrailId(null); }}
            placeholder="또는 코스 이름 직접 입력"
            className="mt-1"
          />
        </div>
      )}

      {/* Waypoints */}
      {mountainId && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Flag className="h-4 w-4 text-primary" /> 경유지 (선택)
          </label>
          {waypoints.length > 0 && (
            <ol className="space-y-1.5">
              {waypoints.map((w, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl border border-input bg-card p-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{w.name}</p>
                    {w.note && <p className="text-[11px] text-muted-foreground truncate">{w.note}</p>}
                  </div>
                  <button onClick={() => removeWaypoint(i)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div className="rounded-xl border border-dashed border-input bg-card p-3 space-y-2">
            <Input value={newWpName} onChange={(e) => setNewWpName(e.target.value)} placeholder="경유지 이름 (예: 위문)" className="h-9" />
            <Input value={newWpNote} onChange={(e) => setNewWpNote(e.target.value)} placeholder="메모 (선택)" className="h-9" />
            <Button type="button" variant="outline" size="sm" onClick={addWaypoint} disabled={!newWpName.trim()} className="w-full gap-1.5">
              <Plus className="h-3.5 w-3.5" /> 경유지 추가
            </Button>
          </div>
        </div>
      )}

      {/* Route notes */}
      {mountainId && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">루트 메모 (선택)</Label>
          <Textarea
            value={routeNotes}
            onChange={(e) => setRouteNotes(e.target.value)}
            placeholder="대피소, 식수 위치, 우회 코스 등..."
            className="min-h-[60px]"
          />
        </div>
      )}

      {/* Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">등산 날짜 *</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: ko }) : "날짜를 선택하세요"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return d < today;
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Start Time */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">출발 시간</label>
        <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="border-0 p-0 h-auto shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Weather Preview */}
      {selectedMountain && weather && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">🌤 예상 날씨 (미리보기)</p>
          <div className="flex items-center gap-3">
            <CondIcon className="h-8 w-8 text-sky-500" />
            <div>
              <p className="text-lg font-bold text-foreground">{weather.temp}°C</p>
              <p className="text-xs text-muted-foreground">{weather.condition}</p>
            </div>
            <div className="ml-auto text-xs text-muted-foreground space-y-0.5">
              <p className="flex items-center gap-1"><Wind className="h-3 w-3" /> {weather.windSpeed}km/h</p>
              <p className="flex items-center gap-1"><Droplets className="h-3 w-3" /> 강수 {weather.precipChance}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Location */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">모임 장소 (선택)</label>
        <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Input
            value={meetingLocation}
            onChange={(e) => setMeetingLocation(e.target.value)}
            placeholder="예: 북한산 국립공원 정문"
            className="border-0 p-0 h-auto shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Max participants */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">최대 참여 인원</Label>
        <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            min={2}
            max={50}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            placeholder="제한 없음"
            className="border-0 p-0 h-auto shadow-none focus-visible:ring-0"
          />
          <span className="text-xs text-muted-foreground">명</span>
        </div>
        <p className="text-[10px] text-muted-foreground">비워두면 인원 제한이 없습니다 (2~50명)</p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">설명 / 메모 (선택)</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="준비물, 주의사항 등..."
          className="min-h-[80px]"
        />
      </div>

      {/* Visible error */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      <div
        className="sticky -mx-5"
        style={{
          bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
          background: "hsl(var(--color-background-primary))",
          borderTop: "0.5px solid hsl(var(--color-border-tertiary))",
          padding: "16px 20px",
          zIndex: 10,
        }}
      >
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full"
          style={{
            background: "hsl(var(--brand-forest))",
            color: "white",
            height: 48,
            borderRadius: "var(--border-radius-md, 12px)",
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          {submitting ? "생성 중..." : "계획 만들기"}
        </Button>
      </div>

      {createdPlanId && (
        <InviteFriendsSheet
          open={showInviteSheet}
          onOpenChange={(open) => {
            setShowInviteSheet(open);
            if (!open) navigate(`/plans/${createdPlanId}`);
          }}
          planId={createdPlanId}
        />
      )}
    </div>
  );
};

export default CreatePlanPage;
