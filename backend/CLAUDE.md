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
- bucket4j-core 8.10.1 + Caffeine (API Rate Limiting, IP별 버킷 만료 캐시)
- Google Gemini API (gemini-2.5-flash) — AI 책 생성 (텍스트)
- OpenAI API (gpt-image-1) — AI 표지 이미지 생성 (응답: b64_json)
- Cloudinary (cloudinary-http45:1.39.0) — 이미지 CDN 업로드/저장

---

## 배포 현황
- **플랫폼**: Railway
- **운영 URL**: `https://remon-service-production.up.railway.app`
- **DB**: MySQL (Railway 내부 연결)
- **빌드**: nixpacks (JDK17), `./gradlew bootJar -x test` (테스트는 CI에서 실행)
- **시작 명령**: `java -Xms128m -Xmx400m -jar build/libs/remon-backend.jar`
- **헬스체크**: `GET /actuator/health`
- `application.properties`는 git 추적 포함 (운영 시크릿은 Railway 환경변수로 주입)

---

## 패키지 구조
```
com.remon/
├── admin/              — 관리자 전용 컨트롤러 (책/리뷰 삭제, 표지 일괄 생성) — 서비스 계층만 호출
├── book/               — 책 CRUD, AI 생성 (비동기), 공개 탐색, 피드
│   ├── ai/             StoryTextGenerator ← GeminiTextGenerator (본문, Gemini)
│   │                   CoverImageGenerator ← OpenAiCoverImageGenerator (표지, gpt-image-1)
│   │                   StoryPrompt (생성 입력 값 객체), GeneratedStory (제목+본문)
│   ├── controller/     BookController.java
│   ├── dto/            BookRequest, BookResponse(상세, 본문 포함), BookSummaryResponse(목록, 본문 제외),
│   │                   BookStatusResponse, BookCursorResponse, GenerateBookRequest
│   ├── entity/         Book.java, BookStatus.java
│   ├── repository/     BookRepository.java (공통 JPQL 조건 상수 VISIBLE / KEYWORD_MATCH)
│   └── service/        BookService, BookGenerationTask (커밋 후 생성 실행),
│                       BookGenerationFailureService (FAILED + 레몬 환불, 멱등),
│                       StaleGenerationRecoveryJob (멈춘 생성 복구), CloudinaryService,
│                       BookCoverCleanupListener (삭제 커밋 후 표지 삭제), 이벤트 record 2종
├── config/             — SecurityConfig, SwaggerConfig, JpaAuditingConfig, AsyncConfig(생성 전용 스레드풀 +
│                       @EnableScheduling), CacheConfig, RedisConfig(spring.cache.type=redis 일 때만),
│                       ClockConfig, DataInitializer, CloudinaryConfig
├── exception/          — GlobalExceptionHandler, ErrorCode, BusinessException, UserNotFoundException,
│                       BookNotFoundException, ErrorResponse
├── follow/             — 팔로우/언팔로우, 팔로워·팔로잉 목록
├── lemon/              — 레몬 시스템 (하루 1개 자동 충전, 책 생성 시 소모)
├── library/            — 내 서재 (사용자-책 관계, 독서 상태 추적)
├── logging/            — 로그 마스킹 처리 (MaskingMessageConverter, MaskingUtil)
├── notification/       — 알림 (리뷰/팔로우 이벤트 자동 생성)
├── ratelimit/          — API 요청 제한 (bucket4j, RateLimitFilter)
├── review/             — 별점·리뷰 CRUD, 평균 평점
├── security/           — JwtTokenProvider, JwtAuthenticationFilter
└── user/               — 회원가입, 로그인(JWT), 카카오 OAuth, 유저 프로필
    ├── controller/     AuthController, KakaoAuthController, UserController
    ├── entity/         User, RefreshToken, OAuthCode
    ├── repository/     UserRepository, RefreshTokenRepository, OAuthCodeRepository
    └── service/        UserService, KakaoAuthService, RefreshTokenService, OAuthCodeService
```

---

## 데이터베이스 스키마

