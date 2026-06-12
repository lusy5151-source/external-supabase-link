import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CommunityCategory = "story" | "mountain_info" | "gear";

export const categoryLabel: Record<CommunityCategory, string> = {
  story: "산행 이야기",
  mountain_info: "산 정보",
  gear: "장비추천",
};

export interface CommunityPost {
  id: string;
  user_id: string;
  category: CommunityCategory;
  title: string | null;
  body: string;
  images: string[];
  mountain_id: number | null;
  created_at: string;
  updated_at: string;
  profile?: { nickname: string | null; avatar_url: string | null };
  like_count?: number;
  comment_count?: number;
  is_liked?: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: { nickname: string | null; avatar_url: string | null };
}

async function enrichPosts(rows: any[], currentUserId?: string): Promise<CommunityPost[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
    supabase.from("public_profiles").select("user_id, nickname, avatar_url").in("user_id", userIds),
    (supabase as any).from("community_post_likes").select("post_id, user_id").in("post_id", ids),
    (supabase as any).from("community_post_comments").select("post_id").in("post_id", ids),
  ]);
  const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
  return rows.map((r) => {
    const postLikes = (likes || []).filter((l: any) => l.post_id === r.id);
    const postComments = (comments || []).filter((c: any) => c.post_id === r.id);
    const p = profMap.get(r.user_id) as any;
    return {
      ...r,
      profile: p ? { nickname: p.nickname, avatar_url: p.avatar_url } : undefined,
      like_count: postLikes.length,
      comment_count: postComments.length,
      is_liked: currentUserId ? postLikes.some((l: any) => l.user_id === currentUserId) : false,
    };
  });
}

export function useCommunityPosts(category?: CommunityCategory | "all") {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any).from("community_posts").select("*").order("created_at", { ascending: false }).limit(100);
    if (category && category !== "all") q = q.eq("category", category);
    const { data } = await q;
    const enriched = await enrichPosts(data || [], user?.id);
    setPosts(enriched);
    setLoading(false);
  }, [category, user?.id]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return { posts, loading, refresh: fetchPosts };
}

export async function fetchRecentCommunityPosts(limit = 5, currentUserId?: string): Promise<CommunityPost[]> {
  const { data } = await (supabase as any)
    .from("community_posts").select("*").order("created_at", { ascending: false }).limit(limit);
  return enrichPosts(data || [], currentUserId);
}

export async function fetchCommunityPost(id: string, currentUserId?: string): Promise<CommunityPost | null> {
  const { data } = await (supabase as any).from("community_posts").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const [enriched] = await enrichPosts([data], currentUserId);
  return enriched;
}

export async function createCommunityPost(p: { category: CommunityCategory; title?: string; body: string; images?: string[]; mountain_id?: number | null }, userId: string) {
  const { data, error } = await (supabase as any).from("community_posts").insert({
    user_id: userId,
    category: p.category,
    title: p.title || null,
    body: p.body,
    images: p.images || [],
    mountain_id: p.mountain_id || null,
  }).select().single();
  if (error) throw error;
  // XP +10 (best-effort)
  try { await (supabase as any).rpc("add_xp", { p_user_id: userId, p_amount: 10, p_source_type: "community_post", p_source_id: data.id, p_description: "커뮤니티 글 작성" }); } catch {}
  return data;
}

export async function toggleCommunityLike(postId: string, userId: string) {
  const { data: existing } = await (supabase as any).from("community_post_likes").select("id").eq("post_id", postId).eq("user_id", userId).maybeSingle();
  if (existing) {
    await (supabase as any).from("community_post_likes").delete().eq("id", existing.id);
    return false;
  }
  await (supabase as any).from("community_post_likes").insert({ post_id: postId, user_id: userId });
  return true;
}

export async function fetchCommunityComments(postId: string): Promise<CommunityComment[]> {
  const { data } = await (supabase as any).from("community_post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
  const rows = data || [];
  if (!rows.length) return [];
  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id))) as string[];
  const { data: profiles } = await supabase.from("public_profiles").select("user_id, nickname, avatar_url").in("user_id", userIds);
  const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
  return rows.map((r: any) => ({ ...r, profile: map.get(r.user_id) as any }));
}

export async function addCommunityComment(postId: string, userId: string, body: string) {
  const { data, error } = await (supabase as any).from("community_post_comments").insert({ post_id: postId, user_id: userId, body }).select().single();
  if (error) throw error;
  try { await (supabase as any).rpc("add_xp", { p_user_id: userId, p_amount: 3, p_source_type: "community_comment", p_source_id: data.id, p_description: "커뮤니티 댓글" }); } catch {}
  return data;
}

export async function deleteCommunityComment(commentId: string) {
  const { error } = await (supabase as any).from("community_post_comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function deleteCommunityPost(postId: string) {
  const { error } = await (supabase as any).from("community_posts").delete().eq("id", postId);
  if (error) throw error;
}

export function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}
