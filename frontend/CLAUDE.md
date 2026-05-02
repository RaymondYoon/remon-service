# CLAUDE.md — Remon Service Frontend 작업 규칙

## 서비스 개요
Remon은 사용자가 키워드와 간단한 내용을 입력하면
AI가 짧은 전자책/소설을 생성해주는 서비스다.

---

## 작업 범위
- 이 파일이 있는 `frontend/` 폴더 내부만 읽고 수정한다.
- 상위 디렉터리나 `backend/`는 접근하지 않는다.

---

## 기술 스택
- React 19, react-router-dom v7
- axios (공통 인스턴스: `src/api/axiosInstance.js`)
- 상태관리: useState / useEffect (전역 상태 라이브러리 없음)
- CSS: 컴포넌트별 CSS 파일 + `src/styles/variables.css` 공통 변수 (다크/라이트 토큰 포함)

---

## 배포 현황
- **플랫폼**: Vercel
- **운영 URL**: `https://remon-service.vercel.app`
- **API 연결**: `REACT_APP_API_URL=https://remon-service-production.up.railway.app`
- 카카오 로그인 URL도 `REACT_APP_API_URL` 환경변수로 처리

---

## 현재 구현된 라우팅 구조
```
/               → Home.jsx           책 목록 + 검색 + 장르 필터 (debounce 300ms)
/book/:id       → BookDetail.jsx     책 상세 + 서재 담기 + AI 생성 배너 + 별점/리뷰
/book/:id/read  → ReadPage.jsx       책 본문 페이지 뷰어
/login          → Login.jsx          이메일 로그인 + 카카오 로그인 버튼
/signup         → Signup.jsx         회원가입
/library        → MyLibrary.jsx      내 서재 (ProtectedRoute)
/my-books       → MyBooks.jsx        내가 만든 책 목록 (ProtectedRoute)
/generate       → GeneratePage.jsx   AI 책 생성 입력 폼 (ProtectedRoute)
/explore        → ExplorePage.jsx    공개 책 둘러보기 + 작가 팔로우
/feed           → FeedPage.jsx       팔로잉 피드 (ProtectedRoute)
/profile/:userId → UserProfilePage.jsx 유저 프로필 + 팔로우 토글
/oauth-callback → OAuthCallback.jsx  카카오 로그인 처리
```

---

## UI 구조
- **헤더**: 로고(🍋 Remon) 왼쪽 고정, 햄버거(☰) 버튼 오른쪽 — 웹/모바일 공통
- **드로어**: 오른쪽 슬라이드 메뉴 (260px), 오버레이 클릭 또는 ✕ 버튼으로 닫기
- **다크모드**: 🌙/☀️ 토글 버튼 (헤더 우측), localStorage 저장, 새로고침 유지
  - `src/hooks/useTheme.js` — `data-theme` attribute + localStorage
  - CSS variables(`[data-theme="dark"]`)로 전체 색상 전환
  - 모든 페이지/컴포넌트 CSS가 변수 기반으로 작성되어 있음

---

## 디자인 시스템 (Remon 톤)
- **컨셉**: 따뜻하고 차분한 전자책 서비스. 레몬빛 청량함 + 독서의 편안함.
- **Primary**: `#5b7e5a` (세이지 그린 — `--color-primary`)
- **Background (라이트)**: `#fafaf7` (크림 화이트 — `--color-bg`)
- **Background (다크)**: `#121212` (`--color-bg`)
- **Card (다크)**: `#1e1e1e` (`--color-card`)
- **Accent**: `#f5c842` (레몬 옐로우 — `--color-accent`)
- 둥근 카드(14~16px), 안정적인 여백, 미니멀한 구성
- 신규 색상은 반드시 `variables.css`에 먼저 추가한 뒤 사용한다.
- 하드코딩된 색상값(`#2c2c2c`, `#fff` 등)은 사용하지 않는다.

---

## 완료된 작업

### 2026-04-26
- [x] JWT Refresh Token 구조 도입 (Access 15분 + Refresh 7일)
- [x] localStorage 키를 `token` → `accessToken`으로 변경, `refreshToken`도 저장
- [x] axiosInstance 401 자동 재발급 로직 추가 (큐 처리 포함)
- [x] OAuthCallback.jsx에서 accessToken + refreshToken 파라미터 파싱
- [x] 카카오 로그인 정상 동작 확인
- [x] Docker + docker-compose 로컬 개발환경 구축

### 2026-04-30
- [x] 팔로우/언팔로우 기능 (followApi.js — POST/DELETE /api/follow/{userId})
- [x] 공개 책 둘러보기 페이지 `/explore` (작가별 팔로우 버튼 포함)
- [x] 팔로잉 피드 페이지 `/feed` (ProtectedRoute)
- [x] 유저 프로필 페이지 `/profile/:userId` (팔로우 토글, 공개 책 목록)
- [x] 별점·리뷰 기능 — BookDetail.jsx에 별점 선택 폼 + 리뷰 목록 + 삭제
- [x] BookCard에 평균 별점 표시 (`averageRating`)
- [x] 별점 UI 개선 — 크기 2rem, 선택 색상 #FFD700, hover fill 효과
- [x] 다크모드 완성도 개선 — CSS variables 통일 (`--color-error-bg`, `--color-error-border`)
- [x] 검색 기능 개선 — 장르 드롭다운(전체/SF/판타지/로맨스/일상/공포), debounce 300ms, 빈 결과 메시지
- [x] AI 책 생성 비동기 처리 연동 (60초 블로킹 → 1초 이내 응답, 폴링 방식)