| 테이블 | 주요 컬럼 | 비고 |
|--------|-----------|------|
| `users` | id, email, password, provider, providerId, nickname, role, created_at, nickname_change_count (default 0), nickname_changed_at (nullable) | email UNIQUE |
| `book` | id, title, author, content (TEXT), genre, tone, status, isAiGenerated, isPublic, publishedBy, coverImageUrl, viewCount (bigint default 0), created_at, lemon_refunded | status: PENDING/GENERATING/DONE/FAILED — created_at·lemon_refunded 는 V6 |
| `user_books` | id, user_id, book_id, status, lastReadPage, savedAt | UNIQUE(user_id, book_id); status: SAVED/READING/DONE |
| `reviews` | id, book_id, user_id, rating (1–5), content (TEXT), createdAt | UNIQUE(book_id, user_id) — 중복 방지 |
| `follows` | id, follower_id, following_id, createdAt | UNIQUE(follower_id, following_id) |
| `notifications` | id, receiverId, senderId, type, message, bookId, isRead, createdAt | type: REVIEW/FOLLOW/BOOK_GENERATED — 책 삭제 시 함께 삭제 |
| `user_lemons` | userId (PK), lemonCount, lastChargeDate | 유저 1명당 1행 |
| `refresh_tokens` | id, email, token, expiryDate | email 인덱스 |
| `oauth_codes` | id, code (UUID), email, access_token (TEXT), refresh_token (TEXT), expires_at, created_at | code UNIQUE, 30초 유효 — V5 마이그레이션 |

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
| GET | `/api/auth/kakao/callback` | 카카오 OAuth 콜백 → 단기 코드 발급 후 redirect | 불필요 |
| POST | `/api/auth/code-exchange` | 단기 코드(UUID) → accessToken + refreshToken 교환 | 불필요 |

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
| GET | `/api/books/my` | 내가 만든 책 목록 (본문 제외) | 필요 (비로그인 401) |
| GET | `/api/books/explore` | 공개 책 탐색 | 불필요 |
| GET | `/api/books/feed` | 팔로잉 유저 책 피드 (본문 제외) | 필요 (비로그인 401) |
| GET | `/api/books/cursor` | 커서 기반 책 목록 (`cursor`, `keyword`, `size`(최대 50), `sort=latest\|rating\|views` — rating/views 는 상위 size개) | 불필요 |
| GET | `/api/books/{id}` | 책 상세 (조회 시 viewCount +1) | 불필요 |
| GET | `/api/books/{id}/status` | AI 생성 상태 + step (TEXT/IMAGE/DONE/FAILED) | 필요 |
| POST | `/api/books` | 책 직접 등록 | 필요 (ADMIN) |
| POST | `/api/books/generate` | AI 책 생성 (202 Accepted, 비동기) | 필요 |
| DELETE | `/api/books/{id}` | 책 삭제 | 필요 |

### 서재 (`/api/library`)
| Method | Endpoint | 설명 | Auth |
|--------|----------|------|------|
| GET | `/api/library` | 내 서재 목록 | 필요 |
| GET | `/api/library/my-book-ids` | 서재 전체 bookId 목록 | 필요 |
| GET | `/api/library/my-reading-book-ids` | 읽기 시작한 bookId 목록 (READING+DONE) — 홈 ✓ 배지용 | 필요 |
| POST | `/api/library` | 서재에 책 추가 (SAVED 상태) | 필요 |
| PATCH | `/api/library/{bookId}/status` | 독서 상태 변경 | 필요 |
| PATCH | `/api/library/{bookId}/start-reading` | 읽기 시작 (upsert: 서재 없으면 READING으로 자동 추가) | 필요 |
| PATCH | `/api/library/{bookId}/page` | 현재 페이지 저장 | 필요 |
| PATCH | `/api/library/{bookId}/finish` | 완독 처리 (DONE) | 필요 |
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
| POST | `/api/admin/books/generate-covers` | 표지 없는 DONE 책 표지 일괄 생성 (202, 백그라운드) | 필요 (ADMIN) |

---

