import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { mountains } from "@/data/mountains";
import { getMockWeather } from "@/data/mockWeather";
import { useHikingPlans } from "@/hooks/useHikingPlans";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Mountain, CalendarIcon, Clock, Cloud, Sun, CloudRain, CloudSnow, CloudSun,
  Wind, Droplets, ArrowLeft, MapPin, ChevronDown, Search, Globe,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const conditionIcons: Record<string, any> = {
  "맑음": Sun, "구름": CloudSun, "흐림": Cloud, "비": CloudRain, "눈": CloudSnow,
};

const CreatePlanPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createPlan } = useHikingPlans();
  const { toast } = useToast();

  const [mountainId, setMountainId] = useState<number | null>(null);
  const [trailName, setTrailName] = useState("");
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [mountainSearch, setMountainSearch] = useState("");
  const [showMountainList, setShowMountainList] = useState(false);

  const selectedMountain = useMemo(
    () => mountains.find((m) => m.id === mountainId),
    [mountainId]
  );

  const weather = selectedMountain ? getMockWeather(selectedMountain.id) : null;
  const CondIcon = weather ? conditionIcons[weather.condition] || Cloud : Cloud;

  const filteredMountains = useMemo(() => {
    if (!mountainSearch.trim()) return mountains.slice(0, 10);
    const q = mountainSearch.toLowerCase();
    return mountains.filter((m) =>
      m.nameKo.includes(q) || m.name.toLowerCase().includes(q) || m.region.includes(q)
    ).slice(0, 10);
  }, [mountainSearch]);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleSubmit = async () => {
    if (!mountainId || !date) {
      toast({ title: "산과 날짜를 선택해주세요", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await createPlan({
      mountain_id: mountainId,
      trail_name: trailName || undefined,
      planned_date: format(date, "yyyy-MM-dd"),
      start_time: startTime || undefined,
      notes: notes || undefined,
      meeting_location: meetingLocation || undefined,
      is_public: isPublic,
      max_participants: isPublic ? maxParticipants : 10,
    } as any);
    setSubmitting(false);

    if (error) {
      toast({ title: "계획 생성 실패", description: error.message, variant: "destructive" });
    } else if (data) {
      toast({ title: "등산 계획이 생성되었습니다!" });
      navigate(`/plans/${data.id}`);
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
              {selectedMountain ? `${selectedMountain.nameKo} (${selectedMountain.height}m)` : "산을 선택하세요"}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>

          {showMountainList && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border bg-card shadow-lg max-h-64 overflow-hidden">
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
              <div className="overflow-y-auto max-h-48">
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
                      <p className="text-[10px] text-muted-foreground">{m.region} · {m.height}m · {m.difficulty}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trail Selection */}
      {selectedMountain?.trails && selectedMountain.trails.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">등산 코스</label>
          <div className="space-y-1.5">
            {selectedMountain.trails.map((trail) => (
              <button
                key={trail.name}
                onClick={() => setTrailName(trail.name)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-colors",
                  trailName === trail.name
                    ? "border-primary bg-primary/5"
                    : "border-input bg-card hover:bg-secondary/50"
                )}
              >
                <p className="text-sm font-medium text-foreground">{trail.name}</p>
                <p className="text-xs text-muted-foreground">
                  {trail.distance} · ⏱ {trail.duration} · 📍 {trail.startingPoint}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">날짜 *</label>
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

      {/* Mountain Info Preview */}
      {selectedMountain && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">⛰ 산 정보</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">난이도</p>
              <p className="font-medium text-foreground">{selectedMountain.difficulty}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">높이</p>
              <p className="font-medium text-foreground">{selectedMountain.height}m</p>
            </div>
            {trailName && selectedMountain.trails && (
              <>
                {(() => {
                  const trail = selectedMountain.trails?.find((t) => t.name === trailName);
                  if (!trail) return null;
                  return (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs">예상 소요시간</p>
                        <p className="font-medium text-foreground">{trail.duration}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">거리</p>
                        <p className="font-medium text-foreground">{trail.distance}</p>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
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

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">메모 (선택)</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="준비물, 주의사항 등..."
          className="min-h-[80px]"
        />
      </div>

      {/* Public toggle */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label className="text-sm font-medium">공개 일정</Label>
              <p className="text-[10px] text-muted-foreground">다른 사용자도 참여할 수 있습니다</p>
            </div>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        {isPublic && (
          <>
            <div className="space-y-2 border-t border-border pt-3">
              <Label className="text-xs">최대 참가 인원</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={2}
                  max={50}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Math.min(50, Math.max(2, Number(e.target.value))))}
                  className="w-24 text-center"
                />
                <span className="text-xs text-muted-foreground">명 (2~50명)</span>
              </div>
            </div>
            <p className="text-[10px] text-primary flex items-center gap-1">
              <Globe className="h-3 w-3" />
              공개 일정은 모든 이용자가 볼 수 있어요
            </p>
          </>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!mountainId || !date || submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? "생성 중..." : "계획 만들기"}
      </Button>
    </div>
  );
};

export default CreatePlanPage;
