export function runAfterStartup(
  callback: () => void,
  delayMs = 800,
  timeoutMs = 4000
) {
  let idleId: number | null = null;
  let cancelled = false;
  const timerId = window.setTimeout(() => {
    if (cancelled) return;
    const requestIdle = window.requestIdleCallback;
    if (typeof requestIdle === "function") {
      idleId = requestIdle(() => {
        if (!cancelled) callback();
      }, { timeout: timeoutMs });
      return;
    }
    callback();
  }, delayMs);

  return () => {
    cancelled = true;
    window.clearTimeout(timerId);
    if (idleId != null && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(idleId);
    }
  };
}
