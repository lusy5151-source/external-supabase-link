import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type SafeProfile = Omit<Profile, "email">;
const PROFILE_SELECT = "id, user_id, nickname, avatar_url, bio, location, hiking_styles, provider, is_active, created_at, updated_at";

const cacheKey = (userId: string) => `profile_cache_${userId}`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedProfile {
  data: Profile;
  timestamp: number;
}

function readCache(userId: string): CachedProfile | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Backward-compat: old shape stored Profile directly
    if (parsed && typeof parsed === "object" && "timestamp" in parsed && "data" in parsed) {
      return parsed as CachedProfile;
    }
    return { data: parsed as Profile, timestamp: 0 };
  } catch {
    return null;
  }
}

function writeCache(userId: string, profile: Profile | null) {
  try {
    if (profile)
      localStorage.setItem(
        cacheKey(userId),
        JSON.stringify({ data: profile, timestamp: Date.now() })
      );
    else localStorage.removeItem(cacheKey(userId));
  } catch {
    /* ignore */
  }
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedForUserRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[useProfile] fetch error:", error.message);
        return;
      }

      let row: any = data;
      if (!row) {
        const { data: upserted, error: upsertErr } = await supabase
          .from("profiles")
          .upsert({ user_id: user.id, id: user.id } as any, { onConflict: "user_id" })
          .select(PROFILE_SELECT)
          .maybeSingle();
        if (upsertErr) console.error("[useProfile] upsert error:", upsertErr.message);
        row = upserted ?? null;
      }

      const next = row ? { ...(row as SafeProfile), email: user.email ?? null } : null;
      setProfile(next);
      writeCache(user.id, next);
    } catch (e: any) {
      console.error("[useProfile] unexpected:", e?.message ?? "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Stale-while-revalidate: show cached profile immediately, refetch in background.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      fetchedForUserRef.current = null;
      return;
    }

    const cached = readCache(user.id);
    if (cached) {
      setProfile({ ...cached.data, email: user.email ?? cached.data.email ?? null });
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Skip background refetch if cache is fresh (< 5 min)
    const isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL;
    if (!isFresh && fetchedForUserRef.current !== user.id) {
      fetchedForUserRef.current = user.id;
      fetchProfile();
    }
  }, [user, fetchProfile]);

  const updateProfile = async (updates: Partial<Pick<Profile, "nickname" | "bio" | "location" | "hiking_styles" | "avatar_url">>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select(PROFILE_SELECT)
      .single();

    if (error) {
      console.error("Failed to update profile:", error);
      const { toast } = await import("sonner");
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    } else if (data) {
      const next = { ...(data as SafeProfile), email: user.email ?? profile?.email ?? null };
      setProfile(next);
      writeCache(user.id, next);
    }
    return { data, error };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;

    const { compressImage, IMAGE_ACCEPT } = await import("@/lib/imageUpload");
    const compressed = await compressImage(file, "profile");
    if (!compressed) return;

    const path = `${user.id}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) return { error: uploadError };

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    return updateProfile({ avatar_url: publicUrl });
  };

  return { profile, loading, updateProfile, uploadAvatar, refetch: fetchProfile };
}
