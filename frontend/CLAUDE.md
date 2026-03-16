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
- CSS: 컴포넌트별 CSS 파일 + `src/styles/variables.css` 공통 변수

---

## 현재 구현된 라우팅 구조
```
/               → Home.jsx          책 목록 + 검색 (실 API 연동)
/book/:id       → BookDetail.jsx    책 상세 + 서재 담기
/login          → Login.jsx         이메일 로그인 + 카카오 로그인 버튼
/signup         → Signup.jsx        회원가입
/library        → MyLibrary.jsx     내 서재 (ProtectedRoute — 로그인 필수)
/oauth-callback → OAuthCallback.jsx 카카오 로그인 처리
```

## 구현 예정 페이지
```
/generate        → GeneratePage.jsx     AI 책 생성 입력 폼 (미구현)
/generate/result → GenerateResult.jsx   생성 중 로딩 + 완료 화면 (미구현)
```

위 두 페이지는 백엔드 AI 생성 API가 준비된 시점에 함께 구현한다.
지금 당장 만들지 않는다.

---

## 디자인 시스템 (Remon 톤)
- **컨셉**: 따뜻하고 차분한 전자책 서비스. 레몬빛 청량함 + 독서의 편안함.
- **Primary**: `#5b7e5a` (세이지 그린 — `--color-primary`)
- **Background**: `#fafaf7` (크림 화이트 — `--color-bg`)
- **Accent**: `#f5c842` (레몬 옐로우 — `--color-accent`)
- 둥근 카드(14~16px), 안정적인 여백, 미니멀한 구성
- 과한 애니메이션 지양. 필요한 곳에만 subtle한 transition.
- 신규 색상은 `variables.css`에 먼저 추가한 뒤 사용한다.

---

## AI 생성 UX MVP 흐름 (구현 예정)
백엔드 API가 준비되면 아래 흐름으로 구현한다.

### GeneratePage (`/generate`)
- 입력: 키워드(태그 형태, 최대 3개) + 장르 선택 + 분량 선택 + 톤 선택
- 비로그인 상태에서 생성 시도 시 → 로그인 페이지로 유도
- 제출 후 `/generate/result`로 이동

### GenerateResult (`/generate/result`)
- 생성 중: 기대감을 주는 로딩 UI (단순 스피너보다 텍스트 메시지 권장)
- 완료: "책이 완성됐어요!" + 바로 읽기 / 서재로 이동 버튼
- 실패: 원인 안내 + 재시도 버튼

---

## API 연동 규칙
- 모든 API 호출은 `src/api/axiosInstance.js`를 통한다 (직접 axios 임포트 금지)
- 인증 토큰은 axiosInstance 인터셉터가 자동 첨부
- 401 응답 시 자동 로그아웃 + `/login` 리다이렉트 (인터셉터 처리됨)
- API 함수는 도메인별로 분리:
  - `src/api/userApi.js` — 로그인, 회원가입
  - `src/api/bookApi.js` — 책 목록, 상세, 서재
  - `src/api/generationApi.js` — AI 생성 (추가 예정, 백엔드 준비 후)

---

## 인증 유틸리티 (`src/utils/auth.js`)
- `saveAuth(data)` — token + user 분리 저장
- `isLoggedIn()` — 토큰 존재 + JWT 만료 여부 동시 확인
- `clearAuth()` — 로그아웃 시 localStorage 전체 제거
- 인증이 필요한 페이지는 반드시 `ProtectedRoute`로 감싼다

---

## 코드 수정 원칙
1. 파일을 먼저 Read한 뒤 수정한다.
2. 요청된 범위 외 수정(리팩터링, 주석 추가 등)은 하지 않는다.
3. 새 라이브러리는 꼭 필요한 경우에만 추가한다.
4. CSS는 `variables.css`의 변수를 우선 사용한다.

---

## Git / 커밋 규칙
- 사용자가 명시적으로 요청할 때만 커밋한다.
- 커밋 메시지: `feat:` / `fix:` / `style:` / `refactor:`
