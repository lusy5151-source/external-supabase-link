import { normalizeImageUrl } from "@/lib/normalizeImageUrl";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users } from "lucide-react";

interface ClubInfo {
  id: string;
  name: string;
  avatar_url: string | null;
  member_count: number;
  is_member: boolean;
}

const db = supabase as any;

export function MountainClubs({ mountainId }: { mountainId: number }) {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<ClubInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      // Find groups that have hiking plans for this mountain
      const { data: plans } = await db
        .from("hiking_plans")
        .select("group_id")
        .eq("mountain_id", mountainId)
        .not("group_id", "is", null);

      if (!plans || plans.length === 0) {
        setLoading(false);
        return;
      }

      const groupIds = [...new Set(plans.map((p: any) => p.group_id))] as string[];

      const { data: groups } = await db
        .from("hiking_group")
        .select("id, name, avatar_url, is_public")
        .in("id", groupIds)
        .eq("is_public", true)
        .limit(3);

      if (!groups || groups.length === 0) {
        setLoading(false);
        return;
      }

      // Get member counts
      const { data: members } = await supabase
        .from("group_members")
        .select("group_id, user_id")
        .in("group_id", groups.map((g: any) => g.id));

      const countMap = new Map<string, number>();
      const userMemberships = new Set<string>();
      (members || []).forEach((m: any) => {
        countMap.set(m.group_id, (countMap.get(m.group_id) || 0) + 1);
        if (user && m.user_id === user.id) userMemberships.add(m.group_id);
      });

      setClubs(
        groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          avatar_url: g.avatar_url,
          member_count: countMap.get(g.id) || 0,
          is_member: userMemberships.has(g.id),
        }))
      );
      setLoading(false);
    }
    fetch();
  }, [mountainId, user]);

  if (loading || clubs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-foreground" style={{ fontSize: 14, fontWeight: 500 }}>
        이 산의 산악회
      </h3>

      <div className="space-y-2">
        {clubs.map((club) => (
          <Link
            key={club.id}
            to={`/groups/${club.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-secondary/30"
          >
            <div
              className="flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold"
              style={{ width: 32, height: 32, fontSize: 13 }}
            >
              {club.avatar_url ? (
                <img src={normalizeImageUrl(club.avatar_url)} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                club.name[0]
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground truncate" style={{ fontSize: 13, fontWeight: 500 }}>
                {club.name}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: 11 }}>
                멤버 {club.member_count}명
              </p>
            </div>
            <button
              className="shrink-0"
              style={{
                fontSize: 12,
                border: "0.5px solid hsl(var(--brand-forest))",
                color: "#3B6D11",
                borderRadius: 20,
                padding: "4px 10px",
                background: "transparent",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {club.is_member ? "보기" : "가입하기"}
            </button>
          </Link>
        ))}
      </div>

      <Link
        to="/social"
        className="block text-center"
        style={{ fontSize: 12, color: "#3B6D11" }}
      >
        전체 산악회 보기 →
      </Link>
    </div>
  );
}
