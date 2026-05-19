import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { awardXp } from "@/lib/xp";

export interface Summit {
  id: string; mountain_id: number; summit_name: string; latitude: number; longitude: number; elevation: number;
}
export interface SummitClaim {
  id: string; user_id: string; mountain_id: number; summit_id: string; group_id: string | null;
  latitude: number; longitude: number; photo_url: string; claimed_at: string;
  profile?: { nickname: string | null; avatar_url: string | null };
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useSummits(mountainId?: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [summits, setSummits] = useState<Summit[]>([]);
  const [claims, setClaims] = useState<SummitClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummits = useCallback(async () => {
    if (!mountainId) return;
    const { data } = await (supabase as any).from("summits").select("*").eq("mountain_id", mountainId);
    setSummits((data as any[]) || []);
  }, [mountainId]);

  const fetchClaims = useCallback(async () => {
    if (!mountainId) return;
    const { data: claimsData } = await (supabase as any).from("summit_claims").select("*").eq("mountain_id", mountainId).order("claimed_at", { ascending: false });
    if (!claimsData || (claimsData as any[]).length === 0) { setClaims([]); setLoading(false); return; }
    const userIds = [...new Set((claimsData as any[]).map((c: any) => c.user_id))];
    const { data: profiles } = await supabase.from("public_profiles").select("user_id, nickname, avatar_url").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setClaims((claimsData as any[]).map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) || null })));
    setLoading(false);
  }, [mountainId]);

  useEffect(() => {
    if (mountainId) { Promise.all([fetchSummits(), fetchClaims()]).then(() => setLoading(false)); }
  }, [fetchSummits, fetchClaims, mountainId]);

  const getSummitOwner = (summitId: string): SummitClaim | null => claims.find((c) => c.summit_id === summitId) || null;
  const getMountainLeader = () => null;
  const getClubOwner = () => null;

  const claimSummit = async (summitId: string, userLat: number, userLng: number, photoFile: File, groupId?: string, fallbackSummitData?: any, aiVerified?: boolean | null, aiConfidence?: number | null) => {
    if (!user) return { success: false, error: "로그인이 필요합니다" };
    console.log("Summit claim user_id:", user.id);
    let actualSummitId = summitId;
    if (summitId.startsWith("fallback-") && fallbackSummitData) {
      const { data: inserted, error: insertErr } = await (supabase as any).from("summits").insert(fallbackSummitData as any).select("id").single();
      if (insertErr || !inserted) return { success: false, error: "정상 정보 생성에 실패했습니다" };
      actualSummitId = (inserted as any).id;
      await fetchSummits();
    }
    const summit = summits.find((s) => s.id === actualSummitId) || (fallbackSummitData ? { ...fallbackSummitData, id: actualSummitId } : null);
    if (!summit) return { success: false, error: "정상을 찾을 수 없습니다" };
    const fileExt = photoFile.name.split(".").pop();
    const filePath = `${user.id}/${summitId}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("summit-photos").upload(filePath, photoFile);
    if (uploadError) return { success: false, error: "사진 업로드에 실패했습니다" };
    const { data: urlData } = supabase.storage.from("summit-photos").getPublicUrl(filePath);
    const { error: insertError } = await (supabase as any).from("summit_claims").insert({ user_id: user.id, mountain_id: summit.mountain_id, summit_id: actualSummitId, group_id: groupId || null, latitude: userLat, longitude: userLng, photo_url: urlData.publicUrl, ai_verified: aiVerified ?? null, ai_confidence: aiConfidence ?? null } as any);
    if (insertError) return { success: false, error: "저장에 실패했습니다" };
    toast({ title: "🎉 정상 정복 인증 완료!" });
    await fetchClaims();
    return { success: true };
  };

  return { summits, claims, loading, getSummitOwner, getMountainLeader, getClubOwner, claimSummit, fetchClaims };
}

export function useLeaderboard() {
  const [loading, setLoading] = useState(true);
  const [topClaimers, setTopClaimers] = useState<any[]>([]);
  const [mountainLeaders, setMountainLeaders] = useState<any[]>([]);
  const [clubRankings, setClubRankings] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: allClaims } = await (supabase as any).from("summit_claims").select("user_id, mountain_id, group_id").order("claimed_at", { ascending: true });
      if (!allClaims || (allClaims as any[]).length === 0) { setLoading(false); return; }
      const userCounts = new Map<string, number>();
      (allClaims as any[]).forEach((c: any) => userCounts.set(c.user_id, (userCounts.get(c.user_id) || 0) + 1));
      const topUsers = [...userCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
      const userIds = topUsers.map(([id]) => id);
      const { data: profiles } = await supabase.from("public_profiles").select("user_id, nickname, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setTopClaimers(topUsers.map(([userId, count]) => ({
        user_id: userId, count, nickname: profileMap.get(userId)?.nickname || null, avatar_url: profileMap.get(userId)?.avatar_url || null,
      })));
      setLoading(false);
    };
    fetchData();
  }, []);

  return { topClaimers, mountainLeaders, clubRankings, loading };
}
