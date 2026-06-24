import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, Check, Camera, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ChallengeShareCard from "@/components/ChallengeShareCard";

type ChallengeType = "bac100" | "forest100";

interface MountainRow {
  id: number;
  name_ko?: string | null;
  name?: string | null;
  height?: number | null;
  bac100_rank?: number | null;
  is_bac100?: boolean | null;
  is_bac100_blackyak?: boolean | null;
  image_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  difficulty?: string | null;
  region?: string | null;
  province?: string | null;
  is_national_park?: boolean | null;
  national_park_name?: string | null;
}

type FilterMode = "all" | "done" | "todo";
type SortMode = "name" | "height" | "rank" | "claimed";

const SILHOUETTE_PATHS = [
  "M0 70 L25 30 L40 50 L60 15 L80 45 L100 35 L100 70 Z",
  "M0 70 L15 45 L30 25 L50 40 L70 20 L90 50 L100 40 L100 70 Z",
  "M0 70 L20 50 L35 20 L55 45 L75 25 L95 50 L100 60 L100 70 Z",
  "M0 70 L18 40 L40 55 L55 25 L75 50 L88 30 L100 45 L100 70 Z",
];

export default function ChallengeMountainsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = (searchParams.get("type") as ChallengeType) || "bac100";
  const challengeType: ChallengeType =
    typeParam === "forest100" ? "forest100" : "bac100";

  const [mountains, setMountains] = useState<MountainRow[]>([]);
  const [claimedIds, setClaimedIds] = useState<Set<number>>(new Set());
  const [photoMap, setPhotoMap] = useState<Map<number, string>>(new Map());
  const [animateIds, setAnimateIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("rank");
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [pendingMountainId, setPendingMountainId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch mountains for the active challenge
  const fetchMountains = useCallback(async () => {
    const column = challengeType === "bac100" ? "is_bac100_blackyak" : "is_bac100";
    const { data, error } = await (supabase as any)
      .from("mountains")
      .select("id, name_ko, name, height, difficulty, region, province, is_bac100_blackyak, is_bac100, is_national_park, national_park_name, bac100_rank, lat, lng, image_url")
      .eq(column, true)
      .order("bac100_rank", { ascending: true, nullsFirst: false })
      .limit(200);
    if (error) console.error("[ChallengeMountains] fetch error", error);
    return (data || []) as MountainRow[];
  }, [challengeType]);

  const fetchClaims = useCallback(async () => {
    if (!user) return { ids: new Set<number>(), photos: new Map<number, string>() };
    const challengeKey = challengeType === "bac100" ? "bac_100" : "forestry_100";
    const [claimsRes, umcRes] = await Promise.all([
      (supabase as any).from("summit_claims").select("mountain_id").eq("user_id", user.id),
      (supabase as any)
        .from("user_mountain_challenges")
        .select("mountain_id, photo_url, is_completed")
        .eq("user_id", user.id)
        .eq("challenge_type", challengeKey),
    ]);
    const ids = new Set<number>(((claimsRes.data || []) as any[]).map((c) => c.mountain_id));
    const photos = new Map<number, string>();
    ((umcRes.data || []) as any[]).forEach((r) => {
      if (r.is_completed) ids.add(r.mountain_id);
      if (r.photo_url) photos.set(r.mountain_id, r.photo_url);
    });
    return { ids, photos };
  }, [user, challengeType]);

  // Track previous claim count to detect new completions for celebration toast
  const prevClaimCountRef = useRef<number | null>(null);
  const prevClaimedIdsRef = useRef<Set<number>>(new Set());

  const refetch = useCallback(async () => {
    const [mtns, claims] = await Promise.all([fetchMountains(), fetchClaims()]);
    setMountains(mtns);

    // Detect newly claimed mountain (in this challenge) for celebration toast + flip animation
    const prevIds = prevClaimedIdsRef.current;
    const newlyClaimed = [...claims.ids].filter((id) => !prevIds.has(id));
    if (prevClaimCountRef.current !== null && newlyClaimed.length > 0) {
      const newlyInChallenge = mtns.find((m) => newlyClaimed.includes(m.id));
      if (newlyInChallenge) {
        const completedInChallenge = mtns.filter((m) => claims.ids.has(m.id)).length;
        toast(
          `🎉 ${newlyInChallenge.name_ko || newlyInChallenge.name} 완등! 100대 명산 ${completedInChallenge}/100 진행 중`,
          { duration: 5000 },
        );
      }
      // Mark newly claimed cards for flip animation
      setAnimateIds(new Set(newlyClaimed));
      setTimeout(() => setAnimateIds(new Set()), 1200);
    }
    prevClaimedIdsRef.current = claims.ids;
    prevClaimCountRef.current = claims.ids.size;

    setClaimedIds(claims.ids);
    setPhotoMap(claims.photos);
    setLoading(false);
  }, [fetchMountains, fetchClaims]);

  // Initial + on dependency change
  useEffect(() => {
    setLoading(true);
    prevClaimCountRef.current = null; // reset on challenge/user change
    prevClaimedIdsRef.current = new Set();
    refetch();
  }, [refetch]);

  // Refetch on window focus / visibility change so newly claimed summits appear
  useEffect(() => {
    const onFocus = () => refetch();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetch]);

  const completedCount = useMemo(
    () => mountains.filter((m) => claimedIds.has(m.id)).length,
    [mountains, claimedIds],
  );
  const challengeName = challengeType === "bac100" ? "100대 명산 도전" : "산림청 100대 도전";
  const recentCompletedMountains = useMemo(
    () =>
      mountains
        .filter((m) => claimedIds.has(m.id))
        .sort((a, b) => (a.bac100_rank ?? 999) - (b.bac100_rank ?? 999))
        .slice(0, 3)
        .map((m) => ({
          id: m.id,
          name: m.name_ko || m.name || "이름 없는 산",
          region: m.province || m.region || m.national_park_name || null,
        })),
    [mountains, claimedIds],
  );
  const total = 100;
  const remaining = Math.max(0, total - completedCount);
  const pct = Math.min(100, Math.round((completedCount / total) * 100));

  const filtered = useMemo(() => {
    const arr = mountains.filter((m) => {
      if (filter === "done") return claimedIds.has(m.id);
      if (filter === "todo") return !claimedIds.has(m.id);
      return true;
    });
    arr.sort((a, b) => {
      switch (sort) {
        case "name":
          return (a.name_ko || a.name || "").localeCompare(b.name_ko || b.name || "");
        case "height":
          return (b.height || 0) - (a.height || 0);
        case "claimed":
          return Number(claimedIds.has(b.id)) - Number(claimedIds.has(a.id));
        case "rank":
        default:
          return (a.bac100_rank ?? 999) - (b.bac100_rank ?? 999);
      }
    });
    return arr;
  }, [mountains, claimedIds, filter, sort]);

  const setType = (t: ChallengeType) => {
    const next = new URLSearchParams(searchParams);
    next.set("type", t);
    setSearchParams(next, { replace: true });
  };

  const sortLabel = {
    rank: "순위순", name: "가나다순", height: "높이순", claimed: "완등순",
  }[sort];

  // Open file picker for a given mountain card
  const handleOpenPicker = (mountainId: number) => {
    if (!user) {
      toast.error("로그인이 필요해요");
      return;
    }
    setPendingMountainId(mountainId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const mountainId = pendingMountainId;
    // reset so same file can be reselected later
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPendingMountainId(null);
    if (!file || !mountainId || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("10MB 이하 이미지만 업로드할 수 있어요");
      return;
    }

    setUploadingId(mountainId);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/challenge-cards/${challengeType}-${mountainId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("summit-photos")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("summit-photos").getPublicUrl(path);
      const photoUrl = urlData.publicUrl;

      const challengeKey = challengeType === "bac100" ? "bac_100" : "forestry_100";
      // Find existing row
      const { data: existing } = await (supabase as any)
        .from("user_mountain_challenges")
        .select("id")
        .eq("user_id", user.id)
        .eq("challenge_type", challengeKey)
        .eq("mountain_id", mountainId)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await (supabase as any)
          .from("user_mountain_challenges")
          .update({
            photo_url: photoUrl,
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("user_mountain_challenges")
          .insert({
            user_id: user.id,
            challenge_type: challengeKey,
            mountain_id: mountainId,
            photo_url: photoUrl,
            is_completed: true,
            completed_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      // Optimistic local update so the user sees it instantly
      setPhotoMap((prev) => {
        const m = new Map(prev);
        m.set(mountainId, photoUrl);
        return m;
      });
      setClaimedIds((prev) => {
        const s = new Set(prev);
        s.add(mountainId);
        return s;
      });
      toast.success("사진을 등록했어요 📸");
    } catch (err: any) {
      console.error("[ChallengeMountains] upload error", err);
      toast.error(err?.message || "사진 업로드에 실패했어요");
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemovePhoto = async (mountainId: number) => {
    if (!user) return;
    const challengeKey = challengeType === "bac100" ? "bac_100" : "forestry_100";
    try {
      const { error } = await (supabase as any)
        .from("user_mountain_challenges")
        .update({ photo_url: null })
        .eq("user_id", user.id)
        .eq("challenge_type", challengeKey)
        .eq("mountain_id", mountainId);
      if (error) throw error;
      setPhotoMap((prev) => {
        const m = new Map(prev);
        m.delete(mountainId);
        return m;
      });
      toast.success("사진을 삭제했어요");
    } catch (err: any) {
      toast.error(err?.message || "삭제에 실패했어요");
    }
  };


  return (
    <div style={{ background: "#e6ede0", minHeight: "100vh", paddingBottom: 40 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {/* Back bar */}
      <Link
        to="/mountains"
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "12px 14px 10px", fontSize: 12, color: "#555",
        }}
      >
        <ChevronLeft size={14} color="#555" /> 탐색으로 돌아가기
      </Link>

      <h1 style={{
        fontSize: 22, fontWeight: 700, color: "#173404",
        margin: "0 14px 12px",
      }}>{challengeName}</h1>

      {/* Tab toggle */}
      <div style={{
        background: "white", borderRadius: 14, padding: 4,
        margin: "0 12px 12px", border: "0.5px solid #e3efcc",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3,
      }}>
        {([
          { key: "bac100", main: "100대 명산", sub: "블랙야크 알파인 클럽" },
          { key: "forest100", main: "산림청 100대", sub: "산림청 공식" },
        ] as const).map((t) => {
          const active = challengeType === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              style={{
                padding: "9px 8px", textAlign: "center", borderRadius: 10,
                cursor: "pointer", border: "none",
                background: active ? "#c6d56c" : "transparent",
                color: active ? "#173404" : "#666",
                fontWeight: active ? 600 : 400,
              }}
            >
              <span style={{ fontSize: 12 }}>{t.main}</span>
              <span style={{
                display: "block", fontSize: 9, opacity: 0.7,
                fontWeight: 400, marginTop: 1,
              }}>{t.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Login prompt */}
      {!user && (
        <div style={{
          background: "white", border: "0.5px solid #e3efcc", borderRadius: 14,
          margin: "0 12px 12px", padding: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <span style={{ fontSize: 12, color: "#444" }}>
            로그인하고 완등을 기록해보세요
          </span>
          <Link
            to="/auth"
            style={{
              background: "#c6d56c", color: "#173404",
              padding: "6px 14px", borderRadius: 10,
              fontSize: 11, fontWeight: 600, textDecoration: "none",
            }}
          >로그인</Link>
        </div>
      )}

      {/* Progress card */}
      <div style={{
        background: "linear-gradient(135deg, #f3f8e9 0%, #e3efcc 100%)",
        border: "0.5px solid #c6d56c", borderRadius: 16,
        padding: 16, margin: "0 12px 12px",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          marginBottom: 10,
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#27500A", fontWeight: 500 }}>현재 진행률</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#173404", lineHeight: 1 }}>
                {completedCount}
              </span>
              <span style={{ fontSize: 14, color: "#639922" }}>/ 100</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#639922" }}>{pct}%</div>
            <ChallengeShareCard
              challengeName={challengeName}
              completedCount={completedCount}
              totalCount={total}
              recentMountains={recentCompletedMountains}
            />
          </div>
        </div>
        <div style={{ background: "white", height: 8, borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, #c6d56c 0%, #97C459 100%)",
            transition: "width 600ms ease-out",
          }} />
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, padding: "0 12px", marginBottom: 10 }}>
        {([
          { key: "all", label: `전체 ${total}` },
          { key: "done", label: `완등 ${completedCount}` },
          { key: "todo", label: `미등 ${remaining}` },
        ] as const).map((c) => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              style={{
                fontSize: 11, padding: "5px 12px", borderRadius: 9999,
                background: active ? "#c6d56c" : "white",
                color: active ? "#173404" : "#666",
                fontWeight: active ? 600 : 400,
                border: active ? "0.5px solid #c6d56c" : "0.5px solid #e3efcc",
                cursor: "pointer",
              }}
            >{c.label}</button>
          );
        })}
      </div>

      {/* Result count + sort */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 14px", marginBottom: 10,
      }}>
        <span style={{ fontSize: 11, color: "#888" }}>
          {filtered.length}개 산
        </span>
        <button
          type="button"
          onClick={() => {
            const order: SortMode[] = ["rank", "name", "height", "claimed"];
            const idx = order.indexOf(sort);
            setSort(order[(idx + 1) % order.length]);
          }}
          style={{
            fontSize: 11, color: "#888", background: "transparent",
            border: "none", cursor: "pointer", padding: 0,
          }}
        >
          {sortLabel} ↓
        </button>
      </div>

      {/* Mountain grid */}
      {loading ? (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8, padding: "0 12px",
        }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{
              background: "white", borderRadius: 14, padding: 8,
            }}>
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 10,
                background: "#f1efe8", marginBottom: 6,
              }} />
              <div style={{ height: 11, background: "#f1efe8", borderRadius: 4, marginBottom: 4 }} />
              <div style={{ height: 9, width: "60%", background: "#f1efe8", borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8, padding: "0 12px",
        }}>
          {filtered.map((m, i) => {
            const done = claimedIds.has(m.id);
            const cardPhoto = photoMap.get(m.id) || null;
            const hasPhoto = done && !!cardPhoto;
            const rank = m.bac100_rank ?? null;
            const silhouette = SILHOUETTE_PATHS[i % SILHOUETTE_PATHS.length];
            const shouldFlip = animateIds.has(m.id);
            const imageSquareInner = (
              <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1",
                borderRadius: 10,
                overflow: "hidden",
                marginBottom: 6,
                background: hasPhoto
                  ? "#000"
                  : done
                    ? "linear-gradient(135deg, #C0DD97 0%, #c6d56c 100%)"
                    : "linear-gradient(135deg, #ECEAE3 0%, #DCDAD3 100%)",
                filter: done ? undefined : "grayscale(0.3)",
              }}>
                {/* Photo background (state C) */}
                {hasPhoto && (
                  <>
                    <img
                      src={cardPhoto!}
                      alt={m.name_ko || m.name || ""}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)" }} />
                  </>
                )}

                {/* Silhouette (states A & B only) */}
                {!hasPhoto && (
                  <svg
                    viewBox="0 0 100 70"
                    preserveAspectRatio="none"
                    style={{
                      position: "absolute", bottom: 0, left: 0,
                      width: "100%", height: "70%",
                      opacity: done ? 0.6 : 0.4,
                    }}
                  >
                    <path d={silhouette} fill="rgba(255,255,255,0.6)" />
                  </svg>
                )}

                {/* Center white check (state B) */}
                {done && !hasPhoto && (
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                  }}>
                    <Check size={36} color="white" strokeWidth={3} style={{ opacity: 0.9, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }} />
                  </div>
                )}

                {/* Photo bottom mountain name (state C) */}
                {hasPhoto && (
                  <div style={{
                    position: "absolute", left: 6, right: 6, bottom: 6,
                    color: "white", fontSize: 11, fontWeight: 600,
                    textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {m.name_ko || m.name}
                  </div>
                )}

                {/* Rank badge */}
                {challengeType === "bac100" && rank && (
                  <span style={{
                    position: "absolute", top: 4, left: 4,
                    background: done ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)",
                    color: done ? "#27500A" : "#173404",
                    fontSize: 9, fontWeight: 700,
                    padding: "1px 5px", borderRadius: 5,
                    backdropFilter: "blur(4px)",
                  }}>
                    #{rank}
                  </span>
                )}

                {/* Status badge */}
                {done ? (
                  <div style={{
                    position: "absolute", top: 4, right: 4,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#97C459", border: "1.5px solid white",
                    boxShadow: hasPhoto ? "0 2px 6px rgba(0,0,0,0.4)" : "0 2px 6px rgba(151,196,89,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check size={11} color="white" strokeWidth={3.5} />
                  </div>
                ) : (
                  <div style={{
                    position: "absolute", top: 4, right: 4,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "rgba(255,255,255,0.5)",
                    border: "1.5px dashed #aaa",
                  }} />
                )}

                {/* User photo upload / edit button (logged-in users only) */}
                {user && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenPicker(m.id);
                    }}
                    aria-label={hasPhoto ? "사진 변경" : "사진 추가"}
                    style={{
                      position: "absolute", bottom: 4, right: 4,
                      width: 24, height: 24, borderRadius: "50%",
                      background: hasPhoto ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.92)",
                      color: hasPhoto ? "white" : "#27500A",
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                      padding: 0,
                    }}
                  >
                    {uploadingId === m.id ? (
                      <span style={{
                        width: 10, height: 10, borderRadius: "50%",
                        border: "2px solid currentColor", borderTopColor: "transparent",
                        animation: "spin 0.8s linear infinite",
                      }} />
                    ) : hasPhoto ? (
                      <Pencil size={11} strokeWidth={2.5} />
                    ) : (
                      <Camera size={12} strokeWidth={2.2} />
                    )}
                  </button>
                )}

                {/* Remove user-uploaded photo */}
                {user && hasPhoto && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemovePhoto(m.id);
                    }}
                    aria-label="사진 삭제"
                    style={{
                      position: "absolute", bottom: 4, left: 4,
                      width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(0,0,0,0.5)", color: "white",
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.25)", padding: 0,
                    }}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            );

            return (
              <Link
                key={m.id}
                to={`/mountains/${m.id}`}
                style={{
                  background: "white",
                  borderRadius: 14,
                  padding: 8,
                  textDecoration: "none",
                  border: done ? "1.5px solid #c6d56c" : "0.5px solid transparent",
                  boxShadow: done ? "0 0 0 3px rgba(198, 213, 108, 0.18)" : undefined,
                  transition: "transform 120ms ease",
                  perspective: 800,
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
              >
                {shouldFlip ? (
                  <motion.div
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "backOut" }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {imageSquareInner}
                  </motion.div>
                ) : (
                  imageSquareInner
                )}

                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: done ? "#173404" : "#555",
                  marginBottom: 1, lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {m.name_ko || m.name}
                </div>
                <div style={{
                  fontSize: 9,
                  color: done ? "#639922" : "#888",
                  fontWeight: done ? 500 : 400,
                }}>
                  {m.height ? `${m.height}m` : "-"}{done ? " · 완등 ✓" : ""}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Stats footer */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        background: "white", borderRadius: 14,
        padding: "14px 4px", margin: "12px 12px",
      }}>
        {[
          { value: completedCount, label: "완등", color: "#173404" },
          { value: remaining, label: "남음", color: "#888" },
          { value: `${pct}%`, label: "달성률", color: "#639922" },
        ].map((s, i, arr) => (
          <div key={s.label} style={{
            textAlign: "center",
            borderRight: i < arr.length - 1 ? "0.5px solid #f1efe8" : "none",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
