## 목표
- 홈의 커뮤니티 섹션을 "미리보기" 영역으로 명확히 하고, 클릭 시 커뮤니티 전체 화면(`/feed`)으로 이동.
- 커뮤니티 전체 화면을 **전체 / 산행 이야기 / 산 정보 / 장비추천** 4탭 구조로 리뉴얼.
- "산 정보", "장비추천"은 사용자가 직접 글을 올리는 게시판으로 신규 추가 (community_posts 테이블).
- "산행 이야기"는 사용자 산행 글 + 공개 등산일지 + 정상인증 공유 + 챌린지 달성 공유를 통합 노출.
- 기존 좋아요/댓글/신고/친구/캐릭터 XP/공개일지/정상인증/챌린지 공유 로직은 그대로 유지.

## 1. 홈 화면 커뮤니티 섹션 (Dashboard.tsx)
- 섹션 전체를 `<Link to="/feed">` 래퍼로 감싸 한번에 눌릴 수 있게 함 (게시글 카드는 내부에서 `e.stopPropagation()`로 자기 라우트로 이동).
- 우측 상단에 **"더보기 →"** 라벨/화살표를 명확히 표시. `linkTo="/feed"` 유지.
- 최대 3~5개 카드만 노출. 카드 정보:
  - 카테고리 태그 칩(산행이야기/산정보/장비추천/공개일지/정상인증/챌린지)
  - 게시글 유형 라벨
  - 작성자 닉네임
  - 본문 일부 (line-clamp-2)
  - 작성 시간 (상대시간)
  - 좋아요/댓글 수
- 카드 클릭 시 유형별 라우팅:
  - community_post → `/community/:id`
  - 공개 일지 → `/journals/:id`
  - 정상인증 → `/summit-claim/:id` 또는 기존 라우트
  - 챌린지 → `/challenges/...` 기존 라우트

## 2. /feed 화면 리뉴얼 (FeedPage.tsx)
- 4탭으로 교체: **전체 / 산행 이야기 / 산 정보 / 장비추천**. 기본 탭 = "전체".
- **전체**: 모든 콘텐츠 시간순 통합 노출.
- **산행 이야기**: 통합 쿼리로
  - `community_posts` (category='story')
  - `hiking_journals` (is_public=true) — JournalCard 재사용
  - `summit_claims` 공유된 항목 — SharedCompletionCard 또는 기존 카드
  - 챌린지 완료 공유 — activity_feed에서 type='challenge_completed' 등
- **산 정보**: `community_posts` (category='mountain_info') 리스트.
- **장비추천**: `community_posts` (category='gear') 리스트.
- 각 탭 우측 상단에 "+ 글쓰기" FAB (산정보/장비추천 탭에서만, 또는 산행 이야기 포함).

## 3. 커뮤니티 게시판 (신규)
신규 라우트 추가:
- `/community/new` — 글 작성 (카테고리 선택)
- `/community/:id` — 게시글 상세 (본문 + 좋아요/댓글/신고/친구추가 메뉴)

기존 `JournalCard`의 인터랙션 패턴(좋아요/댓글/`ContentMenu`)을 그대로 사용.

## 4. 데이터베이스
신규 테이블 마이그레이션:

```sql
create type community_category as enum ('story','mountain_info','gear');

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category community_category not null,
  title text,
  body text not null,
  images text[] default '{}',
  mountain_id uuid references mountains(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant select on public.community_posts to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant all on public.community_posts to service_role;
alter table public.community_posts enable row level security;
create policy "read all" on public.community_posts for select using (true);
create policy "insert own" on public.community_posts for insert to authenticated with check (auth.uid()=user_id);
create policy "update own" on public.community_posts for update to authenticated using (auth.uid()=user_id);
create policy "delete own" on public.community_posts for delete to authenticated using (auth.uid()=user_id);

create table public.community_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);
-- + grants + RLS (read all, write own)

create table public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now()
);
-- + grants + RLS
```

`reports` 테이블의 `target_type`은 이미 존재하는 enum 또는 text — `'community_post'`, `'community_comment'` 값 사용.

## 5. 캐릭터 XP
글 작성/댓글 시 기존 `useUserXp` 또는 `xp_log` 패턴 따라 XP 적립 (작성=+10, 댓글=+3 등 기존 정책 매칭).

## 변경 파일 (예상)
- `supabase/migrations/<ts>_community_posts.sql` (신규)
- `src/integrations/supabase/types.ts` (자동 업데이트는 별도)
- `src/hooks/useCommunityPosts.ts` (신규)
- `src/pages/FeedPage.tsx` (4탭 교체)
- `src/pages/CommunityPostDetailPage.tsx` (신규)
- `src/pages/CommunityPostCreatePage.tsx` (신규)
- `src/components/CommunityPostCard.tsx` (신규)
- `src/pages/Dashboard.tsx` (커뮤니티 섹션 미리보기 개편)
- `src/App.tsx` (라우트 3개 추가)

## 확인 필요
- 위 4탭 구조와 신규 게시판 테이블 생성 방향 진행해도 될지?
- "산행 이야기" 탭에 챌린지 달성 공유는 `activity_feed` 기반으로 채워도 되는지, 아니면 별도 share 테이블이 필요한지?
