import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Restaurant {
  id?: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  distance_m: number;
  phone?: string | null;
  place_url?: string | null;
  category_group_code?: string;
}

interface Props {
  lat: number | null | undefined;
  lng: number | null | undefined;
}

function categoryEmoji(cat: string, code?: string): string {
  if (code === "CE7") return "☕";
  if (/한식|국밥|백반|찌개|국수|칼국수/.test(cat)) return "🍚";
  if (/일식|초밥|스시|라멘|돈까스|돈가스/.test(cat)) return "🍜";
  if (/중식|중국/.test(cat)) return "🥢";
  if (/양식|파스타|피자|이탈리아|스테이크/.test(cat)) return "🍝";
  if (/고기|갈비|삼겹|구이/.test(cat)) return "🥩";
  if (/치킨/.test(cat)) return "🍗";
  if (/분식|떡볶이/.test(cat)) return "🥘";
  if (/회|해물|해산물|장어/.test(cat)) return "🐟";
  if (/카페|디저트|베이커리|빵/.test(cat)) return "☕";
  return "🍲";
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function formatWalkTime(m: number): string {
  // ~80m/min walking
  const mins = Math.max(1, Math.round(m / 80));
  return `도보 ${mins}분`;
}

export function NearbyRestaurantsSection({ lat, lng }: Props) {
  const [items, setItems] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (typeof lat !== "number" || typeof lng !== "number") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setHasError(false);
      try {
        const { data, error } = await supabase.functions.invoke(
          "get-nearby-restaurants",
          { body: { lat, lng, radius: 1500, limit: 5 } },
        );
        if (cancelled) return;
        if (error) {
          setHasError(true);
          setItems([]);
        } else {
          setItems((data?.results ?? []) as Restaurant[]);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lat, lng]);

  if (!loading && !hasError && items.length === 0) return null;

  return (
    <section
      style={{
        background: "linear-gradient(135deg, #FFF9EE 0%, #FEF3DD 100%)",
        border: "0.5px solid rgba(250, 199, 117, 0.4)",
        borderRadius: 16,
        padding: 14,
        margin: "0 12px 8px",
      }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#412402" }}>
          🍴 출발지 주변 맛집
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (typeof lat === "number" && typeof lng === "number") {
                window.open(
                  `https://map.kakao.com/?q=${encodeURIComponent("맛집")}&urlLevel=4&urlX=${lng}&urlY=${lat}`,
                  "_blank",
                );
              }
            }}
            style={{
              fontSize: 10, color: "#886638", background: "transparent",
              border: "none", cursor: "pointer", padding: 0,
            }}
          >
            더보기 ›
          </button>
        )}
      </div>

      <div
        className="no-scrollbar"
        style={{
          display: "flex", gap: 8, overflowX: "auto",
          margin: "0 -14px", padding: "0 14px",
        }}
      >
        {loading
          ? [0, 1, 2].map((i) => (
              <div key={i} style={{
                flex: "0 0 auto", width: 130, background: "white",
                borderRadius: 12, padding: 8,
              }}>
                <div style={{
                  width: "100%", height: 80, borderRadius: 8, background: "#f1efe8",
                  marginBottom: 6,
                }} />
                <div style={{ height: 11, background: "#f1efe8", borderRadius: 4, marginBottom: 4 }} />
                <div style={{ height: 9, width: "60%", background: "#f1efe8", borderRadius: 4 }} />
              </div>
            ))
          : items.map((r, i) => (
              <button
                key={r.id || i}
                type="button"
                onClick={() => {
                  if (r.place_url) window.open(r.place_url, "_blank");
                  else window.open(
                    `https://map.kakao.com/link/search/${encodeURIComponent(r.name)}`,
                    "_blank",
                  );
                }}
                style={{
                  flex: "0 0 auto", width: 130, background: "white",
                  borderRadius: 12, padding: 8, border: "none", cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{
                  position: "relative", width: "100%", height: 80,
                  borderRadius: 8, marginBottom: 6, overflow: "hidden",
                  background: "linear-gradient(135deg, #FBE3B6 0%, #FAC775 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 30,
                }}>
                  <span>{categoryEmoji(r.category, r.category_group_code)}</span>
                  <span style={{
                    position: "absolute", top: 4, right: 4,
                    background: "rgba(0,0,0,0.5)", color: "white",
                    fontSize: 9, padding: "1px 6px", borderRadius: 6,
                    backdropFilter: "blur(4px)",
                  }}>
                    {formatDistance(r.distance_m)}
                  </span>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: "#173404", lineHeight: 1.3,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  marginBottom: 2,
                }}>
                  {r.name}
                </div>
                <div style={{
                  fontSize: 9, color: "#888", display: "flex", gap: 4,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  <span style={{
                    overflow: "hidden", textOverflow: "ellipsis",
                  }}>{r.category || "음식점"}</span>
                  <span>·</span>
                  <span>{formatWalkTime(r.distance_m)}</span>
                </div>
              </button>
            ))}
      </div>
    </section>
  );
}

export default NearbyRestaurantsSection;
