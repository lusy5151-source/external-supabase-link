import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent SW registration in preview/iframe contexts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  // In production: auto-reload when a new SW takes control to avoid stale chunks
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  // Best-effort cleanup of stale workbox precache entries from older builds
  if ("caches" in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (key.startsWith("workbox-precache-") && !key.includes(location.host)) {
          caches.delete(key);
        }
      });
    }).catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
