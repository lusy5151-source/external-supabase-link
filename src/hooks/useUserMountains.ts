import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Mountain } from "@/data/mountains";

export interface UserMountainRow {
  id: string;
  mountain_id: number;
  name_ko: string;
  name: string | null;
  height: number;
  region: string;
  difficulty: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  is_user_created: boolean;
  created_by: string;
  status: string;
  created_at: string;
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
    name: row.name || row.name_ko,
    nameKo: row.name_ko,
    height: row.height,
    region: row.region,
    difficulty: row.difficulty as Mountain["difficulty"],
    description: row.description || "",
    lat: row.lat || 0,
    lng: row.lng || 0,
    is_baekdu: false,
    popularity: 1,
    isUserCreated: true,
    createdBy: row.created_by,
    dbId: row.id,
    status: row.status,
  };
}

export function useUserMountains() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userMountains = [], isLoading } = useQuery({
    queryKey: ["user-mountains", user?.id],
    queryFn: async () => {
      // Fetch all visible mountains (RLS handles visibility: active + own pending + admin)
      const { data, error } = await supabase
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
      const { data, error } = await supabase
        .from("user_mountains")
        .insert({
          name_ko: input.name_ko,
          name: input.name || null,
          height: input.height,
          region: input.region,
          difficulty: input.difficulty,
          description: input.description || null,
          lat: input.lat || null,
          lng: input.lng || null,
          image_url: input.image_url || null,
          created_by: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as UserMountainRow;
    },
    onSuccess: () => {
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
    const path = `${user.id}/${Date.now()}.${ext}`;

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
  const userMountainsAsMountains = userMountains.map(toMountain);

  return {
    userMountains,
    userMountainsAsMountains,
    isLoading,
    createMountain,
    uploadMountainImage,
  };
}
