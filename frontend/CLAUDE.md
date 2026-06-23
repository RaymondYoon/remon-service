# CLAUDE.md — Remon Service Frontend 작업 규칙

## 서비스 개요
Remon은 사용자가 키워드와 간단한 조건을 입력하면
AI가 짧은 전자책/소설을 생성해주는 서비스다.

---

## 작업 범위
- 이 파일이 있는 `frontend/` 폴더 내부만 읽고 수정한다.
- 상위 디렉터리나 `backend/`는 접근하지 않는다.

---

## 기술 스택
- React 19, react-router-dom v7
- axios 1.x (공통 인스턴스: `src/api/axiosInstance.js`)
- react-pageflip 2.0.3 — 책 넘기기 애니메이션
- 상태관리: useState / useEffect (전역 상태 라이브러리 없음)
- CSS: 컴포넌트별 CSS 파일 + `src/styles/variables.css` 공통 변수 (다크/라이트 토큰 포함)
- 코드 스플리팅: React.lazy + Suspense (모든 페이지 컴포넌트)

---

## 배포 현황
- **플랫폼**: Vercel
- **운영 URL**: `https://remon-service.vercel.app`
- **API 연결**: `REACT_APP_API_URL=https://remon-service-production.up.railway.app`
- 카카오 로그인 URL도 `REACT_APP_API_URL` 환경변수로 처리

---

## 환경 변수

| 키 | 값 (운영) | 설명 |
|---|---|---|
| `REACT_APP_API_URL` | `https://remon-service-production.up.railway.app` | 백엔드 API 기본 URL |

로컬 개발 시: `frontend/.env.local` 또는 `.env`에 `REACT_APP_API_URL=http://localhost:8080`

---

## 라우팅 구조
```
/                → Home.jsx            책 목록 + 검색 + 장르 필터 (debounce 300ms) + 정렬 탭 (최신순/평점순/조회수순)
/book/:id        → BookDetail.jsx      책 상세 + 서재 담기 + 별점/리뷰
/book/:id/read   → ReadPage.jsx        react-pageflip 책 본문 뷰어 (데스크톱 두 페이지 / 모바일 단일 페이지)
/login           → Login.jsx           이메일 로그인 + 카카오 로그인 버튼
/signup          → Signup.jsx          회원가입
/library         → MyLibrary.jsx       내 서재 (ProtectedRoute)
/my-books        → MyBooks.jsx         내가 만든 책 목록 (ProtectedRoute)
/generate        → GeneratePage.jsx    AI 책 생성 폼 + 레몬트리 (ProtectedRoute)
/explore         → ExplorePage.jsx     공개 책 탐색 + 작가 팔로우
/feed            → FeedPage.jsx        팔로잉 피드 (ProtectedRoute)
/profile/:userId → UserProfilePage.jsx 유저 프로필 + 팔로우 토글
/mypage          → MyPage.jsx          내 프로필 + 레몬트리 + 통계 (ProtectedRoute)
/oauth-callback  → OAuthCallback.jsx   카카오 OAuth 처리
```

---

## 파일 구조
```
src/
├── api/
│   ├── axiosInstance.js    — Axios 공통 인스턴스 (401 자동 재발급, 8초 타임아웃)
│   ├── bookApi.js          — 책 목록/상세/생성/AI 생성/탐색/피드/서재 ID 목록
│   ├── userApi.js          — 로그인/회원가입/프로필/레몬/닉네임/계정삭제
│   ├── followApi.js        — 팔로우/언팔로우/목록
│   ├── reviewApi.js        — 리뷰 작성/목록/삭제
│   └── notificationApi.js  — 알림 목록/읽음 처리/미읽음 수
├── components/
│   ├── Header.jsx          — 로고, 알림 벨(미읽음 뱃지), 🍋 레몬 수, 다크모드 토글, 햄버거 메뉴
│   ├── BookCard.jsx        — 책 카드 (React.memo, coverImageUrl 표지, 장르 배지, 그리드 레이아웃, hover 효과, ✓ 배지)
│   ├── BookList.jsx        — BookCard 목록 래퍼 (React.memo)
│   ├── LemonTree.jsx       — CSS/SVG 레몬 나무 시각화 (레몬 개수별 3단계)
│   ├── LemonFall.jsx       — 레몬 소모 시 낙하 애니메이션
│   ├── Toast.jsx           — 토스트 알림 UI
│   ├── ProtectedRoute.jsx  — 로그인 필요 라우트 가드
│   └── Footer.jsx
├── hooks/
│   ├── useBooks.js         — 책 목록 + 키워드 필터 fetch
│   ├── useInfiniteBooks.js — 무한 스크롤 페이지네이션 (params에 sort 포함 — 변경 시 자동 초기화·재조회)
│   ├── useTheme.js         — 다크/라이트 모드 토글 + localStorage
│   └── useToast.js         — 토스트 알림 상태 관리
├── pages/
│   ├── Home.jsx, BookDetail.jsx, ReadPage.jsx
│   ├── GeneratePage.jsx, MyLibrary.jsx, MyBooks.jsx, MyPage.jsx
│   ├── ExplorePage.jsx, FeedPage.jsx, UserProfilePage.jsx
│   ├── Login.jsx, Signup.jsx, OAuthCallback.jsx
│   └── (각 페이지별 동일 이름 CSS 파일 존재)
├── styles/
│   ├── variables.css       — CSS 변수 (다크/라이트 토큰, 컬러, 폰트)
│   └── global.css
└── utils/
    ├── auth.js             — 토큰/유저 저장·조회, JWT 만료 확인
    └── lemonStorage.js     — 일일 레몬 사용 횟수 추적 (localStorage, 자정 초기화)
```

