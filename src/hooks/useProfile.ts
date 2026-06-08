import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { timeStart, timeEnd, shortId } from "@/lib/debugTiming";

type Profile = Tables<"profiles">;
type SafeProfile = Omit<Profile, "email">;
const PROFILE_SELECT = "id, user_id, nickname, avatar_url, bio, location, hiking_styles, provider, is_active, created_at, updated_at";

const cacheKey = (userId: string) => `profile_cache_${userId}`;
const CACHE_TTL = 5 * 60 * 1000;

interface CachedProfile { data: Profile; timestamp: number; }

function readCache(userId: string): CachedProfile | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "timestamp" in parsed && "data" in parsed) {
      return parsed as CachedProfile;
    }
    return { data: parsed as Profile, timestamp: 0 };
  } catch { return null; }
}

function writeCache(userId: string, profile: Profile | null) {
  try {
    if (profile) localStorage.setItem(cacheKey(userId), JSON.stringify({ data: profile, timestamp: Date.now() }));
    else localStorage.removeItem(cacheKey(userId));
  } catch {}
}

// Module-level in-flight dedupe so multiple consumers share one network request.
const inFlight = new Map<string, Promise<Profile | null>>();
type Listener = (p: Profile | null) => void;
const listeners = new Map<string, Set<Listener>>();
function emit(userId: string, p: Profile | null) {
  listeners.get(userId)?.forEach((l) => { try { l(p); } catch {} });
}

async function fetchProfileOnce(userId: string, email: string | null): Promise<Profile | null> {
  const existing = inFlight.get(userId);
  if (existing) return existing;
  const p = (async () => {
    timeStart("profile:fetch", { uid: shortId(userId) });
    try {
      const { data, error } = await supabase
        .from("profiles").select(PROFILE_SELECT).eq("user_id", userId).maybeSingle();
      if (error) { console.error("[useProfile] fetch error:", error.message); return null; }
      let row: any = data;
      if (!row) {
        const { data: upserted } = await supabase
          .from("profiles")
          .upsert({ user_id: userId, id: userId } as any, { onConflict: "user_id" })
          .select(PROFILE_SELECT).maybeSingle();
        row = upserted ?? null;
      }
      const next = row ? ({ ...(row as SafeProfile), email } as Profile) : null;
      writeCache(userId, next);
      emit(userId, next);
      return next;
    } finally {
      timeEnd("profile:fetch");
      inFlight.delete(userId);
    }
  })();
  inFlight.set(userId, p);
  return p;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const next = await fetchProfileOnce(user.id, user.email ?? null);
    setProfile(next);
    setLoading(false);
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const cached = readCache(user.id);
    if (cached) {
      setProfile({ ...cached.data, email: user.email ?? cached.data.email ?? null });
      setLoading(false);
    } else {
      setLoading(true);
    }
    let set = listeners.get(user.id);
    if (!set) { set = new Set(); listeners.set(user.id, set); }
    const l: Listener = (p) => { setProfile(p); setLoading(false); };
    set.add(l);

    const isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL;
    if (!isFresh) fetchProfileOnce(user.id, user.email ?? null).catch(() => {});

    return () => { set?.delete(l); };
  }, [user?.id, user?.email]);

  const updateProfile = async (updates: Partial<Pick<Profile, "nickname" | "bio" | "location" | "hiking_styles" | "avatar_url">>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles").update(updates).eq("user_id", user.id).select(PROFILE_SELECT).single();
    if (error) {
      console.error("Failed to update profile:", error);
      const { toast } = await import("sonner");
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    } else if (data) {
      const next = { ...(data as SafeProfile), email: user.email ?? profile?.email ?? null } as Profile;
      setProfile(next);
      writeCache(user.id, next);
      emit(user.id, next);
    }
    return { data, error };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const { compressImage } = await import("@/lib/imageUpload");
    const compressed = await compressImage(file, "profile");
    if (!compressed) return;
    const path = `${user.id}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("avatars").upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) return { error: uploadError };
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    return updateProfile({ avatar_url: publicUrl });
  };

  return { profile, loading, updateProfile, uploadAvatar, refetch: fetchProfile };
}
