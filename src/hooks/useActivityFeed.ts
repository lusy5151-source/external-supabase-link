import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityFeedItem { id: string; user_id: string; type: string; mountain_id: number | null; plan_id: string | null; message: string; participant_ids: string[]; created_at: string; profile?: { nickname: string | null; avatar_url: string | null }; participant_profiles?: { user_id: string; nickname: string | null; avatar_url: string | null }[]; }

export function useActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from("activity_feed").select("*").order("created_at", { ascending: false }).limit(50);
      if (!data || data.length === 0) { setItems([]); setLoading(false); return; }
      const allUserIds = new Set<string>();
      (data as any[]).forEach((d) => { allUserIds.add(d.user_id); (d.participant_ids || []).forEach((pid: string) => allUserIds.add(pid)); });
      const { data: profiles } = await supabase.from("public_profiles").select("user_id, nickname, avatar_url").in("user_id", [...allUserIds]);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setItems((data as any[]).map((d) => ({ ...d, profile: profileMap.get(d.user_id) || null, participant_profiles: (d.participant_ids || []).map((pid: string) => profileMap.get(pid)).filter(Boolean) })));
    } catch { setItems([]); } finally { setLoading(false); }
  }, []);

  return { items, loading, fetchFeed };
}