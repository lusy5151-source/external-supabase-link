import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HikingJournal {
  id: string; user_id: string; mountain_id: number; course_name: string | null; course_starting_point: string | null; course_notes: string | null; duration: string | null; difficulty: string | null; weather: string | null; notes: string | null; photos: string[]; tagged_friends: string[]; visibility: "public" | "friends" | "private"; hiked_at: string; created_at: string; updated_at: string;
  profile?: { nickname: string | null; avatar_url: string | null }; like_count?: number; comment_count?: number; is_liked?: boolean;
}

export interface JournalComment { id: string; journal_id: string; user_id: string; content: string; created_at: string; profile?: { nickname: string | null; avatar_url: string | null }; }

export function useHikingJournals() {
  const { user } = useAuth();

  const fetchMyJournals = useCallback(async (): Promise<HikingJournal[]> => {
    if (!user) return [];
    const [{ data }, { data: profileData }] = await Promise.all([
      supabase.from("hiking_journals").select("*").eq("user_id", user.id).order("hiked_at", { ascending: false }),
      supabase.from("profiles").select("user_id, nickname, avatar_url").eq("user_id", user.id).single(),
    ]);
    const profile = profileData ? { nickname: (profileData as any).nickname, avatar_url: (profileData as any).avatar_url } : undefined;
    if (!data || data.length === 0) return [];
    const journalIds = (data as any[]).map((j) => j.id);
    const [{ data: likes }, { data: comments }] = await Promise.all([
      supabase.from("journal_likes").select("journal_id, user_id").in("journal_id", journalIds),
      supabase.from("journal_comments").select("journal_id").in("journal_id", journalIds),
    ]);
    const likeCounts = new Map<string, number>(); const userLikes = new Set<string>();
    (likes || []).forEach((l: any) => { likeCounts.set(l.journal_id, (likeCounts.get(l.journal_id) || 0) + 1); if (l.user_id === user.id) userLikes.add(l.journal_id); });
    const commentCounts = new Map<string, number>();
    (comments || []).forEach((c: any) => { commentCounts.set(c.journal_id, (commentCounts.get(c.journal_id) || 0) + 1); });
    return (data as any[]).map((j) => ({ ...j, profile, like_count: likeCounts.get(j.id) || 0, comment_count: commentCounts.get(j.id) || 0, is_liked: userLikes.has(j.id) })) as HikingJournal[];
  }, [user]);

  const fetchFeed = useCallback(async (): Promise<HikingJournal[]> => {
    if (!user) return [];
    const { data: journals } = await supabase.from("hiking_journals").select("*").neq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (!journals || journals.length === 0) return [];
    const userIds = [...new Set((journals as any[]).map((j) => j.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, nickname, avatar_url").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const journalIds = (journals as any[]).map((j) => j.id);
    const [{ data: likes }, { data: comments }] = await Promise.all([supabase.from("journal_likes").select("journal_id, user_id").in("journal_id", journalIds), supabase.from("journal_comments").select("journal_id").in("journal_id", journalIds)]);
    const likeCounts = new Map<string, number>(); const userLikes = new Set<string>();
    (likes || []).forEach((l: any) => { likeCounts.set(l.journal_id, (likeCounts.get(l.journal_id) || 0) + 1); if (l.user_id === user.id) userLikes.add(l.journal_id); });
    const commentCounts = new Map<string, number>();
    (comments || []).forEach((c: any) => { commentCounts.set(c.journal_id, (commentCounts.get(c.journal_id) || 0) + 1); });
    return (journals as any[]).map((j) => ({ ...j, profile: profileMap.get(j.user_id) || null, like_count: likeCounts.get(j.id) || 0, comment_count: commentCounts.get(j.id) || 0, is_liked: userLikes.has(j.id) })) as HikingJournal[];
  }, [user]);

  const createJournal = async (journal: any) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { data, error } = await supabase.from("hiking_journals").insert({ ...journal, user_id: user.id } as any).select().single();
    return { data: data as HikingJournal | null, error };
  };

  const updateJournal = async (id: string, updates: Partial<HikingJournal>) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase.from("hiking_journals").update(updates as any).eq("id", id);
    return { error };
  };

  const deleteJournal = async (id: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase.from("hiking_journals").delete().eq("id", id);
    return { error };
  };

  const toggleLike = async (journalId: string, isLiked: boolean) => {
    if (!user) return;
    if (isLiked) await supabase.from("journal_likes").delete().eq("journal_id", journalId).eq("user_id", user.id);
    else await supabase.from("journal_likes").insert({ journal_id: journalId, user_id: user.id } as any);
  };

  const fetchComments = async (journalId: string): Promise<JournalComment[]> => {
    const { data: comments } = await supabase.from("journal_comments").select("*").eq("journal_id", journalId).order("created_at", { ascending: true });
    if (!comments || comments.length === 0) return [];
    const userIds = [...new Set((comments as any[]).map((c) => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, nickname, avatar_url").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    return (comments as any[]).map((c) => ({ ...c, profile: profileMap.get(c.user_id) || null }));
  };

  const addComment = async (journalId: string, content: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { data, error } = await supabase.from("journal_comments").insert({ journal_id: journalId, user_id: user.id, content } as any).select().single();
    return { data, error };
  };

  const deleteComment = async (commentId: string) => { if (!user) return; await supabase.from("journal_comments").delete().eq("id", commentId); };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const { compressImage } = await import("@/lib/imageUpload");
    const compressed = await compressImage(file, "general");
    if (!compressed) return null;
    const path = `${user.id}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("journal-photos").upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("journal-photos").getPublicUrl(path);
    return publicUrl;
  };

  return { fetchMyJournals, fetchFeed, createJournal, updateJournal, deleteJournal, toggleLike, fetchComments, addComment, deleteComment, uploadPhoto };
}