---

## UI 구조
- **헤더**: 로고(🍋 Remon) 왼쪽 고정, 🔔 알림 벨(미읽음 뱃지) + 🍋 N개 + 다크모드 토글 + 햄버거(☰) 오른쪽
- **드로어**: 오른쪽 슬라이드 메뉴 (260px), 오버레이 클릭 또는 ✕ 버튼으로 닫기
- **다크모드**: 🌙/☀️ 토글 버튼 (헤더 우측), localStorage 저장, 새로고침 유지
  - `src/hooks/useTheme.js` — `data-theme` attribute + localStorage
  - CSS variables(`[data-theme="dark"]`)로 전체 색상 전환

---

## 디자인 시스템 (Remon 톤)
- **컨셉**: 따뜻하고 차분한 전자책 서비스. 레몬빛 청량함 + 독서의 편안함.
- **Primary**: `#5b7e5a` (세이지 그린 — `--color-primary`)
- **Background (라이트)**: `#fafaf7` (크림 화이트 — `--color-bg`)
- **Background (다크)**: `#121212` (`--color-bg`)
- **Card (다크)**: `#1e1e1e` (`--color-card`)
- **Accent**: `#f5c842` (레몬 옐로우 — `--color-accent`)
- **표지 없을 때 기본 배경**: `#FFF9E6` (부드러운 레몬색) + 🍋 이모지
- 둥근 카드(14~16px), 안정적인 여백, 미니멀한 구성
- 신규 색상은 반드시 `variables.css`에 먼저 추가한 뒤 사용한다.
- 하드코딩된 색상값은 사용하지 않는다 (`#FFF9E6` 같은 의미 있는 고정값 예외).

---

## 레몬 시스템 (프론트엔드)
- Header: `GET /api/users/me/lemon` 60초 폴링 → 🍋 N개 실시간 표시
- GeneratePage: LemonTree 표시 + "보유 레몬 N개 · 오늘 N/3회 사용", 레몬 0개 시 생성 버튼 비활성화
- MyPage: LemonTree + 통계 (남은/사용/한도)
- `src/utils/lemonStorage.js`: localStorage 기반 일일 사용 횟수 추적 (자정 초기화)
- LemonTree 단계: 0개=앙상한 나무 / 1~3개=잎+열매 / 4개 이상=풍성+최대 8개

---

## 책 생성 옵션 (GeneratePage)
- **키워드**: 최대 4개 (태그 형식, Enter/쉼표로 추가)
- **장르**: SF / 판타지 / 로맨스 / 일상 / 공포
- **분위기**: 따뜻하게(WARM) / 긴장감 있게(DARK) / 유쾌하게(HUMOROUS)
- **결말**: 해피엔딩(HAPPY) / 새드엔딩(SAD) / 열린결말(OPEN)
- **주인공 이름**: 텍스트 입력 (선택사항, 비워두면 AI가 결정)
- **서술 시점**: 3인칭(전지적 시점) / 1인칭(내가 주인공) — 칩 형식 단일 선택, 기본 3인칭
- **주인공 성격**: 소심한 / 까칠한 / 비밀이 있는 / 천재적인 / 상처받은 / 엉뚱한 — 칩 형식 단일 선택, 선택 해제 가능 (다시 누르면 null)
- 분량은 4000자 내외로 고정

---

