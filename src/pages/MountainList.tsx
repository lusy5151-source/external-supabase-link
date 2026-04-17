import { useState, useMemo } from "react";
import { regions } from "@/data/mountains";
import type { Mountain } from "@/data/mountains";
import { useMountains } from "@/contexts/MountainsContext";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { Search, CheckCircle2, Circle, ChevronRight, ChevronDown, ArrowUpDown, Mountain as MountainIcon, Star, Smile, MapPin, Flame, User, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import React, { lazy, Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useUserMountains } from "@/hooks/useUserMountains";
import { useBac100Mountains } from "@/hooks/useBac100Mountains";
import RegisterMountainModal from "@/components/RegisterMountainModal";

const MountainMapSection = lazy(() => import("@/components/MountainMapSection"));

type SortKey = "name" | "height" | "popularity";
type ViewMode = "all" | "forestry100" | "bac100" | "region" | "oreum" | "full";

const MountainList = () => {
  const { mountains: dbMountains } = useMountains();
  const { isCompleted, toggleComplete, completedCount } = useStore();
  const { user } = useAuth();
  const { userMountainsAsMountains, userMountains } = useUserMountains();
  const { data: bac100List = [] } = useBac100Mountains();
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("전체");
  const [showCompleted, setShowCompleted] = useState<"all" | "done" | "todo">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [openRegions, setOpenRegions] = useState<Set<string>>(new Set());
  const [showUserOnly, setShowUserOnly] = useState(false);

  const allMountains = useMemo(() => {
    const visibleUserMountains = userMountainsAsMountains.filter((m) => {
      const row = userMountains.find((um) => um.mountain_id === m.id);
      if (!row) return false;
      if (row.status === "active") return true;
      if (row.status === "pending" && user && row.created_by === user.id) return true;
      return false;
    });
    return [...dbMountains, ...visibleUserMountains];
  }, [dbMountains, userMountainsAsMountains, userMountains, user]);

  const totalBaekdu = dbMountains.filter((m) => m.is_baekdu).length;
  const completedBaekdu = dbMountains.filter((m) => m.is_baekdu && isCompleted(m.id)).length;

  const filterAndSort = (list: any[]) => {
    let filtered = list.filter((m: any) => {
      const matchSearch = !search.trim() || m.nameKo.includes(search) || m.name.toLowerCase().includes(search.toLowerCase());
      const matchDifficulty = difficultyFilter === "전체" || m.difficulty === difficultyFilter;
      const matchStatus = showCompleted === "all" || (showCompleted === "done" && isCompleted(m.id)) || (showCompleted === "todo" && !isCompleted(m.id));
      const matchUserOnly = !showUserOnly || !!(m as any).isUserCreated;
      return matchSearch && matchDifficulty && matchStatus && matchUserOnly;
    });
    filtered.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.nameKo.localeCompare(b.nameKo, "ko");
      else if (sortKey === "height") cmp = a.height - b.height;
      else if (sortKey === "popularity") cmp = (a.popularity || 0) - (b.popularity || 0);
      return sortAsc ? cmp : -cmp;
    });
    return filtered;
  };

  const allFiltered = useMemo(() => filterAndSort(allMountains), [search, difficultyFilter, showCompleted, isCompleted, sortKey, sortAsc, allMountains, showUserOnly]);
  // 산림청 100대 명산: bac100_label 에 "산림청" 포함
  const forestry100Filtered = useMemo(
    () => filterAndSort(dbMountains.filter((m) => m.bac100_label?.includes("산림청"))),
    [search, difficultyFilter, showCompleted, isCompleted, sortKey, sortAsc, showUserOnly, dbMountains]
  );
  // BAC 100대 명산: is_bac100 = true (산림청 라벨이 아닌 경우)
  const bac100Filtered = useMemo(
    () => filterAndSort(dbMountains.filter((m) => (m.is_bac100 ?? m.is_baekdu) && !m.bac100_label?.includes("산림청"))),
    [search, difficultyFilter, showCompleted, isCompleted, sortKey, sortAsc, showUserOnly, dbMountains]
  );
  const oreumFiltered = useMemo(() => filterAndSort(dbMountains.filter((m) => m.region === "제주" && !m.is_baekdu)), [search, difficultyFilter, showCompleted, isCompleted, sortKey, sortAsc, showUserOnly, dbMountains]);

  const allRegions = [...regions, "기타"] as const;
  const regionGroups = useMemo(() => {
    return allRegions.map((r) => ({ region: r, mountains: filterAndSort(allMountains.filter((m) => m.region === r)) })).filter((g) => g.mountains.length > 0);
  }, [search, difficultyFilter, showCompleted, isCompleted, sortKey, sortAsc, allMountains, showUserOnly]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "name"); }
  };

  const toggleRegion = (region: string) => {
    setOpenRegions((prev) => { const next = new Set(prev); if (next.has(region)) next.delete(region); else next.add(region); return next; });
  };

  const viewModes: { key: ViewMode; label: string; icon: any }[] = [
    { key: "all", label: "전체", icon: MountainIcon },
    { key: "forestry100", label: "산림청 100대", icon: Star },
    { key: "bac100", label: "BAC 백대명산", icon: Star },
    { key: "region", label: "지역별", icon: MapPin },
    { key: "oreum", label: "제주 오름", icon: Flame },
  ];

  const getCurrentList = () => {
    if (viewMode === "forestry100") return forestry100Filtered;
    if (viewMode === "bac100") return bac100Filtered;
    if (viewMode === "oreum") return oreumFiltered;
    return allFiltered;
  };

  return (
    <div className="space-y-5 pb-24 -mx-5 -mt-4 px-5 pt-4" style={{ background: "linear-gradient(180deg, hsl(205, 60%, 94%) 0%, hsl(var(--background)) 40%)" }}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">산 탐색</h1>
        <p className="mt-1 text-muted-foreground text-sm">전체 {allMountains.length}개 · 완등 {completedCount}개 · 백대명산 {completedBaekdu}/{totalBaekdu}</p>
      </div>

      <div data-onboarding="mountain-map" className="relative" style={{ zIndex: 0 }}>
        <Suspense fallback={<LoadingSpinner message="지도를 불러오는 중..." />}>
          <MountainMapSection />
        </Suspense>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="산 이름으로 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <RegisterMountainModal />

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {viewModes.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setViewMode(key)} className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${viewMode === key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 overflow-x-auto">
            {["전체", "쉬움", "보통", "어려움"].map((d) => (
              <button key={d} onClick={() => setDifficultyFilter(d)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${difficultyFilter === d ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{d}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {([["name", "이름"], ["height", "높이"], ["popularity", "인기"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => toggleSort(key)} className={`flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${sortKey === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {label}{sortKey === key && <ArrowUpDown className="h-3 w-3" />}
              </button>
            ))}
          </div>
        </div>
        <div data-onboarding="mountain-filter" className="flex gap-1.5">
          {([["all", "전체"], ["done", "완등"], ["todo", "미등"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setShowCompleted(val)} className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${showCompleted === val ? "bg-primary text-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{label}</button>
          ))}
        </div>
        <button onClick={() => setShowUserOnly(!showUserOnly)} className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${showUserOnly ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
          <User className="inline h-3 w-3 mr-0.5" />사용자 등록 산만
        </button>
      </div>

      {viewMode === "region" ? (
        <div className="space-y-2">
          {regionGroups.map(({ region, mountains: rMountains }) => (
            <Collapsible key={region} open={openRegions.has(region)} onOpenChange={() => toggleRegion(region)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span className="font-medium text-sm text-foreground">{region}</span><span className="text-xs text-muted-foreground">{rMountains.length}개</span></div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openRegions.has(region) ? "rotate-180" : ""}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 mt-2 pl-2">
                  {rMountains.map((m) => (<MountainCard key={m.id} m={m} isCompleted={isCompleted(m.id)} toggleComplete={toggleComplete} />))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{getCurrentList().length}개 결과</p>
          <div className="space-y-2">
            {getCurrentList().length === 0 ? (<p className="py-12 text-center text-sm text-muted-foreground">검색 결과가 없습니다</p>) : getCurrentList().map((m) => (<MountainCard key={m.id} m={m} isCompleted={isCompleted(m.id)} toggleComplete={toggleComplete} />))}
          </div>
        </>
      )}
    </div>
  );
};

const MountainCard = React.memo(function MountainCard({ m, isCompleted: completed, toggleComplete }: { m: any; isCompleted: boolean; toggleComplete: (id: number) => void }) {
  const isUserCreated = !!(m as any).isUserCreated;
  const diffColor = m.difficulty === "쉬움" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : m.difficulty === "보통" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <div className={`flex items-center gap-3 rounded-lg border bg-card p-3.5 shadow-sm transition-colors ${completed ? "border-primary/20 bg-primary/5" : "border-border"}`}>
      <button onClick={() => toggleComplete(m.id)} className="shrink-0" aria-label={completed ? "완등 취소" : "완등 표시"}>
        {completed ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground/40" />}
      </button>
      <Link to={`/mountains/${m.id}`} className="flex flex-1 items-center justify-between min-w-0">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <p className="font-medium truncate text-foreground">{m.nameKo}</p>
            {(m.is_bac100 ?? m.is_baekdu) && (<Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">BAC 100대 명산</Badge>)}
            {m.bac100_label?.includes("산림청") && (<Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">산림청 100대 명산</Badge>)}
            {isUserCreated && m.status === "pending" && (<Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 border-amber-300 text-amber-600"><Clock className="h-2.5 w-2.5" />승인 대기</Badge>)}
            {isUserCreated && m.status !== "pending" && (<Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 gap-0.5"><User className="h-2.5 w-2.5" />커스텀</Badge>)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{m.region}</span><span>·</span><span>{m.height}m</span>
            <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${diffColor}`}>{m.difficulty}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      </Link>
    </div>
  );
});

export default MountainList;