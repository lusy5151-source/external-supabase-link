import { useEffect, useRef, useState } from "react";
import { ChevronDown, X, Plus, MoreHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import RegisterMountainModal from "@/components/RegisterMountainModal";

// ── Types ──────────────────────────────────────────────────────────────────
export type KindKey = "all" | "bac100" | "forestry100" | "national" | "user";
export type StatusKey = "all" | "todo" | "done";
export type SortKey = "name" | "height" | "popularity";
export type Difficulty = "쉬움" | "보통" | "어려움";

export interface MountainFilterState {
  kind: KindKey;
  difficulties: Difficulty[]; // multi
  status: StatusKey;
  sort: SortKey;
  region: string; // "전체" or region name
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

const KIND_LABELS: Record<KindKey, string> = {
  all: "전체",
  bac100: "백대명산",
  forestry100: "산림청 100대",
  national: "국립공원",
  user: "사용자 등록",
};
const STATUS_LABELS: Record<StatusKey, string> = {
  all: "전체",
  todo: "미등",
  done: "완등",
};
const SORT_LABELS: Record<SortKey, string> = {
  name: "가나다순",
  height: "높이순",
  popularity: "인기순",
};

// ── Tokens ────────────────────────────────────────────────────────────────
const FOREST = "#2F403A";
const CREAM = "#F8FAED";
const LIME = "#C7D66D";
const SKY = "#C6DBF0";
const NAVY = "#013F92";
const BORDER = "rgba(47,64,58,0.12)";

// ── Pill ──────────────────────────────────────────────────────────────────
type PillVariant = "default" | "single" | "multi" | "personal";

function Pill({
  label,
  variant,
  onClick,
  onClear,
}: {
  label: string;
  variant: PillVariant;
  onClick: () => void;
  onClear?: () => void;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    whiteSpace: "nowrap",
    border: "0.5px solid transparent",
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1.2,
  };
  let style: React.CSSProperties = base;
  if (variant === "default") {
    style = {
      ...base,
      background: CREAM,
      color: FOREST,
      borderColor: BORDER,
    };
  } else if (variant === "single") {
    style = { ...base, background: FOREST, color: "#FFFFFF" };
  } else if (variant === "multi") {
    style = { ...base, background: SKY, color: NAVY, fontWeight: 500 };
  } else if (variant === "personal") {
    style = { ...base, background: LIME, color: FOREST, fontWeight: 500 };
  }
  return (
    <button type="button" style={style} onClick={onClick}>
      <span>{label}</span>
      {onClear ? (
        <X
          size={12}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        />
      ) : (
        <ChevronDown size={12} />
      )}
    </button>
  );
}

// ── Dropdown panel (anchored below pill) ──────────────────────────────────
function DropdownPanel({
  open,
  onClose,
  children,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  anchorRef: React.RefObject<HTMLDivElement>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);
  if (!open) return null;
  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: 0,
        zIndex: 30,
        background: "#FFFFFF",
        border: `0.5px solid ${BORDER}`,
        borderRadius: 12,
        padding: 8,
        minWidth: 160,
        boxShadow: "0 6px 20px rgba(47,64,58,0.12)",
      }}
    >
      {children}
    </div>
  );
}

function OptionRow({
  label,
  selected,
  onClick,
  multi,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "8px 10px",
        background: selected && !multi ? "rgba(199,214,109,0.25)" : "transparent",
        color: FOREST,
        fontSize: 13,
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span>{label}</span>
      {multi ? (
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            border: `1px solid ${selected ? FOREST : BORDER}`,
            background: selected ? FOREST : "transparent",
            color: "#FFF",
            fontSize: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected ? "✓" : ""}
        </span>
      ) : selected ? (
        <span style={{ color: FOREST }}>✓</span>
      ) : null}
    </button>
  );
}

// ── Pill with its own dropdown wrapper ────────────────────────────────────
function PillWithDropdown({
  pillLabel,
  variant,
  onClear,
  children,
}: {
  pillLabel: string;
  variant: PillVariant;
  onClear?: () => void;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <div ref={anchor} style={{ position: "relative", flexShrink: 0 }}>
      <Pill
        label={pillLabel}
        variant={variant}
        onClick={() => setOpen((v) => !v)}
        onClear={onClear}
      />
      <DropdownPanel open={open} onClose={() => setOpen(false)} anchorRef={anchor}>
        {children(() => setOpen(false))}
      </DropdownPanel>
    </div>
  );
}

// ── Main bar ──────────────────────────────────────────────────────────────
interface Props {
  value: MountainFilterState;
  onChange: (next: MountainFilterState) => void;
  regions: string[];
}

