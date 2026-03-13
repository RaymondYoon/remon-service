# CLAUDE.md — Remon Service Backend 작업 규칙

## 작업 범위
- 이 파일이 있는 `backend/` 폴더 내부만 읽고 수정한다.
- 상위 디렉터리(`e-book service/`, `~/`)는 접근하지 않는다.

## 기술 스택
- Java 17, Spring Boot 3.5.5
- Spring Security — JWT 기반 Stateless 인증
- MariaDB (운영) / H2 in-memory (테스트)
- Lombok, Spring Data JPA / Hibernate
- springdoc-openapi 2.8.3 (Swagger UI)
- jjwt 0.12.6

## 코드 수정 원칙
1. 파일을 먼저 Read한 뒤 수정한다. 읽지 않은 파일은 수정하지 않는다.
2. 요청된 범위 외 코드(리팩터링, 주석, 타입힌트 추가 등)는 변경하지 않는다.
3. 신규 파일은 꼭 필요할 때만 생성한다.
4. 보안 취약점(SQL Injection, XSS, 하드코딩된 시크릿 등)을 도입하지 않는다.

## 인증 설계
- **일반 로그인**: `POST /api/users/login` → JWT 발급 (응답 body의 `token` 필드)
- **카카오 로그인**: `GET /api/auth/kakao/callback?code=...` → JWT 발급
- **보호 엔드포인트**: `Authorization: Bearer <token>` 헤더 필수
- 세션 정책: STATELESS (서버 세션 사용 안 함)
- Swagger 인증: `/swagger-ui.html` → Authorize 버튼에 JWT 입력

## 테스트 규칙
- 신규 기능 구현 시 단위 테스트를 함께 작성한다.
- `@ExtendWith(MockitoExtension.class)` — 서비스·도메인 단위 테스트
- `@WebMvcTest` — 컨트롤러 레이어 단독 테스트 (DB 연결 없음)
- 테스트 실행: `./gradlew test`
- 테스트 보고서: `build/reports/tests/test/index.html`

## 환경 변수 (민감 정보 관리)
| 키 | 용도 | 운영 환경 교체 방법 |
|---|---|---|
| `jwt.secret` | JWT 서명 키 | 환경변수 `JWT_SECRET` |
| `kakao.client-id` | 카카오 REST API 키 | 환경변수 `KAKAO_CLIENT_ID` |

- `.env` 파일이나 실제 시크릿 값이 포함된 파일은 커밋하지 않는다.
- `application.properties`의 현재 `jwt.secret`는 개발 전용 값이며 운영 배포 전 교체 필수.

## 카카오 로그인 설정 방법
1. [카카오 개발자 콘솔](https://developers.kakao.com)에서 앱 생성
2. REST API 키 복사 → `application.properties`의 `kakao.client-id`에 입력
3. 플랫폼 > Web > 사이트 도메인: `http://localhost:8080` 추가
4. 카카오 로그인 > Redirect URI: `http://localhost:8080/api/auth/kakao/callback` 등록
5. 동의항목: 이메일(선택), 닉네임(필수) 설정

## Git / 커밋 규칙
- 사용자가 명시적으로 요청할 때만 커밋한다. 자동 커밋하지 않는다.
- 커밋 메시지 형식: `feat: ...` / `fix: ...` / `refactor: ...` / `test: ...`
- `application.properties`에 실제 운영 시크릿이 들어간 경우 커밋 전 반드시 경고한다.
