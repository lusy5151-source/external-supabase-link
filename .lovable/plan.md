

## 진단 결과: wandeung.com은 정상 작동 중

브라우저로 직접 접속해 확인한 결과, 앱은 **정상적으로 렌더링되고 있습니다**. 대시북드, 다가오는 일정(북한산 D-3), 100대 명산 진행률(23%), 산왕 카드, 환영 모달 모두 표시됨을 스크린샷으로 확인했습니다.

### 실제 발견된 단일 이슈 (블로킹 아님)

콘솔 에러 1건만 존재:
```
404: https://wandeung.com/icon-192x192.png
warn: Manifest icon download failed
```

이는 PWA 매니페스트에서 참조하는 아이콘 파일이 `public/` 폴더에 없어서 발생합니다. **앱 실행에는 영향 없음** — PWA 설치 시 아이콘만 누락됩니다.

### "화면이 안 보인다"의 가능한 원인

서버/번들/HTML은 모두 정상입니다 (HTTP 200, 모든 청크 로드됨). 사용자 측에서 화면이 안 보인다면 다음 중 하나일 가능성이 높습니다:

1. **이전 배포의 손상된 Service Worker가 캐시됨** — 최근 vite-plugin-pwa 설정 변경(`injectRegister: "script-defer"`, manualChunks 변경)으로 SW가 오래된 청크 경로를 가리킴
2. **브라우저 캐시에 깨진 청크가 남아있음** — 이전 분할 빌드의 createContext 에러가 캐시됨
3. **퍼블리시가 아직 안 됨** — 최근 vite.config.ts 수정 후 Publish 버튼을 누르지 않았을 수 있음

### 수정 계획

**1. 누락된 PWA 아이콘 처리** (`vite.config.ts`)
- 매니페스트의 `/icon-192x192.png`, `/icon-512x512.png` 참조를 기존에 존재하는 `/placeholder.svg` 또는 새 아이콘으로 교체. 가장 안전한 방식은 manifest의 icons 배열을 임시로 SVG 단일 아이콘으로 바꿔 404 제거.

**2. 깨진 SW 자동 정리 강화** (`src/main.tsx`)
- 현재는 preview/iframe에서만 SW unregister. 프로덕션에서도 사용자가 새 빌드 받을 때 옛 SW가 옛 청크 경로를 들고 있을 수 있음.
- SW 등록 실패 시 또는 controllerchange 시 강제 새로고침 로직 추가:
  ```ts
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    window.location.reload();
  });
  ```
- 옛 캐시(`workbox-precache-*`) 자동 삭제 로직.

**3. 사용자 액션 안내**
- 코드 변경 후 반드시 **Publish → Update** 클릭 필요 (vite.config.ts는 빌드 설정이라 재빌드/재배포 시에만 반영)
- 사용자에게는 강력 새로고침(Ctrl+Shift+R) 또는 Application → Clear storage 한 번 권장

### 변경 대상 파일

- `vite.config.ts` — manifest icons 항목을 placeholder.svg로 임시 변경 (404 제거)
- `src/main.tsx` — SW controllerchange 핸들러 + 옛 캐시 정리 추가

UX/디자인 변경 없음. 기존 동작 그대로 유지.

