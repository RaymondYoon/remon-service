# Remon Service — Backend

AI가 짧은 전자책/소설을 생성해주는 서비스 **Remon**의 백엔드 서버입니다.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| Language | Java 17 |
| Framework | Spring Boot 3.5.5 |
| 인증 | Spring Security (JWT, Stateless) |
| DB | MariaDB (운영) / H2 in-memory (테스트) |
| ORM | Spring Data JPA / Hibernate |
| API 문서 | springdoc-openapi 2.8.3 (Swagger UI) |
| JWT | jjwt 0.12.6 |
| AI | OpenAI Chat Completions API (gpt-5-mini) |

---

## 실행 방법

### Docker로 실행 (권장)

프로젝트 루트(`remon-service/`)에서 실행합니다.

```bash
# 1. 환경변수 파일 준비
cp .env.example .env
# .env 파일을 열어 실제 값으로 채운다

# 2. 빌드 및 실행
docker compose up --build

# 3. 백그라운드 실행
docker compose up -d --build

# 4. 종료
docker compose down

# 5. DB 볼륨까지 초기화
docker compose down -v
```

- 백엔드: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- MySQL: `localhost:3306` (DB명: `remon`)

### 로컬 직접 실행 (MySQL 별도 실행 필요)

```bash
# MySQL만 Docker로 띄우기
docker compose up mysql -d

# Spring Boot 실행 (local 프로파일 적용)
./gradlew bootRun --args='--spring.profiles.active=local'
```

`application-local.properties`가 자동으로 적용되어 `show-sql=true`와 로컬 DB 설정이 사용됩니다.

환경변수는 아래 값이 필요합니다 (`export` 또는 IDE Run Configuration에서 설정):

```
JWT_SECRET=...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
OPENAI_API_KEY=...
```

---

## 현재 구현 기능

- 회원가입 / 이메일 로그인 (JWT 발급)
- 카카오 소셜 로그인 (OAuth2 코드 플로우)
- 책 목록 조회 / 단건 조회
- AI 책 생성 (`POST /api/books/generate`)

---

## 주요 API

### 인증 / 회원

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/users/register` | 회원가입 |
| POST | `/api/users/login` | 이메일 로그인 → JWT 반환 |
| GET | `/api/auth/kakao` | 카카오 로그인 시작 (브라우저 리다이렉트) |
| GET | `/api/auth/kakao/callback` | 카카오 콜백 → 프론트로 JWT 리다이렉트 |

### 책

| Method | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/api/books` | 불필요 | 책 목록 조회 (검색 파라미터 선택) |
| GET | `/api/books/{id}` | 불필요 | 책 단건 조회 |
| POST | `/api/books/generate` | 필요 | AI 책 생성 |

---

## 인증 방식

### JWT

- 로그인 성공 시 응답 body의 `token` 필드로 JWT 반환
- 보호 엔드포인트는 `Authorization: Bearer <token>` 헤더 필수
- 세션 정책: STATELESS

### 카카오 로그인 흐름

```
브라우저 → GET /api/auth/kakao
         → 카카오 인증 페이지
         → GET /api/auth/kakao/callback?code=...
         → JWT 발급
         → 프론트 /oauth-callback?token=...&nickname=...&email=... 리다이렉트
```

---

## AI 책 생성 API

```http
POST /api/books/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "keywords": ["우주", "고양이"],
  "genre": "SF",
  "length": "SHORT",
  "tone": "WARM"
}
```

| 파라미터 | 선택 값 |
|----------|---------|
| `length` | `SHORT` (~3,000자) / `MEDIUM` (~8,000자) / `LONG` (~15,000자) |
| `tone` | `WARM` (따뜻하게) / `DARK` (긴장감 있게) / `HUMOROUS` (유쾌하게) |

- OpenAI Chat Completions API 동기 호출 — 응답까지 10~30초 소요
- 생성 실패 시 Book을 저장하지 않고 에러 반환

---

## 다음 작업

- [ ] 내 서재 API (`GET /api/library`, `POST /api/library`)
- [ ] 생성한 책 목록 조회 API
- [ ] AI 생성 비동기 처리 + 상태 polling 구조 고려
- [ ] 운영 환경 배포 설정 (환경변수 기반 시크릿 관리)
