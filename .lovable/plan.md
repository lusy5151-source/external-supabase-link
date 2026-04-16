

# SummitClaimSection에 AI 정상석 인증 추가

## 개요
SummitClaimPage에 이미 구현된 AI 정상석 인증 로직을 SummitClaimSection 컴포넌트의 정복 인증 다이얼로그에도 동일하게 추가합니다.

## 변경 파일
**`src/components/SummitClaimSection.tsx`** (단일 파일 수정)

## 구현 내용

1. **상태 추가**: `aiVerification` 상태 (`idle | verifying | approved | rejected | error`) + confidence, reason, elements
2. **AI 검증 함수**: `verifyPhotoWithAI` — 사진 선택 시 자동으로 `verify-summit-photo` Edge Function 호출
3. **`handlePhotoChange` 수정**: 사진 선택 후 자동으로 AI 검증 시작
4. **`handleStartClaim` 수정**: 다이얼로그 열 때 AI 상태 초기화
5. **UI 추가** (사진 업로드 아래, 산악회 선택 위):
   - `verifying` → 로딩 스피너 + "AI가 정상석을 분석하고 있습니다"
   - `approved` → 초록색 박스 + 신뢰도 + 감지 요소 배지
   - `rejected` → 빨간색 경고 + 이유 + "그래도 인증 가능" 안내
   - `error` → 회색 안내 (AI 검증 건너뜀)
6. **아이콘 import**: `ShieldCheck`, `ShieldX`, `AlertTriangle` 추가 (lucide-react)
7. **supabase import**: `supabase` 클라이언트 추가

SummitClaimPage의 AI 검증 UI/로직을 그대로 미러링하되, 제출 버튼은 AI 결과와 무관하게 기존 조건(GPS + 사진) 유지합니다.