export default function MountainFilterBar({ value, onChange, regions }: Props) {
  const set = <K extends keyof MountainFilterState>(k: K, v: MountainFilterState[K]) =>
    onChange({ ...value, [k]: v });

  const [moreOpen, setMoreOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // Pending state for multi-select (difficulty)
  const [pendingDiff, setPendingDiff] = useState<Difficulty[]>(value.difficulties);
  useEffect(() => setPendingDiff(value.difficulties), [value.difficulties]);

  const isDirty =
    value.kind !== DEFAULT_FILTERS.kind ||
    value.difficulties.length > 0 ||
    value.status !== DEFAULT_FILTERS.status ||
    value.sort !== DEFAULT_FILTERS.sort ||
    value.region !== DEFAULT_FILTERS.region ||
    value.showUserOnly ||
    value.favoritesOnly;

  // Pill labels & variants
  const kindActive = value.kind !== "all";
  const diffActive = value.difficulties.length > 0;
  const statusActive = value.status !== "all";
  const sortActive = value.sort !== "name";

  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <div>
      {/* Pill row */}
      <div
        className="scrollbar-hide"
        style={{
          display: "flex",
          gap: 6,
          padding: "0 16px",
          height: 36,
          alignItems: "center",
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        {/* 종류 */}
        <PillWithDropdown
          pillLabel={kindActive ? `종류: ${KIND_LABELS[value.kind]}` : "종류"}
          variant={kindActive ? "single" : "default"}
          onClear={kindActive ? () => set("kind", "all") : undefined}
        >
          {(close) => (
            <div style={{ minWidth: 160 }}>
              {(Object.keys(KIND_LABELS) as KindKey[]).map((k) => (
                <OptionRow
                  key={k}
                  label={KIND_LABELS[k]}
                  selected={value.kind === k}
                  onClick={() => {
                    set("kind", k);
                    close();
                  }}
                />
              ))}
            </div>
          )}
        </PillWithDropdown>

        {/* 난이도 (multi) */}
        <PillWithDropdown
          pillLabel={
            diffActive ? `난이도 ${value.difficulties.length}` : "난이도"
          }
          variant={diffActive ? "multi" : "default"}
        >
          {(close) => (
            <div style={{ minWidth: 180 }}>
              {(["쉬움", "보통", "어려움"] as Difficulty[]).map((d) => {
                const checked = pendingDiff.includes(d);
                return (
                  <OptionRow
                    key={d}
                    label={d}
                    multi
                    selected={checked}
                    onClick={() =>
                      setPendingDiff((prev) =>
                        prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                      )
                    }
                  />
                );
              })}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 6,
                  paddingTop: 6,
                  borderTop: `0.5px solid ${BORDER}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPendingDiff([])}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: FOREST,
                    fontSize: 12,
                    opacity: 0.7,
                    cursor: "pointer",
                  }}
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={() => {
                    set("difficulties", pendingDiff);
                    close();
                  }}
                  style={{
                    background: FOREST,
                    color: "#FFF",
                    fontSize: 12,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  적용
                </button>
              </div>
            </div>
          )}
        </PillWithDropdown>

        {/* 완등 상태 */}
        <PillWithDropdown
          pillLabel={
            statusActive ? `완등 상태: ${STATUS_LABELS[value.status]}` : "완등 상태"
          }
          variant={statusActive ? "personal" : "default"}
          onClear={statusActive ? () => set("status", "all") : undefined}
        >
          {(close) => (
            <div style={{ minWidth: 140 }}>
              {(Object.keys(STATUS_LABELS) as StatusKey[]).map((s) => (
                <OptionRow
                  key={s}
                  label={STATUS_LABELS[s]}
                  selected={value.status === s}
                  onClick={() => {
                    set("status", s);
                    close();
                  }}
                />
              ))}
            </div>
          )}
        </PillWithDropdown>

        {/* 정렬 */}
        <PillWithDropdown
          pillLabel={sortActive ? `정렬: ${SORT_LABELS[value.sort]}` : "정렬"}
          variant={sortActive ? "single" : "default"}
          onClear={sortActive ? () => set("sort", "name") : undefined}
        >
          {(close) => (
            <div style={{ minWidth: 140 }}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((s) => (
                <OptionRow
                  key={s}
                  label={SORT_LABELS[s]}
                  selected={value.sort === s}
                  onClick={() => {
                    set("sort", s);
                    close();
                  }}
                />
              ))}
            </div>
          )}
        </PillWithDropdown>

        {/* 더보기 */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 10px",
            background: CREAM,
            color: FOREST,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 999,
            fontSize: 11,
            whiteSpace: "nowrap",
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          <MoreHorizontal size={12} />
          더보기
        </button>
      </div>

      {/* Reset link */}
      {isDirty && (
        <div style={{ padding: "6px 16px 0" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "4px 8px",
              background: CREAM,
              color: "rgba(47,64,58,0.7)",
              fontSize: 10,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            초기화
          </button>
        </div>
      )}

      {/* 더보기 sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle style={{ color: FOREST }}>추가 필터</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-4 pb-6">
            {/* Region */}
            <div>
              <div style={{ fontSize: 12, color: FOREST, opacity: 0.7, marginBottom: 8 }}>
                지역
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["전체", ...regions].map((r) => {
                  const active = value.region === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => set("region", r)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        border: `0.5px solid ${active ? FOREST : BORDER}`,
                        background: active ? FOREST : "#FFF",
                        color: active ? "#FFF" : FOREST,
                        cursor: "pointer",
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: FOREST,
                }}
              >
                <span>사용자 등록 산만 보기</span>
                <input
                  type="checkbox"
                  checked={value.showUserOnly}
                  onChange={(e) => set("showUserOnly", e.target.checked)}
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: FOREST,
                }}
              >
                <span>즐겨찾기만 보기</span>
                <input
                  type="checkbox"
                  checked={value.favoritesOnly}
                  onChange={(e) => set("favoritesOnly", e.target.checked)}
                />
              </label>
            </div>

            {/* Register mountain */}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setRegisterOpen(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors"
              style={{
                borderColor: "rgba(47,64,58,0.3)",
                color: FOREST,
                background: "rgba(199,214,109,0.15)",
              }}
            >
              <Plus className="h-4 w-4" />
              산이 없나요? 직접 등록하기
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Hidden register modal, controlled */}
      <RegisterMountainModal
        hideTrigger
        open={registerOpen}
        onOpenChange={setRegisterOpen}
      />
    </div>
  );
}
