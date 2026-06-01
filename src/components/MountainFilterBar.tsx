import { useState } from "react";
import { X, ListFilter, MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ── Types ──────────────────────────────────────────────────────────────────
export type KindKey = "all" | "bac100" | "forestry100" | "national" | "user" | "bac100_blackyak";
export type StatusKey = "all" | "todo" | "done";
export type SortKey = "name" | "height" | "popularity";
export type Difficulty = "쉬움" | "보통" | "어려움";

export interface MountainFilterState {
  kind: KindKey;
  difficulties: Difficulty[];
  status: StatusKey;
  sort: SortKey;
  region: string;
  showUserOnly: boolean;
  favoritesOnly: boolean;
}

export const DEFAULT_FILTERS: MountainFilterState = {
  kind: "all",
  difficulties: [],
  status: "all",
  sort: "name",
  region: "전체",
  showUserOnly: false,
  favoritesOnly: false,
};

const SORT_LABELS: Record<SortKey, string> = {
  name: "이름순",
  height: "높이순",
  popularity: "인기순",
};

const KIND_CHIPS: { key: KindKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "national", label: "국립공원" },
  { key: "bac100_blackyak", label: "100대 명산" },
  { key: "forestry100", label: "산림청 100대" },
];

interface Props {
  value: MountainFilterState;
  onChange: (next: MountainFilterState) => void;
  regions: string[];
  resultCount?: number;
}

