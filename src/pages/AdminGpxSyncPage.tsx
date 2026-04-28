import { useEffect, useMemo, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const ADMIN_EMAIL = "wandeung1@gmail.com";
const VWORLD_KEY = "F41DD5DC-6774-33EA-8E02-68505ADAF394";
const VWORLD_DOMAIN = "https://wandeung.com";

type MountainRow = {
  id: number;
  name_ko: string | null;
  name: string | null;
  region: string | null;
  is_bac100: boolean | null;
  lat: number | null;
  lng: number | null;
  trails_total: number;
  trails_with_geom: number;
  last_sync: string | null;
};

type TrailRow = {
  id: string;
  name: string;
  mountain_id: number;
  geometry: any;
};

type LogEntry = {
  status: "success" | "no_match" | "no_result" | "error" | "info";
  message: string;
};

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const x = a.toLowerCase().replace(/\s+/g, "");
  const y = b.toLowerCase().replace(/\s+/g, "");
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.8;
  // simple char overlap
  const set = new Set(x);
  let common = 0;
  for (const c of y) if (set.has(c)) common++;
  return common / Math.max(x.length, y.length);
}

function lineLength(coords: number[][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

async function fetchVworldFeatures(lat: number, lng: number): Promise<any[]> {
  const minLng = lng - 0.03;
  const maxLng = lng + 0.03;
  const minLat = lat - 0.03;
  const maxLat = lat + 0.03;
  const url =
    `https://api.vworld.kr/req/wfs?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0` +
    `&TYPENAME=lt_l_frtrk&SRSNAME=EPSG:4326&OUTPUT=application/json` +
    `&BBOX=${minLng},${minLat},${maxLng},${maxLat},EPSG:4326` +
    `&KEY=${VWORLD_KEY}&DOMAIN=${encodeURIComponent(VWORLD_DOMAIN)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json?.features ?? [];
}

export default function AdminGpxSyncPage() {
  const { user, loading: authLoading } = useAuth();
  const [mountains, setMountains] = useState<MountainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyBac100, setOnlyBac100] = useState(true);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const stopRef = useRef(false);

  if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
    return <Navigate to="/" replace />;
  }

  const loadMountains = async () => {
    setLoading(true);
    const { data: mts } = await (supabase as any)
      .from("mountains")
      .select("id, name, name_ko, region, is_bac100, lat, lng")
      .order("is_bac100", { ascending: false })
      .order("name_ko", { ascending: true })
      .limit(2000);

    const { data: trails } = await (supabase as any)
      .from("trails")
      .select("id, mountain_id, geometry, gpx_synced_at")
      .limit(10000);

    const trailsByMountain = new Map<number, { total: number; withGeom: number; lastSync: string | null }>();
    for (const t of trails ?? []) {
      const entry = trailsByMountain.get(t.mountain_id) ?? { total: 0, withGeom: 0, lastSync: null };
      entry.total += 1;
      if (t.geometry) entry.withGeom += 1;
      if (t.gpx_synced_at && (!entry.lastSync || t.gpx_synced_at > entry.lastSync)) {
        entry.lastSync = t.gpx_synced_at;
      }
      trailsByMountain.set(t.mountain_id, entry);
    }

    const rows: MountainRow[] = (mts ?? []).map((m: any) => {
      const stats = trailsByMountain.get(m.id) ?? { total: 0, withGeom: 0, lastSync: null };
      return {
        id: m.id,
        name: m.name,
        name_ko: m.name_ko,
        region: m.region,
        is_bac100: m.is_bac100,
        lat: m.lat,
        lng: m.lng,
        trails_total: stats.total,
        trails_with_geom: stats.withGeom,
        last_sync: stats.lastSync,
      };
    });
    setMountains(rows);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) loadMountains();
  }, [user]);

  const filtered = useMemo(() => {
    return mountains.filter((m) => {
      if (onlyBac100 && !m.is_bac100) return false;
      if (onlyMissing && m.trails_total > 0 && m.trails_with_geom >= m.trails_total) return false;
      if (m.trails_total === 0) return false;
      return true;
    });
  }, [mountains, onlyBac100, onlyMissing]);

  const stats = useMemo(() => {
    let total = 0;
    let withGeom = 0;
    for (const m of mountains) {
      total += m.trails_total;
      withGeom += m.trails_with_geom;
    }
    return {
      total,
      withGeom,
      missing: total - withGeom,
      pct: total === 0 ? 0 : Math.round((withGeom / total) * 100),
    };
  }, [mountains]);

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filtered.map((m) => m.id)));
    else setSelected(new Set());
  };

  const toggleOne = (id: number, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const addLog = (entry: LogEntry) => setLogs((prev) => [entry, ...prev].slice(0, 500));

  const runSync = async (mountainList: MountainRow[]) => {
    setSyncing(true);
    stopRef.current = false;
    setLogs([]);
    let summary = { processed: 0, success: 0, no_match: 0, no_result: 0, error: 0 };

    // Load all trails for these mountains
    const ids = mountainList.map((m) => m.id);
    const { data: trails } = await (supabase as any)
      .from("trails")
      .select("id, name, mountain_id, geometry")
      .in("mountain_id", ids);

    const targets: TrailRow[] = (trails ?? []).filter((t: TrailRow) => onlyMissing ? !t.geometry : true);
    setProgress({ current: 0, total: targets.length });

    // Group features by mountain to avoid repeat API calls
    const featureCache = new Map<number, any[] | null>();

    for (let i = 0; i < targets.length; i++) {
      if (stopRef.current) {
        addLog({ status: "info", message: "⏹ 중단됨" });
        break;
      }
      const trail = targets[i];
      const mountain = mountainList.find((m) => m.id === trail.mountain_id);
      const mtName = mountain?.name_ko || mountain?.name || `#${trail.mountain_id}`;
      summary.processed++;
      setProgress({ current: i + 1, total: targets.length });

      if (!mountain || mountain.lat == null || mountain.lng == null) {
        addLog({ status: "error", message: `❌ ${mtName} - ${trail.name} (좌표 없음)` });
        summary.error++;
        continue;
      }

      try {
        let features = featureCache.get(mountain.id);
        if (features === undefined) {
          features = await fetchVworldFeatures(mountain.lat, mountain.lng);
          featureCache.set(mountain.id, features);
          await new Promise((r) => setTimeout(r, 500));
        }

        if (!features || features.length === 0) {
          addLog({ status: "no_result", message: `⚠️ ${mtName} - ${trail.name} (VWorld 결과 없음)` });
          summary.no_result++;
          await (supabase as any).from("gpx_sync_log").insert({
            trail_id: trail.id,
            mountain_id: trail.mountain_id,
            source: "vworld",
            status: "no_result",
          });
          continue;
        }

        // Find best match by name
        const lineFeatures = features.filter(
          (f: any) => f.geometry?.type === "LineString" && Array.isArray(f.geometry.coordinates)
        );
        if (lineFeatures.length === 0) {
          addLog({ status: "no_match", message: `⚠️ ${mtName} - ${trail.name} (LineString 없음)` });
          summary.no_match++;
          continue;
        }

        let best: any = null;
        let bestScore = 0;
        for (const f of lineFeatures) {
          const props = f.properties || {};
          const candidates = [props.frtrk_nm, props.name, props.FRTRK_NM, props.NAME].filter(Boolean);
          for (const c of candidates) {
            const s = similarity(trail.name, String(c));
            if (s > bestScore) {
              bestScore = s;
              best = f;
            }
          }
        }

        if (!best || bestScore < 0.4) {
          // fallback: longest line
          best = lineFeatures.reduce((a: any, b: any) =>
            lineLength(a.geometry.coordinates) >= lineLength(b.geometry.coordinates) ? a : b
          );
        }

        const pointCount = best.geometry.coordinates.length;
        const { error: updErr } = await (supabase as any)
          .from("trails")
          .update({
            geometry: best.geometry,
            gpx_source: "vworld",
            gpx_quality: "official",
            gpx_point_count: pointCount,
            gpx_synced_at: new Date().toISOString(),
          })
          .eq("id", trail.id);

        if (updErr) throw updErr;

        await (supabase as any).from("gpx_sync_log").insert({
          trail_id: trail.id,
          mountain_id: trail.mountain_id,
          source: "vworld",
          status: "success",
          point_count: pointCount,
        });

        addLog({ status: "success", message: `✅ ${mtName} - ${trail.name} (${pointCount} points)` });
        summary.success++;
      } catch (err: any) {
        const msg = err?.message || String(err);
        addLog({ status: "error", message: `❌ ${mtName} - ${trail.name} (${msg})` });
        summary.error++;
        await (supabase as any).from("gpx_sync_log").insert({
          trail_id: trail.id,
          mountain_id: trail.mountain_id,
          source: "vworld",
          status: "error",
          error_message: msg,
        });
      }
    }

    setSyncing(false);
    addLog({
      status: "info",
      message: `📊 완료 - 처리:${summary.processed} 성공:${summary.success} 결과없음:${summary.no_result} 매칭실패:${summary.no_match} 에러:${summary.error}`,
    });
    toast.success(`동기화 완료: ${summary.success}/${summary.processed} 성공`);
    await loadMountains();
  };

  const handleSyncSelected = () => {
    const list = filtered.filter((m) => selected.has(m.id));
    if (list.length === 0) {
      toast.error("선택된 산이 없습니다");
      return;
    }
    runSync(list);
  };

  const handleSyncAll = () => {
    runSync(filtered);
  };

  if (authLoading) return <div className="p-8">로딩 중...</div>;

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GPX 데이터 동기화 (VWorld)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          VWorld WFS API를 통해 등산로 geometry를 브라우저에서 직접 동기화합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">전체 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">전체 trails</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">geometry 있음</div>
              <div className="text-2xl font-bold text-primary">{stats.withGeom}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">geometry 없음</div>
              <div className="text-2xl font-bold text-destructive">{stats.missing}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">진행률</div>
              <div className="text-2xl font-bold">{stats.pct}%</div>
              <Progress value={stats.pct} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">필터 & 동기화</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyBac100} onCheckedChange={(c) => setOnlyBac100(!!c)} />
              100대 명산만
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyMissing} onCheckedChange={(c) => setOnlyMissing(!!c)} />
              geometry 없는 것만
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSyncSelected} disabled={syncing || selected.size === 0}>
              선택된 산만 동기화 ({selected.size})
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={syncing}>
                  전체 일괄 동기화 (느림)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>전체 일괄 동기화</AlertDialogTitle>
                  <AlertDialogDescription>
                    필터에 매칭되는 모든 산({filtered.length}개)의 trails를 동기화합니다.
                    오랜 시간이 걸릴 수 있습니다. 계속하시겠습니까?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSyncAll}>실행</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {syncing && (
              <Button variant="destructive" onClick={() => (stopRef.current = true)}>
                중단
              </Button>
            )}
          </div>

          {syncing && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                진행: {progress.current} / {progress.total}
              </div>
              <Progress value={progress.total === 0 ? 0 : (progress.current / progress.total) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">실행 로그</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-md p-3 max-h-80 overflow-auto font-mono text-xs space-y-1">
              {logs.map((l, i) => (
                <div key={i}>{l.message}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">산 목록 ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">로딩 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filtered.length > 0 && filtered.every((m) => selected.has(m.id))}
                        onCheckedChange={(c) => toggleAll(!!c)}
                      />
                    </TableHead>
                    <TableHead>산 이름</TableHead>
                    <TableHead>지역</TableHead>
                    <TableHead>100대</TableHead>
                    <TableHead className="text-right">trails</TableHead>
                    <TableHead className="text-right">geom 있음</TableHead>
                    <TableHead>마지막 sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(m.id)}
                          onCheckedChange={(c) => toggleOne(m.id, !!c)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{m.name_ko || m.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.region || "-"}</TableCell>
                      <TableCell>{m.is_bac100 ? "✓" : ""}</TableCell>
                      <TableCell className="text-right">{m.trails_total}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            m.trails_with_geom === m.trails_total
                              ? "text-primary"
                              : m.trails_with_geom === 0
                              ? "text-destructive"
                              : ""
                          }
                        >
                          {m.trails_with_geom}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.last_sync ? new Date(m.last_sync).toLocaleString("ko-KR") : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
