# 🍋 Remon — AI 전자책 생성 서비스

> 키워드 몇 개면 AI가 나만의 단편 소설을 써드립니다.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.5-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://mysql.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel)](https://remon-service.vercel.app)
[![Railway](https://img.shields.io/badge/API_on-Railway-0B0D0E?logo=railway)](https://remon-service-production.up.railway.app)

**🌐 라이브 데모**: [remon-service.vercel.app](https://remon-service.vercel.app)

---

## 📖 프로젝트 소개

**Remon**은 Google Gemini AI를 활용해 사용자가 원하는 단편 소설을 자동 생성해주는 풀스택 웹 서비스입니다.

키워드, 장르, 분위기, 결말 방향, 주인공 이름을 설정하면 AI가 맞춤형 이야기를 만들어 줍니다. 생성된 책은 react-pageflip 뷰어로 실제 책 넘기는 경험을 제공하고, 팔로우·리뷰·피드 등 소셜 기능도 함께 갖추고 있습니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| **AI 소설 생성** | 키워드·장르·분위기·결말·주인공 이름 → Gemini 2.5 Flash로 단편 소설 생성 |
| **책 뷰어** | react-pageflip 기반 페이지 넘기기 애니메이션, 키보드 방향키 지원 |
| **레몬 경제 시스템** | 하루 1개 자동 충전, 생성 시 소모, 하루 3회 제한 / 레몬트리 UI 시각화 |
| **내 서재** | 독서 상태(저장/읽는 중/완독) 관리, 마지막 읽은 페이지 저장·복원 |
| **소셜 기능** | 팔로우/언팔로우, 팔로잉 피드, 공개 책 탐색 |
| **별점 & 리뷰** | 1~5점 별점 + 텍스트 리뷰, 유저당 1개 제한 |
| **알림** | 팔로우·리뷰 이벤트 실시간 알림 + 헤더 뱃지 |
| **다크모드** | CSS 변수 기반 다크/라이트 모드 전환, localStorage 유지 |
| **카카오 로그인** | OAuth 2.0 소셜 로그인 + 이메일 회원가입 |

---

## 🛠 기술 스택

### Frontend
| 분류 | 기술 |
|------|------|
| 프레임워크 | React 19 |
| 라우팅 | react-router-dom v7 |
| HTTP | axios (401 자동 토큰 재발급) |
| 책 뷰어 | react-pageflip 2.0.3 |
| 스타일링 | CSS Modules + CSS Variables (다크/라이트 테마) |
| 성능 | React.memo, React.lazy + Suspense (코드 스플리팅) |
| 배포 | Vercel |

### Backend
| 분류 | 기술 |
|------|------|
| 프레임워크 | Java 17, Spring Boot 3.5.5 |
| 인증 | Spring Security + JWT (Access 15분 / Refresh 7일) |
| 소셜 로그인 | 카카오 OAuth 2.0 |
| ORM | Spring Data JPA + Hibernate |
| AI | Google Gemini API (gemini-2.5-flash) |
| Rate Limiting | bucket4j-core 8.10.1 |
| API 문서 | springdoc-openapi 2.8.3 (Swagger UI) |
| 배포 | Railway (JVM `-Xms128m -Xmx400m`) |

### Infrastructure
| 분류 | 기술 |
|------|------|
| DB (운영) | MySQL 8 on Railway |
| DB (로컬) | Docker + docker-compose |
| 빌드 | nixpacks (Railway), Gradle |

---

## 🏗 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     사용자 브라우저                           │
│              React 19 (Vercel)                               │
│   Home / Generate / ReadPage / Library / Feed / ...          │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTPS (axios, 401 자동 재발급)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Spring Boot 3.5.5 (Railway)                     │
│                                                              │
│  SecurityFilter → JWT 검증 → Controller → Service           │
│                                                              │
│  BookController   UserController   NotificationController   │
│  LibraryController  ReviewController  FollowController       │
│                                                              │
│  @Async BookGenerationTask ──► OpenAiService                │
│         (PENDING → DONE)          (Gemini API 호출)          │
│                                                              │
│  LemonService (하루 3회 제한, 자동 충전)                      │
│  bucket4j RateLimitFilter                                    │
└──────────┬───────────────────────────┬──────────────────────┘
           │ JPA                       │ RestTemplate
           ▼                           ▼
┌──────────────────┐     ┌─────────────────────────────────┐
│  MySQL 8         │     │  Google Gemini API              │
│  (Railway)       │     │  gemini-2.5-flash               │
│                  │     │  (비동기 소설 생성)               │
│  users           │     └─────────────────────────────────┘
│  books           │
│  user_books      │
│  reviews         │
│  follows         │
│  notifications   │
│  user_lemons     │
│  refresh_tokens  │
└──────────────────┘
```

---

## 💡 핵심 구현 내용

### 1. AI 책 생성 — 비동기 폴링 패턴

**상황(S)**: Gemini API 호출이 10~60초 걸리기 때문에 동기 처리 시 HTTP 타임아웃 및 UX 저하 발생

**과제(T)**: 사용자 대기 없이 즉각 응답하고, 생성 완료 시 자동으로 결과 화면으로 이동

**행동(A)**:
- 백엔드: 책을 `PENDING` 상태로 DB에 즉시 저장 후 `202 Accepted` 응답 → `@Async`로 Gemini API를 별도 스레드에서 호출 → 완료 시 `DONE`/`FAILED`로 상태 업데이트
- 프론트엔드: 응답받은 bookId로 `GET /api/books/{id}/status`를 3초마다 폴링 → `DONE` 확인 시 상세 페이지로 이동

**결과(R)**: 사용자는 로딩 애니메이션을 보면서 기다리고, 생성 완료 즉시 자동 이동

```java
// BookGenerationTask.java
@Async
public void run(Long bookId, List<String> keywords, String genre, String tone, String ending, String protagonistName) {
    bookRepository.updateStatus(bookId, BookStatus.GENERATING);
    try {
        String[] result = openAiService.generate(keywords, genre, tone, ending, protagonistName);
        bookRepository.updateGenerationResult(bookId, result[0], result[1], BookStatus.DONE);
    } catch (Exception e) {
        bookRepository.updateStatus(bookId, BookStatus.FAILED);
    }
}
```

---

### 2. JWT 토큰 자동 재발급 — Axios 인터셉터

**상황(S)**: Access Token 만료(15분) 시 매번 재로그인을 요구하면 UX가 크게 저하됨

**과제(T)**: 사용자가 의식하지 못하게 토큰을 자동 재발급해야 함. 동시 다발 401 요청 시 중복 재발급 방지 필요

**행동(A)**:
- Axios 응답 인터셉터에서 401 응답을 가로채 `POST /api/auth/refresh` 호출
- `isRefreshing` 플래그와 `failedQueue` 배열로 동시 401 요청을 큐에 쌓고 재발급 완료 후 일괄 재시도
- 재발급 실패 시 `clearAuth()` + `/login` 리다이렉트

**결과(R)**: 사용자는 만료를 의식하지 않고 7일 동안 seamless하게 서비스 이용

---

### 3. react-pageflip DOM 기반 페이지 분할

**상황(S)**: 소설 텍스트 길이가 일정하지 않아 단순히 글자 수로 분할하면 특정 페이지에서 텍스트 잘림 발생

**과제(T)**: 페이지 높이에 정확히 맞게 텍스트를 분할해야 하며, 한 단락이 페이지를 초과할 때도 처리 필요

**행동(A)**:
- 화면 밖에 숨겨진 probe DOM 요소에 텍스트를 렌더링해 실제 높이(offsetHeight)를 측정
- 단락 단위로 추가하다가 페이지 높이를 초과하면 새 페이지 시작
- 단락 하나가 페이지 전체를 초과하는 경우 Binary Search로 분할 지점을 찾고 공백 기준으로 단어 경계에서 자름

**결과(R)**: 텍스트 잘림 없는 정확한 페이지 분할, 해상도/폰트 크기 변경 시 자동 재계산

---

### 4. 레몬 경제 시스템 — 서버사이드 검증

**상황(S)**: 프론트엔드에서만 레몬 잔량을 확인하면 클라이언트 조작으로 무제한 생성 가능

**과제(T)**: 서버에서 레몬 잔량을 검증하고 원자적으로 소모해야 함

**행동(A)**:
- `user_lemons` 테이블에 유저별 레몬 잔량 관리
- `LemonService.consumeLemon(email)` — 잔량 확인 + 하루 3회 제한 + 1개 소모를 하나의 `@Transactional` 안에서 처리
- 하루 1개 자동 충전: `lastChargeDate`와 오늘 날짜를 비교해 충전 여부 결정

**결과(R)**: 서버에서 이중 검증, API 직접 호출로 우회 불가

---

## 🔧 트러블슈팅

### Railway 메모리 부족 (OOM)
- **문제**: Railway 무료 플랜 512MB 메모리에서 Spring Boot + MySQL 동시 실행 시 OOM
- **원인**: JVM이 기본적으로 시스템 메모리의 25%를 Heap으로 잡아 컨테이너 한도 초과
- **해결**: `java -Xms128m -Xmx400m -jar ...` 으로 Heap 사이즈를 명시적으로 제한

### Refresh Token Duplicate Key
- **문제**: 동시 요청 시 같은 이메일로 RefreshToken이 중복 저장되어 unique constraint 위반
- **원인**: `deleteByEmail` 후 flush 없이 `save` 하면 같은 트랜잭션 안에서 delete가 아직 DB에 반영 안 된 상태
- **해결**: `deleteByEmail` 후 `entityManager.flush()` 호출로 즉시 반영

### Gemini API JSON 파싱 오류
- **문제**: Gemini가 간혹 JSON을 마크다운 코드블록(` ```json ... ``` `)으로 감싸 반환
- **해결**: 응답 파싱 시 코드블록 패턴을 정규식으로 제거 후 파싱

### react-pageflip portrait 모드 index 어긋남
- **문제**: `usePortrait=true` (한 페이지 모드) 전환 시 react-pageflip 내부 page index가 홀짝 기준으로 계산되어 실제 표시 페이지와 `currentPage` state가 어긋남
- **해결**: `usePortrait=false` (두 페이지)로 고정

---

## 🚀 로컬 실행 방법

### 사전 요건
- Java 17+, Docker Desktop, Node.js 18+

### 1. 환경 변수 설정
루트 디렉터리에 `.env` 파일 생성:
```env
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=remon
MYSQL_USER=remon
MYSQL_PASSWORD=remon1234
JWT_SECRET=your-base64-encoded-secret
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-secret
GEMINI_API_KEY=your-gemini-api-key
```

### 2. 백엔드 빌드 및 실행
```bash
cd backend
./gradlew bootJar -x test
cd ..
docker compose up
```
백엔드: http://localhost:8080
Swagger UI: http://localhost:8080/swagger-ui.html

### 3. 프론트엔드 실행
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8080 npm start
```
프론트엔드: http://localhost:3000

---

## 📁 프로젝트 구조

```
remon-service/
├── backend/                        Spring Boot 백엔드
│   └── src/main/java/com/remon/
│       ├── book/                   AI 생성 + 책 CRUD
│       ├── user/                   인증 + 카카오 OAuth
│       ├── library/                내 서재
│       ├── review/                 별점·리뷰
│       ├── follow/                 팔로우
│       ├── notification/           알림
│       ├── lemon/                  레몬 경제 시스템
│       └── security/               JWT 필터
├── frontend/                       React 19 프론트엔드
│   └── src/
│       ├── api/                    axios API 함수
│       ├── components/             재사용 컴포넌트
│       ├── pages/                  페이지 컴포넌트
│       ├── hooks/                  커스텀 훅
│       ├── styles/                 CSS 변수 (다크/라이트 테마)
│       └── utils/                  auth, lemonStorage
├── docker-compose.yml              로컬 개발 환경
└── railway.json                    Railway 배포 설정
```

---

## 📬 API 문서

Swagger UI: [remon-service-production.up.railway.app/swagger-ui.html](https://remon-service-production.up.railway.app/swagger-ui.html)

주요 엔드포인트:
- `POST /api/books/generate` — AI 책 생성 (비동기, 202 Accepted)
- `GET /api/books/{id}/status` — 생성 상태 폴링
- `GET /api/users/me/lemon` — 레몬 잔량 조회
- `GET /api/books/feed` — 팔로잉 피드