## 책 뷰어 (ReadPage)
- `usePortrait={dim.isMobile}` — 모바일(≤640px) 단일 페이지, 데스크톱 두 페이지
- DOM 높이 기반 페이지 분할 (`buildPagesByHeight` 함수) — binary search로 단락 잘림 방지
- 모바일: `contentH`에 40px 안전 마진 추가 — 마지막 줄 경계 잘림 방지
- 모바일: `pageNumBarRef`로 페이지 번호 바 실제 DOM 높이 측정 (측정 실패 시 `PAGE_NUM_HEIGHT=36` fallback)
- 모바일: 페이지 너비 `vw-32`, 높이 `Math.max(vh-200, 450)` 보장
- 키보드 방향키 지원 (← →)
- 읽은 페이지 localStorage + 서버 양쪽 저장 (debounce 1500ms)
- 완독 시 자동으로 DONE 상태 처리
- **ReadPage 방문 시 `startReading` 자동 호출** — 서재에 없는 책도 READING으로 자동 등록
- **GPU 가속 강제 활성화** (`ReadPage.css`) — `.read-container`, `.html-flipbook`, `.flip-page`, `.flip-page-inner`에 `will-change: transform`, `transform: translateZ(0)`, `backface-visibility: hidden` 적용 → 안드로이드 모바일 책 넘김 버벅임 해소

---

## 홈 ✓ 배지 동작 방식
- `GET /api/library/my-reading-book-ids`로 READING + DONE 상태 bookId 목록 조회
- BookCard에 ✓ 배지는 해당 목록에 있는 책(읽기 시작한 책)에만 표시
- ReadPage 방문 → `startReading` upsert → 다음 홈 방문 시 ✓ 배지 표시

---

## 인증 유틸리티 (`src/utils/auth.js`)
- `saveAuth(data)` — accessToken + refreshToken + user 분리 저장
  - localStorage 키: `accessToken`, `refreshToken`, `user`
- `getToken()` — `accessToken` 키로 읽음
- `isLoggedIn()` — 토큰 존재 + JWT 만료 여부 동시 확인
- `clearAuth()` — accessToken, refreshToken, user 전체 제거
- 인증이 필요한 페이지는 반드시 `ProtectedRoute`로 감싼다

## axiosInstance 동작 (`src/api/axiosInstance.js`)
- BASE_URL: `REACT_APP_API_URL` 환경변수
- 요청 타임아웃: 8초
- 요청 인터셉터: `accessToken`을 `Authorization: Bearer` 헤더에 자동 첨부
- 401 응답 시: `POST /api/auth/refresh`로 refreshToken 전송 → 새 accessToken 저장 후 원래 요청 재시도
- 동시 다발 401 요청은 큐(failedQueue)로 처리
- 갱신 실패 시 clearAuth + `/login` 리다이렉트

---

## API 연동 규칙
- 모든 API 호출은 `src/api/axiosInstance.js`를 통한다 (직접 axios 임포트 금지)
- 인증 토큰은 axiosInstance 인터셉터가 자동 첨부
- 401 응답 시 자동 로그아웃 + `/login` 리다이렉트 (인터셉터 처리됨)
- API 함수는 도메인별로 분리:
  - `src/api/userApi.js` — 로그인, 회원가입, 프로필, 레몬
  - `src/api/bookApi.js` — 책 목록, 상세, AI 생성, 탐색, 피드, 서재 ID
  - `src/api/followApi.js` — 팔로우/언팔로우
  - `src/api/reviewApi.js` — 리뷰 CRUD
  - `src/api/notificationApi.js` — 알림

---

## 완료된 작업

### 2026-04-26
- [x] JWT Refresh Token 구조 도입 (Access 15분 + Refresh 7일)
- [x] axiosInstance 401 자동 재발급 로직 추가 (큐 처리 포함)
- [x] OAuthCallback.jsx에서 accessToken + refreshToken 파라미터 파싱

### 2026-04-30
- [x] 팔로우/언팔로우 기능 (followApi.js)
- [x] 공개 책 탐색 페이지 `/explore` (작가별 팔로우 버튼 포함)
- [x] 팔로잉 피드 페이지 `/feed`
- [x] 유저 프로필 페이지 `/profile/:userId`
- [x] 별점·리뷰 기능 (BookDetail.jsx에 별점 선택 폼 + 리뷰 목록)
- [x] BookCard에 평균 별점 표시
- [x] 검색 기능 개선 — 장르 드롭다운, debounce 300ms

