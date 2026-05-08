# CLAUDE.md — Remon Service Backend 작업 규칙

## 서비스 개요
Remon은 사용자가 키워드와 간단한 조건을 입력하면
AI가 짧은 전자책/소설을 생성해주는 서비스다.

---

## 작업 범위
- 이 파일이 있는 `backend/` 폴더 내부만 읽고 수정한다.
- 상위 디렉터리(`e-book service/`, `~/`)는 접근하지 않는다.

---

## 기술 스택
- Java 17, Spring Boot 3.5.5
- Spring Security — JWT 기반 Stateless 인증
- MySQL 8 (Railway 운영) / H2 in-memory (테스트)
- Lombok, Spring Data JPA / Hibernate
- springdoc-openapi 2.8.3 (Swagger UI: `/swagger-ui.html`)
- jjwt 0.12.6 (jjwt-api, jjwt-impl, jjwt-jackson)
- bucket4j-core 8.10.1 (API Rate Limiting)
- Google Gemini API (gemini-2.5-flash) — AI 책 생성

---

## 배포 현황
- **플랫폼**: Railway
- **운영 URL**: `https://remon-service-production.up.railway.app`
- **DB**: MySQL (Railway 내부 연결)
- **빌드**: nixpacks (JDK17), `./gradlew bootJar -x test`
- **시작 명령**: `java -Xms128m -Xmx400m -jar build/libs/remon-backend.jar`
- **헬스체크**: `GET /actuator/health`
- `application.properties`는 git 추적 포함 (운영 시크릿은 Railway 환경변수로 주입)

---

## 패키지 구조
```
com.remon/
├── admin/              — 관리자 전용 컨트롤러 (책/리뷰 삭제)
├── book/               — 책 CRUD, AI 생성 (비동기), 공개 탐색, 피드
│   ├── controller/     BookController.java
│   ├── dto/            BookRequest, BookResponse, GenerateBookRequest
│   ├── entity/         Book.java, BookStatus.java
│   ├── repository/     BookRepository.java
│   └── service/        BookService.java, BookGenerationTask.java, OpenAiService.java
├── config/             — SecurityConfig, SwaggerConfig, JpaAuditingConfig, AsyncConfig
├── exception/          — GlobalExceptionHandler
├── follow/             — 팔로우/언팔로우, 팔로워·팔로잉 목록
├── lemon/              — 레몬 시스템 (하루 1개 자동 충전, 책 생성 시 소모)
├── library/            — 내 서재 (사용자-책 관계, 독서 상태 추적)
├── logging/            — 로그 마스킹 처리 (MaskingMessageConverter)
├── notification/       — 알림 (리뷰/팔로우 이벤트 자동 생성)
├── ratelimit/          — API 요청 제한 (bucket4j, RateLimitFilter)
├── review/             — 별점·리뷰 CRUD, 평균 평점
├── security/           — JwtTokenProvider, JwtAuthenticationFilter
└── user/               — 회원가입, 로그인(JWT), 카카오 OAuth, 유저 프로필
    ├── controller/     AuthController, KakaoAuthController, UserController
    └── service/        UserService, KakaoAuthService, RefreshTokenService
```

---

## 데이터베이스 스키마

| 테이블 | 주요 컬럼 | 비고 |
|--------|-----------|------|
| `users` | id, email, password, provider, providerId, nickname, role, created_at | email UNIQUE |
| `books` | id, title, author, content (TEXT), genre, tone, status, isAiGenerated, isPublic, publishedBy | status: PENDING/GENERATING/DONE/FAILED |
| `user_books` | id, user_id, book_id, status, lastReadPage, savedAt | UNIQUE(user_id, book_id); status: SAVED/READING/FINISHED |
| `reviews` | id, book_id, user_id, rating (1–5), content (TEXT), createdAt | UNIQUE(book_id, user_id) — 중복 방지 |
| `follows` | id, follower_id, following_id, createdAt | UNIQUE(follower_id, following_id) |
| `notifications` | id, receiverId, senderId, type, message, isRead, createdAt | type: REVIEW/FOLLOW |
| `user_lemons` | userId (PK), lemonCount, lastChargeDate | 유저 1명당 1행 |
| `refresh_tokens` | id, email, token, expiryDate | email 인덱스 |

---

## API 엔드포인트 전체 목록

### 인증 (`/api/auth`, `/api/users`)
| Method | Endpoint | 설명 | Auth |
|--------|----------|------|------|
| POST | `/api/users/register` | 회원가입 | 불필요 |
| POST | `/api/users/login` | 로그인 → accessToken + refreshToken 반환 | 불필요 |
| POST | `/api/users/logout` | 로그아웃 | 필요 |
| POST | `/api/auth/refresh` | accessToken 재발급 | refreshToken |
| GET | `/api/auth/kakao` | 카카오 OAuth 시작 | 불필요 |
| GET | `/api/auth/kakao/callback` | 카카오 OAuth 콜백 | 불필요 |

