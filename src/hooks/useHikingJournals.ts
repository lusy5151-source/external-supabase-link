import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HikingJournal {
  id: string;
  user_id: string;
  mountain_id: number;
  mountain_ids?: number[];
  course_name: string | null;
  course_starting_point: string | null;
  course_notes: string | null;
  duration: string | null;
  difficulty: string | null;
  weather: string | null;
  notes: string | null;
  photos: string[];
  tagged_friends: string[];
  visibility: "public" | "friends" | "private";
  hiked_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: { nickname: string | null; avatar_url: string | null };
  like_count?: number;
  comment_count?: number;
  is_liked?: boolean;
}

export interface JournalComment {
  id: string;
  journal_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { nickname: string | null; avatar_url: string | null };
}

export function useHikingJournals() {
  const { user } = useAuth();

  const fetchMyJournals = useCallback(async (): Promise<HikingJournal[]> => {
    if (!user) return [];
    const [{ data }, { data: profileData }] = await Promise.all([
      supabase
        .from("hiking_journals")
        .select("*")
        .eq("user_id", user.id)
        .order("hiked_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .eq("user_id", user.id)
        .single(),
    ]);
    const profile = profileData ? { nickname: (profileData as any).nickname, avatar_url: (profileData as any).avatar_url } : undefined;

    if (!data || data.length === 0) return [];

    const journalIds = (data as any[]).map((j) => j.id);

    const [{ data: likes }, { data: comments }] = await Promise.all([
      supabase.from("journal_likes").select("journal_id, user_id").in("journal_id", journalIds),
      supabase.from("journal_comments").select("journal_id").in("journal_id", journalIds),
    ]);

    const likeCounts = new Map<string, number>();
    const userLikes = new Set<string>();
    (likes || []).forEach((l: any) => {
      likeCounts.set(l.journal_id, (likeCounts.get(l.journal_id) || 0) + 1);
      if (l.user_id === user.id) userLikes.add(l.journal_id);
    });

    const commentCounts = new Map<string, number>();
    (comments || []).forEach((c: any) => {
      commentCounts.set(c.journal_id, (commentCounts.get(c.journal_id) || 0) + 1);
    });

    return (data as any[]).map((j) => ({
      ...j,
      profile,
      like_count: likeCounts.get(j.id) || 0,
      comment_count: commentCounts.get(j.id) || 0,
      is_liked: userLikes.has(j.id),
    })) as HikingJournal[];
  }, [user]);

  const fetchUserJournals = useCallback(async (userId: string): Promise<HikingJournal[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from("hiking_journals")
      .select("*")
      .eq("user_id", userId)
      .order("hiked_at", { ascending: false });
    return (data as any[] || []) as HikingJournal[];
  }, [user]);

  const fetchFeed = useCallback(async (publicOnly: boolean = false): Promise<HikingJournal[]> => {
    if (!user) return [];
    // Fetch journals (RLS handles visibility)
    let query = supabase
      .from("hiking_journals")
      .select("*")
      .neq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (publicOnly) {
      query = query.eq("visibility", "public");
    }

    const { data: journals } = await query;
    if (!journals || journals.length === 0) return [];

    // Get profiles
    const userIds = [...new Set((journals as any[]).map((j) => j.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    // Get like counts
    const journalIds = (journals as any[]).map((j) => j.id);
    const { data: likes } = await supabase
      .from("journal_likes")
      .select("journal_id, user_id")
      .in("journal_id", journalIds);

    const likeCounts = new Map<string, number>();
    const userLikes = new Set<string>();
    (likes || []).forEach((l: any) => {
      likeCounts.set(l.journal_id, (likeCounts.get(l.journal_id) || 0) + 1);
      if (l.user_id === user.id) userLikes.add(l.journal_id);
    });

    // Get comment counts
    const { data: comments } = await supabase
      .from("journal_comments")
      .select("journal_id")
      .in("journal_id", journalIds);

    const commentCounts = new Map<string, number>();
    (comments || []).forEach((c: any) => {
      commentCounts.set(c.journal_id, (commentCounts.get(c.journal_id) || 0) + 1);
    });

    return (journals as any[]).map((j) => ({
      ...j,
      profile: profileMap.get(j.user_id) || null,
      like_count: likeCounts.get(j.id) || 0,
      comment_count: commentCounts.get(j.id) || 0,
      is_liked: userLikes.has(j.id),
    })) as HikingJournal[];
  }, [user]);

  const createJournal = async (journal: {
    mountain_id: number;
    mountain_ids?: number[];
    course_name?: string;
    course_starting_point?: string;
    course_notes?: string;
    duration?: string;
    difficulty?: string;
    weather?: string;
    notes?: string;
    photos?: string[];
    tagged_friends?: string[];
    visibility?: string;
    hiked_at?: string;
  }) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { data, error } = await supabase
      .from("hiking_journals")
      .insert({ ...journal, user_id: user.id } as any)
      .select()
      .single();
    if (error) {
      console.error("Failed to create journal:", error);
      const { toast } = await import("sonner");
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    }

    // Notify tagged friends
    if (!error && journal.tagged_friends && journal.tagged_friends.length > 0) {
      const notifications = journal.tagged_friends.map((fId) => ({
        user_id: fId,
        plan_id: "00000000-0000-0000-0000-000000000000",
        type: "tag",
        message: "등산 일지에 함께한 친구로 태그되었습니다 🏔️",
      }));
      await supabase.from("plan_notifications").insert(notifications as any);
    }

    // Auto-update challenge progress
    if (!error) {
      try {
        const { useChallenges } = await import("@/hooks/useChallenges");
        // We can't call hooks here, so we do inline progress update
        const { data: userChallenges } = await supabase
          .from("user_challenges")
          .select("*, challenges(*)")
          .eq("user_id", user.id)
          .eq("completed", false);

        if (userChallenges && userChallenges.length > 0) {
          const { data: allJournals } = await supabase
            .from("hiking_journals")
            .select("*")
            .eq("user_id", user.id);

          if (allJournals) {
            const now = new Date();
            const { mountains } = await import("@/data/mountains");

            for (const uc of userChallenges as any[]) {
              const ch = uc.challenges;
              if (!ch) continue;
              let progress = 0;

              switch (ch.goal_type) {
                case "count":
                  progress = allJournals.filter((j: any) => {
                    const d = new Date(j.hiked_at);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length;
                  break;
                case "mountain":
                  progress = new Set(allJournals.map((j: any) => j.mountain_id)).size;
                  break;
                case "elevation": {
                  const ids = new Set(allJournals.map((j: any) => j.mountain_id));
                  progress = mountains.some((m) => ids.has(m.id) && m.height >= ch.goal_value)
                    ? ch.goal_value : 0;
                  break;
                }
                case "group_count":
                  progress = allJournals.filter(
                    (j: any) => j.tagged_friends && j.tagged_friends.length > 0
                  ).length;
                  break;
                case "group_size":
                  progress = allJournals.some(
                    (j: any) => j.tagged_friends && j.tagged_friends.length >= ch.goal_value
                  ) ? ch.goal_value : 0;
                  break;
                case "streak": {
                  const dates = allJournals
                    .map((j: any) => new Date(j.hiked_at).toDateString())
                    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
                    .map((d: string) => new Date(d).getTime())
                    .sort((a: number, b: number) => a - b);
                  let maxS = dates.length > 0 ? 1 : 0, s = 1;
                  for (let i = 1; i < dates.length; i++) {
                    if ((dates[i] - dates[i - 1]) / 86400000 === 1) { s++; maxS = Math.max(maxS, s); }
                    else s = 1;
                  }
                  progress = maxS;
                  break;
                }
                default:
                  continue;
              }

              const completed = progress >= ch.goal_value;
              await supabase
                .from("user_challenges")
                .update({
                  progress,
                  completed,
                  completed_at: completed ? new Date().toISOString() : null,
                } as any)
                .eq("id", uc.id);
            }
          }
        }
      } catch (e) {
        console.error("Challenge progress update failed:", e);
      }
    }

    return { data: data as HikingJournal | null, error };
  };

  const updateJournal = async (id: string, updates: Partial<HikingJournal>) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("hiking_journals")
      .update(updates as any)
      .eq("id", id);
    if (error) {
      console.error("Failed to update journal:", error);
      const { toast } = await import("sonner");
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    }
    return { error };
  };

  const deleteJournal = async (id: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { error } = await supabase
      .from("hiking_journals")
      .delete()
      .eq("id", id);
    return { error };
  };

  const toggleLike = async (journalId: string, isLiked: boolean) => {
    if (!user) return;
    if (isLiked) {
      await supabase
        .from("journal_likes")
        .delete()
        .eq("journal_id", journalId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("journal_likes")
        .insert({ journal_id: journalId, user_id: user.id } as any);
    }
  };

  const fetchComments = async (journalId: string): Promise<JournalComment[]> => {
    const { data: comments } = await supabase
      .from("journal_comments")
      .select("*")
      .eq("journal_id", journalId)
      .order("created_at", { ascending: true });

    if (!comments || comments.length === 0) return [];

    const userIds = [...new Set((comments as any[]).map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    return (comments as any[]).map((c) => ({
      ...c,
      profile: profileMap.get(c.user_id) || null,
    }));
  };

  const addComment = async (journalId: string, content: string) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const { data, error } = await supabase
      .from("journal_comments")
      .insert({ journal_id: journalId, user_id: user.id, content } as any)
      .select()
      .single();
    return { data, error };
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;
    await supabase.from("journal_comments").delete().eq("id", commentId);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const { compressImage } = await import("@/lib/imageUpload");
    const compressed = await compressImage(file, "general");
    if (!compressed) return null;
    const path = `${user.id}/${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("journal-photos")
      .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage
      .from("journal-photos")
      .getPublicUrl(path);
    return publicUrl;
  };

  return {
    fetchMyJournals,
    fetchUserJournals,
    fetchFeed,
    createJournal,
    updateJournal,
    deleteJournal,
    toggleLike,
    fetchComments,
    addComment,
    deleteComment,
    uploadPhoto,
  };
}
