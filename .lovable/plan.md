# 지도 라이브러리: Leaflet → 네이버 지도 전면 교체

## 변경 대상 파일 (3개 지도 + 설정)

현재 프로젝트에는 Leaflet(OSM 타일) 기반 지도가 3곳에서 사용 중입니다. 모두 네이버 지도 v3 JS API로 교체합니다.

1. `index.html` — 네이버 지도 스크립트 추가
2. `src/components/MountainMapSection.tsx` — 홈/지도 섹션 (산 마커, 필터, 인포카드, 내 위치)
3. `src/pages/MapView.tsx` — 전체 지도 페이지
4. `src/components/TrailMap.tsx` — 산별 등산로 폴리라인 지도
5. `src/index.css` — leaflet z-index 규칙 제거, 네이버 지도용으로 교체
6. `package.json` — `leaflet`, `@types/leaflet`, `react-leaflet` 의존성 제거

## 주의: API 키 검증 필요

지정해주신 `ncpClientId=e35ks3exhv`는 일반적인 네이버 클라우드 플랫폼 Maps Client ID 형식보다 짧습니다(보통 더 긴 영숫자). 일단 지정하신 값 그대로 적용하지만, 지도가 401/인증 오류로 빈 화면이 뜨면:
- NCP Console → Maps → Application의 정확한 Client ID 확인
- Web 서비스 URL 등록란에 `https://wandeung.com`, `https://www.wandeung.com`, Lovable 프리뷰 도메인(`*.lovable.app`) 등록 여부 확인
이 두 가지를 먼저 점검해야 합니다.

## 상세 구현

### 1. `index.html` `<head>`
```html
<script type="text/javascript"
  src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=e35ks3exhv&submodules=geocoder,drawing">
</script>
```

### 2. 타입 안전성
`src/vite-env.d.ts`에 전역 `naver` 선언 추가:
```ts
declare global {
  interface Window { naver: any }
  const naver: any;
}
```
(외부 스크립트라 정식 타입은 `any`로 처리, 기존 코드의 `L.Map` 등은 모두 제거)

### 3. `MountainMapSection.tsx` 교체 패턴
- `L.map(...)` → `new naver.maps.Map(el, { center: new naver.maps.LatLng(36, 127.8), zoom: 7, mapTypeId: naver.maps.MapTypeId.TERRAIN, minZoom: 6, maxBounds: new naver.maps.LatLngBounds(new naver.maps.LatLng(33,124.5), new naver.maps.LatLng(38.7,131.9)) })`
- 마커 → `new naver.maps.Marker({ position, map, icon: { content: '<div>...</div>', anchor: new naver.maps.Point(16,16) } })`
  - 기존 완등(👤)/공동(👥)/미등(⛰) 3종 스타일/크기를 HTML content로 그대로 유지
- 클릭 → `naver.maps.Event.addListener(marker, 'click', () => setSelectedInfo(...))`
- 마커 제거 → `marker.setMap(null)`
- 내 위치 → `map.setCenter(new naver.maps.LatLng(lat,lng)); map.setZoom(11);`
- 필터/인포카드 UI(오버레이, 카드, Progress)는 그대로 유지

### 4. `MapView.tsx`
동일 패턴으로 교체. 마커 클릭 시 `navigate(/mountains/:id)`. 범례/진행률 UI 유지.

### 5. `TrailMap.tsx` — 폴리라인
- 산 위치 마커 1개
- 등산로 features를 순회하며 `new naver.maps.Polyline({ map, path: coords.map(([lng,lat]) => new naver.maps.LatLng(lat,lng)), strokeColor: TRAIL_COLORS[idx%n], strokeWeight: 4, strokeOpacity: 0.8 })`
- 범위 맞춤 → `map.fitBounds(bounds)` (네이버는 `naver.maps.LatLngBounds`에 `extend()`로 누적)
- 시작점 마커, 툴팁(호버) → `naver.maps.InfoWindow`로 클릭 시 표시(네이버에는 leaflet의 hover tooltip이 없어 클릭형으로 변경)
- 로딩/에러/"GPS 등산로 데이터" 안내 UI 유지

### 6. `index.css`
```css
/* 제거 */
.leaflet-container, .leaflet-top, .leaflet-bottom, .leaflet-pane { ... }
```
네이버 지도의 컨트롤은 기본 z-index로 충분. 필요 시 컨테이너에 `position:relative`만 유지.

### 7. 의존성 정리
`package.json`에서 다음 제거:
- `leaflet`, `@types/leaflet`, `react-leaflet`
- 모든 `import L from "leaflet"` / `import "leaflet/dist/leaflet.css"` 제거

### 8. 스크립트 로드 가드
네이버 SDK는 `<head>`에서 동기 로드되지만, `useEffect` 내에서 `if (!window.naver?.maps) return;` 가드를 두어 SSR/늦은 로드 시에도 안전하게 처리.

## 사용자에게 보일 차이
- 지도 타일이 OSM(영문/세계 표준) → 네이버 지형도(한국 친화적, 한글 지명, 등고선 표시)로 전환
- 마커/필터/인포카드/범례 등 UX는 그대로 유지
- 등산로 폴리라인 호버 툴팁이 클릭 시 표시되는 InfoWindow로 변경

승인해주시면 위 순서대로 적용하겠습니다.