### 유저 (`/api/users`)
| Method | Endpoint | 설명 | Auth |
|--------|----------|------|------|
| GET | `/api/users` | 전체 유저 목록 | 불필요 |
| GET | `/api/users/{email}` | 이메일로 유저 조회 | 불필요 |
| GET | `/api/users/{userId}/profile` | 유저 프로필 + 팔로우 상태 | 선택 |
| GET | `/api/users/me/lemon` | 내 레몬 잔량 + 오늘 사용 횟수 | 필요 |
| PATCH | `/api/users/me/nickname` | 닉네임 변경 | 필요 |
| DELETE | `/api/users/me` | 계정 삭제 | 필요 |

### 책 (`/api/books`)
| Method | Endpoint | 설명 | Auth |
|--------|----------|------|------|
| GET | `/api/books` | 책 목록 (keyword, page, size 쿼리) | 불필요 |
| GET | `/api/books/my` | 내가 만든 책 목록 | 필요 |
| GET | `/api/books/explore` | 공개 책 탐색 | 불필요 |
| GET | `/api/books/feed` | 팔로잉 유저 책 피드 | 필요 |
| GET | `/api/books/{id}` | 책 상세 | 불필요 |
| GET | `/api/books/{id}/status` | AI 생성 상태 (PENDING/DONE/FAILED) | 필요 |
| POST | `/api/books` | 책 직접 등록 | 필요 |
| POST | `/api/books/generate` | AI 책 생성 (202 Accepted, 비동기) | 필요 |
| DELETE | `/api/books/{id}` | 책 삭제 | 필요 |

### 서재 (`/api/library`)
| Method | Endpoint | 설명 | Auth |
|--------|----------|------|------|
| GET | `/api/library` | 내 서재 목록 | 필요 |
| GET | `/api/library/my-book-ids` | 서재 bookId 목록 | 필요 |
| POST | `/api/library` | 서재에 책 추가 | 필요 |
| PATCH | `/api/library/{bookId}/status` | 독서 상태 변경 | 필요 |
| PATCH | `/api/library/{bookId}/start-reading` | 읽기 시작 | 필요 |
| PATCH | `/api/library/{bookId}/page` | 현재 페이지 저장 | 필요 |
| PATCH | `/api/library/{bookId}/finish` | 완독 처리 | 필요 |
| DELETE | `/api/library/{bookId}` | 서재에서 제거 | 필요 |

### 리뷰 & 별점 (`/api/books/{bookId}/reviews`)
| Method | Endpoint | 설명 | Auth |
|--------|----------|------|------|
| GET | `/api/books/{bookId}/reviews` | 리뷰 목록 | 불필요 |
| POST | `/api/books/{bookId}/reviews` | 리뷰 작성 (rating 1–5) | 필요 |
| DELETE | `/api/books/{bookId}/reviews/{reviewId}` | 리뷰 삭제 | 필요 |

### 팔로우 (`/api/follow`)
| Method | Endpoint | 설명 | Auth |
|--------|----------|------|------|
| POST | `/api/follow/{userId}` | 팔로우 | 필요 |
| DELETE | `/api/follow/{userId}` | 언팔로우 | 필요 |
| GET | `/api/follow/{userId}/followers` | 팔로워 목록 | 불필요 |
| GET | `/api/follow/{userId}/following` | 팔로잉 목록 | 불필요 |

### 알림 (`/api/notifications`)
| Method | Endpoint | 설명 | Auth |
|--------|----------|------|------|
| GET | `/api/notifications` | 알림 목록 | 필요 |
| GET | `/api/notifications/unread-count` | 읽지 않은 알림 수 | 필요 |
| PATCH | `/api/notifications/{id}/read` | 알림 읽음 처리 | 필요 |
| PATCH | `/api/notifications/read-all` | 전체 읽음 처리 | 필요 |

### 관리자 (`/api/admin`)
| Method | Endpoint | 설명 | Auth |
|--------|----------|------|------|
| DELETE | `/api/admin/books/{id}` | 책 삭제 (관리자) | 필요 (ADMIN) |
| DELETE | `/api/admin/reviews/{id}` | 리뷰 삭제 (관리자) | 필요 (ADMIN) |

---

## 인증 방식
- **일반 로그인**: `POST /api/users/login` → accessToken(15분) + refreshToken(7일) 발급
- **카카오 로그인**: OAuth 2.0 → JWT 발급 → 프론트 `/oauth-callback?accessToken=...&refreshToken=...` redirect
- **토큰 재발급**: `POST /api/auth/refresh` → refreshToken → 새 accessToken 발급
- **보호 엔드포인트**: `Authorization: Bearer <accessToken>` 헤더 필수
- 세션 정책: STATELESS
- JWT secret: Base64 인코딩 적용
- RefreshToken: DB 저장, 발급 시 deleteByEmail + flush 후 새로 save

---

