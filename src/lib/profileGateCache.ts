export type ProfileGateData = {
  is_onboarded: boolean | null;
  character_id: string | null;
  character_selected_at: string | null;
};

const PROFILE_GATE_CACHE_TTL = 24 * 60 * 60 * 1000;

export function readProfileGateCache(userId: string): ProfileGateData | "missing" | null {
  try {
    const raw = localStorage.getItem(`wandeung_profile_gate:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; value: ProfileGateData | "missing" };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > PROFILE_GATE_CACHE_TTL) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeProfileGateCache(userId: string, value: ProfileGateData | "missing") {
  try {
    localStorage.setItem(`wandeung_profile_gate:${userId}`, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {}
}
