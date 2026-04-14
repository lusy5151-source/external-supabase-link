

## 문제 분석

### 1. Google 로그인 문제
현재 `AuthPage.tsx`에서 Google 로그인을 `lovable.auth.signInWithOAuth("google")`로 호출하고 있습니다. 이 프로젝트는 **외부 Supabase**에 연결되어 있으므로 Lovable Cloud Auth 대신 `supabase.auth.signInWithOAuth`를 사용해야 합니다.

### 2. 카카오 로그인 문제
카카오 콜백에서 호출하는 `kakao-auth` Edge Function이 존재하지 않습니다. `supabase/functions/` 디렉토리에 `get-weather`만 있고 `kakao-auth`는 없습니다.

---

## 수정 계획

### Step 1: Google 로그인 수정 (`src/pages/AuthPage.tsx`)
- `lovable.auth.signInWithOAuth("google")` → `supabase.auth.signInWithOAuth({ provider: 'google' })` 로 변경
- `lovable` import 제거
- redirect URL은 published URL(`https://external-spark.lovable.app`)로 설정

### Step 2: `kakao-auth` Edge Function 생성 (`supabase/functions/kakao-auth/index.ts`)
- 카카오 인증 코드를 받아 access token 교환
- 카카오 사용자 정보 조회
- Supabase Admin API로 사용자 생성/로그인 처리 (service_role_key 사용)
- 세션 토큰 반환
- 필요 시크릿: `KAKAO_CLIENT_SECRET` (카카오 앱 시크릿 키) — 없으면 사용자에게 안내

### Step 3: Supabase Google Provider 설정 안내
- Supabase 대시보드에서 Google Auth Provider를 활성화하고 Client ID/Secret을 설정해야 함
- Site URL과 Redirect URL 설정 필요

---

## 사용자 필요 액션
- **Google**: Supabase 대시보드 > Authentication > Providers에서 Google 활성화 및 OAuth 자격증명 설정
- **카카오**: 카카오 앱의 Client Secret이 필요할 수 있음 (현재 REST API Key는 코드에 하드코딩되어 있음)

## 수정 파일
1. `src/pages/AuthPage.tsx` — Google 로그인 방식 변경
2. `supabase/functions/kakao-auth/index.ts` — 신규 생성

