# 🍋 Remon — AI 전자책 생성 서비스

![Java](https://img.shields.io/badge/Java_17-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_3.5-6DB33F?style=flat&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=flat&logo=mysql&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

> 키워드 몇 개를 입력하면 AI가 나만의 단편 소설을 만들어주는 풀스택 웹 서비스

**서비스 URL**: https://remon-service.vercel.app
**Swagger API 문서**: https://remon-service-production.up.railway.app/swagger-ui.html

---

## 목차
1. [프로젝트 소개](#프로젝트-소개)
2. [기술 스택](#기술-스택)
3. [주요 기능](#주요-기능)
4. [아키텍처](#아키텍처)
5. [핵심 구현 내용](#핵심-구현-내용)
6. [트러블슈팅](#트러블슈팅)
7. [로컬 실행 방법](#로컬-실행-방법)

---

## 프로젝트 소개

Remon은 "레몬처럼 상큼한 독서 경험"을 모티프로 한 AI 전자책 생성 플랫폼입니다.

- 키워드, 장르, 분위기, 결말, 주인공 이름을 입력하면 Google Gemini가 3000자 내외의 단편 소설을 비동기로 생성합니다.
- 생성된 책은 react-pageflip 기반 뷰어에서 실제 책처럼 넘겨 읽을 수 있습니다.
- 레몬 경제 시스템(하루 1개 자동 충전, 1일 3회 생성 제한)으로 사용 제한을 둡니다.
- 팔로우, 리뷰, 피드 등 소셜 기능으로 다른 사용자가 만든 책도 탐색할 수 있습니다.

---

## 기술 스택

### Backend
| 분류 | 기술 |
|------|------|
| 언어 / 프레임워크 | Java 17, Spring Boot 3.5.5 |
| 인증 | Spring Security, JWT (jjwt 0.12.6), 카카오 OAuth 2.0 |
| DB / ORM | MySQL 8, Spring Data JPA, Hibernate |
| AI | Google Gemini API (gemini-2.5-flash) |
| Rate Limiting | Bucket4j 8.10.1 |
| API 문서 | springdoc-openapi 2.8.3 (Swagger UI) |
| 빌드 / 배포 | Gradle, nixpacks, Railway |

### Frontend
| 분류 | 기술 |
|------|------|
| 프레임워크 | React 19 |
| 라우팅 | react-router-dom v7 |
| HTTP 클라이언트 | axios (공통 인스턴스, 401 자동 재발급) |
| 책 뷰어 | react-pageflip 2.0.3 |
| 스타일링 | CSS + CSS 변수 (다크/라이트 모드) |
| 배포 | Vercel |

### Infra
| 분류 | 기술 |
|------|------|
| 컨테이너 | Docker, docker-compose |
| 백엔드 호스팅 | Railway (JVM -Xms128m -Xmx400m) |
| 프론트엔드 호스팅 | Vercel |
| DB 호스팅 | MySQL on Railway (내부 연결) |

---

## 주요 기능

### AI 책 생성
- 키워드(최대 4개), 장르, 분위기, 결말, 주인공 이름 → Google Gemini API로 3000자 소설 생성
- 비동기 처리(202 Accepted + 폴링 방식)로 UI 블로킹 없이 생성 진행 상태 실시간 확인

### 책 뷰어
- react-pageflip으로 실제 책처럼 페이지 넘기기 애니메이션
- DOM 높이 기반 자동 페이지 분할 — 텍스트 잘림 없이 모든 화면 크기에서 정확한 페이지 구성
- 읽은 페이지 localStorage + 서버 양쪽 저장, 이어 읽기 지원

### 레몬 경제 시스템
- 유저당 레몬 보유량 관리 (DB 기반), 자정에 1개 자동 충전
- 책 생성 시 레몬 1개 소모 / 하루 최대 3회 생성 제한
- 레몬트리 UI: 보유 레몬 개수에 따라 나무가 자라는 시각화 (CSS/SVG 직접 구현)

### 소셜 기능
- 팔로우/언팔로우, 팔로잉 유저의 책 피드
- 별점(1~5점) + 리뷰 작성 (유저당 1개 제한, 중복 방지)
- 리뷰/팔로우 이벤트 실시간 알림 + 헤더 미읽음 뱃지

### 인증
- 이메일 회원가입/로그인 + 카카오 OAuth 2.0
- JWT Access Token(15분) + Refresh Token(7일) 자동 재발급
- 401 응답 시 axiosInstance 인터셉터에서 자동으로 토큰 갱신 후 요청 재시도

---

## 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                  Vercel (Frontend)                   │
│  React 19 + react-router-dom v7 + react-pageflip    │
│  axios (JWT 자동첨부, 401 자동재발급)                 │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────────┐
│               Railway (Backend)                      │
│  Spring Boot 3.5.5 / Java 17                        │
│  Spring Security + JWT + Kakao OAuth                 │
│  @Async AI 생성 / bucket4j Rate Limit               │
│  Swagger UI (/swagger-ui.html)                       │
└───────┬───────────────────────────┬──────────────────┘
        │                           │
┌───────▼────────┐        ┌─────────▼──────────────┐
│  MySQL 8       │        │  Google Gemini API      │
│  (Railway 내부) │        │  gemini-2.5-flash       │
└────────────────┘        └────────────────────────┘
```

**모노레포 구조**
```
remon-service/
├── backend/      — Spring Boot (com.remon 패키지 12개 모듈)
├── frontend/     — React (api/, components/, hooks/, pages/, utils/)
└── docker-compose.yml  — 로컬 개발 환경
```

---

## 핵심 구현 내용

### 1. AI 비동기 책 생성 파이프라인

**Situation**: Gemini API 호출은 최대 30초 소요 → 동기 처리 시 요청 타임아웃 및 UX 차단 발생

**Task**: 사용자가 생성 버튼을 눌렀을 때 즉시 응답하면서 백그라운드에서 생성 진행

**Action**:
- `POST /api/books/generate`에서 Book을 PENDING 상태로 즉시 DB 저장, 202 Accepted 반환
- `@Async`로 별도 스레드에서 Gemini API 호출 → 완료 시 DONE, 실패 시 FAILED 업데이트
- 프론트엔드에서 `GET /api/books/{id}/status`를 1초 간격으로 폴링하여 DONE 감지 후 뷰어로 이동

**Result**: 30초 생성 대기 중에도 UI가 블로킹되지 않으며, 실패 시 FAILED 상태로 사용자에게 명확한 피드백 제공

---

### 2. DOM 높이 기반 책 페이지 자동 분할

**Situation**: 소설 본문 길이·폰트 크기·화면 크기가 제각각이라 고정 글자 수로 페이지를 나누면 텍스트가 넘치거나 잘림

**Task**: 실제 렌더링 높이를 기준으로 페이지를 동적으로 분할

**Action**:
- 화면 밖 숨김 DOM probe 요소에 단락을 하나씩 추가하며 `offsetHeight`로 실제 렌더 높이 측정
- 단락 하나만으로도 한 페이지를 초과하는 경우 binary search로 단어 경계에서 분할
- 창 크기 변경(resize) 시 debounce 150ms 후 전체 페이지 재계산

**Result**: 단락 잘림 없이 정확한 페이지 구성, 모바일·태블릿·데스크톱 모두 동일하게 동작

---

### 3. JWT + Refresh Token 자동 재발급

**Situation**: Access Token 15분 만료 시 사용자가 수동으로 재로그인해야 하는 UX 문제

**Task**: 사용자가 인식하지 못하는 투명한 토큰 갱신

**Action**:
- axiosInstance 응답 인터셉터에서 401 감지 → `POST /api/auth/refresh`로 Refresh Token 전송
- 동시에 여러 API가 401을 받는 경우 `failedQueue`로 큐잉하여 갱신 완료 후 일괄 재시도
- 갱신 실패(Refresh Token 만료) 시 clearAuth() + 로그인 페이지로 리다이렉트
- 백엔드: `deleteByEmail() + flush()` 후 새 Refresh Token 저장 → duplicate key 방지

**Result**: Access Token 만료와 무관하게 로그인 상태 유지, 사용자 경험 저하 없음

---

### 4. Gemini 응답 파싱 안정화

**Situation**: Gemini API에 JSON 형식 응답을 요청했지만 소설 본문에 따옴표·쉼표·줄바꿈이 포함되어 JSON parse error 빈발

**Task**: 파싱 방식을 근본적으로 바꿔 소설 내용과 무관하게 안정적으로 파싱

**Action**:
- `responseMimeType: "application/json"` 제거, 프롬프트에서 `[TITLE]` / `[CONTENT]` 구분자 방식으로 변경
- 백엔드에서 정규식 `\[TITLE\]\s*(.+?)\s*\[CONTENT\]\s*(.+)` (DOTALL)으로 title/content 추출
- 구분자 파싱 실패 시 첫 줄 = title, 나머지 = content로 fallback 처리

**Result**: JSON 파싱 오류 근본 해결, fallback으로 극단적 케이스도 처리

---

## 트러블슈팅

| 문제 | 원인 | 해결 |
|------|------|------|
| Railway 컨테이너 OOM 재시작 반복 | Spring Boot 기본 힙 크기가 512MB 제한 초과 | 시작 명령에 `-Xms128m -Xmx400m` 추가 |
| 카카오 로그인 간헐적 500 오류 | `deleteByEmail` 후 flush 없이 save 시 같은 트랜잭션에서 duplicate key 감지 | `deleteByEmail()` 직후 `entityManager.flush()` 추가 |
| 두 페이지 모드 nav 버튼 비활성화 | HTMLFlipBook DOM이 버튼 영역 위에 z-index로 덮음 | `.read-nav`에 `position: relative; z-index: 10` 추가 |
| 홈 ✓ 배지 미표시 | `startReading`이 서재에 없으면 아무것도 안 하는 구조 | upsert 방식으로 변경 — 서재에 없으면 READING 상태로 자동 추가 |
| Gemini JSON parse error | 소설 본문 내 따옴표·쉼표·줄바꿈이 JSON 파싱 오류 유발 | JSON 대신 `[TITLE]`/`[CONTENT]` 구분자 방식으로 프롬프트·파싱 전면 변경 |
| 책 뷰어 텍스트 잘림 | 고정 글자 수 기반 페이지 분할로 폰트/화면 크기 미반영 | DOM probe + offsetHeight 기반 동적 분할로 교체 |

---

## 로컬 실행 방법

### 사전 준비
- Java 17, Docker Desktop, Node.js 18+

### 1. 환경변수 설정
루트 디렉터리에 `.env` 파일 생성:
```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=remon
MYSQL_USER=remon
MYSQL_PASSWORD=remonpassword
JWT_SECRET=base64EncodedSecretKey
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 2. 백엔드 실행
```bash
cd backend
./gradlew bootJar -x test
cd ..
docker compose up
```
- 백엔드: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

### 3. 프론트엔드 실행
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8080 npm start
```
- 프론트엔드: `http://localhost:3000`

---

## 프로젝트 구조

```
remon-service/
├── backend/src/main/java/com/remon/
│   ├── book/          책 CRUD, AI 생성 비동기 처리
│   ├── user/          인증, JWT, 카카오 OAuth
│   ├── library/       내 서재, 독서 상태 관리
│   ├── lemon/         레몬 경제 시스템
│   ├── review/        별점·리뷰
│   ├── follow/        팔로우/언팔로우
│   ├── notification/  알림
│   ├── security/      JWT 필터
│   ├── ratelimit/     bucket4j Rate Limiting
│   └── config/        Security, Async, JPA, Swagger 설정
└── frontend/src/
    ├── api/           axios API 모듈 (bookApi, userApi, ...)
    ├── components/    Header, BookCard, LemonTree, Toast, ...
    ├── hooks/         useInfiniteBooks, useTheme, useToast
    ├── pages/         Home, ReadPage, GeneratePage, ...
    └── utils/         auth.js, lemonStorage.js
```
