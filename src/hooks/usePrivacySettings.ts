import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PrivacySettings {
  id: string;
  user_id: string;
  profile_visibility: "public" | "private";
  journal_visibility: "public" | "friends" | "private";
  allow_friend_requests: boolean;
}

export function usePrivacySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("privacy_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setSettings(data as unknown as PrivacySettings);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<Pick<PrivacySettings, "profile_visibility" | "journal_visibility" | "allow_friend_requests">>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("privacy_settings")
      .update(updates as any)
      .eq("user_id", user.id)
      .select()
      .single();

    if (!error && data) {
      setSettings(data as unknown as PrivacySettings);
    }
    return { data, error };
  };

  const isPrivateAccount = settings?.profile_visibility === "private";
  const defaultJournalVisibility = settings?.journal_visibility || "public";

  return {
    settings,
    loading,
    updateSettings,
    isPrivateAccount,
    defaultJournalVisibility,
    refetch: fetchSettings,
  };
}
