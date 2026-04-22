
목표
- `/kakao/callback` 페이지의 현재 코드를 확인하고, 카카오 리다이렉트 시 `code` 파라미터를 추출해 `kakao-auth` Edge Function에 전달하는지 검증합니다.
- 현재 구현이 이미 요구사항을 충족하는지 판단하고, 필요할 경우 적용할 수정 범위를 정리합니다.

현재 `/kakao/callback` 핵심 코드
```tsx
const handleKakaoLogin = async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const errorParam = params.get("error");

  if (errorParam) {
    setError("카카오 로그인이 취소되었습니다.");
    setTimeout(() => navigate("/auth"), 2000);
    return;
  }

  if (!code) {
    setError("인증 코드가 없습니다.");
    setTimeout(() => navigate("/auth"), 2000);
    return;
  }

  const redirectUri = `${window.location.origin}/kakao/callback`;

  const { data, error: fnError } = await supabase.functions.invoke("kakao-auth", {
    body: { code, redirect_uri: redirectUri },
  });

  if (data?.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    navigate("/");
  }
};
```

검증 결과
- `/kakao/callback` 페이지는 이미 존재합니다.
  - 파일: `src/pages/KakaoCallback.tsx`
  - 라우트 등록: `src/App.tsx`의 `path="/kakao/callback"`
- URL에서 `code` 파라미터를 추출하고 있습니다.
  - 현재 코드: `const code = params.get("code")`
  - 사용 방식은 요청하신 `new URLSearchParams(window.location.search).get('code')`와 동일합니다.
- `kakao-auth` Edge Function에 `code`와 `redirect_uri`를 전달하고 있습니다.
  - 현재 코드: `body: { code, redirect_uri: \`${window.location.origin}/kakao/callback\` }`
- 응답의 `session`으로 Supabase 세션을 설정하고 있습니다.
  - 현재 코드: `await supabase.auth.setSession(...)`
- 세션 설정 후 홈(`/`)으로 이동하고 있습니다.
  - 현재 코드: `navigate("/")`

판단
- 현재 `/kakao/callback` 구현은 요청하신 로그인 흐름의 핵심 요구사항을 이미 충족합니다.
- 즉, “코드가 없거나 잘못된 상태”는 아닙니다.
- 차이점은 한 가지입니다:
  - 현재는 `fetch(${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kakao-auth, ...)` 대신
  - `supabase.functions.invoke("kakao-auth", ...)`를 사용하고 있습니다.
- 이 방식은 이 프로젝트 스택에서는 정상적이고 권장되는 호출 방식입니다. 기능상으로는 동일한 목적을 수행합니다.

추가로 확인된 서버측 토큰 교환 흐름
- `supabase/functions/kakao-auth/index.ts`에서 다음 흐름이 구현되어 있습니다.
  1. 요청 body에서 `code`, `redirect_uri` 수신
  2. `https://kauth.kakao.com/oauth/token`으로 authorization code 교환
  3. `https://kapi.kakao.com/v2/user/me`로 사용자 정보 조회
  4. Supabase 사용자 생성/갱신
  5. 세션 생성 후 `{ session }` 반환
- 따라서 “클라이언트가 code를 넘기지 않는다”는 문제는 코드상 확인되지 않았습니다.

승인 후 적용 가능한 정리 작업
1. `src/pages/KakaoCallback.tsx`를 요청하신 형태와 최대한 동일하게 맞춥니다.
   - `supabase.functions.invoke(...)`를 직접 `fetch(...)` 호출로 교체
   - `apikey: import.meta.env.VITE_SUPABASE_ANON_KEY` 헤더 추가
2. 에러 처리 로직은 유지합니다.
   - `error`, `code 없음`, `session 없음`, fetch 실패 모두 사용자 메시지 표시
3. 필요하면 응답 검증을 조금 더 강화합니다.
   - `response.ok` 확인
   - `session.access_token`, `session.refresh_token` 존재 여부 확인
4. 카카오 콜백 페이지 동작은 그대로 유지합니다.
   - 세션 설정 성공 시 `/` 이동

기술 세부사항
- 현재 파일:
  - `src/pages/KakaoCallback.tsx`
  - `src/App.tsx`
  - `supabase/functions/kakao-auth/index.ts`
- 현재 구현은 아래 두 조건을 이미 만족합니다.
  - `code`를 URL query에서 추출
  - `redirect_uri`를 `${window.location.origin}/kakao/callback`으로 동적 전달
- 미충족 항목은 “정확히 fetch 형태로 쓰고 싶은지” 여부뿐입니다. 기능적 문제로 보이지는 않습니다.

승인 후 실제 수정안
```tsx
useEffect(() => {
  const handleKakaoLogin = async () => {
    const code = new URLSearchParams(window.location.search).get("code");

    if (!code) {
      setError("인증 코드가 없습니다.");
      setTimeout(() => navigate("/auth"), 2000);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kakao-auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            code,
            redirect_uri: `${window.location.origin}/kakao/callback`,
          }),
        }
      );

      const { session, error } = await response.json();

      if (!response.ok || error || !session) {
        setError(error || "카카오 로그인 처리 중 오류가 발생했습니다.");
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }

      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      navigate("/");
    } catch {
      setError("카카오 로그인 처리 중 오류가 발생했습니다.");
      setTimeout(() => navigate("/auth"), 2000);
    }
  };

  handleKakaoLogin();
}, [navigate]);
```