## 인증 방식
- **일반 로그인**: `POST /api/users/login` → accessToken(15분) + refreshToken(7일) 발급
- **카카오 로그인**: OAuth 2.0 → JWT 발급 → 30초 단기 코드로 프론트 `/oauth-callback?code=...` redirect → `POST /api/auth/code-exchange`로 토큰 교환
- **토큰 재발급**: `POST /api/auth/refresh` → refreshToken → 새 accessToken 발급
- **보호 엔드포인트**: `Authorization: Bearer <accessToken>` 헤더 필수
- 세션 정책: STATELESS
- JWT secret: Base64 인코딩 적용
- RefreshToken: DB 저장, 발급 시 deleteByEmail + flush 후 새로 save
- 인증 없음/만료 토큰 → **401** `{"error":"로그인이 필요합니다."}` (클라이언트가 토큰 재발급), 로그인했지만 권한 부족 → **403**

---

## 오류 응답
```json
{ "error": "책을 찾을 수 없습니다. id=99", "code": "BOOK_NOT_FOUND" }
{ "error": "입력값 검증 실패", "code": "VALIDATION_FAILED", "fields": { "email": "..." } }
```
- 클라이언트는 `error`(메시지)를 표시하고, 분기가 필요하면 `code`를 사용한다
- 도메인 오류는 `BusinessException(ErrorCode)` 로 던진다 — 상태 코드는 `ErrorCode`에 정의
  (USER_NOT_FOUND·BOOK_NOT_FOUND·REVIEW_NOT_FOUND 404, ACCESS_DENIED 403, LEMON_INSUFFICIENT 400)
- 이메일로 사용자 조회는 `userRepository.getByEmail(email)` (없으면 UserNotFoundException)
- 아직 전용 예외가 없는 곳의 `IllegalStateException`/`IllegalArgumentException` 은 400 `INVALID_REQUEST`, `NoSuchElementException` 은 404 `NOT_FOUND`

---

## AI 책 생성 API
```
POST /api/books/generate
Authorization: Bearer <token>
{
  "keywords": ["우주", "고양이", "모험", "시간여행"],  // 최대 4개
  "genre": "SF",
  "tone": ["WARM", "MYSTERIOUS"],        // 분위기 다중 선택, 최대 2개 (10종: WARM/DARK/HUMOROUS/MYSTERIOUS/MELANCHOLY/TENSE/EPIC/BRUTAL/DREAMY/CYNICAL)
  "ending": "HAPPY",                      // HAPPY | SAD | OPEN (선택, 기본 HAPPY)
  "protagonistNames": ["지우", "하늘"],  // 선택, 최대 3명, 비워두면 AI가 결정
  "protagonistTrait": ["비밀이 있는", "천재적인"],  // 선택, 최대 3개 (17종)
  "viewpoint": "1인칭",                  // "1인칭" | "3인칭" (선택, 기본 "3인칭")
  "synopsis": "두 소년이 시간여행 장치를 발견한다",  // 한 줄 시놉시스 (선택)
  "characters": ["박사 김현우", "외계인 제로"]       // 조연 등장인물, 최대 4명 (선택)
}
→ 202 Accepted + { "id": 123 }
```
- 레몬 차감 + Book을 PENDING 으로 저장 → `BookGenerationRequestedEvent` 발행 → **트랜잭션 커밋 후**(`@TransactionalEventListener(AFTER_COMMIT)`) 생성 스레드풀에 작업 등록 (큐 포화로 거절되면 즉시 FAILED + 환불)
- 상태 흐름: `PENDING → GENERATING(시작) → GENERATING(텍스트 완료) → DONE(이미지 포함)/FAILED`
- 모든 상태 변경은 **조건부 UPDATE** (`transitionStatus(id, from, to)`, `saveGeneratedText`는 GENERATING 일 때만) — 그 사이 FAILED 처리·삭제된 책을 덮어쓰거나 되살리지 않음
- **실패 시**: `BookGenerationFailureService.failAndRefund` — FAILED 전환 + 레몬 1개 환불, `lemon_refunded` 플래그로 중복 환불 방지
- **멈춘 작업 복구**: `StaleGenerationRecoveryJob` — 서버 시작 시 + 5분마다, `created_at` 이 15분보다 오래된 PENDING/GENERATING 을 FAILED + 환불 (`book.generation.stale-after-minutes`, `book.generation.recovery-interval-ms`)
- 알림(`BOOK_GENERATED`)은 이미지 처리 완료 후 발송 (이미지 실패 시에도 발송, 책 자체는 완성)
- 클라이언트는 `GET /api/books/{id}/status`를 폴링하여 완료 감지 — DONE 수신 시 coverImageUrl 포함된 완성 책
- AI 모델: `gemini-2.5-flash` (연결 10초 / 읽기 `gemini.timeout-ms`=120초, 500·503 은 3초 간격 최대 3회 시도), API 키는 `x-goog-api-key` 헤더로 전달
- 응답 파싱: JSON 대신 `[TITLE]` / `[CONTENT]` 구분자 방식 (소설 본문 내 따옴표·쉼표 파싱 오류 방지)
- 분량: 6000자 내외 고정 (프롬프트 지침: 5500자 이상 6500자 이내)
- 생성 시 레몬 1개 소모 (서버측 처리)
- **프롬프트 엔지니어링**: 서사구조(훅+기승전결) / Showing > Telling / 오감 묘사 / 타겟독자(성인) / CoT 집필 구상 단계 / 시놉시스·조연·다중 성격·다중 분위기 반영

