
목표
- 카카오 로그인이 다시 동작하지 않는 원인을 현재 코드와 설정 기준으로 정확히 정리하고, 로그인 흐름을 안정적으로 복구합니다.
- 프론트엔드에서 잘못된 환경변수 사용을 정리하고, Edge Function의 세션 발급 방식을 Supabase에 맞는 안전한 흐름으로 교체합니다.

문제 진단
1. 클라이언트에서 잘못된 Supabase 키 이름을 사용하고 있습니다.
   - `src/pages/KakaoCallback.tsx`는 `import.meta.env.VITE_SUPABASE_ANON_KEY`를 참조합니다.
   - 이 프로젝트에 실제로 제공되는 값은 `VITE_SUPABASE_PUBLISHABLE_KEY`이며, 코드베이스와 연결 정보도 이 이름을 기준으로 동작합니다.
   - 결과적으로 카카오 콜백에서 Edge Function 호출 시 `apikey` 헤더가 비어 있을 가능성이 높습니다.

2. 카카오 로그인 시작 코드가 환경변수 누락에 취약합니다.
   - `src/pages/AuthPage.tsx`는 `VITE_KAKAO_API_KEY`를 사용하지만, 현재 제공된 환경 정보에는 이 값이 보이지 않습니다.
   - 카카오 JavaScript 키가 아니라 REST API 키를 공개 클라이언트에 넣는 구조도 관리가 불안정합니다.
   - 키가 비어 있으면 인가 요청 URL 자체가 잘못되어 로그인 시작 단계부터 실패할 수 있습니다.

3. Edge Function의 세션 생성 방식이 취약합니다.
   - `supabase/functions/kakao-auth/index.ts`는 `auth.admin.generateLink({ type: "magiclink" })` 후 `verifyOtp()`로 세션을 만들고 있습니다.
   - 이 방식은 OAuth 소셜 로그인 세션 처리 용도로는 우회적이며, Supabase Auth 정책/메일 OTP 동작과 충돌할 수 있습니다.
   - 특히 `hashed_token` 기반 검증은 안정성이 낮고, 향후 Supabase 동작 변경에도 취약합니다.

4. 사용자 조회 방식도 비효율적입니다.
   - 현재는 `listUsers()`로 전체 유저를 가져와 email/kakao_id를 탐색합니다.
   - 데이터가 늘어나면 성능과 안정성 모두 나빠집니다.

구현 계획
1. 카카오 로그인 시작부 정리
   - `src/pages/AuthPage.tsx`에서 카카오 로그인 URL 생성 로직을 점검합니다.
   - `API_KEYS.kakao`가 비어 있을 때 즉시 사용자에게 설정 오류 메시지를 보여주도록 방어 로직을 추가합니다.
   - 공개 클라이언트에서 사용하는 키 이름을 프로젝트 실제 환경과 일치하도록 정리합니다.
   - 필요 시 `src/config/apiKeys.ts`를 수정해 카카오 클라이언트용 공개 키 참조 방식을 명확히 맞춥니다.

2. 카카오 콜백 페이지 안정화
   - `src/pages/KakaoCallback.tsx`에서 Edge Function 호출 헤더의 `apikey`를 실제 프로젝트 키(`VITE_SUPABASE_PUBLISHABLE_KEY`) 기준으로 수정합니다.
   - 응답 파싱 전에 `response.ok`와 JSON 에러 구조를 더 엄격하게 검증합니다.
   - 세션 설정 성공 시 `navigate("/", { replace: true })`로 정리해 히스토리 오염을 줄입니다.
   - 에러 상황별 메시지를 분리해 “인가 코드 없음”, “토큰 교환 실패”, “세션 생성 실패”를 구분합니다.

3. Edge Function 재구성
   - `supabase/functions/kakao-auth/index.ts`를 카카오 토큰 교환과 사용자 식별까지는 유지하되, 세션 발급 부분을 재설계합니다.
   - 현재의 `generateLink + verifyOtp` 흐름을 제거하고, Supabase에서 지원되는 더 직접적이고 안정적인 사용자 연결 방식으로 바꿉니다.
   - 구현 시 아래를 함께 정리합니다:
     - 입력값 검증 추가 (`code`, `redirect_uri`)
     - Kakao API 응답 실패 시 상세 에러 반환
     - `listUsers()` 전수 탐색 최소화
     - 모든 응답에 일관된 CORS 헤더 유지

4. 사용자 프로필 동기화 영향 점검
   - 카카오로 신규 가입/기존 로그인 시 `handle_new_auth_user`와 현재 프로필 구조가 정상적으로 이어지는지 확인합니다.
   - `provider`, `full_name`, `avatar_url` 메타데이터 형식이 기존 Google/이메일 흐름과 충돌하지 않도록 맞춥니다.

5. 라우팅 및 인증 흐름 검증
   - `/auth` → 카카오 시작 → `/kakao/callback?code=...` → 세션 저장 → `/` 이동 흐름으로 검증합니다.
   - 로그인 실패 시 `/auth`로 되돌아가되, 다시 카카오 로그인을 자동 시작하는 루프가 없는지 확인합니다.
   - 기존 Google 콜백(`/auth/callback`)과 충돌하지 않는지도 함께 점검합니다.

6. 운영 설정 확인 항목 정리
   - 코드 수정과 별개로, 실제 카카오 개발자 콘솔 설정값도 함께 맞춰야 합니다.
   - 확인할 항목:
     - 카카오 Redirect URI에 `https://www.wandeung.com/kakao/callback`
     - `https://wandeung.com/kakao/callback`
     - 필요 시 현재 preview URL의 `/kakao/callback`
     - Edge Function secret `KAKAO_REST_API_KEY`가 최신 REST API 키인지
   - preview에서만 실패하고 published/custom domain에서 성공한다면, 환경별 리다이렉트 등록 누락 가능성을 우선 확인합니다.

수정 대상 파일
- `src/config/apiKeys.ts`
- `src/pages/AuthPage.tsx`
- `src/pages/KakaoCallback.tsx`
- `supabase/functions/kakao-auth/index.ts`

완료 기준
- 카카오 로그인 버튼 클릭 시 정상적으로 카카오 인가 화면으로 이동
- `/kakao/callback`에서 `code`를 받아 Edge Function 호출 성공
- 세션이 생성되고 앱에 로그인 상태가 반영됨
- 최종적으로 홈(`/`)으로 이동
- 실패 시에도 재시도 가능한 상태로 `/auth`에 복귀하고 무한 루프가 없음

기술 세부사항
- 현재 가장 의심되는 1차 원인은 `VITE_SUPABASE_ANON_KEY` 사용입니다. 이 프로젝트는 `VITE_SUPABASE_PUBLISHABLE_KEY` 기준으로 연결되어 있습니다.
- 현재 Edge Function의 `generateLink`/`verifyOtp` 방식은 소셜 로그인 세션 생성 방식으로 부적절할 가능성이 높아, 로그인 불안정의 핵심 원인 후보입니다.
- CORS 자체는 현재 함수 코드상 큰 문제는 없어 보이므로, 우선순위는 키 정합성 및 세션 발급 로직 교체입니다.
