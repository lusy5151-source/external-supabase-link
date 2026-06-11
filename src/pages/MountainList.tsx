import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { getRecentSearches, removeRecentSearch, clearRecentSearches, addRecentSearch, type RecentSearch } from "@/lib/recentSearches";
import { X as XIcon } from "lucide-react";
import { regions } from "@/data/mountains";
import type { Mountain } from "@/data/mountains";
import { useMountains } from "@/contexts/MountainsContext";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { Search, CheckCircle2, Circle, ChevronRight, ChevronDown, ArrowUpDown, Mountain as MountainIcon, Star, Smile, MapPin, Flame, User, Clock, Trees, Footprints, Route, ListFilter, Map as MapIcon, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useGuest } from "@/contexts/GuestContext";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import React, { lazy, Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useUserMountains } from "@/hooks/useUserMountains";
import { useSummitClaims } from "@/hooks/useSummitClaims";
import { useBac100Mountains } from "@/hooks/useBac100Mountains";
import { useAllWalkingPaths, pathTypeLabel } from "@/hooks/useWalkingPaths";
import RegisterMountainModal from "@/components/RegisterMountainModal";
import { NearbyClubs } from "@/components/NearbyClubs";
import StickySearchBar from "@/components/StickySearchBar";
import MountainFilterBar, { DEFAULT_FILTERS, type MountainFilterState } from "@/components/MountainFilterBar";
import { useCompletionSuggestion } from "@/context/CompletionSuggestionContext";

const MountainMapSection = lazy(() => import("@/components/MountainMapSection"));

type SortKey = "name" | "height" | "popularity";
type ViewMode = "all" | "national" | "forestry100" | "bac100" | "region" | "oreum" | "walking" | "full";
type Segment = "list" | "map";

