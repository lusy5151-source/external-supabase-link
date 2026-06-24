import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { useMountainsData } from "@/hooks/useMountainsData";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (m: { id: number; name: string; height: number; image_url?: string | null; region?: string }) => void;
}

const MountainPickerModal = ({ open, onClose, onSelect }: Props) => {
  const { data: mountains = [] } = useMountainsData();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return mountains.slice(0, 50);
    const k = q.trim().toLowerCase();
    return mountains
      .filter((m) => (m.nameKo || m.name || "").toLowerCase().includes(k) || (m.region || "").toLowerCase().includes(k))
      .slice(0, 100);
  }, [q, mountains]);

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "hsl(var(--background))", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "0.5px solid hsl(var(--border))" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>산 정보 선택</h3>
          <button onClick={onClose}><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ padding: 12, borderBottom: "0.5px solid hsl(var(--border))" }}>
          <div style={{ position: "relative" }}>
            <Search style={{ width: 14, height: 14, position: "absolute", left: 10, top: 11, color: "#888" }} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="산 이름으로 검색"
              style={{ width: "100%", border: "0.5px solid #EAE7DD", borderRadius: 8, padding: "8px 12px 8px 30px", fontSize: 14, background: "transparent", color: "hsl(var(--foreground))" }}
            />
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => { onSelect({ id: m.id, name: m.nameKo || m.name, height: m.height, image_url: m.image_url, region: m.region }); onClose(); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", borderBottom: "0.5px solid #F0EFE6", textAlign: "left" }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 6, background: "#EAF3DE", overflow: "hidden", flexShrink: 0 }}>
                {m.image_url && <img src={m.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground))" }}>{m.nameKo || m.name}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{m.region} · {m.height}m</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", padding: 24, fontSize: 12, color: "#888" }}>검색 결과가 없어요</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MountainPickerModal;
