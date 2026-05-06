import { useEffect, useRef, useState } from "react";
import { Search, X as XIcon } from "lucide-react";

const KEY = "wandeung.recentSearches";
const MAX = 5;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}

interface Props {
  search: string;
  setSearch: (v: string) => void;
}

export default function StickySearchBar({ search, setSearch }: Props) {
  const [focused, setFocused] = useState(false);
  const [recents, setRecents] = useState<string[]>(() => loadRecent());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    if (!focused) return;
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [focused]);

  const commitSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recents.filter((r) => r !== trimmed)].slice(0, MAX);
    setRecents(next);
    saveRecent(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitSearch(search);
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const removeOne = (q: string) => {
    const next = recents.filter((r) => r !== q);
    setRecents(next);
    saveRecent(next);
  };

  const clearAll = () => {
    setRecents([]);
    saveRecent([]);
  };

  const showDropdown = focused && search.trim() === "" && recents.length > 0;

  return (
    <div
      className="sticky"
      style={{
        top: 60,
        zIndex: 20,
        marginTop: 8,
        marginBottom: 12,
      }}
    >
      <div ref={wrapperRef} className="relative">
        <div
          className="flex items-center"
          style={{
            background: "#FFFFFF",
            border: focused ? "2px solid #C7D66D" : "0.5px solid #E5E7EB",
            padding: focused ? "8.5px 12.5px" : "10px 14px",
            borderRadius: 16,
            transition: "border-color 0.15s",
          }}
        >
          <Search size={16} strokeWidth={2} style={{ color: "#9CA3AF", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="산 이름으로 검색..."
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-gray-400"
            style={{
              fontSize: 14,
              color: "#111827",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                inputRef.current?.focus();
              }}
              aria-label="검색어 지우기"
              className="text-gray-300 hover:text-gray-500 transition-colors"
              style={{ marginLeft: 6 }}
            >
              <XIcon size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {showDropdown && (
          <div
            className="absolute left-0 right-0"
            style={{
              top: "calc(100% + 6px)",
              background: "#FFFFFF",
              border: "0.5px solid rgba(47,64,58,0.12)",
              borderRadius: 12,
              maxHeight: 240,
              overflowY: "auto",
              boxShadow: "0 6px 18px rgba(47,64,58,0.08)",
              zIndex: 30,
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: "10px 12px 6px" }}
            >
              <span style={{ fontSize: 11, color: "rgba(47,64,58,0.6)" }}>최근 검색</span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  clearAll();
                }}
                style={{
                  fontSize: 11,
                  color: "#FF696C",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                전체 삭제
              </button>
            </div>
            <ul>
              {recents.slice(0, MAX).map((q) => (
                <li
                  key={q}
                  className="flex items-center justify-between"
                  style={{ padding: "8px 12px" }}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearch(q);
                      commitSearch(q);
                      setFocused(false);
                      inputRef.current?.blur();
                    }}
                    style={{
                      fontSize: 13,
                      color: "#2F403A",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      flex: 1,
                      textAlign: "left",
                      padding: 0,
                    }}
                  >
                    {q}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      removeOne(q);
                    }}
                    aria-label={`${q} 삭제`}
                    style={{
                      color: "rgba(47,64,58,0.5)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      marginLeft: 8,
                    }}
                  >
                    <XIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
