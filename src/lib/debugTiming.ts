// Lightweight debug timing utility.
// Logs are emitted only when `localStorage.wandeung_debug === "1"`.
// Never log full user ids, access_tokens, refresh_tokens, or passwords.

const isEnabled = (): boolean => {
  try {
    return typeof window !== "undefined" && localStorage.getItem("wandeung_debug") === "1";
  } catch {
    return false;
  }
};

export const shortId = (id?: string | null): string => {
  if (!id) return "anon";
  return id.slice(0, 8);
};

const activeLabels = new Set<string>();

export function timeStart(label: string, meta?: Record<string, unknown>) {
  if (!isEnabled()) return;
  // Avoid duplicate label warnings
  const key = label;
  if (activeLabels.has(key)) return;
  activeLabels.add(key);
  try {
    // eslint-disable-next-line no-console
    console.time(`[wandeung] ${label}`);
    if (meta) {
      // eslint-disable-next-line no-console
      console.log(`[wandeung] ${label} :start`, meta);
    }
  } catch {
    /* ignore */
  }
}

export function timeEnd(label: string, meta?: Record<string, unknown>) {
  if (!isEnabled()) return;
  const key = label;
  if (!activeLabels.has(key)) return;
  activeLabels.delete(key);
  try {
    // eslint-disable-next-line no-console
    console.timeEnd(`[wandeung] ${label}`);
    if (meta) {
      // eslint-disable-next-line no-console
      console.log(`[wandeung] ${label} :end`, meta);
    }
  } catch {
    /* ignore */
  }
}

export async function withTiming<T>(label: string, fn: () => Promise<T>, meta?: Record<string, unknown>): Promise<T> {
  timeStart(label, meta);
  try {
    return await fn();
  } finally {
    timeEnd(label);
  }
}