---

## 레몬 시스템
- 유저당 레몬 보유량은 `user_lemons` 테이블에서 관리
- 날짜가 바뀐 뒤 첫 조회/사용 시 `MAX_DAILY = 2`개로 충전 (`lastChargeDate` 비교)
- 책 생성 시 레몬 1개 소모 (비관적 락 `findByUserIdWithLock`), 레몬 부족 시 `LEMON_INSUFFICIENT`
- 생성 실패 시 `refundLemon` 으로 1개 환불 (오늘 충전분일 때만, 최대치 초과 없음)
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
| `OPENAI_API_KEY` | OpenAI API 키 (gpt-image-1 표지 이미지) | Railway 환경변수 |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name | Railway 환경변수 |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Railway 환경변수 |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Railway 환경변수 |
| `PORT` | 서버 포트 (기본 8080) | Railway 자동 주입 |
| `SPRING_PROFILES_ACTIVE` | 프로파일 (local/production) | Railway 환경변수 |

로컬 개발: `docker-compose.yml` + `.env` 파일 사용 (`application-local.properties`로 로컬 DB 설정 분리)

선택 설정 (application.properties 기본값 있음): `book.generation.stale-after-minutes`(15), `book.generation.recovery-interval-ms`(300000), `ratelimit.trusted-proxy-hops`(1 — X-Forwarded-For 에서 신뢰할 프록시 수)

---

## 로컬 실행 방법

```bash
# 1. JAR 빌드 (루트에서)
cd backend && ./gradlew bootJar -x test && cd ..

# 2. Docker Compose로 MySQL + 백엔드 실행
docker compose up

# 헬스체크
curl http://localhost:8080/actuator/health
```

