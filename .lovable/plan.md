

# AI 인증 거부 시 경고 확인 다이얼로그 추가

## 변경 파일
**`src/components/SummitClaimSection.tsx`** (단일 파일)

## 구현 내용

1. **AlertDialog import 추가**: `@/components/ui/alert-dialog`에서 `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` import

2. **상태 추가**: `showRejectWarning` (boolean) — 경고 다이얼로그 표시 여부

3. **제출 버튼 onClick 수정**:
   - AI 결과가 `rejected`일 때 → `setShowRejectWarning(true)` (경고 다이얼로그 표시)
   - 그 외 → 기존 `handleSubmitClaim` 직접 호출

4. **AlertDialog UI 추가** (Dialog 내부, 제출 버튼 아래):
   - 제목: "AI 인증 경고"
   - 내용: AI가 정상석을 인식하지 못했다는 안내 + rejection 사유 표시 + "그래도 제출하시겠습니까?"
   - 취소 버튼: "취소" → 다이얼로그 닫기
   - 확인 버튼: "그래도 제출" → `handleSubmitClaim()` 실행 + 다이얼로그 닫기

