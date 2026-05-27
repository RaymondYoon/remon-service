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
/                → Home.jsx            책 목록 + 검색 + 장르 필터 (debounce 300ms)
/book/:id        → BookDetail.jsx      책 상세 + 서재 담기 + 별점/리뷰
/book/:id/read   → ReadPage.jsx        react-pageflip 책 본문 뷰어 (두 페이지 고정)
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
│   ├── useInfiniteBooks.js — 무한 스크롤 페이지네이션
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
- 분량은 3000자 내외로 고정

---

## 책 뷰어 (ReadPage)
- react-pageflip으로 두 페이지 모드 고정 (usePortrait=false)
- DOM 높이 기반 페이지 분할 (`buildPagesByHeight` 함수) — binary search로 단락 잘림 방지
- 키보드 방향키 지원 (← →)
- 읽은 페이지 localStorage + 서버 양쪽 저장 (debounce 1500ms)
- 완독 시 자동으로 DONE 상태 처리
- **ReadPage 방문 시 `startReading` 자동 호출** — 서재에 없는 책도 READING으로 자동 등록

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

---

## 앞으로 할 작업
- [ ] GitHub Actions CI/CD
- [ ] 광고 보고 레몬 추가 획득
- [ ] 무한 스크롤 (useInfiniteBooks 연동 완성)
- [ ] 테스트 코드 작성 (Jest)

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
