# CLAUDE.md — Remon Service Backend 작업 규칙

## 서비스 개요
Remon은 사용자가 키워드와 간단한 내용을 입력하면
AI가 짧은 전자책/소설을 생성해주는 서비스다.

---

## 작업 범위
- 이 파일이 있는 `backend/` 폴더 내부만 읽고 수정한다.
- 상위 디렉터리(`e-book service/`, `~/`)는 접근하지 않는다.

---

## 기술 스택
- Java 17, Spring Boot 3.5.5
- Spring Security — JWT 기반 Stateless 인증
- MySQL (Railway 운영) / H2 in-memory (테스트)
- Lombok, Spring Data JPA / Hibernate
- springdoc-openapi 2.8.3 (Swagger UI)
- jjwt 0.12.6

---

## 배포 현황
- **플랫폼**: Railway
- **운영 URL**: `https://remon-service-production.up.railway.app`
- **DB**: MySQL (Railway 내부 연결)
- `application.properties`는 git 추적 포함 (운영 시크릿은 Railway 환경변수로 주입)

---

## 현재 구현된 구조
```
com.remon
├── user        — 회원가입, 로그인(JWT), 카카오 OAuth, 유저 프로필
├── book        — 책 CRUD, 검색, AI 생성, 공개 책 둘러보기, 피드
├── library     — 내 서재 (사용자-책 관계)
├── follow      — 팔로우/언팔로우, 팔로워·팔로잉 목록
├── review      — 별점·리뷰 CRUD, 평균 평점
├── config      — SecurityConfig, SwaggerConfig, JpaAuditingConfig
├── security    — JwtTokenProvider, JwtAuthenticationFilter
└── exception   — GlobalExceptionHandler
```

---

## 현재 인증 방식
- **일반 로그인**: `POST /api/users/login` → accessToken(15분) + refreshToken(7일) 발급
- **카카오 로그인**: `GET /api/auth/kakao` → 카카오 인증 →
  `GET /api/auth/kakao/callback?code=...` → JWT 발급 →
  프론트 `https://remon-service.vercel.app/oauth-callback?accessToken=...&refreshToken=...` redirect
- **토큰 재발급**: `POST /api/auth/refresh` → refreshToken으로 새 accessToken 발급
- **보호 엔드포인트**: `Authorization: Bearer <accessToken>` 헤더 필수
- 세션 정책: STATELESS
- JWT secret: Base64 인코딩 적용
- RefreshToken은 DB(MySQL) 저장, 발급 시 기존 토큰 deleteByEmail + flush 후 새로 save

---

## AI 책 생성 API
```
POST /api/books/generate
Authorization: Bearer <token>
{
  "keywords": ["우주", "고양이"],
  "genre": "SF",
  "length": "SHORT",
  "tone": "WARM"
}
→ AI API 호출 → Book 저장 → 생성된 bookId 반환
```

### Book 엔티티 주요 필드
- `content` (TEXT) — AI가 생성한 본문
- `isAiGenerated` (boolean) — AI 생성 여부
- `genre`, `tone` — 생성 시 사용한 파라미터

### 고려 사항
- AI API 호출은 비동기 처리 완료 — Book을 PENDING 상태로 즉시 저장 후 @Async로 생성, 완료 시 DONE으로 업데이트
- AI API 키는 `application.properties`에 추가하고 하드코딩하지 않는다
- 생성 실패 시 Book 상태를 FAILED로 업데이트하고 에러 응답을 반환한다

---

## 완료된 작업

### 2026-04-26
- [x] JWT Refresh Token 구조 도입 (Access 15분 + Refresh 7일, DB 저장)
- [x] RefreshToken DB 저장 및 자동 재발급 로직 (`POST /api/auth/refresh`)
- [x] 카카오 OAuth redirect에 accessToken + refreshToken 파라미터 연동
- [x] `createRefreshToken`에서 `deleteByEmail` 후 `flush()` 추가 — duplicate key 버그 수정
- [x] 카카오 로그인 정상 동작 확인
- [x] Docker + docker-compose 로컬 개발환경 구축
  - MySQL 8 컨테이너 + Spring Boot 컨테이너 (공유 네트워크)
  - `.env` 파일로 환경변수 관리
  - `application-local.properties`로 로컬 DB 설정 분리
  - JAR 사전 빌드 방식 (`eclipse-temurin:17-jre-alpine`)

### 2026-04-30
- [x] 팔로우/언팔로우 기능 (`POST/DELETE /api/follow/{userId}`, 팔로워·팔로잉 목록)
- [x] 유저 프로필 API (`GET /api/users/{userId}/profile`)
- [x] 공개 책 둘러보기 API (`GET /api/books/explore`)
- [x] 피드 API (`GET /api/books/feed` — 팔로잉 유저 책 목록)
- [x] 별점·리뷰 CRUD (`GET/POST/DELETE /api/books/{bookId}/reviews`)
  - 중복 리뷰 방지 (유니크 제약)
  - N+1 방지: `findAverageRatingsByBookIds` 배치 쿼리로 평균 평점 일괄 조회
  - BookResponse에 `averageRating` 포함
- [x] AI 책 생성 비동기 처리 — @Async + Book status(PENDING→DONE/FAILED), 60초 블로킹 제거
- [x] nixpacks.toml 추가 — Railway JAVA_HOME 빌드 문제 해결

## 앞으로 할 작업
- [ ] GitHub Actions CI/CD 파이프라인
- [ ] 책 생성 횟수 제한 (유저당 하루 3회)
- [ ] 페이지네이션 / 무한 스크롤
- [ ] Lighthouse 성능 측정 및 최적화
- [ ] 테스트 코드 작성

---

## 환경 변수 (민감 정보 관리)
| 키 | 용도 | 주입 방법 |
|---|---|---|
| `jwt.secret` | JWT 서명 키 (Base64) | Railway 환경변수 `JWT_SECRET` |
| `kakao.client-id` | 카카오 REST API 키 | Railway 환경변수 `KAKAO_CLIENT_ID` |
| `kakao.client-secret` | 카카오 클라이언트 시크릿 | Railway 환경변수 `KAKAO_CLIENT_SECRET` |
| `kakao.redirect-uri` | 운영: `https://remon-service-production.up.railway.app/api/auth/kakao/callback` | `application.properties` 직접 기입 |
| `ai.api-key` | AI API 키 (추가 예정) | Railway 환경변수 `AI_API_KEY` |
| `spring.datasource.*` | MySQL 연결 정보 | Railway 환경변수 자동 주입 |

---

## 코드 수정 원칙
1. 파일을 먼저 Read한 뒤 수정한다. 읽지 않은 파일은 수정하지 않는다.
2. 요청된 범위 외 코드(리팩터링, 주석, 타입 힌트 추가 등)는 변경하지 않는다.
3. 신규 파일은 꼭 필요할 때만 생성한다.
4. 보안 취약점(SQL Injection, XSS, 하드코딩된 시크릿 등)을 도입하지 않는다.

---

## 테스트 규칙
- `@ExtendWith(MockitoExtension.class)` — 서비스·도메인 단위 테스트
- `@WebMvcTest` — 컨트롤러 레이어 단독 테스트
- 실행: `./gradlew test`
- 보고서: `build/reports/tests/test/index.html`

---

## Git / 커밋 규칙
- 사용자가 명시적으로 요청할 때만 커밋한다.
- 커밋 메시지: `feat:` / `fix:` / `refactor:` / `test:` / `docs:`
