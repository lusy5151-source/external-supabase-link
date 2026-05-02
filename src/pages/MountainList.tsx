import { useState, useMemo, useEffect, useRef } from "react";
import { getRecentSearches, removeRecentSearch, clearRecentSearches, addRecentSearch, type RecentSearch } from "@/lib/recentSearches";
import { X as XIcon } from "lucide-react";
import { regions } from "@/data/mountains";
import type { Mountain } from "@/data/mountains";
import { useMountains } from "@/contexts/MountainsContext";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { Search, CheckCircle2, Circle, ChevronRight, ChevronDown, ArrowUpDown, Mountain as MountainIcon, Star, Smile, MapPin, Flame, User, Clock, Trees, Footprints, Route } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import React, { lazy, Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useUserMountains } from "@/hooks/useUserMountains";
import { useBac100Mountains } from "@/hooks/useBac100Mountains";
import { useAllWalkingPaths, pathTypeLabel } from "@/hooks/useWalkingPaths";
import RegisterMountainModal from "@/components/RegisterMountainModal";
import { NearbyClubs } from "@/components/NearbyClubs";
import StickySearchBar from "@/components/StickySearchBar";
import MountainFilterBar, { DEFAULT_FILTERS, type MountainFilterState } from "@/components/MountainFilterBar";

const MountainMapSection = lazy(() => import("@/components/MountainMapSection"));

type SortKey = "name" | "height" | "popularity";
type ViewMode = "all" | "national" | "forestry100" | "bac100" | "region" | "oreum" | "walking" | "full";
type Segment = "list" | "map";

