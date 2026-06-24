import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Mountain } from "@/data/mountains";

export interface UserMountainRow {
  id: string;
  user_id: string;
  mountain_id: number;
  name_ko: string | null;
  name: string | null;
  height: number | null;
  region: string | null;
  difficulty: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  is_user_created: boolean | null;
  created_by: string | null;
  status: string | null;
  created_at: string | null;
}

export interface CreateMountainInput {
  name_ko: string;
  name?: string;
  height: number;
  region: string;
  difficulty: string;
  description?: string;
  lat?: number;
  lng?: number;
  image_url?: string;
}

/** Convert a user_mountains row to a Mountain-compatible object */
export function toMountain(row: UserMountainRow): Mountain & { isUserCreated: true; createdBy: string; dbId: string; status: string } {
  return {
    id: row.mountain_id,
    name: row.name || row.name_ko || "새 산",
    nameKo: row.name_ko || row.name || "새 산",
    height: row.height || 0,
    region: row.region || "기타",
    difficulty: (row.difficulty || "보통") as Mountain["difficulty"],
    description: row.description || "",
    lat: row.lat || 0,
    lng: row.lng || 0,
    is_baekdu: false,
    trails: [],
    image_url: row.image_url || undefined,
    isUserCreated: true,
    createdBy: row.created_by || row.user_id,
    dbId: row.id,
    status: row.status || "pending",
  };
}

export function useUserMountains() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userMountains = [], isLoading } = useQuery({
    queryKey: ["user-mountains", user?.id],
    queryFn: async () => {
      // Fetch all visible mountains (RLS handles visibility: active + own pending + admin)
      const { data, error } = await (supabase as any)
        .from("user_mountains")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as UserMountainRow[];
    },
  });

  const createMountain = useMutation({
    mutationFn: async (input: CreateMountainInput) => {
      if (!user) throw new Error("로그인이 필요합니다");
      const mountainId = await generateUserMountainId();
      const { data, error } = await (supabase as any)
        .from("user_mountains")
        .insert({
          user_id: user.id,
          mountain_id: mountainId,
          name_ko: input.name_ko,
          name: input.name || null,
          height: input.height,
          region: input.region,
          difficulty: input.difficulty,
          description: input.description || null,
          lat: input.lat || null,
          lng: input.lng || null,
          image_url: input.image_url || null,
          is_user_created: true,
          created_by: user.id,
          status: "pending",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as UserMountainRow;
    },
    onSuccess: (createdMountain) => {
      queryClient.setQueryData<UserMountainRow[]>(["user-mountains", user?.id], (current = []) => {
        const withoutDuplicate = current.filter((mountain) => mountain.id !== createdMountain.id);
        return [createdMountain, ...withoutDuplicate];
      });
      queryClient.invalidateQueries({ queryKey: ["user-mountains"] });
      toast.success("산이 등록되었습니다! 이제 이 산으로 일지를 작성할 수 있어요.");
    },
    onError: (error: Error) => {
      toast.error("산 등록에 실패했습니다", { description: error.message });
    },
  });

  const uploadMountainImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const { compressImage } = await import("@/lib/imageUpload");
    const compressed = await compressImage(file, "general");
    if (!compressed) return null;

    const ext = compressed.name.split(".").pop() || "jpg";
    const safeId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `${user.id}/${safeId}.${ext}`;

    const { error } = await supabase.storage
      .from("mountain-images")
      .upload(path, compressed);
    if (error) {
      toast.error("이미지 업로드 실패");
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("mountain-images")
      .getPublicUrl(path);
    return urlData.publicUrl;
  };

  // Convert all user mountains to Mountain-compatible objects
  const userMountainsAsMountains = useMemo(() => userMountains.map(toMountain), [userMountains]);

  return {
    userMountains,
    userMountainsAsMountains,
    isLoading,
    createMountain,
    uploadMountainImage,
  };
}

async function generateUserMountainId(): Promise<number> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = 900_000_000 + Math.floor(Math.random() * 99_999_999);
    const [{ data: existingOfficial }, { data: existingUser }] = await Promise.all([
      supabase.from("mountains").select("id").eq("id", candidate).maybeSingle(),
      (supabase as any).from("user_mountains").select("mountain_id").eq("mountain_id", candidate).maybeSingle(),
    ]);
    if (!existingOfficial && !existingUser) return candidate;
  }
  return 980_000_000 + Math.floor(Math.random() * 19_999_999);
}
