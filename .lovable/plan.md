## 진단: 푸시 알림이 동작하지 않는 이유

### 1. 토큰 저장 경로가 두 개라 서로 충돌
앱이 시작될 때 `src/App.tsx`에서 두 가지가 동시에 실행됩니다.

- `usePushNotifications()` (`src/hooks/usePushNotifications.ts`)
  → `push_tokens` 테이블에 `token` 컬럼으로 저장
- `initPushNotifications()` (`src/lib/pushNotifications.ts`)
  → `user_fcm_tokens` 테이블에 `fcm_token` 컬럼으로 저장

둘 다 `PushNotifications.register()`를 호출하고, 리스너를 별도로 붙입니다. Capacitor Push 플러그인은 같은 이벤트 리스너가 두 번 등록되면 한쪽이 늦게 붙어서 토큰 콜백을 놓치거나, 동시에 두 테이블에 흩어져 저장돼서 발송 쪽이 토큰을 못 찾는 상황이 생깁니다.

### 2. 발송 함수가 보는 테이블과 저장되는 테이블이 다름
서버 측 트리거(`notify_friend_request`, `notify_plan_invitation`, `notify_club_message` 등)는 전부 `send_push_notification(...)`를 호출하고, 이 함수는 Edge Function `send-push-notification`을 호출합니다. 그 함수는 토큰을 다음과 같이 조회합니다.

```ts
// supabase/functions/send-push-notification/index.ts
supabase.from("push_tokens").select("token").eq("platform", "ios")
```

즉 발송 측은 **오직 `push_tokens`만** 봅니다. 그런데 `initPushNotifications()`는 `user_fcm_tokens`에 저장합니다. 이쪽 경로로 저장된 토큰은 발송 시 무시되고, 함수는 “토큰 없음”으로 200 반환만 합니다.

현재 DB 상태:
- `push_tokens`: 0건
- `user_fcm_tokens`: 0건
- `push_notification_logs`: 3건 (수동 테스트 호출만 남아있음)

토큰이 한 줄도 안 들어와 있다는 게 핵심 증상입니다.

### 3. 웹/PWA에는 푸시 구현이 없음
`Capacitor.isNativePlatform()`이 false면 두 훅 모두 일찍 return 합니다. 따라서 모바일 브라우저에서 “알림 허용”을 눌러도 백그라운드 푸시는 동작하지 않습니다 (로컬 `Notification` 알림은 `useSchedulePlanAlerts`만 띄움). 사용자 입장에서는 “앱에서 푸시가 안 와요”라고 느껴지는데, 웹 사용자라면 애초에 푸시 채널이 없는 상태입니다.

### 4. iOS 빌드/시크릿 점검 항목
APNs 호출 코드 자체는 정상이지만, 다음 중 하나라도 어긋나면 “토큰은 받지만 알림이 안 옴”이 됩니다.
- `APNS_BUNDLE_ID` 시크릿이 `capacitor.config.ts`의 `appId`(`com.wandeung.app`)와 정확히 일치해야 함
- APNs Key가 Sandbox/Production 어느 환경에 대응되는지 — 현재 코드는 `https://api.push.apple.com` (Production)만 호출. TestFlight/디바이스 디버그 빌드는 sandbox(`api.sandbox.push.apple.com`)로 가야 토큰이 살아있음
- iOS 앱에 Push Notifications capability와 Background Modes(Remote notifications)가 켜져 있어야 함 (네이티브 프로젝트 설정)

---

## 수정 계획

### A. 토큰 저장 경로 일원화 (코드)
1. `src/App.tsx`에서 `usePushNotifications()` 호출 제거. 초기화는 `initPushNotifications()` 하나만 사용.
2. `src/lib/pushNotifications.ts`가 저장하는 테이블을 `push_tokens`로 통일하고 컬럼명도 `token`으로 맞춤. (`user_fcm_tokens`는 사용하지 않음 — 추후 정리)
   ```ts
   .from("push_tokens").upsert(
     { user_id, token, platform, updated_at: new Date().toISOString() },
     { onConflict: "user_id,token" }
   )
   ```
3. `src/hooks/usePushNotifications.ts` 파일은 제거하거나 비활성화해서 리스너 이중 등록을 방지.

### B. 발송 함수 sandbox/prod 대응 (Edge Function)
`supabase/functions/send-push-notification/index.ts`에 환경 분기 추가.
- 새 시크릿 `APNS_ENV` (`production` | `sandbox`) 도입
- 값에 따라 호스트를 `api.push.apple.com` / `api.sandbox.push.apple.com`로 선택
- TestFlight·App Store 빌드는 production, Xcode 디바이스 디버그 빌드는 sandbox

또한 토큰이 0건일 때 `push_notification_logs`에 `status='no_token'`을 남기도록 보강해서, 추후 디버깅 시 “토큰이 없는 것”과 “APNs가 거절한 것”을 구분.

### C. APNs 응답 핸들링
- 401/410(BadDeviceToken, Unregistered) 응답을 받으면 해당 row를 `push_tokens`에서 삭제.
- 로그에 `status_code`, `apns-id`를 같이 저장(컬럼이 없다면 `status` 텍스트에 포함).

### D. 운영 점검 체크리스트(사용자가 직접 확인)
1. iOS 앱을 실제 디바이스에서 실행 → 권한 허용 → Supabase `push_tokens` 테이블에 row가 새로 생기는지 확인.
2. 그 row의 `platform='ios'`인지 확인.
3. Edge Function 로그(`supabase functions logs send-push-notification`)에서 “APNs: 200” 응답이 찍히는지 확인. 400/403/410이면 시크릿/번들 ID/환경(sandbox vs prod) 문제.
4. Xcode → Signing & Capabilities에 “Push Notifications”, Background Modes의 “Remote notifications” 체크.

### E. (선택) 웹 푸시
PWA 사용자에게도 푸시를 보내려면 FCM Web Push(별도 `firebase-messaging-sw.js` + VAPID 키)를 도입해야 합니다. 이는 별도 작업이므로 본 작업 범위에서는 제외하고, 필요하면 후속 작업으로 진행.

---

## 변경될 파일
- `src/App.tsx` — `usePushNotifications()` 호출 제거
- `src/lib/pushNotifications.ts` — `push_tokens` 테이블/컬럼으로 저장하도록 변경
- `src/hooks/usePushNotifications.ts` — 제거 또는 빈 export로 비활성화
- `supabase/functions/send-push-notification/index.ts` — sandbox/prod 분기, 410/401 토큰 정리, 응답 로깅

## 사용자 확인이 필요한 항목
1. 현재 푸시가 안 되는 환경이 **iOS 네이티브 앱**인지, **웹/PWA**인지?
2. iOS라면 빌드 종류가 Xcode 디바이스 디버그인지, TestFlight인지?  
   (이에 따라 `APNS_ENV` 기본값을 sandbox로 둘지 production으로 둘지 결정)
3. 웹 푸시(FCM Web Push)도 함께 구현할지?

위 1~3 확인되면 바로 빌드 모드로 전환해 코드/엣지 함수 수정과 점검 가이드를 한 번에 적용하겠습니다.