## AI 책 생성 API
```
POST /api/books/generate
Authorization: Bearer <token>
{
  "keywords": ["우주", "고양이", "모험", "시간여행"],  // 최대 4개
  "genre": "SF",
  "tone": "WARM",
  "ending": "HAPPY",           // HAPPY | SAD | OPEN (선택, 기본 HAPPY)
  "protagonistName": "지우"    // 선택, null이면 AI가 결정
}
→ 202 Accepted + { "id": 123 }
```
- Book을 PENDING 상태로 즉시 저장 → `@Async`로 Gemini API 호출 → DONE/FAILED 업데이트
- 클라이언트는 `GET /api/books/{id}/status`를 폴링하여 완료 감지
- AI 모델: `gemini-2.5-flash` (30초 타임아웃)
- 분량: 항상 3000자 내외 (SHORT 고정)
- 생성 시 레몬 1개 소모 (서버측 처리)

---

## 레몬 시스템
- 유저당 레몬 보유량은 `user_lemons` 테이블에서 관리
- 하루 1개 자동 충전 (`lastChargeDate` 비교)
- 책 생성 시 레몬 1개 소모, 하루 최대 3회 제한
- `GET /api/users/me/lemon` — `{ lemonCount, usedToday, maxDaily }` 반환

---

## 환경 변수

| 키 | 용도 | 주입 방법 |
|---|---|---|
| `DATABASE_URL` | MySQL JDBC URL | Railway 환경변수 |
| `DATABASE_USERNAME` | MySQL 사용자 | Railway 환경변수 |
| `DATABASE_PASSWORD` | MySQL 비밀번호 | Railway 환경변수 |
| `JWT_SECRET` | JWT 서명 키 (Base64) | Railway 환경변수 |
| `KAKAO_CLIENT_ID` | 카카오 REST API 키 | Railway 환경변수 |
| `KAKAO_CLIENT_SECRET` | 카카오 클라이언트 시크릿 | Railway 환경변수 |
| `GEMINI_API_KEY` | Google Gemini API 키 | Railway 환경변수 |
| `PORT` | 서버 포트 (기본 8080) | Railway 자동 주입 |
| `SPRING_PROFILES_ACTIVE` | 프로파일 (local/production) | Railway 환경변수 |

로컬 개발: `docker-compose.yml` + `.env` 파일 사용 (`application-local.properties`로 로컬 DB 설정 분리)

---

## 완료된 작업

### 2026-04-26
- [x] JWT Refresh Token 구조 도입 (Access 15분 + Refresh 7일, DB 저장)
- [x] `POST /api/auth/refresh` 구현
- [x] 카카오 OAuth redirect에 accessToken + refreshToken 파라미터 연동
- [x] `createRefreshToken`에서 `deleteByEmail` 후 `flush()` 추가 — duplicate key 버그 수정
- [x] Docker + docker-compose 로컬 개발환경 구축

### 2026-04-30
- [x] 팔로우/언팔로우 API
- [x] 유저 프로필 API (`GET /api/users/{userId}/profile`)
- [x] 공개 책 탐색 API (`GET /api/books/explore`)
- [x] 팔로잉 피드 API (`GET /api/books/feed`)
- [x] 별점·리뷰 CRUD (중복 방지, N+1 방지 배치 쿼리, averageRating 포함)
- [x] AI 책 생성 비동기 처리 (@Async + PENDING→DONE/FAILED)
- [x] nixpacks.toml 추가 — Railway JAVA_HOME 빌드 문제 해결

### 2026-05-01
- [x] 알림 기능 (REVIEW/FOLLOW 타입)
- [x] 레몬 시스템 (`UserLemon` 엔티티, 책 생성 시 서버측 소모)
- [x] OpenAI → Groq → Gemini API 마이그레이션 (gemini-2.5-flash)
- [x] Railway 메모리 부족 해결 — JVM 옵션 `-Xms128m -Xmx400m`

### 2026-05-08
- [x] 책 생성 옵션 확장: `ending`(결말), `protagonistName`(주인공 이름) 추가
- [x] 분량 선택 제거 — 3000자 내외로 고정 (length 필드 제거)
- [x] Gemini 프롬프트에 결말 방향·주인공 이름 반영

---

## 앞으로 할 작업
- [ ] GitHub Actions CI/CD 파이프라인
- [ ] 무한 스크롤 (커서 기반 페이지네이션)
- [ ] 광고 보고 레몬 추가 획득 API
- [ ] 테스트 코드 작성
- [ ] React Native 앱 개발 검토
- [ ] Oracle Cloud 이전 검토 (메모리 여유)

---

## 코드 수정 원칙
1. 파일을 먼저 Read한 뒤 수정한다. 읽지 않은 파일은 수정하지 않는다.
2. 요청된 범위 외 코드(리팩터링, 주석, 타입 힌트 추가 등)는 변경하지 않는다.
3. 신규 파일은 꼭 필요할 때만 생성한다.
4. 보안 취약점(SQL Injection, XSS, 하드코딩된 시크릿 등)을 도입하지 않는다.

---

## Git / 커밋 규칙
- 사용자가 명시적으로 요청할 때만 커밋한다.
- 커밋 메시지: `feat:` / `fix:` / `refactor:` / `test:` / `docs:` / `style:`
