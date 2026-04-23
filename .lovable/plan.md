
목표
- 로그인 페이지에 “Supabase 연결 테스트” 원클릭 버튼을 추가합니다.
- 버튼 클릭 시 현재 연결된 외부 Supabase 설정으로 임시 테스트 계정 인증을 시도하고, 결과를 페이지 내 로그 패널과 토스트로 함께 보여줍니다.
- 실제 이메일 회원가입 장애 원인(현재 확인된 `/signup` 지연/타임아웃)도 테스트 결과에 드러나도록 기록합니다.

구현 범위
1. 로그인 페이지에 테스트 버튼 추가
- `src/pages/AuthPage.tsx`에 별도 테스트 액션 버튼을 추가합니다.
- 일반 로그인/회원가입 폼과 분리해, 실사용 입력값을 건드리지 않는 독립 테스트 흐름으로 만듭니다.
- 버튼은 로딩 중 중복 클릭이 되지 않도록 막습니다.

2. 임시 테스트 계정으로 인증 시도
- 클릭 시 랜덤 이메일(예: `supabase-test-{timestamp}@example.com`)과 임시 비밀번호를 생성합니다.
- 현재 연결된 클라이언트(`@/integrations/supabase/client`)로 다음 순서의 테스트를 수행합니다.
  - 현재 Supabase URL/키 설정 존재 여부 기록
  - `signUp()` 시도
  - 응답의 `user`, `session`, `error`, `emailRedirectTo` 기록
  - 필요 시 `getSession()` / `getUser()` 상태를 추가 기록
- 현재 프로젝트는 이메일 가입에서 `/signup` 504 타임아웃 이력이 있으므로, 이 경우도 실패가 아니라 “Auth 요청은 도달했으나 확인 메일/후처리 단계에서 지연됨”으로 명확히 표시합니다.

3. 결과 로그 패널 추가
- 로그인 페이지 내부에 테스트 결과 패널을 추가합니다.
- 최소한 아래 정보를 순서대로 표시합니다.
  - 테스트 시작 시각
  - 사용한 Supabase URL
  - 테스트 이메일
  - `signUp` 성공/실패 여부
  - `error.message`
  - 세션 존재 여부
  - 사용자 ID / 이메일 / provider 후보
  - 최종 판정: 연결 성공 / 인증 요청 도달 / 이메일 확인 필요 / 타임아웃 / 실패
- 기존 `logClientAuthDebug()` 결과도 함께 반영해 현재 auth 상태를 쉽게 볼 수 있게 합니다.

4. 토스트 요약 메시지 추가
- 테스트 완료 후 토스트로 핵심 결과를 짧게 보여줍니다.
- 예:
  - “Supabase 연결 확인됨. 테스트 가입 요청 성공”
  - “Supabase 연결은 정상이나 이메일 가입 단계에서 타임아웃 발생”
  - “설정 문제 또는 인증 실패”

5. 기존 패턴 재사용
- 현재 프로젝트의 auth 디버깅 방식(`src/lib/authDebug.ts`)을 재사용해 결과 포맷을 맞춥니다.
- 외부 Supabase 연결 제약을 유지하며 `src/integrations/supabase/client.ts`의 URL/Key는 절대 변경하지 않습니다.

수정 대상 파일
- `src/pages/AuthPage.tsx`
- 필요 시 `src/lib/authDebug.ts`

테스트 동작 설계
```text
[Supabase 연결 테스트 버튼 클릭]
  → 임시 이메일/비밀번호 생성
  → signUp()
  → 결과/에러 수집
  → getSession(), getUser(), authDebug 수집
  → 로그 패널 업데이트
  → 토스트 표시
```

완료 기준
- 로그인 페이지에 테스트 버튼이 보임
- 버튼 1회 클릭으로 connected Supabase 설정 기준 인증 시도가 실행됨
- 결과가 페이지 내 로그 패널에 누적 표시됨
- 같은 결과가 토스트로 요약 표시됨
- `/signup` 504, 이메일 확인 필요, 세션 생성 성공, 설정 오류를 서로 구분해 보여줌

기술 세부사항
- 현재 코드베이스는 이미 `supabase.auth.signUp()`과 `logClientAuthDebug()`를 사용하고 있으므로, 별도 테스트용 Edge Function 없이 클라이언트에서 직접 구현하는 것이 가장 단순합니다.
- 현재 외부 Supabase URL은 `https://ylcjlzlchinijvyojdbc.supabase.co`로 고정되어 있으며 변경 대상이 아닙니다.
- 최근 auth 로그상 이메일 가입은 `user_confirmation_requested` 이후 504 타임아웃이 발생한 이력이 있어, 테스트 버튼은 “가입 성공 여부”뿐 아니라 “요청이 Auth까지 도달했는지”까지 함께 보여줘야 원인 파악에 도움이 됩니다.