const MountainList = () => {
  const { mountains: dbMountains } = useMountains();
  const { isCompleted: isCompletedLocal, toggleComplete: toggleCompleteLocal, addCompletion: addCompletionLocal } = useStore();
  const { user } = useAuth();
  const { claimedIds, toggleClaim: toggleClaimRaw } = useSummitClaims();
  const { suggest } = useCompletionSuggestion();
  const toggleClaim = useCallback(async (mountainId: number, mountainName?: string) => {
    const result = await toggleClaimRaw(mountainId, mountainName);
    if (result?.ok && result.action === "marked") {
      try { if (!isCompletedLocal(mountainId)) addCompletionLocal(mountainId); } catch {}
      suggest(mountainId, mountainName);
    }
    return result;
  }, [toggleClaimRaw, suggest, isCompletedLocal, addCompletionLocal]);
  const isCompleted = useCallback((id: number) => claimedIds.has(id) || isCompletedLocal(id), [claimedIds, isCompletedLocal]);
  const completedCount = useMemo(() => {
    const s = new Set<number>(claimedIds);
    // include any local-only completions
    dbMountains.forEach((m) => { if (isCompletedLocal(m.id)) s.add(m.id); });
    return s.size;
  }, [claimedIds, dbMountains, isCompletedLocal]);
  const { userMountainsAsMountains, userMountains } = useUserMountains();
  const { data: bac100List = [] } = useBac100Mountains();
  const { data: walkingPaths = [] } = useAllWalkingPaths();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<MountainFilterState>(DEFAULT_FILTERS);
  const [openRegions, setOpenRegions] = useState<Set<string>>(new Set());
  const [segment, setSegment] = useState<Segment>("list");

  // Derive legacy values used downstream
  const sortKey: SortKey = filters.sort;
  const sortAsc = filters.sort === "name"; // name asc, others desc/asc
  const showCompleted: "all" | "done" | "todo" = filters.status;
  const showUserOnly = filters.showUserOnly;
  const difficultyFilter: string = filters.difficulties.length === 0 ? "전체" : "__multi__";
  // Map "종류" pill to internal viewMode for category lists
  const viewMode: ViewMode =
    filters.kind === "bac100"
      ? "bac100"
      : filters.kind === "forestry100"
      ? "forestry100"
      : filters.kind === "national"
      ? "national"
      : "all";

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

  // ── Hero progress card: collection toggle ──
  type CollectionKey = "forestry100" | "bac100";
  const [collection, setCollection] = useState<CollectionKey>(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("defaultMountainCollection")) as CollectionKey | null;
    return saved === "bac100" || saved === "forestry100" ? saved : "forestry100";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("defaultMountainCollection", collection);
  }, [collection]);

  // 산림청 100대 완등 수
  const forestryCompleted = dbMountains.filter((m) => m.bac100_label?.includes("산림청") && isCompleted(m.id)).length;
  // BAC 100대 완등 수: bac100List 항목 중 mountain_id 가 완등이거나, name 매칭
  const bacCompleted = useMemo(() => {
    return bac100List.filter((b: any) => {
      const mid = b.mountain_id ?? b.id;
      return mid != null && isCompleted(mid);
    }).length;
  }, [bac100List, isCompleted]);

  const collectionMeta = {
    forestry100: { name: "산림청 100대 명산", completed: forestryCompleted },
    bac100: { name: "100대 명산", completed: bacCompleted },
  } as const;
  const selected = collectionMeta[collection];

  // Animated progress bar
  const [progressWidth, setProgressWidth] = useState(0);
  useEffect(() => {
    setProgressWidth(0);
    const t = window.setTimeout(() => setProgressWidth(Math.min(100, bacCompleted)), 30);
    return () => window.clearTimeout(t);
  }, [bacCompleted]);

  const favoritesCount = 0; // placeholder until favorites feature is wired up

  // 산 직접 등록 모달
  const [registerOpen, setRegisterOpen] = useState(false);
  useEffect(() => {
    const handler = () => setRegisterOpen(true);
    window.addEventListener("open-register-mountain", handler);
    return () => window.removeEventListener("open-register-mountain", handler);
  }, []);


  const filterAndSort = (list: any[]) => {
    let filtered = list.filter((m: any) => {
      const matchSearch =
        !search.trim() ||
        m.nameKo.includes(search) ||
        m.name.toLowerCase().includes(search.toLowerCase());
      const matchDifficulty =
        filters.difficulties.length === 0 ||
        filters.difficulties.includes(m.difficulty);
      const matchStatus =
        showCompleted === "all" ||
        (showCompleted === "done" && isCompleted(m.id)) ||
        (showCompleted === "todo" && !isCompleted(m.id));
      const matchUserOnly = !showUserOnly || !!(m as any).isUserCreated;
      const matchKindUser = filters.kind !== "user" || !!(m as any).isUserCreated;
      const matchRegion = filters.region === "전체" || m.region === filters.region;
      const matchKindCategory =
        filters.kind === "national" ? !!m.is_national_park :
        filters.kind === "bac100_blackyak" ? !!(m as any).is_bac100_blackyak :
        filters.kind === "forestry100" ? !!m.is_bac100 :
        true;
      return (
        matchSearch &&
        matchDifficulty &&
        matchStatus &&
        matchUserOnly &&
        matchKindUser &&
        matchRegion &&
        matchKindCategory
      );
    });
    filtered.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.nameKo.localeCompare(b.nameKo, "ko");
      else if (sortKey === "height") cmp = b.height - a.height;
      else if (sortKey === "popularity") cmp = (b.popularity || 0) - (a.popularity || 0);
      return cmp;
    });
    return filtered;
  };

  const filterDeps = [search, filters, isCompleted] as const;

  const allFiltered = useMemo(() => filterAndSort(allMountains), [...filterDeps, allMountains]);
  const forestry100Filtered = useMemo(
    () => filterAndSort(dbMountains.filter((m) => m.bac100_label?.includes("산림청"))),
    [...filterDeps, dbMountains]
  );
  const bac100Filtered = useMemo(
    () => filterAndSort(bac100List),
    [...filterDeps, bac100List]
  );
  const oreumFiltered = useMemo(
    () => filterAndSort(dbMountains.filter((m) => m.region === "제주" && !m.is_baekdu)),
    [...filterDeps, dbMountains]
  );
  const nationalFiltered = useMemo(
    () => filterAndSort(dbMountains.filter((m) => m.is_national_park)),
    [...filterDeps, dbMountains]
  );

  const allRegions = [...regions, "기타"] as const;
  const regionGroups = useMemo(() => {
    return allRegions
      .map((r) => ({ region: r, mountains: filterAndSort(allMountains.filter((m) => m.region === r)) }))
      .filter((g) => g.mountains.length > 0);
  }, [...filterDeps, allMountains]);

  const toggleRegion = (region: string) => {
    setOpenRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  const getCurrentList = () => allFiltered;
  // Suppress unused-var TS warnings for legacy view branches
  void oreumFiltered; void regionGroups; void openRegions; void toggleRegion; void walkingPaths;

  return (
    <div className="space-y-5 pb-24 -mx-5 -mt-4 px-5 pt-4" style={{ background: "linear-gradient(180deg, hsl(205, 60%, 94%) 0%, hsl(var(--background)) 40%)" }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 4 }}>탐색</h1>
        <div style={{ fontSize: 12, color: "#6B7280" }}>
          전체 {allMountains.length}개 ·{" "}
          완등 <span style={{ color: "#6B9E2F", fontWeight: 500 }}>{completedCount}</span>개 ·{" "}
          <Link
            to="/my/collections/bac100"
            style={{
              color: "#6B9E2F",
              fontWeight: 500,
              textDecoration: "underline dotted",
              textUnderlineOffset: 2,
            }}
          >
            백대명산 {bacCompleted}/100 ›
          </Link>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "0.5px solid #e3efcc",
            borderRadius: 14,
            marginTop: 12,
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px 8px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MountainIcon size={14} color="#173404" strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#173404" }}>100대 명산 도전</span>
            </div>
            <span style={{ fontSize: 10, color: "#999" }}>탭하면 도전 페이지로</span>
          </div>

          {([
            { label: "100대 명산", count: bacCompleted, to: "/challenge?type=bac100", borderTop: false },
            { label: "산림청 100대", count: forestryCompleted, to: "/challenge?type=forest100", borderTop: true },
          ] as const).map((row) => {
            const pct = Math.min(100, Math.max(0, (row.count / 100) * 100));
            return (
              <Link
                key={row.label}
                to={row.to}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  borderTop: row.borderTop ? "0.5px solid #f1efe8" : undefined,
                  textDecoration: "none", cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbf7")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 11, color: "#444", flex: "0 0 90px" }}>{row.label}</span>
                <div style={{ flex: 1, height: 5, background: "#f1efe8", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`, background: "#c6d56c",
                    transition: "width 600ms ease-out",
                  }} />
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: "#639922",
                  flex: "0 0 50px", textAlign: "right",
                }}>{row.count}/100</span>
                <span style={{ color: "#ccc", fontSize: 14 }}>›</span>
              </Link>
            );
          })}
        </div>
      </div>


      {/* Segment toggle */}
      <div
        style={{
          background: "#F7FAF2",
          border: "0.5px solid #F3F4F6",
          borderRadius: 16,
          padding: 4,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
        }}
      >
        {([["list", "목록", ListFilter], ["map", "지도", MapIcon]] as const).map(([key, label, Icon]) => {
          const active = segment === key;
          return (
            <button
              key={key}
              onClick={() => setSegment(key)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: 8,
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                background: active ? "#C7D66D" : "transparent",
                color: active ? "#173404" : "#6B7280",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.2s, color 0.2s",
              }}
            >
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Sticky search */}
      <StickySearchBar search={search} setSearch={setSearch} />


      {segment === "map" ? (
        <div data-onboarding="mountain-map" className="relative" style={{ zIndex: 0 }}>
          <Suspense fallback={<LoadingSpinner message="지도를 불러오는 중..." />}>
            <MountainMapSection />
          </Suspense>
        </div>
      ) : (
        <>
          {/* Nearby clubs */}
          <NearbyClubs />

          {/* Filter chips + result count + filter sheet */}
          <div className="-mx-5">
            <MountainFilterBar
              value={filters}
              onChange={setFilters}
              regions={[...regions, "기타"]}
              resultCount={getCurrentList().length}
            />
          </div>

          <div>
            {getCurrentList().length === 0 ? (
              <div
                className="text-center"
                style={{
                  background: "#FFFFFF",
                  border: "2px dashed #E5E7EB",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <p style={{ fontSize: 14, color: "#6B7280" }}>
                  {filters.kind !== "all" ? "선택한 조건의 산이 없어요" : "검색 결과가 없어요"}
                </p>
                {filters.kind !== "all" ? (
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, kind: "all" })}
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#639922",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    다른 필터 시도해보기
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("open-register-mountain"))}
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#6B9E2F",
                      fontWeight: 500,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    + 산이 없나요? 직접 등록하기
                  </button>
                )}
              </div>
            ) : (
              getCurrentList().map((m) => (
                <MountainCard
                  key={m.id}
                  m={m}
                  isCompleted={isCompleted(m.id)}
                  onToggleClaim={toggleClaim}
                />
              ))
            )}
           </div>
        </>
      )}
      <RegisterMountainModal open={registerOpen} onOpenChange={setRegisterOpen} hideTrigger />
    </div>
  );
};

const MountainCard = React.memo(function MountainCard({ m, isCompleted: completed, onToggleClaim }: { m: any; isCompleted: boolean; onToggleClaim: (mountainId: number, mountainName?: string) => Promise<{ ok: boolean; action: "marked" | "unmarked" | null; message?: string }> }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest, showLoginPrompt } = useGuest();
  const { getCompletionCount, addCompletion } = useStore();
  const completionCount = getCompletionCount(m.id);
  const [busy, setBusy] = useState(false);
  const isUserCreated = !!(m as any).isUserCreated;

  const diffStyle =
    m.difficulty === "쉬움"
      ? { background: "#ECFDF5", color: "#065F46" }
      : m.difficulty === "보통"
      ? { background: "#FFFBEB", color: "#92400E" }
      : { background: "#FEF2F2", color: "#991B1B" };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isGuest) {
      toast("로그인 후 완등을 기록할 수 있어요", {
        action: { label: "로그인", onClick: () => showLoginPrompt() },
      });
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const res = await onToggleClaim(m.id, m.nameKo);
      if (!res.ok) {
        toast.error(`기록 실패: ${res.message ?? ""}`);
        return;
      }
      if (res.action === "marked") {
        toast(`🎉 ${m.nameKo} 완등!`);
      } else if (res.action === "unmarked") {
        toast("완등 기록을 취소했어요");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCardClick = () => {
    addRecentSearch({ id: m.id, name: m.nameKo });
    navigate(`/mountains/${m.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group transition-all"
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        border: "0.5px solid transparent",
        boxShadow: completed
          ? "0 0 0 1px hsl(var(--background)), 0 0 0 3px #C7D66D"
          : "none",
      }}
      onMouseEnter={(e) => {
        if (!completed) e.currentTarget.style.border = "0.5px solid #E5E7EB";
      }}
      onMouseLeave={(e) => {
        if (!completed) e.currentTarget.style.border = "0.5px solid transparent";
      }}
    >
      {/* (A) Toggle */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        aria-label={completed ? "완등 취소" : "완등 표시"}
        className="active:scale-[0.85] transition-transform disabled:opacity-60"
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: completed ? "none" : "2px solid #C7D66D",
          background: completed ? "#C7D66D" : "transparent",
          cursor: "pointer",
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (!completed) (e.currentTarget.style.borderColor = "#C7D66D");
        }}
        onMouseLeave={(e) => {
          if (!completed) (e.currentTarget.style.borderColor = "#C7D66D");
        }}
      >
        {completed && (
          <Check
            size={16}
            strokeWidth={3}
            color="#FFFFFF"
            style={{
              animation: "wd-check-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        )}
      </button>

      {/* (B) Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#111827" }} className="truncate">
            {m.nameKo}
          </p>
          {completed && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 9999, background: "#6B9E2F", color: "#FFFFFF", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
              완등{completionCount > 1 ? ` ${completionCount}회` : ""}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addCompletion(m.id);
                  toast(`🏔 재등반 기록! ${completionCount + 1}번째`);
                }}
                aria-label="재등반"
                style={{ border: "none", background: "rgba(255,255,255,0.25)", color: "white", borderRadius: 9999, padding: "0 6px", fontSize: 10, cursor: "pointer", lineHeight: 1.4 }}
              >+1</button>
            </span>
          )}
          {m.is_bac100_blackyak && (
            <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 9999, background: "#FAEEDA", color: "#633806", whiteSpace: "nowrap" }}>
              100대 명산
            </span>
          )}
          {m.is_bac100 && (
            <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 9999, background: "#EAF3DE", color: "#173404", whiteSpace: "nowrap" }}>
              산림청 100대
            </span>
          )}
          {m.is_national_park && (
            <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 9999, background: "#E1F5EE", color: "#04342C", whiteSpace: "nowrap" }}>
              {m.national_park_name || "국립공원"}
            </span>
          )}
          {isUserCreated && m.status === "pending" && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 9999, background: "#FFFBEB", color: "#92400E", fontWeight: 500 }}>
              승인 대기
            </span>
          )}
        </div>
        <div className="flex items-center" style={{ gap: 6, marginTop: 2, fontSize: 11, color: "#6B7280" }}>
          <span>{m.region}</span>
          <span>·</span>
          <span>{m.height}m</span>
          <span>·</span>
          <span style={{ padding: "1px 6px", borderRadius: 4, fontWeight: 500, ...diffStyle }}>
            {m.difficulty}
          </span>
        </div>
      </div>

      {/* (C) Chevron */}
      <ChevronRight size={16} strokeWidth={2} color="#D1D5DB" style={{ flexShrink: 0 }} />
    </div>
  );
});

function WalkingPathsList({ paths }: { paths: any[] }) {
  if (paths.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">등록된 둘레길이 없습니다</p>;
  }
  return (
    <>
      <p className="text-xs text-muted-foreground">{paths.length}개 둘레길</p>
      <div className="space-y-2">
        {paths.map((p) => {
          const diffColor =
            p.difficulty === "쉬움"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : p.difficulty === "어려움"
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
          return (
            <Link
              key={p.id}
              to={`/walking-paths/${p.id}`}
              className="block rounded-lg border border-border bg-card p-3.5 shadow-sm hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-medium text-foreground truncate">{p.name}</p>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/40 text-primary">
                      {pathTypeLabel(p.path_type)}
                    </Badge>
                    {p.difficulty && (
                      <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${diffColor}`}>{p.difficulty}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                    {p.region && <><span>{p.region}</span><span>·</span></>}
                    {p.total_distance_km != null && <><span>{p.total_distance_km}km</span><span>·</span></>}
                    {p.total_courses != null && <span>{p.total_courses}개 코스</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function RecentSearchInput({ search, setSearch }: { search: string; setSearch: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const [recents, setRecents] = useState<RecentSearch[]>(() => getRecentSearches());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setRecents(getRecentSearches());
    window.addEventListener("wandeung_recent_searches_updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("wandeung_recent_searches_updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const showDropdown = focused && search.trim() === "" && recents.length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="산 이름으로 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground border-b border-border">최근 검색</div>
          <ul className="max-h-72 overflow-y-auto">
            {recents.map((r) => (
              <li key={r.id} className="flex items-center hover:bg-primary/5 transition-colors">
                <Link
                  to={`/mountains/${r.id}`}
                  onClick={() => {
                    addRecentSearch(r);
                    setFocused(false);
                  }}
                  className="flex-1 px-3 py-2.5 text-sm text-foreground truncate"
                >
                  {r.name}
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentSearch(r.id);
                  }}
                  className="px-3 py-2.5 text-muted-foreground hover:text-foreground"
                  aria-label="기록 삭제"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-3 py-2 text-right">
            <button
              onClick={() => clearRecentSearches()}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              전체 삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MountainList;