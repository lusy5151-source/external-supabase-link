import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { JournalCard } from "@/components/JournalCard";
import type { HikingJournal } from "@/hooks/useHikingJournals";
import { ArrowLeft, Mountain } from "lucide-react";

export default function JournalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [journal, setJournal] = useState<HikingJournal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("hiking_journals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const [{ data: profile }, { data: likes }, { data: comments }] = await Promise.all([
      supabase.from("public_profiles).select("user_id, nickname, avatar_url").eq("user_id", (data as any).user_id).maybeSingle(),
      supabase.from("journal_likes").select("user_id").eq("journal_id", id),
      supabase.from("journal_comments").select("id").eq("journal_id", id),
    ]);

    setJournal({
      ...(data as any),
      profile: profile ? { nickname: (profile as any).nickname, avatar_url: (profile as any).avatar_url } : undefined,
      like_count: (likes || []).length,
      comment_count: (comments || []).length,
      is_liked: user ? (likes || []).some((l: any) => l.user_id === user.id) : false,
    });
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, user?.id]);

  return (
    <div className="-mx-4 -mt-6 pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary transition-colors"
          aria-label="뒤로"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-base font-bold text-foreground">등산 일지</h1>
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">불러오는 중...</div>
        ) : notFound || !journal ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Mountain className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">일지를 찾을 수 없습니다</p>
          </div>
        ) : (
          <JournalCard journal={journal} showAuthor onRefresh={load} />
        )}
      </div>
    </div>
  );
}
