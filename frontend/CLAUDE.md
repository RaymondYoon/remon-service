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
/               → Home.jsx          책 목록 + 검색 (실 API 연동)
/book/:id       → BookDetail.jsx    책 상세 + 서재 담기 + AI 생성 배너
/book/:id/read  → ReadPage.jsx      책 본문 페이지 뷰어
/login          → Login.jsx         이메일 로그인 + 카카오 로그인 버튼
/signup         → Signup.jsx        회원가입
/library        → MyLibrary.jsx     내 서재 (ProtectedRoute — 로그인 필수)
/my-books       → MyBooks.jsx       내가 만든 책 목록 (ProtectedRoute)
/generate       → GeneratePage.jsx  AI 책 생성 입력 폼 (ProtectedRoute)
/oauth-callback → OAuthCallback.jsx 카카오 로그인 처리
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

## 완료된 작업 (2026-04-26)
- [x] JWT Refresh Token 구조 도입 (Access 15분 + Refresh 7일)
- [x] localStorage 키를 `token` → `accessToken`으로 변경, `refreshToken`도 저장
- [x] axiosInstance 401 자동 재발급 로직 추가 (큐 처리 포함)
- [x] OAuthCallback.jsx에서 accessToken + refreshToken 파라미터 파싱
- [x] 카카오 로그인 정상 동작 확인
- [x] Docker + docker-compose 로컬 개발환경 구축
  - `.env` 파일로 환경변수 관리
  - `application-local.properties`로 로컬 DB 설정 분리

## 앞으로 할 작업
- [ ] GitHub Actions CI/CD
- [ ] AI 책 생성 비동기 처리 연동 (현재 60초 블로킹)
- [ ] 책 생성 로딩 애니메이션 개선
- [ ] 다른 사람 책 둘러보기 페이지 (공개/비공개)
- [ ] 별점/리뷰 기능
- [ ] 다크모드 전체 완성도 개선

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
