import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      devOptions: {
        enabled: false,
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        globIgnores: [
          "**/heic2any-*.js",
          "**/html2canvas*.js",
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: "완등",
        short_name: "완등",
        start_url: "/",
        display: "standalone",
        background_color: "#F8FAED",
        theme_color: "#C7D66D",
        orientation: "portrait",
        scope: "/",
        icons: [
          { src: "/placeholder.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/placeholder.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            /node_modules\/(react|react-dom|react-router-dom|@tanstack\/react-query|@tanstack\/query-core)\//.test(id)
          ) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@supabase/")) return "vendor-supabase";
          if (id.includes("node_modules/@capacitor/") || id.includes("node_modules/@capacitor-community/")) {
            return "vendor-capacitor";
          }
          if (
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/cmdk/") ||
            id.includes("node_modules/vaul/")
          ) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/lucide-react/")) return "vendor-icons";
          if (id.includes("node_modules/date-fns/")) return "vendor-date";
          if (id.includes("node_modules/heic2any/")) return "heic2any";
          if (id.includes("node_modules/html2canvas/")) return "html2canvas";
          if (id.includes("node_modules/exifr/")) return "exifr";
          if (id.includes("node_modules/leaflet/")) return "leaflet";
          if (id.includes("node_modules/framer-motion/")) return "framer-motion";
          if (id.includes("node_modules/recharts/")) return "recharts";
        },
      },
    },
  },
}));
