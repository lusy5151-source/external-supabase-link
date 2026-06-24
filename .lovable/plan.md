## 문제

현재 매거진 작성 화면(@AdminPage 내 매거진 수정 다이얼로그)은 **제목·카테고리·설명**만 입력하는 단순 모달이라, 본문 작성·사진 배치·서식·산 정보 연결이 전혀 불가능합니다. 한편 이미 존재하는 `/admin/magazine`(전체 매거진 관리 페이지)와 `/admin/magazine/:id/edit`(블록 에디터)는 좀 더 풍부하지만 여기서도

- 본문 텍스트가 **순수 텍스트(textarea)** 라 굵게/글자 크기 적용 불가
- **본문 안에 사진을 자유롭게 끼워 넣을 수 없음** (블록 단위)
- **산 정보 카드**를 글에 삽입할 수 없음

이 부분을 사용자 요청대로 블로그 글쓰기에 가까운 경험으로 바꿉니다.

---

## 변경 사항

### 1. 진입 흐름 정리
- @AdminPage 의 매거진 수정 다이얼로그는 **간단 정보(제목·카테고리·설명) 편집용**으로 유지하되, 다이얼로그 안에 "본문 자세히 편집" 버튼을 추가해 `/admin/magazine/:id/edit`(풀 에디터)로 바로 이동.
- 새 글 작성 시에도 풀 에디터로 보내, 사용자가 원하는 블로그형 작성 화면이 기본이 되도록 함.

### 2. 리치 텍스트 본문 (Tiptap)
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link` 추가.
- `text_only` / `image_text` / `tip` 블록의 본문 입력을 **Tiptap 에디터**로 교체.
- 상단 미니 툴바: **굵게**, **글자 크기(본문/큰 글씨/작은 글씨 = 14/18/12px)**, **목록**, **인용**, **사진 삽입**, **링크**, **산 정보 삽입**.
- 본문 안 사진은 Tiptap Image 노드로 삽입(업로드 → `magazine-images` 버킷 URL을 src 로). 본문 중간 어느 위치에든 배치 가능.
- 저장 형식은 **HTML 문자열**을 기존 `body_text` 컬럼(TEXT)에 그대로 저장. 스키마 변경 없음.
- 매거진 상세(@MagazinePage)는 해당 HTML 을 `dangerouslySetInnerHTML` 로 렌더링하되, `DOMPurify` 로 화이트리스트 sanitize(허용 태그: p, br, strong, em, u, h2/h3, ul/ol/li, blockquote, a, img, span[style=font-size], div.mountain-ref).

### 3. 산 정보 임베드
- 새 블록 타입 `mountain_ref` 추가. 데이터는 `mountain_id`(int) 만 저장.
- 에디터: 산 검색 모달(이름으로 mountains 테이블 검색) → 선택 시 해당 위치에 카드 블록 삽입.
- 본문 안에 인라인으로 넣을 수도 있도록 Tiptap 커스텀 노드 `mountainRef` 제공 — HTML 내에 `<div data-mountain-id="..."></div>` 마커로 저장. 렌더 시 해당 산 카드(작은 썸네일 + 산이름 + 높이)로 치환, 클릭하면 `/mountains/:id` 로 이동.
- 별도 블록으로도 추가 가능(목록 영역에 카드 한 장).

### 4. 스키마 변경 (단일 마이그레이션)
- `magazine_content_blocks` 테이블에 컬럼 추가:
  - `mountain_id int` (nullable) — 산 참조 블록용
  - `body_html text` (nullable) — 명시적으로 HTML 임을 표시. 기존 `body_text` 는 호환을 위해 유지하되 신규 저장은 `body_html` 사용 (렌더링은 두 컬럼 모두 fallback).
- block_type CHECK 제약은 없고 텍스트라 새 값 `mountain_ref` 추가에 마이그레이션 불필요. 정책/그랜트는 기존 그대로 유효.

### 5. 사파이 렌더링(@MagazinePage)
- 기존 블록 switch 에 `mountain_ref` 케이스 추가 → MountainCard(작게) 렌더.
- `text_only` / `image_text` / `tip` 의 본문 표시를 `body_html` 우선, 없으면 `body_text`(개행→`<br/>`) 로 fallback.
- HTML 내부의 `[data-mountain-id]` 마커는 렌더 시점에 React 노드로 치환(간단히 정규식 split 또는 `html-react-parser` 사용).

---

## 기술 세부

- 신규 패키지: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `dompurify`, `html-react-parser`.
- 폰트 사이즈는 Tiptap 의 Mark 확장(`span style="font-size:..."`)으로 처리.
- 산 검색 모달은 기존 `useMountainsData` 훅 재사용(클라이언트 필터).
- 새 마이그레이션:
  - `ALTER TABLE public.magazine_content_blocks ADD COLUMN IF NOT EXISTS mountain_id integer;`
  - `ALTER TABLE public.magazine_content_blocks ADD COLUMN IF NOT EXISTS body_html text;`

---

## 영향 받는 파일

- 수정: `src/pages/AdminMagazineEditorPage.tsx`, `src/pages/AdminPage.tsx`(다이얼로그 → 풀 에디터 진입 버튼), `src/pages/MagazinePage.tsx`(블록 렌더링).
- 신규: `src/components/magazine/RichTextEditor.tsx`, `src/components/magazine/MountainPickerModal.tsx`, `src/components/magazine/MountainRefCard.tsx`.
- DB: `magazine_content_blocks` 컬럼 2개 추가.

---

## 진행 순서

1. 마이그레이션 승인 → 컬럼 추가.
2. Tiptap·DOMPurify 패키지 설치.
3. 리치 에디터 컴포넌트 + 산 선택 모달 + 커스텀 노드 작성.
4. AdminMagazineEditorPage 의 본문 입력을 리치 에디터로 교체하고 `mountain_ref` 블록 추가 UI 구현.
5. AdminPage 의 매거진 다이얼로그에 "본문 자세히 편집" 진입 버튼 추가.
6. MagazinePage 의 블록 렌더에 HTML/산 참조 처리 추가.