export default function MountainFilterBar({ value, onChange, regions, resultCount }: Props) {
  const set = <K extends keyof MountainFilterState>(k: K, v: MountainFilterState[K]) =>
    onChange({ ...value, [k]: v });

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Pending state for the sheet
  const [pending, setPending] = useState<MountainFilterState>(value);
  const openFilter = () => {
    setPending(value);
    setFilterOpen(true);
  };
  const apply = () => {
    onChange(pending);
    setFilterOpen(false);
  };
  const resetSheet = () =>
    setPending({
      ...pending,
      difficulties: [],
      status: "all",
      region: "전체",
      showUserOnly: false,
    });

  const toggleDiff = (d: Difficulty) =>
    setPending((p) => ({
      ...p,
      difficulties: p.difficulties.includes(d)
        ? p.difficulties.filter((x) => x !== d)
        : [...p.difficulties, d],
    }));

  return (
    <div className="px-5">
      {/* Filter chips row */}
      <div
        data-onboarding="mountain-filter"
        className="-mx-1 px-1 no-scrollbar"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        {KIND_CHIPS.map(({ key, label }) => {
          const active = value.kind === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => set("kind", key)}
              style={{
                padding: "6px 14px",
                borderRadius: 9999,
                fontSize: 12,
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: active ? "#C7D66D" : "#FFFFFF",
                color: active ? "#173404" : "#4B5563",
                fontWeight: active ? 500 : 400,
                border: active ? "none" : "0.5px solid #F3F4F6",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
        {/* Region chip */}
        {(() => {
          const regionActive = value.region !== "전체";
          return (
            <button
              type="button"
              onClick={() => {
                if (regionActive) {
                  set("region", "전체");
                } else {
                  openFilter();
                }
              }}
              style={{
                padding: "6px 14px",
                borderRadius: 9999,
                fontSize: 12,
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: regionActive ? "#C7D66D" : "#FFFFFF",
                color: regionActive ? "#173404" : "#4B5563",
                fontWeight: regionActive ? 500 : 400,
                border: regionActive ? "none" : "0.5px solid #F3F4F6",
                cursor: "pointer",
              }}
            >
              <MapPin size={11} />
              {regionActive ? value.region : "지역"}
            </button>
          );
        })()}
      </div>

      {/* Result count + sort/filter row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "#6B7280" }}>
          {resultCount ?? 0}개 결과
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            style={{
              fontSize: 12,
              color: "#4B5563",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {SORT_LABELS[value.sort]} ↕
          </button>
          <button
            type="button"
            onClick={openFilter}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "#FFFFFF",
              border: "0.5px solid #F3F4F6",
              padding: "4px 10px",
              borderRadius: 9999,
              fontSize: 12,
              color: "#4B5563",
              cursor: "pointer",
            }}
          >
            <ListFilter size={12} />
            필터
          </button>
        </div>
      </div>

      {/* Sort sheet */}
      <Sheet open={sortOpen} onOpenChange={setSortOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>정렬</SheetTitle>
          </SheetHeader>
          <div className="mt-4 pb-6 space-y-1">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((s) => {
              const active = value.sort === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    set("sort", s);
                    setSortOpen(false);
                  }}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    fontSize: 14,
                    color: "#111827",
                    background: active ? "rgba(192,221,151,0.25)" : "transparent",
                    border: "none",
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                >
                  <span>{SORT_LABELS[s]}</span>
                  {active && <span style={{ color: "#6B9E2F" }}>✓</span>}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Filter sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl flex flex-col" style={{ maxHeight: "85vh" }}>
          <SheetHeader className="flex-row items-center justify-between">
            <SheetTitle>필터</SheetTitle>
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              aria-label="닫기"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6B7280" }}
            >
              <X size={20} />
            </button>
          </SheetHeader>

          <div className="mt-4 flex-1 overflow-y-auto space-y-6 pb-4">
            {/* 난이도 (multi) */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 8 }}>
                난이도
              </div>
              <div className="flex flex-wrap gap-2">
                {(["쉬움", "보통", "어려움"] as Difficulty[]).map((d) => {
                  const active = pending.difficulties.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDiff(d)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 9999,
                        fontSize: 12,
                        background: active ? "#C7D66D" : "#FFFFFF",
                        color: active ? "#173404" : "#4B5563",
                        fontWeight: active ? 500 : 400,
                        border: active ? "none" : "0.5px solid #F3F4F6",
                        cursor: "pointer",
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 완등 상태 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 8 }}>
                완등 상태
              </div>
              <div className="flex flex-wrap gap-2">
                {([["all", "전체"], ["done", "완등"], ["todo", "미등"]] as [StatusKey, string][]).map(
                  ([key, label]) => {
                    const active = pending.status === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPending({ ...pending, status: key })}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 9999,
                          fontSize: 12,
                          background: active ? "#C7D66D" : "#FFFFFF",
                          color: active ? "#173404" : "#4B5563",
                          fontWeight: active ? 500 : 400,
                          border: active ? "none" : "0.5px solid #F3F4F6",
                          cursor: "pointer",
                        }}
                      >
                        {label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* 등록 출처 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 8 }}>
                등록 출처
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  [false, "전체"],
                  [true, "사용자 등록 산만"],
                ] as [boolean, string][]).map(([key, label]) => {
                  const active = pending.showUserOnly === key;
                  return (
                    <button
                      key={String(key)}
                      type="button"
                      onClick={() => setPending({ ...pending, showUserOnly: key })}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 9999,
                        fontSize: 12,
                        background: active ? "#C7D66D" : "#FFFFFF",
                        color: active ? "#173404" : "#4B5563",
                        fontWeight: active ? 500 : 400,
                        border: active ? "none" : "0.5px solid #F3F4F6",
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingTop: 12,
              borderTop: "0.5px solid #F3F4F6",
            }}
          >
            <button
              type="button"
              onClick={resetSheet}
              style={{
                background: "transparent",
                border: "none",
                color: "#6B7280",
                fontSize: 14,
                cursor: "pointer",
                padding: "12px 4px",
              }}
            >
              초기화
            </button>
            <button
              type="button"
              onClick={apply}
              style={{
                flex: 1,
                background: "#C7D66D",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 500,
                padding: 12,
                borderRadius: 16,
                border: "none",
                cursor: "pointer",
              }}
            >
              적용
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