### 2026-05-01
- [x] 알림 기능 구현 — 리뷰/팔로우 시 알림 생성, 헤더 🔔 뱃지, 드롭다운 UI
- [x] 레몬 시스템 구현 — 하루 1개 자동 충전, 책 생성 시 소모, 하루 3회 제한
- [x] 레몬 떨어지는 애니메이션 추가
- [x] OpenAI → Groq → Gemini API 마이그레이션 (gemini-2.5-flash)
- [x] 마크다운 제거 `cleanContent()` 함수 추가 (ReadPage.jsx)
- [x] react-pageflip으로 진짜 책 넘기는 애니메이션 구현
  - 데스크탑: 두 페이지 펼침 (usePortrait=false)
  - 모바일: 한 페이지씩 (usePortrait=true)
  - 키보드 방향키 지원
- [x] ESLint 에러 수정 — Vercel 빌드 실패 해결 (cleanContent 정규식 이스케이프)

### 2026-05-02
- [x] Lighthouse 성능 최적화
  - index.html 타이틀/메타 태그 업데이트 (og:title, og:description, twitter:card 등 SEO)
  - Google Fonts Noto Sans KR preconnect + preload
  - React.lazy + Suspense로 모든 페이지 컴포넌트 code splitting
  - BookCard, BookList → React.memo로 불필요한 리렌더링 방지
  - BookCard 커버 이미지 → `<img loading="lazy">` 변환 (background-image → img 태그)
  - MyLibrary filteredBooks → useMemo 적용
- [x] 레몬트리 UI
  - `src/components/LemonTree.jsx` + `LemonTree.css` — CSS/SVG 직접 구현
  - 레몬 0개: 앙상한 나무 (가지 끝 노출)
  - 레몬 1~3개: 잎 조금 + 레몬 열매
  - 레몬 4개 이상: 풍성한 나무 + 레몬 최대 8개
  - 레몬 소모 시 열매 떨어지는 CSS 애니메이션
  - `src/utils/lemonStorage.js` — localStorage 기반 일일 레몬 추적 (하루 3개, 자정 초기화)
  - MyLibrary.jsx 상단에 레몬트리 섹션 추가
  - GeneratePage에서 생성 성공 시 consumeLemon() 호출

## 앞으로 할 작업
- [ ] GitHub Actions CI/CD
- [ ] 광고 보고 레몬 추가 획득
- [ ] 페이지네이션 / 무한 스크롤
- [ ] 테스트 코드 작성
- [ ] React Native 앱 개발 검토
- [ ] Oracle Cloud로 이전 검토 (메모리 여유)

---

## API 연동 규칙
- 모든 API 호출은 `src/api/axiosInstance.js`를 통한다 (직접 axios 임포트 금지)
- 인증 토큰은 axiosInstance 인터셉터가 자동 첨부
- 401 응답 시 자동 로그아웃 + `/login` 리다이렉트 (인터셉터 처리됨)
- API 함수는 도메인별로 분리:
  - `src/api/userApi.js` — 로그인, 회원가입
  - `src/api/bookApi.js` — 책 목록, 상세, 서재, AI 생성
  - `src/api/generationApi.js` — AI 생성 전용 (백엔드 비동기 API 준비 후 분리 예정)

---

## 인증 유틸리티 (`src/utils/auth.js`)
- `saveAuth(data)` — accessToken + refreshToken + user 분리 저장
  - localStorage 키: `accessToken`, `refreshToken`, `user`
- `getToken()` — `accessToken` 키로 읽음
- `isLoggedIn()` — 토큰 존재 + JWT 만료 여부 동시 확인
- `clearAuth()` — accessToken, refreshToken, user 전체 제거
- 인증이 필요한 페이지는 반드시 `ProtectedRoute`로 감싼다

## axiosInstance 동작 (`src/api/axiosInstance.js`)
- 요청 인터셉터: `accessToken`을 `Authorization: Bearer` 헤더에 자동 첨부
- 401 응답 시: `POST /api/auth/refresh`로 refreshToken 전송 → 새 accessToken 저장 후 원래 요청 재시도
- 동시 다발 401 요청은 큐(failedQueue)로 처리
- 갱신 실패 시 clearAuth + `/login` 리다이렉트

---

## 코드 수정 원칙
1. 파일을 먼저 Read한 뒤 수정한다.
2. 요청된 범위 외 수정(리팩터링, 주석 추가 등)은 하지 않는다.
3. 새 라이브러리는 꼭 필요한 경우에만 추가한다.
4. CSS는 `variables.css`의 변수를 우선 사용한다. 하드코딩 금지.

---

## Git / 커밋 규칙
- 사용자가 명시적으로 요청할 때만 커밋한다.
- 커밋 메시지: `feat:` / `fix:` / `style:` / `refactor:` / `docs:`