`.env` 파일 필요 항목:
```
MYSQL_ROOT_PASSWORD=...
MYSQL_DATABASE=remon
MYSQL_USER=remon
MYSQL_PASSWORD=...
JWT_SECRET=...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
GEMINI_API_KEY=...
OPENAI_API_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## 테스트

```bash
./gradlew build          # 컴파일 + 테스트 + JaCoCo 리포트
./gradlew test           # 테스트만
```
- 테스트 설정: `src/test/resources/application.properties` — H2 인메모리(MySQL 모드), Flyway 끄고 `ddl-auto=create-drop`, Redis 대신 `spring.cache.type=none`, 외부 API 키는 더미
- 커버리지 리포트: `build/reports/jacoco/test/html/index.html`
- 리포지토리 쿼리는 `@DataJpaTest` + `@AutoConfigureTestDatabase(replace = NONE)` 로 H2 에서 검증
- `GeminiApiTest` 는 `GEMINI_API_KEY` 환경변수가 있을 때만 실제 호출하는 수동 테스트

---

## 트러블슈팅 이력

| 문제 | 원인 | 해결 |
|------|------|------|
| 표지 이미지 항상 null | gpt-image-1은 `url` 대신 `b64_json` 반환 — 코드는 `url` 필드만 읽음 | `data.get("b64_json")` 우선 처리, `Base64.getDecoder().decode()` 로 직접 변환 |
| 표지 이미지 `coverImageUrl` DB 미저장 | `Book` 엔티티에 `coverImageUrl` 필드 누락 + `BookResponse` DTO에도 미포함 | 엔티티·DTO 양쪽에 필드 추가 |
| gpt-image-1 `400 Bad Request` | 구 DALL-E 파라미터(`style`, `response_format`) 그대로 전달 | gpt-image-1 스펙에 맞게 파라미터 정리 (size, quality, n만) |
| Gemini 간헐적 500/503 | Google 측 일시 과부하 | maxAttempts=3, 3초 대기 재시도 로직 추가 |
| Railway OOM 재시작 | Spring Boot 기본 힙이 Railway 512MB 제한 초과 | `-Xms128m -Xmx400m` JVM 옵션 추가 |
| 카카오 로그인 500 오류 | `deleteByEmail` 후 flush 없이 save 시 같은 트랜잭션에서 duplicate key | `deleteByEmail()` 직후 `entityManager.flush()` 추가 |
| Gemini JSON parse error 빈발 | 소설 본문의 따옴표·쉼표·줄바꿈이 JSON 파싱 오류 유발 | JSON 대신 `[TITLE]`/`[CONTENT]` 구분자 방식으로 변경 |
| Railway nixpacks JAVA_HOME 미설정 | Railway 기본 빌드 시 JDK가 PATH 없어 Gradle 실패 | `nixpacks.toml`에 `nixPkgs = ["jdk17_headless"]` 추가 |
| 표지 일괄 생성 curl 타임아웃 | 책 수 × OpenAI API 호출(30~60초)이 Railway HTTP 타임아웃 초과 | 컨트롤러는 즉시 202 반환, 실제 처리는 `@Async` 백그라운드 실행으로 분리 |
| `findDoneBooksWithoutCover` 결과 0건 | JPQL `b.status = 'DONE'` 문자열 리터럴 — Hibernate enum 비교에서 결과 없음 | `@Query` + `@Param("status") BookStatus status` 명시적 파라미터 바인딩으로 교체 |
| `BOOK_GENERATED` 알림 저장 시 `Data truncated for column 'type'` | `notifications.type` 컬럼 길이가 `BOOK_GENERATED`(14자)보다 짧게 생성됨 | `@Column(nullable = false, length = 20)` 명시 → DDL-auto=update로 컬럼 자동 확장 |
| OpenAI API `429 / insufficient_quota` | OpenAI 계정 크레딧 소진 (billing limit 초과) — gpt-image-1 표지 생성 전체 실패 | `ImagenService` 예외 `catch`로 표지 실패해도 책은 DONE 유지됨. 크레딧 충전 또는 `ImagenService` 비활성화로 대응 |
| 평점순/조회수순 커서 페이지네이션 불가 | 커서가 `b.id < :cursor` 조건 기반이라 ID 외 정렬 기준과 혼용 시 중복/누락 발생 | `sort=rating`·`sort=views`는 커서 없이 상위 12개 고정 반환(`hasMore=false`)으로 처리 — 정렬 변경 시 프론트에서 목록 초기화 |
| 카카오 OAuth 토큰이 URL에 노출 | redirect URL에 `accessToken`·`refreshToken` 쿼리 파라미터로 전달 → 브라우저 히스토리·서버 로그에 토큰 노출 | 단기 UUID 코드(30초 유효) 발급 후 URL에는 `code`만 포함 → 프론트가 `POST /api/auth/code-exchange`로 토큰 교환 |

---

## 앞으로 할 작업
- [ ] 기본 관리자 계정(`DataInitializer`, admin1234) 비밀번호 환경변수화
- [ ] CD (자동 배포) — CI 는 구축됨
- [ ] Elasticsearch 도입 (키워드 검색 고도화)
- [ ] 광고 보고 레몬 추가 획득 API
- [ ] 테스트 보강 (NotificationService, FollowService, LibraryService — 현재 라인 커버리지 약 45%)
- [ ] Oracle Cloud 이전 검토 (Railway 메모리 제한 대응)
- [ ] 앱 EAS Build 배포를 위한 카카오 OAuth 앱 도메인 추가
- [ ] Python 분석 스크립트 (생성된 책 장르·분위기 분포, 사용자 활동 통계)

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
