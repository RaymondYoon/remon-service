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
- MariaDB (운영) / H2 in-memory (테스트)
- Lombok, Spring Data JPA / Hibernate
- springdoc-openapi 2.8.3 (Swagger UI)
- jjwt 0.12.6

---

## 현재 구현된 구조
```
com.remon
├── user        — 회원가입, 로그인(JWT), 카카오 OAuth
├── book        — 책 CRUD, 검색
├── config      — SecurityConfig, SwaggerConfig, JpaAuditingConfig
├── security    — JwtTokenProvider, JwtAuthenticationFilter
└── exception   — GlobalExceptionHandler
```

현재 Book은 수동 등록 기반이며, AI 생성 연동은 아직 구현되지 않았다.

---

## 현재 인증 방식
- **일반 로그인**: `POST /api/users/login` → JWT 발급 (응답 body의 `token` 필드)
- **카카오 로그인**: `GET /api/auth/kakao` → 카카오 인증 →
  `GET /api/auth/kakao/callback?code=...` → JWT 발급 →
  프론트 `http://localhost:3000/oauth-callback?token=...` redirect
- **보호 엔드포인트**: `Authorization: Bearer <token>` 헤더 필수
- 세션 정책: STATELESS

---

## MVP 확장 방향 (Book 중심)
현재 Book 엔티티에 AI 생성 흐름을 붙이는 것이 가장 빠른 MVP 경로다.

### Book 엔티티에 추가할 필드
- `content` (TEXT) — AI가 생성한 본문
- `isAiGenerated` (boolean) — AI 생성 여부
- `genre`, `tone` — 생성 시 사용한 파라미터

### AI 생성 API 방향
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

### 고려 사항
- AI API 호출은 응답 지연이 있으므로 동기/비동기 방식을 결정한 뒤 구현한다
- AI API 키는 `application.properties`에 추가하고 하드코딩하지 않는다
- 생성 실패 시 Book을 저장하지 않고 에러 응답을 반환한다

### 추후 분리 가능한 구조
현재 MVP에서는 Book에 직접 붙이되,
요청량이 늘거나 생성 상태 관리가 필요해지면
`generation` 도메인과 `library` 도메인으로 분리할 수 있다.
지금 당장 분리 설계할 필요는 없다.

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

## 환경 변수 (민감 정보 관리)
| 키 | 용도 | 운영 환경 교체 |
|---|---|---|
| `jwt.secret` | JWT 서명 키 | 환경변수 `JWT_SECRET` |
| `kakao.client-id` | 카카오 REST API 키 | 환경변수 `KAKAO_CLIENT_ID` |
| `kakao.client-secret` | 카카오 클라이언트 시크릿 | 환경변수 `KAKAO_CLIENT_SECRET` |
| `ai.api-key` | AI API 키 (추가 예정) | 환경변수 `AI_API_KEY` |

- `application.properties`의 시크릿 값은 절대 커밋하지 않는다.
- 현재 `jwt.secret`는 개발 전용 값이며 운영 배포 전 교체 필수.

---

## Git / 커밋 규칙
- 사용자가 명시적으로 요청할 때만 커밋한다.
- 커밋 메시지: `feat:` / `fix:` / `refactor:` / `test:`
- `application.properties`에 실제 시크릿이 있으면 커밋 전 반드시 경고한다.
