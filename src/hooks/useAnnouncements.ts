import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Announcement { id: string; title: string; date: string; category: string; content: string | null; summary: string | null; source: string | null; created_at: string; }

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchAnnouncements = useCallback(async () => { setLoading(true); const { data } = await supabase.from("announcements").select("*").order("date", { ascending: false }).limit(50); if (data) setAnnouncements(data as unknown as Announcement[]); setLoading(false); }, []);
  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);
  return { announcements, loading, refetch: fetchAnnouncements };
}