const MountainList = () => {
  const { mountains: dbMountains } = useMountains();
  const { isCompleted, toggleComplete, completedCount } = useStore();
  const { user } = useAuth();
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
    const t = window.setTimeout(() => setProgressWidth(Math.min(100, selected.completed)), 30);
    return () => window.clearTimeout(t);
  }, [collection, selected.completed]);

  const favoritesCount = 0; // placeholder until favorites feature is wired up


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
      return (
        matchSearch &&
        matchDifficulty &&
        matchStatus &&
        matchUserOnly &&
        matchKindUser &&
        matchRegion
      );
    });
    filtered.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.nameKo.localeCompare(b.nameKo, "ko");
      else if (sortKey === "height") cmp = b.height - a.height; // 높이순: 높은 순
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

  const getCurrentList = () => {
    if (viewMode === "national") return nationalFiltered;
    if (viewMode === "forestry100") return forestry100Filtered;
    if (viewMode === "bac100") return bac100Filtered;
    return allFiltered;
  };
  // Suppress unused-var TS warnings for legacy view branches
  void oreumFiltered; void regionGroups; void openRegions; void toggleRegion; void walkingPaths;

  return (
    <div className="space-y-5 pb-24 -mx-5 -mt-4 px-5 pt-4" style={{ background: "linear-gradient(180deg, hsl(205, 60%, 94%) 0%, hsl(var(--background)) 40%)" }}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">탐색</h1>
      </div>

      {/* Hero progress card */}
      <Link
        to={`/my/collections/${collection}`}
        className="block -mx-1"
        style={{
          background: "#C7D66D",
          padding: 14,
          borderRadius: 14,
          marginLeft: 12,
          marginRight: 12,
          marginTop: -4,
          marginBottom: 12,
          textDecoration: "none",
        }}
      >
        {/* Collection toggle */}
        <div
          className="inline-flex"
          style={{
            padding: 3,
            background: "rgba(255,255,255,0.5)",
            borderRadius: 999,
            marginBottom: 12,
          }}
          onClick={(e) => e.preventDefault()}
        >
          {([
            ["forestry100", "산림청 100대"],
            ["bac100", "100대 명산"],
          ] as const).map(([key, label]) => {
            const active = collection === key;
            return (
              <button
                key={key}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCollection(key);
                }}
                style={{
                  padding: "4px 10px",
                  background: active ? "#2F403A" : "transparent",
                  color: active ? "#FFFFFF" : "#2F403A",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Progress label row */}
        <div className="flex justify-between items-baseline" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(47,64,58,0.75)" }}>{selected.name}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#2F403A" }}>
            {selected.completed} / 100
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 6,
            width: "100%",
            background: "rgba(255,255,255,0.5)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressWidth}%`,
              background: "#2F403A",
              borderRadius: 999,
              transition: "width 800ms ease-out",
            }}
          />
        </div>

        {/* Inline stats */}
        <div className="flex" style={{ gap: 16, marginTop: 12 }}>
          {[
            { caption: "전체 산", value: allMountains.length },
            { caption: "완등", value: completedCount },
            { caption: "즐겨찾기", value: favoritesCount },
          ].map((s) => (
            <div key={s.caption}>
              <div style={{ fontSize: 11, color: "rgba(47,64,58,0.7)" }}>{s.caption}</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#2F403A" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </Link>

      {/* Sticky search */}
      <StickySearchBar search={search} setSearch={setSearch} />

      {/* Segment toggle */}
      <div className="flex rounded-xl p-1" style={{ background: "hsl(var(--secondary))" }}>
        {([["list", "목록"], ["map", "지도"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSegment(key)}
            className="flex-1 rounded-lg py-2 text-sm font-semibold transition-colors"
            style={{
              background: segment === key ? "hsl(var(--brand-lime))" : "transparent",
              color: segment === key ? "hsl(var(--brand-forest))" : "hsl(var(--color-text-tertiary))",
            }}
          >
            {label}
          </button>
        ))}
      </div>

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

          {/* Single-row pill filter bar (replaces previous quick chips + bottom-sheet filters) */}
          <div className="-mx-5">
            <MountainFilterBar
              value={filters}
              onChange={setFilters}
              regions={[...regions, "기타"]}
            />
          </div>

          <p className="text-xs text-muted-foreground">{getCurrentList().length}개 결과</p>
          <div className="space-y-2">
            {getCurrentList().length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">검색 결과가 없습니다</p>
            ) : (
              getCurrentList().map((m) => (
                <MountainCard
                  key={m.id}
                  m={m}
                  isCompleted={isCompleted(m.id)}
                  toggleComplete={toggleComplete}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Brand palette ──────────────────────────────────────────────────────────
const BRAND = {
  forest: "#2F403A",
  lime: "#C7D66D",
  sky: "#C6DBF0",
  navy: "#013F92",
  coral: "#FF696C",
  cream: "#F8FAED",
  lavender: "#C2B6DE",
  lavenderDeep: "#5E548E",
  lavenderText: "#2F2645",
} as const;

function getCategory(m: any): "bac100" | "forestry100" | "national" | "default" {
  if (m.is_bac100 ?? m.is_baekdu) return "bac100";
  if (m.bac100_label?.includes("산림청")) return "forestry100";
  if (m.is_national_park) return "national";
  return "default";
}

const THUMB_GRADIENT: Record<ReturnType<typeof getCategory>, string> = {
  bac100: "linear-gradient(135deg, #C6DBF0, #013F92)",
  national: "linear-gradient(135deg, #C7D66D, #2F403A)",
  forestry100: "linear-gradient(135deg, #C2B6DE, #5E548E)",
  default: "linear-gradient(135deg, #F8FAED, #2F403A)",
};

function getMountainImage(m: any): string | null {
  return m?.image_url || m?.imageUrl || m?.photo_url || m?.thumbnail_url || null;
}

function parseHours(m: any): string | null {
  const dur = m?.trails?.[0]?.duration as string | undefined;
  if (!dur) return null;
  // Examples: "2시간", "1시간 30분", "4시간 30분"
  const hMatch = dur.match(/(\d+)\s*시간/);
  const mMatch = dur.match(/(\d+)\s*분/);
  if (!hMatch && !mMatch) return null;
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
  if (mins >= 30) return `${hours}.5`;
  return `${hours}`;
}

function formatCompletedDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}.${mo}.${da}`;
}

const MountainCard = React.memo(function MountainCard({
  m,
  isCompleted: completed,
  toggleComplete,
}: {
  m: any;
  isCompleted: boolean;
  toggleComplete: (id: number) => void;
}) {
  const { getRecord } = useStore();
  void toggleComplete; // completion now toggled from detail page; card-tap routes
  const category = getCategory(m);
  const image = getMountainImage(m);
  const hours = parseHours(m);
  const record = completed ? getRecord(m.id) : null;
  const completedDate = formatCompletedDate(record?.completedAt);

  // Category badge
  const catBadge =
    category === "bac100"
      ? { label: "100대 명산", bg: BRAND.lavender, color: BRAND.lavenderText }
      : category === "forestry100"
      ? { label: "산림청 100대", bg: BRAND.lime, color: BRAND.forest }
      : category === "national"
      ? { label: m.national_park_name || "국립공원", bg: BRAND.sky, color: BRAND.navy }
      : null;

  // Difficulty chip
  const diffStyle =
    m.difficulty === "쉬움"
      ? { bg: BRAND.lime, color: BRAND.forest }
      : m.difficulty === "보통"
      ? { bg: BRAND.sky, color: BRAND.navy }
      : { bg: BRAND.coral, color: "#FFFFFF" };

  const completedDiffBg = "rgba(255,255,255,0.7)";
  const cardStyle: React.CSSProperties = completed
    ? { background: BRAND.lime, border: "none" }
    : {
        background: "#FFFFFF",
        border: "0.5px solid rgba(47,64,58,0.1)",
      };

  return (
    <Link
      to={`/mountains/${m.id}`}
      onClick={() => addRecentSearch({ id: m.id, name: m.nameKo })}
      className="block mb-2.5"
      style={{
        ...cardStyle,
        borderRadius: 12,
        padding: 12,
        textDecoration: "none",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 10,
          flexShrink: 0,
          overflow: "hidden",
          background: completed ? BRAND.forest : THUMB_GRADIENT[category],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage:
            !completed && image ? `url(${image})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {completed && <CheckCircle2 size={28} color={BRAND.lime} strokeWidth={2.5} />}
      </div>

      {/* Right content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: name + category badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: BRAND.forest,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {m.nameKo}
          </span>
          {catBadge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: "1px 6px",
                borderRadius: 4,
                background: catBadge.bg,
                color: catBadge.color,
                whiteSpace: "nowrap",
              }}
            >
              {catBadge.label}
            </span>
          )}
          {completed && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: "1px 6px",
                borderRadius: 4,
                background: BRAND.forest,
                color: BRAND.lime,
              }}
            >
              완등
            </span>
          )}
        </div>

        {/* Row 2: region · height */}
        <div
          style={{
            fontSize: 12,
            color: "rgba(47,64,58,0.7)",
            marginTop: 2,
          }}
        >
          {m.region} · {m.height}m
        </div>

        {/* Row 3: difficulty chip + caption */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: "2px 6px",
              borderRadius: 4,
              background: completed ? completedDiffBg : diffStyle.bg,
              color: completed && m.difficulty === "보통" ? BRAND.navy : diffStyle.color,
            }}
          >
            {m.difficulty}
          </span>
          <span style={{ fontSize: 11, color: completed ? "rgba(47,64,58,0.7)" : "rgba(47,64,58,0.55)" }}>
            {completed
              ? completedDate
                ? `${completedDate} 완등`
                : "완등"
              : hours
              ? `소요 약 ${hours}시간`
              : ""}
          </span>
        </div>
      </div>
    </Link>
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