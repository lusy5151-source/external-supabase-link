import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMountains } from "@/contexts/MountainsContext";
import { Users } from "lucide-react";

interface NearbyClub {
  id: string;
  name: string;
  avatar_url: string | null;
  member_count: number;
  mountain_name: string | null;
}

const db = supabase as any;

export function NearbyClubs() {
  const { mountains } = useMountains();
  const [clubs, setClubs] = useState<NearbyClub[]>([]);
  const [hasLocation, setHasLocation] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        setHasLocation(true);

        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        // Find nearby mountains (within ~30km)
        const nearbyMountains = mountains
          .filter((m) => {
            const dlat = m.lat - userLat;
            const dlng = m.lng - userLng;
            return dlat * dlat + dlng * dlng < 0.09; // ~30km rough
          })
          .slice(0, 20);

        if (nearbyMountains.length === 0) {
          setLoading(false);
          return;
        }

        const nearbyIds = nearbyMountains.map((m) => m.id);

        // Find groups with plans for nearby mountains
        const { data: plans } = await db
          .from("hiking_plans")
          .select("group_id, mountain_id")
          .in("mountain_id", nearbyIds)
          .not("group_id", "is", null);

        if (!plans || plans.length === 0) {
          setLoading(false);
          return;
        }

        const groupMountainMap = new Map<string, number>();
        plans.forEach((p: any) => {
          if (!groupMountainMap.has(p.group_id)) {
            groupMountainMap.set(p.group_id, p.mountain_id);
          }
        });

        const groupIds = [...groupMountainMap.keys()].slice(0, 10);

        const { data: groups } = await db
          .from("hiking_group")
          .select("id, name, avatar_url, is_public")
          .in("id", groupIds)
          .eq("is_public", true)
          .limit(8);

        if (!groups || groups.length === 0) {
          setLoading(false);
          return;
        }

        // Get member counts
        const { data: members } = await supabase
          .from("group_members")
          .select("group_id")
          .in("group_id", groups.map((g: any) => g.id));

        const countMap = new Map<string, number>();
        (members || []).forEach((m: any) => {
          countMap.set(m.group_id, (countMap.get(m.group_id) || 0) + 1);
        });

        if (cancelled) return;

        setClubs(
          groups.map((g: any) => {
            const mtId = groupMountainMap.get(g.id);
            const mt = mtId ? mountains.find((m) => m.id === mtId) : null;
            return {
              id: g.id,
              name: g.name,
              avatar_url: g.avatar_url,
              member_count: countMap.get(g.id) || 0,
              mountain_name: mt?.nameKo || null,
            };
          })
        );
        setLoading(false);
      },
      () => {
        if (!cancelled) {
          setHasLocation(false);
          setLoading(false);
        }
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );

    return () => { cancelled = true; };
  }, [mountains]);

  if (!hasLocation || loading || clubs.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <h3 className="text-foreground" style={{ fontSize: 14, fontWeight: 500 }}>
        내 주변 산악회
      </h3>

      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {clubs.map((club) => (
          <Link
            key={club.id}
            to={`/groups/${club.id}`}
            className="shrink-0 rounded-xl border bg-card"
            style={{
              borderWidth: "0.5px",
              borderColor: "hsl(var(--border))",
              padding: "10px 12px",
              minWidth: 140,
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold"
                style={{ width: 28, height: 28, fontSize: 11 }}
              >
                {club.avatar_url ? (
                  <img src={club.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  club.name[0]
                )}
              </div>
              <p className="text-foreground truncate" style={{ fontSize: 13, fontWeight: 500 }}>
                {club.name}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground" style={{ fontSize: 11 }}>
                {club.member_count}명
              </span>
            </div>
            {club.mountain_name && (
              <span
                className="inline-block mt-1.5 rounded-md bg-primary/5 px-1.5 py-0.5 text-primary"
                style={{ fontSize: 10 }}
              >
                ⛰ {club.mountain_name}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
