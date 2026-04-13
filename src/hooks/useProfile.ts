import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    setProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Pick<Profile, "nickname" | "bio" | "location" | "hiking_styles" | "avatar_url">>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update profile:", error);
      const { toast } = await import("sonner");
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    } else if (data) {
      setProfile(data);
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
