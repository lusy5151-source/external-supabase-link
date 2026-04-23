import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useProfileSync() {
  const { user } = useAuth();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    syncedRef.current = user?.id ?? null;
  }, [user?.id]);
}