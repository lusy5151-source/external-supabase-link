

# 완등횟수 챌린지 카운트 수정 계획

## 문제 요약

완등횟수 챌린지가 정상 인증 후에도 progress가 0으로 유지되는 문제입니다. 원인은 3군데에 있습니다.

---

## 문제 1: DB 트리거가 중복 제거 카운트 사용

현재 `update_challenge_progress_on_summit` 트리거에서 `goal_type = 'mountain'`일 때 `COUNT(DISTINCT mountain_id)`를 사용합니다. 사용자가 원하는 것은 **정상 인증 건수(총 횟수)**이므로 `COUNT(*)`로 변경해야 합니다.

### 변경
- Supabase migration으로 트리거 함수 수정
- `goal_type = 'mountain'` 분기에서 `COUNT(DISTINCT mountain_id)` → `COUNT(*)`

## 문제 2: 프론트엔드 recalculateProgress가 hiking_journals 기반

`useChallenges.ts`의 `recalculateProgress`와 `computeProgress`가 `hiking_journals` 테이블을 기준으로 progress를 계산합니다. 정상 인증은 `summit_claims` 테이블에 저장되므로, summit 관련 goal_type은 `summit_claims`에서 카운트해야 합니다.

### 변경 (src/hooks/useChallenges.ts)
- `recalculateProgress`에서 `summit_claims`도 함께 조회
- `computeProgress` 함수에서 `goal_type = 'mountain'`일 때 `summit_claims` 건수 사용
- `hiking_journals` 기반 로직은 journal 관련 goal_type에만 적용

## 문제 3: SummitClaimPage 토스트가 잘못된 goal_type 필터링

`SummitClaimPage.tsx` 329번 줄에서 `goal_type === "summit_count"`로 필터하지만, 실제 DB의 goal_type은 `"mountain"`입니다.

### 변경 (src/pages/SummitClaimPage.tsx)
- 329번 줄: `"summit_count"` → `"mountain"`

---

## 기존 데이터 동기화

migration에서 기존 사용자들의 `user_challenges` progress를 `summit_claims` 기준으로 재계산하는 UPDATE 포함.

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|-----------|
| Supabase migration (신규) | 트리거 함수에서 `COUNT(*)` 사용 + 기존 데이터 동기화 |
| `src/hooks/useChallenges.ts` | `recalculateProgress`가 `summit_claims` 기반으로 계산 |
| `src/pages/SummitClaimPage.tsx` | goal_type 필터 `"summit_count"` → `"mountain"` |

