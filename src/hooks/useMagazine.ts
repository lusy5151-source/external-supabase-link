import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MagazinePost {
  id: string;
  title: string;
  category: string;
  cover_image_url: string | null;
  description: string | null;
  is_featured: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MagazineSlide {
  id: string;
  post_id: string;
  image_url: string;
  slide_order: number;
  created_at: string;
}

export function useMagazine() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<MagazinePost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("magazine_posts" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setPosts((data as any as MagazinePost[]) || []);
    setLoading(false);
  }, []);

  const fetchSlides = useCallback(async (postId: string) => {
    const { data } = await supabase
      .from("magazine_slides" as any)
      .select("*")
      .eq("post_id", postId)
      .order("slide_order", { ascending: true });
    return (data as any as MagazineSlide[]) || [];
  }, []);

  const fetchFeaturedPost = useCallback(async () => {
    const { data } = await supabase
      .from("magazine_posts" as any)
      .select("*")
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as any as MagazinePost | null;
  }, []);

  const createPost = useCallback(async (post: { title: string; category: string; description: string; cover_image_url?: string; is_featured?: boolean }) => {
    if (!user) return null;
    const { data, error } = await supabase.from("magazine_posts" as any).insert({ ...post, created_by: user.id } as any).select().single();
    if (error) throw error;
    return data as any as MagazinePost;
  }, [user]);

  const updatePost = useCallback(async (id: string, updates: Partial<MagazinePost>) => {
    const { error } = await supabase.from("magazine_posts" as any).update(updates as any).eq("id", id);
    if (error) throw error;
  }, []);

  const deletePost = useCallback(async (id: string) => {
    const { error } = await supabase.from("magazine_posts" as any).delete().eq("id", id);
    if (error) throw error;
  }, []);

  const addSlide = useCallback(async (postId: string, imageUrl: string, order: number) => {
    const { data, error } = await supabase.from("magazine_slides" as any).insert({ post_id: postId, image_url: imageUrl, slide_order: order } as any).select().single();
    if (error) throw error;
    return data as any as MagazineSlide;
  }, []);

  const deleteSlide = useCallback(async (slideId: string) => {
    const { error } = await supabase.from("magazine_slides" as any).delete().eq("id", slideId);
    if (error) throw error;
  }, []);

  const toggleLike = useCallback(async (postId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from("magazine_likes" as any).select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    if (existing) {
      await supabase.from("magazine_likes" as any).delete().eq("id", (existing as any).id);
    } else {
      await supabase.from("magazine_likes" as any).insert({ post_id: postId, user_id: user.id } as any);
    }
  }, [user]);

  const toggleSave = useCallback(async (postId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from("magazine_saves" as any).select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    if (existing) {
      await supabase.from("magazine_saves" as any).delete().eq("id", (existing as any).id);
    } else {
      await supabase.from("magazine_saves" as any).insert({ post_id: postId, user_id: user.id } as any);
    }
  }, [user]);

  const getLikeCount = useCallback(async (postId: string) => {
    const { count } = await supabase.from("magazine_likes" as any).select("*", { count: "exact", head: true }).eq("post_id", postId);
    return count || 0;
  }, []);

  const isLiked = useCallback(async (postId: string) => {
    if (!user) return false;
    const { data } = await supabase.from("magazine_likes" as any).select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    return !!data;
  }, [user]);

  const isSaved = useCallback(async (postId: string) => {
    if (!user) return false;
    const { data } = await supabase.from("magazine_saves" as any).select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    return !!data;
  }, [user]);

  const uploadImage = useCallback(async (file: File, folder: string = "covers") => {
    const { compressImage } = await import("@/lib/imageUpload");
    const compressed = await compressImage(file, "general");
    if (!compressed) throw new Error("이미지 압축에 실패했습니다");
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage.from("magazine-images").upload(path, compressed, { contentType: "image/jpeg" });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("magazine-images").getPublicUrl(path);
    return urlData.publicUrl;
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return {
    posts, loading, fetchPosts, fetchSlides, fetchFeaturedPost,
    createPost, updatePost, deletePost, addSlide, deleteSlide,
    toggleLike, toggleSave, getLikeCount, isLiked, isSaved, uploadImage,
  };
}
