import { useState, useEffect, useCallback } from "react";

export interface OfflineClaim {
  id: string;
  mountainId: number;
  mountainName: string;
  summitId: string;
  summitName: string;
  photoDataUrl: string;
  photoFileName: string;
  latitude: number | null;
  longitude: number | null;
  groupId: string | null;
  timestamp: string;
  synced: boolean;
}

const STORAGE_KEY = "wandeung-offline-claims";

function loadClaims(): OfflineClaim[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveClaims(claims: OfflineClaim[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
}

export function useOfflineClaims() {
  const [offlineClaims, setOfflineClaims] = useState<OfflineClaim[]>(() => loadClaims());

  const addOfflineClaim = useCallback((claim: Omit<OfflineClaim, "id" | "synced">) => {
    const newClaim: OfflineClaim = {
      ...claim,
      id: crypto.randomUUID(),
      synced: false,
    };
    setOfflineClaims((prev) => {
      const updated = [...prev, newClaim];
      saveClaims(updated);
      return updated;
    });
    return newClaim;
  }, []);

  const markSynced = useCallback((id: string) => {
    setOfflineClaims((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, synced: true } : c));
      saveClaims(updated);
      return updated;
    });
  }, []);

  const removeOfflineClaim = useCallback((id: string) => {
    setOfflineClaims((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveClaims(updated);
      return updated;
    });
  }, []);

  const pendingClaims = offlineClaims.filter((c) => !c.synced);

  return { offlineClaims, pendingClaims, addOfflineClaim, markSynced, removeOfflineClaim };
}