### 2026-05-01
- [x] 알림 기능 — 헤더 🔔 뱃지 + 드롭다운 UI
- [x] 레몬 시스템 UI — 레몬트리 + 낙하 애니메이션
- [x] ReadPage: react-pageflip 책 넘기기 애니메이션 구현

### 2026-05-02
- [x] Lighthouse 성능 최적화 (React.memo, lazy loading, code splitting, SEO 메타 태그)
- [x] 레몬트리 UI (LemonTree.jsx — CSS/SVG 직접 구현)
- [x] MyPage.jsx 신규 `/mypage` 라우트

### 2026-05-04
- [x] AI 책 생성 키워드 입력 4개로 확장
- [x] BookCard 전체 영역 클릭 가능 처리
- [x] ReadPage 페이지 번호 겹침 문제 수정

### 2026-05-08
- [x] 책 표지 없을 때 🍋 이모지 + 레몬색(#FFF9E6) 배경으로 통일 (전 페이지)
- [x] 분량 선택 UI 제거 (3000자 고정)
- [x] 책 생성 옵션 추가: 결말 방향(해피/새드/열린결말) + 주인공 이름 입력
- [x] ReadPage 한/두 페이지 토글 버튼 제거 (두 페이지 고정)

### 2026-05-11
- [x] 홈 ✓ 배지 기준 변경: 서재 담기 → 읽기 시작한 책 (READING+DONE)
- [x] `getMyReadingBookIds` API 함수 추가 (`bookApi.js`)

### 2026-05-27
- [x] `BookCard.jsx` 디자인 개선 — 그리드 레이아웃, 장르 배지, hover 효과, `coverImageUrl` 필드 반영
- [x] `Home.jsx` 스켈레톤 로딩 UI 추가 (로딩 중 카드 형태 플레이스홀더)
- [x] `Home.jsx` 서버 다운 에러 화면 추가 (API 연결 실패 시 안내 화면)

### 2026-05-28
- [x] `BookDetail.jsx` `book.coverImage` → `book.coverImageUrl` 필드명 수정
- [x] `MyLibrary.jsx` 탭 순서 변경 (ALL → READING → SAVED → DONE) + SAVED 레이블 "담은 책" → "읽고 싶어요"
- [x] `useInfiniteBooks.js` 페이지 기반 → 커서 기반으로 전환 (`getBooksCursor`, `cursorRef`, `isResetRef` 사용, stale closure 방지)
- [x] `bookApi.js` `getBooksCursor(params)` 함수 추가 (`GET /api/books/cursor`)

### 2026-05-30
- [x] `ReadPage.jsx` 모바일 반응형 개선 — 단일 페이지 모드(`usePortrait={dim.isMobile}`), `contentH` 40px 안전 마진, `pageNumBarRef` DOM 높이 측정, 모바일 너비/높이 최적화 (아이폰 14 Pro 하단 잘림 해결)
- [x] `BookList.jsx` 모바일 그리드 중앙정렬 개선

### 2026-06-01
- [x] `ReadPage.css` GPU 가속 강제 활성화 — `will-change: transform`, `translateZ(0)`, `backface-visibility: hidden` 추가 → 안드로이드 모바일 책 넘김 버벅임 해소
- [x] `GeneratePage.jsx` 서술 시점 칩 UI 추가 (`VIEWPOINTS`: 3인칭/1인칭, 기본 3인칭)
- [x] `GeneratePage.jsx` 주인공 성격 칩 UI 추가 (`PROTAGONIST_TRAITS`: 6가지, 단일 선택, 재클릭 시 해제)
- [x] `generateBook` API 호출 시 `viewpoint`, `protagonistTrait` 필드 전송
- [x] 키워드 placeholder 예시 문구 개선 (`"예: 우주, 고양이, 우주선 탈출 / 지우, 하늘, 까칠한 천재"`)

### 2026-06-05
- [x] `GeneratePage.jsx` 생성 진행도 표시 — `progress` state + `stepRef` + `progressIntervalRef` 추가
  - 생성 요청 직후 10% 설정, 200ms 인터벌로 부드럽게 증가
  - `step="TEXT"` 구간: 10→50% (최대 50%에서 멈춤)
  - `step="IMAGE"` 감지 시 50%로 점프 후 50→90% (최대 90%에서 멈춤)
  - DONE 수신 시 100% → 800ms 후 navigate
  - 단계별 메시지: "✍️ 이야기를 쓰고 있어요..." / "🎨 표지를 그리고 있어요..." / "✨ 완성됐어요!"
- [x] `GeneratePage.css` 프로그레스 바 스타일 추가 — `.generate-progress-wrap` / `.generate-progress-fill` / `.generate-progress-pct` / `.generate-progress-msg`
- [x] `BookDetail.jsx` 공유 버튼 추가 — "본문 보기" 옆 📤 공유 버튼
  - `handleShare`: `navigator.share()` 호출 (Web Share API)
  - 미지원 브라우저: `navigator.clipboard.writeText(url)` + "링크가 복사됐어요!" 토스트
- [x] `BookDetail.css` `.share-btn` 스타일 추가 (테두리형, hover 시 primary 색상)

### 2026-06-07
- [x] `Home.jsx` 정렬 탭 UI 추가 — "추천 전자책" 타이틀 오른쪽에 최신순/평점순/조회수순 버튼 3개
  - `sort` state (기본값 `"latest"`) 및 `SORT_OPTIONS` 상수 추가
  - `params` useMemo에 `sort` 포함 → 정렬 변경 시 `paramsKey` 변경으로 자동 초기화·재조회
- [x] `Home.css` 정렬 탭 스타일 추가 — `.home-section-header` (flex, space-between), `.sort-tabs`, `.sort-tab`, `.sort-tab--active` (primary 색상, color-mix 배경)

### 2026-06-10
- [x] `GeneratePage.jsx` 장르 확장 — `GENRES` 9개 (`SF/판타지/로맨스/일상/공포/액션/스릴러/드라마/느와르`)
- [x] `GeneratePage.jsx` 분위기 확장 — `TONES` 7개 (기존 3개 + 신비로운/쓸쓸한/긴장감/웅장한 추가)
- [x] `GeneratePage.jsx` 주인공 성격 확장 — `PROTAGONIST_TRAITS` 13개 (기존 6개 + 고집스러운/순수한/냉소적인/외로운/야망있는/겁쟁이/반항적인 추가)
- [x] `BookDetail.jsx` 공유 버튼 순서 변경 — 본문보기 → **내서재담기** → **공유** 순으로 재배치
- [x] `BookDetail.css` 공유 버튼 스타일 변경 — 44×44px 원형 (`border-radius: 50%`), 배경 `var(--color-card)`, 테두리 `1px solid var(--color-border)`, 🔗 아이콘만 표시, hover 시 primary 색상

### 2026-06-11
- [x] `BookCard.jsx` 작가 이름 클릭 시 작가 프로필 페이지 이동 — `publishedBy` 있을 때 `<Link to="/profile/{id}">` 렌더링, `onClick stopPropagation`으로 카드 전체 클릭 이벤트와 분리
- [x] `BookCard.css` `.book-author-link` 스타일 추가 — hover 시 `color: var(--color-primary)` + `text-decoration: underline`
- [x] `Header.jsx` 드로어 메뉴에서 "둘러보기" 링크 제거 (라우트 `/explore`는 App.jsx에 유지)
- [x] `ExplorePage.jsx` 장르 필터 칩 추가 — `GENRES` 10개 상수, `selectedGenre` state, `filteredBooks` computed value
- [x] `ExplorePage.jsx` 카드 표지 이미지 구조 추가 — `explore-card-cover` div (coverImageUrl 있으면 `<img>`, 없으면 🍋 이모지)
- [x] `ExplorePage.css` 이미지 잘림 수정 — `max-height:200px` 제거, 카드 `padding:0; overflow:hidden`, 커버 `aspect-ratio:3/4`로 교체. 팔로우 버튼 스타일: 팔로우=primary bg+white / 팔로잉=border only
- [x] `FeedPage.jsx` 전면 재작성 — 팔로잉 작가 아바타 가로 스크롤 행 + 책 그리드 커버 카드 + 빈 화면 안내 ("둘러보기 →" 버튼)
- [x] `FeedPage.css` 전면 재작성 — 작가 아바타 행 (52px 원형, 가로 스크롤, `scrollbar-width:none`), 책 그리드 엣지-투-엣지 카드
- [x] `UserProfilePage.jsx` 책 카드에 표지 이미지 추가 — `profile-book-cover` div (`coverImageUrl` 있으면 `<img>`, 없으면 🍋 이모지)
- [x] `UserProfilePage.css` `.profile-book-cover`, `.profile-book-img`, `.profile-book-emoji` 스타일 추가, 팔로우 버튼 크기 개선 (padding 10px 28px)
- [x] `MyPage.jsx` 팔로워/팔로잉 통계 및 모달 추가 — 프로필 카드 내 클릭 가능 카운트 버튼, 탭 전환 모달로 목록 표시 (36px 아바타 + 프로필 링크)
- [x] `MyPage.css` 팔로우 통계/모달 관련 스타일 추가 (`.mypage-follow-stats`, `.mypage-modal-overlay`, `.mypage-modal` 등)

### 2026-06-14
- [x] `OAuthCallback.jsx` 보안 개선 — URL에서 `code`(단기 UUID)·`nickname`·`email`만 파싱, `exchangeOAuthCode(code)` 호출로 `POST /api/auth/code-exchange` 요청 → 응답에서 `accessToken`·`refreshToken` 수신 후 `saveAuth` 저장 (토큰이 URL에 노출되지 않음)
- [x] `userApi.js` `exchangeOAuthCode(code)` 함수 추가 — `POST /api/auth/code-exchange { code }`
- [x] `MyPage.jsx` userId 서버 조회로 변경 — `GET /api/users/me/lemon` 응답 or `/api/users/{email}` 기반으로 서버에서 userId 실시간 조회 (로컬 스토리지 캐시 제거로 로그인 직후 즉시 반영)

### 2026-06-15
- [x] `GeneratePage.jsx` 한 줄 시놉시스 입력 추가 — `synopsis` state, `<textarea>` UI (maxLength 100), API 전송 시 빈 문자열이면 `null`
- [x] `GeneratePage.jsx` 분위기 다중 선택 (최대 2개) — `tones: ["WARM"]` 배열 state, `toggleTone()`: 마지막 1개 유지 강제, 2개 초과 시 `"최대 2개까지 선택 가능해요"` 토스트
- [x] `GeneratePage.jsx` 주인공 성격 다중 선택 (최대 3개) — `protagonistTraits: []` 배열 state, `toggleTrait()`: 재클릭 해제, 3개 초과 시 `"최대 3개까지 선택 가능해요"` 토스트
- [x] `GeneratePage.jsx` 주인공 여러 명 (최대 3명) — `protagonistNames: [""]` 배열 state, 동적 추가/삭제 UI (`+ 주인공 추가` 버튼, × 삭제 버튼)
- [x] `GeneratePage.jsx` 조연 등장인물 (최대 4명) — `characters: []` 배열 state, 동적 추가/삭제 UI
- [x] 다중 선택 칩에 `✓` 체크 아이콘 표시 (`chip-check` span), `chip-group--multi` 클래스 구분
- [x] `GeneratePage.css` 캐릭터 입력 스타일 추가 — `.character-list`, `.character-input-row`, `.character-remove-btn` (원형 ×), `.character-add-btn` (dashed border)
- [x] `ReadPage.jsx` 모바일 텍스트 잘림 근본 해결 — `getPageDimensions()`에서 `window.innerWidth` → `document.documentElement.clientWidth` 사용 (iOS Safari 스크롤바·노치 제외 실제 콘텐츠 너비)
- [x] `ReadPage.jsx` 모바일 단일 페이지 강제 적용 — 모바일 감지 로직 확정 (`clientWidth ≤ 640`), `usePortrait={dim.isMobile}` 유지
- [x] `BookDetail.jsx` 다크모드 별점 색상 수정 — `[data-theme="dark"] .review-star-btn` inactive `color: #888`, active `color: #f5c842` 추가
- [x] 텍스트 입력 `onKeyDown` 엔터 제출 방지 — 주인공·조연 `<input>`에 `e.key === 'Enter'` 시 `e.preventDefault()` 추가
- [x] `BookGenerationContext` 전역 책 생성 폴링 — 페이지 이동해도 생성 상태 유지, 완료 시 알림 토스트

### 2026-06-16~22
- [x] `ReadPage.jsx` 모바일 텍스트 잘림 근본 해결 — `document.documentElement.clientWidth` 사용 (iOS Safari `innerWidth` 불일치 해결)
- [x] `ReadPage.jsx` 데스크톱/모바일 그림자 분리 — `drawShadow={!dim.isMobile}` (모바일은 정적 CSS 그림자, 데스크톱은 JS 동적 그림자)
- [x] `ReadPage.css` 중앙 그라데이션 — `.html-flipbook::after` (데스크톱만, 모바일 `display: none`)
- [x] `ReadPage.css` 책 읽기 화면 글래스모피즘 통일 — 헤더(`rgba(255,255,255,0.6)` + `backdrop-filter: blur(12px)`), 진행바(`height: 2px`, 레몬→그린 그라데이션), 네비게이션 버튼(`rgba(255,255,255,0.6)` + `blur(10px)`), 페이지 번호(`opacity: 0.5`)
- [x] `ReadPage` 페이지 분할 로직 개선 — 창 크기(높이) 변경 시 자동 재분할, 문장 단위 분리로 빈공간 제거
- [x] `BookGenerationContext` 전역 책 생성 폴링 — 페이지 이동해도 생성 상태 유지, 완료 시 알림 토스트, 최소화 버블 UI
- [x] `BookCard.css` 디자인 개선 — 그린 계열 그림자, `translateY(-6px) scale(1.02)` hover, 글래스모피즘 장르 배지
- [x] `BookDetail.jsx` 전면 포스터 스타일 재설계 — 블러 배경(`position:fixed`, `blur(60px)`), 세로 정렬, 명조체 제목, 레몬옐로우 `본문보기` 버튼(240×52px), 원형 보조버튼(서재담기/공유)
- [x] `BookDetail.css` 레몬 옐로우 통일 — `.btn-read-primary` `linear-gradient(135deg, #F0C75E, #E0AD3C)`, `.btn-icon-circle` 글래스모피즘, `genre-pill` 옐로우 틴트
- [x] `BookDetail.css` 리뷰 폼 디자인 통일 — 폼 컨테이너 글래스모피즘, 별점 26px + `#F0C75E`, textarea focus 레몬 링, 제출버튼 레몬 그라데이션
- [x] `GeneratePage.jsx` 시놉시스 입력 추가 — `synopsis` state, `<textarea>` UI (maxLength 100)
- [x] `GeneratePage.jsx` 분위기 다중 선택 (최대 2개), 성격 다중 선택 (최대 3개)
- [x] `GeneratePage.jsx` 주인공 여러 명 (최대 3명), 조연 등장인물 (최대 4명) — 동적 추가/삭제 UI
- [x] `OAuthCallback.jsx` 보안 개선 — URL에서 단기 UUID 코드 파싱 → `POST /api/auth/code-exchange` 교환
- [x] `MyPage.jsx` 팔로워/팔로잉 모달 추가 — 클릭 가능 카운트, 탭 전환 목록
- [x] `Header.jsx` 둘러보기 드로어 링크 제거
- [x] 다크모드 별점 색상 수정, 닉네임 에러 메시지, 엔터 제출 방지

### 2026-06-23
- [x] `MyPage.css` / `MyLibrary.css` 디자인 통일 — 글래스모피즘 + 레몬 옐로우 톤
  - 프로필·레몬트리·계정 카드: `rgba(255,255,255,0.6)` + `backdrop-filter: blur(12px)` + `box-shadow: 0 4px 20px rgba(0,0,0,0.04)`, 테두리 `rgba(61,43,31,0.08)`
  - 아바타: `linear-gradient(135deg, #5b7e5a, #4a6b49)` 그라데이션
  - 레몬트리 통계 박스·empty 메시지: `rgba(240,199,94,0.1)` 옐로우 틴트
  - 닉네임 input focus: `border-color: rgba(240,199,94,0.6)` + 옐로우 glow, 변경 버튼: `linear-gradient(135deg, #F0C75E, #E0AD3C)` + `color: #3D2B1F`
  - 탈퇴 버튼: 테두리 제거, hover 시만 `rgba(220,53,69,0.08)` 틴트
  - 서재 통계 카드: 글래스모피즘 + 숫자 `#E0AD3C` 강조
  - 서재 필터 탭 선택: `linear-gradient(135deg, #F0C75E, #E0AD3C)` + `color: #3D2B1F`, 비선택: `rgba(61,43,31,0.15)` 테두리
  - 서재 책 카드: 글래스모피즘 + hover `translateY(-3px)` + 그린 그림자
- [x] `variables.css` 독서 다크모드 변수 교체 — `--color-read-bg: #1c1614`, `--color-read-page: #2a2220`, `--color-read-text: #e8ddd0`, `--color-read-page-num: #a89888`
- [x] `ReadPage.css` 다크모드 전면 개편 — 차가운 네이비(`#1a1a2e`) → 따뜻한 브라운 블랙(`#1c1614`)
  - `[data-theme="dark"] .read-container::before`: `position: fixed`, `radial-gradient(rgba(240,199,94,0.06))` 은은한 스탠드 불빛
  - 다크 헤더: `rgba(28,22,20,0.7)`, 진행바: `linear-gradient(90deg, #d4a04a, #8a6a3a)`, 버튼: `rgba(255,255,255,0.08)` + 흰 테두리
- [x] `ReadPage.css` 라이트모드 배경 나무 책상 텍스처 — `repeating-linear-gradient(91deg)` + `repeating-linear-gradient(90deg)` 나무 결 + `linear-gradient(180deg, #e0b888, #c99a64)`
- [x] `ReadPage.css` 다크모드 배경 누수 버그 수정 — `[data-theme="dark"] .read-container`에 `background-color: #1c1614; background-image: none` 명시
- [x] `ReadPage.jsx` 데스크톱 큰 화면(≥1400px) 책 너비 확장 → 재조정 — `Math.min(vw * 0.58, 950) / 2` (비율 0.68→0.58, 상한 1100→950px)
- [x] `ReadPage.jsx` `.read-book` 동적 `maxWidth` 인라인 스타일 추가 — CSS `max-width: 800px` 고정 한계 해소, 책 너비에 맞춰 자동 확장
- [x] `ReadPage.jsx` `VERTICAL_CHROME` 215→230, 모바일 높이 `vh-200`→`vh-220` (세로 스크롤바 방지 버퍼)
- [x] `ReadPage.css` `.flip-page-inner` `overflow: hidden` 추가 (내용 넘침 스크롤 차단)
- [x] `ReadPage.jsx` 이전/다음 버튼 라벨 단순화 — `"이전 페이지"/"다음 페이지"` → `"이전"/"다음"`
- [x] `ReadPage.css` 이전/다음 버튼 글래스모피즘 물방울 스타일 — `backdrop-filter: blur(16px) saturate(180%)`, 라이트 `rgba(255,255,255,0.35)` / 다크 `rgba(255,255,255,0.08)`, `inset 0 1px 1px rgba(255,255,255,0.4)` 하이라이트
- [x] `ReadPage.css` 하단 버튼 영역 잘림 수정 — `padding-bottom: 24px`, `.read-book` `overflow-x: hidden`(수직 잘림 제거), `.read-nav` `padding-bottom: env(safe-area-inset-bottom, 8px)`
- [x] `ReadPage.css` 페이지 번호 `font-size: 13px` + `opacity: 0.6`, 헤더·진행바 `max-width: 1100px`으로 확장

### 2026-06-16
- [x] `ReadPage.css` 책 읽기 화면 전면 디자인 개선:
  - 배경: 라이트 `#f5f0e8` (크림) / 다크 `#1a1a2e` (딥 네이비)
  - 페이지: 라이트 `#fefcf7` (아이보리) / 다크 `#16213e`
  - `.flip-page` `border: 1px solid rgba(0,0,0,0.08)` + `box-shadow: 0 4px 20px rgba(0,0,0,0.08)`
  - `.read-para` `font-family: 'Georgia', 'Nanum Myeongjo', serif` + `font-size: 16px` + `text-indent: 1.5em`
  - `.flip-page-num` `font-family: Georgia, serif` + `font-size: 12px` + `color: #999`
  - `.read-header` `background: rgba(255,255,255,0.95)` + `backdrop-filter: blur(8px)` + `border-bottom`
  - `.read-progress-fill` `height: 3px` + `background: linear-gradient(to right, #5b7e5a, #8ab87a)`
  - `.read-nav-btn` `border-radius: 24px`
- [x] `variables.css` 독서 페이지 CSS 변수 업데이트 — 라이트 `--color-read-bg: #f5f0e8`, 다크 `--color-read-bg: #1a1a2e` / `--color-read-page: #16213e`

---

## 앞으로 할 작업
- [ ] GitHub Actions CI/CD
- [ ] 광고 보고 레몬 추가 획득
- [ ] 서비스 스크린샷 촬영 및 `docs/screenshots/` 추가
- [ ] 테스트 코드 작성 (Jest)
- [ ] 평점순/조회수순 정렬 시 무한 스크롤 지원 검토 (현재 상위 12개 고정)

---

## 코드 수정 원칙
1. 파일을 먼저 Read한 뒤 수정한다.
2. 요청된 범위 외 수정(리팩터링, 주석 추가 등)은 하지 않는다.
3. 새 라이브러리는 꼭 필요한 경우에만 추가한다.
4. CSS는 `variables.css`의 변수를 우선 사용한다. 하드코딩 금지 (의미 있는 고정값 예외).

---

## Git / 커밋 규칙
- 사용자가 명시적으로 요청할 때만 커밋한다.
- 커밋 메시지: `feat:` / `fix:` / `style:` / `refactor:` / `docs:`
