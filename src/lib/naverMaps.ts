import { useEffect, useState } from "react";

const SCRIPT_ID = "naver-maps-sdk";
const SRC =
  "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=e35ks3exhv&submodules=geocoder";

let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    naver?: any;
    navermap_authFailure?: () => void;
  }
}

/**
 * Dynamically load the Naver Maps SDK on demand.
 * - No-op if already loaded.
 * - De-duplicates concurrent calls.
 * - Uses async script tag (no document.write blocking).
 */
export function loadNaverMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.naver?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  // Register auth-failure handler once
  if (!window.navermap_authFailure) {
    window.navermap_authFailure = function () {
      // eslint-disable-next-line no-console
      console.error("[Naver Maps] Authentication failed.", {
        currentOrigin: window.location.origin,
      });
    };
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.naver?.maps) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Naver Maps load error")));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Naver Maps SDK"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * React hook: triggers on-demand SDK load and returns readiness flag.
 * Failures do not throw — they leave `ready` as false so the host UI can degrade gracefully.
 */
export function useNaverMaps(): boolean {
  const [ready, setReady] = useState<boolean>(() => !!window.naver?.maps);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    loadNaverMaps()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[Naver Maps] SDK load failed:", err?.message || err);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return ready;
}
