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

```bash
./gradlew bootRun
```

기본 포트: `http://localhost:8080`
Swagger UI: `http://localhost:8080/swagger-ui.html`

`application.properties`에 아래 값이 설정되어 있어야 합니다.

```properties
jwt.secret=...
kakao.client-id=...
kakao.client-secret=...
openai.api-key=...
openai.model=gpt-5-mini
openai.url=https://api.openai.com/v1/chat/completions
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
