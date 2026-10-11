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
│   ├── GenerationToast.jsx — 전역 책 생성 진행/완료 토스트
│   ├── Footer.jsx
│   └── generate/           — GeneratePage 섹션 컴포넌트
│       ├── generateOptions.js — 장르·분위기·결말·시점·성격 상수와 최대 개수
│       ├── LemonPanel.jsx, GenerateField.jsx, ChipGroup.jsx
│       └── KeywordInput.jsx, NameListInput.jsx (주인공/조연)
├── context/
│   └── BookGenerationContext.jsx — 전역 생성 상태 폴링 (페이지 이동해도 유지)
├── hooks/
│   ├── useBooks.js         — 책 목록 + 키워드 필터 fetch
│   ├── useInfiniteBooks.js — 무한 스크롤 페이지네이션 (params에 sort 포함 — 변경 시 자동 초기화·재조회)
│   ├── usePagination.js    — 책 뷰어 화면 크기·페이지 분할·현재 페이지 상태
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
    ├── lemonStorage.js     — 일일 레몬 사용 횟수 추적 (localStorage, 자정 초기화)
    └── paginateContent.js  — 본문을 렌더 높이 기준으로 페이지 분할하는 DOM 유틸
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
- GeneratePage: LemonTree 표시 + "보유 레몬 N개 · 오늘 N/{maxDaily}회 사용" (현재 하루 2개), 레몬 0개 시 생성 버튼 비활성화
- 생성 실패(FAILED) 시 서버가 레몬을 자동 환불 — 실패 토스트에 환불 안내
- MyPage: LemonTree + 통계 (남은/사용/한도)
- `src/utils/lemonStorage.js`: localStorage 기반 일일 사용 횟수 추적 (자정 초기화)
- LemonTree 단계: 0개=앙상한 나무 / 1~3개=잎+열매 / 4개 이상=풍성+최대 8개

---

## 책 생성 옵션 (GeneratePage)
- 옵션 값·최대 개수는 `components/generate/generateOptions.js` 에서 관리 (백엔드 프롬프트 매핑과 값 일치 필요)
- **키워드**: 최대 4개 (태그 형식, Enter/쉼표로 추가)
- **장르** 9종: SF / 판타지 / 로맨스 / 일상 / 공포 / 액션 / 스릴러 / 드라마 / 느와르
- **분위기** 10종, 최대 2개 (마지막 1개는 해제 불가)
- **결말**: 해피엔딩(HAPPY) / 새드엔딩(SAD) / 열린결말(OPEN)
- **주인공 이름**: 최대 3명 (비워두면 AI가 결정) / **조연**: 최대 4명
- **한 줄 시놉시스**: 선택, 100자
- **서술 시점**: 3인칭(기본) / 1인칭
- **주인공 성격** 17종, 최대 3개 (다시 누르면 해제)
- 분량은 6000자 내외로 고정 (서버 프롬프트)
- 제출 후 `startGeneration(bookId)` → 홈으로 이동, 진행 상황은 `BookGenerationContext` 가 전역 폴링

---

## 책 뷰어 (ReadPage)
- 구조: `ReadPage.jsx`(화면·저장) + `hooks/usePagination.js`(크기·분할·현재 페이지) + `utils/paginateContent.js`(분할 알고리즘)
- `usePortrait={dim.isMobile}` — 모바일(≤640px) 단일 페이지, 데스크톱 두 페이지 (≥1400px 화면은 책 너비 최대 950px)
- 페이지 분할: 화면 밖 측정용 프레임(`PageMeasureFrame`)의 실제 본문 칸 높이 기준 — 문단 → 문장 → 글자(이진 탐색) 순으로 쪼개 빈 공간 최소화
- 창 크기 변경 시 300ms 디바운스 후 재분할, 읽던 위치는 진행률 기준으로 유지
- 시작 페이지: 라우터 state `lastReadPage` → localStorage(`remon_page_{email}_{bookId}`) → 0
- 키보드 방향키 지원 (← →)
- 읽은 페이지 localStorage + 서버 양쪽 저장 (debounce 1500ms), 마지막 페이지 도달 시 완독(DONE) 처리
- **ReadPage 방문 시 `startReading` 자동 호출** — 서재에 없는 책도 READING으로 자동 등록
- GPU 가속(`will-change`, `translateZ(0)`) — 안드로이드 책 넘김 버벅임 방지

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
  (백엔드는 토큰 없음/만료 시 401, 권한 부족 시 403 을 반환)
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

## 앞으로 할 작업
- [ ] CD (자동 배포) — CI 는 구축됨 (PR/main 푸시 시 `npm run build`)
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
