import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type SafeProfile = Omit<Profile, "email">;
const PROFILE_SELECT = "id, user_id, nickname, avatar_url, bio, location, hiking_styles, provider, is_active, created_at, updated_at";

const cacheKey = (userId: string) => `profile_cache_${userId}`;

function readCache(userId: string): Profile | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, profile: Profile | null) {
  try {
    if (profile) localStorage.setItem(cacheKey(userId), JSON.stringify(profile));
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

    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("user_id", user.id)
      .single();

    const next = data ? { ...(data as SafeProfile), email: user.email ?? null } : null;
    setProfile(next);
    writeCache(user.id, next);
    setLoading(false);
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
      setProfile({ ...cached, email: user.email ?? cached.email ?? null });
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (fetchedForUserRef.current !== user.id) {
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
