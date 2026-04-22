import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { supabase } from "@/integrations/supabase/client";
import "./index.css";

supabase.auth.getSession().then(({ data, error }) => {
  if (error || !data.session) {
    supabase.auth.signOut();
    localStorage.removeItem("supabase.auth.token");
  }
});

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
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
