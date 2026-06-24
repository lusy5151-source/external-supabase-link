import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mountain as MountainIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  mountainId: number;
  compact?: boolean;
}

interface Row {
  id: number;
  name: string | null;
  name_ko: string | null;
  height: number | null;
  region: string | null;
  image_url: string | null;
}

const cache = new Map<number, Row>();

const MountainRefCard = ({ mountainId, compact }: Props) => {
  const [m, setM] = useState<Row | null>(cache.get(mountainId) || null);

  useEffect(() => {
    if (m) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("mountains")
        .select("id,name,name_ko,height,region,image_url")
        .eq("id", mountainId)
        .maybeSingle();
      if (data) { cache.set(mountainId, data); if (alive) setM(data); }
    })();
    return () => { alive = false; };
  }, [mountainId, m]);

  const name = m?.name_ko || m?.name || "산 정보";

  if (compact) {
    return (
      <Link
        to={`/mountains/${mountainId}`}
        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 12, background: "#EAF3DE", color: "#3B6D11", fontSize: 12, fontWeight: 500, textDecoration: "none", margin: "0 2px", verticalAlign: "baseline" }}
      >
        <MountainIcon style={{ width: 12, height: 12 }} />
        {name}
      </Link>
    );
  }

  return (
    <Link
      to={`/mountains/${mountainId}`}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: "#F7F6E4", border: "0.5px solid #EAE7DD", textDecoration: "none", color: "inherit", margin: "12px 0" }}
    >
      <div style={{ width: 56, height: 56, borderRadius: 8, background: "#EAF3DE", overflow: "hidden", flexShrink: 0 }}>
        {m?.image_url ? (
          <img src={m.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <MountainIcon style={{ width: 24, height: 24, color: "#639922" }} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>{name}</div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
          {m?.region ? `${m.region} · ` : ""}{m?.height ? `${m.height}m` : ""}
        </div>
        <div style={{ fontSize: 10, color: "#639922", marginTop: 4, fontWeight: 600 }}>산 정보 보기 →</div>
      </div>
    </Link>
  );
};

export default MountainRefCard;
