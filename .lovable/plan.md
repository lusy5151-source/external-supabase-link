

# Plan: Copy Wandeung (peak-tracker-korea) Code to This Project

## Summary
The source project [Wandeung](/projects/46e599f8-67ab-4959-95c8-5f766c10bc71) is a full-featured Korean hiking tracker app with 33 pages, 40+ components, 29 hooks, contexts, data files, edge functions, and PWA support. I'll copy all code from that project into this one while keeping the current Supabase connection (`ylcjlzlchinijvyojdbc`).

## What Will Be Done

### 1. Update Configuration Files
- **package.json**: Add missing dependencies (leaflet, react-leaflet, heic2any, html2canvas, browser-image-compression, vite-plugin-pwa, recharts, @tailwindcss/typography, etc.)
- **vite.config.ts**: Add PWA plugin configuration
- **tailwind.config.ts**: Add custom colors (nature, sky, earth, coral, etc.), fonts, animations
- **index.html**: Update meta tags, PWA manifest link, title to "완등"
- **tsconfig files**: Keep as-is (compatible)

### 2. Replace Core Source Files
- **src/App.tsx**: Replace with full routing (33 routes), providers (Auth, Store, Onboarding), lazy loading, error boundaries, splash screen
- **src/main.tsx**: Add service worker handling for preview environments
- **src/index.css**: Replace with full theme variables (nature/sky/earth colors, Noto Sans KR font)
- **src/App.css**: Copy over

### 3. Copy All Source Directories (~120+ files)
- **src/pages/** (33 files): Dashboard, AuthPage, MountainList, MountainDetail, Records, MapView, SocialPage, PlansPage, ChallengePage, etc.
- **src/components/** (40 files): Layout, SplashScreen, ErrorBoundary, JournalForm, WeatherCard, HikingShareCard, etc.
- **src/components/ui/** (48 files): Keep existing shadcn components, update if source has changes
- **src/hooks/** (29 files): useProfile, useMountainStore, useHikingJournals, useChallenges, useWeather, etc.
- **src/contexts/** (2 files): AuthContext, OnboardingContext
- **src/context/** (1 file): StoreContext
- **src/config/** (1 file): apiKeys.ts
- **src/data/** (5 files): mountains, badges, mock data
- **src/lib/** (3 files): utils, imageUpload, supabaseErrorHandler
- **src/integrations/lovable/** (1 file): index.ts

### 4. Copy Public Assets
- PWA icons (icon-192x192.png, icon-512x512.png)
- manifest.json
- .well-known/assetlinks.json
- favicon.ico

### 5. Copy Demo Assets
- src/assets/demo/ (5 hiking images)

### 6. Copy Edge Functions (8 functions)
- kakao-auth, get-weather, nearby-places, verify-summit-photo, sync-profile, plan-reminders, process-email-queue, auth-email-hook
- Plus _shared directory

### 7. Preserve Supabase Connection
- **src/integrations/supabase/client.ts**: Keep current project's URL and anon key (`ylcjlzlchinijvyojdbc`)
- **src/integrations/supabase/types.ts**: Keep current project's types (same DB)
- **.env**: Keep current values
- **supabase/config.toml**: Keep current project ref

### 8. Skip Migration Files
- Migrations are already applied to the connected Supabase DB, so no need to copy them

## Technical Notes
- This is a large operation (~120+ files to create/update)
- The Supabase client and types will NOT be overwritten to maintain the current connection
- Edge functions will be copied and auto-deployed
- PWA configuration points to wandeung.com as start_url

