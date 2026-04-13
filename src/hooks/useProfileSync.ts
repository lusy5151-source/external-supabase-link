import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useProfileSync() {
  const { user } = useAuth();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncedRef.current === user.id) return;
    syncedRef.current = user.id;
    supabase.functions.invoke('sync-profile')
      .catch((err) => console.warn("Profile sync failed:", err));
  }, [user]);
}