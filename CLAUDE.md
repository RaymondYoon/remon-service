# CLAUDE.md — Remon Service 프로젝트 전체 개요

## 프로젝트 개요
**Remon**은 AI가 전자책/소설을 자동 생성해주는 웹 서비스다.
사용자가 키워드(최대 4개), 장르, 분위기, 결말 방향, 주인공 이름(선택)을 입력하면
Google Gemini(gemini-2.5-flash)가 단편 소설을 생성한다.
레몬 경제 시스템(하루 3회 제한)과 소셜 기능(팔로우, 리뷰, 피드)을 갖추고 있다.

---

## 배포 URL

| 서비스 | URL |
|--------|-----|
| 프론트엔드 (Vercel) | https://remon-service.vercel.app |
| 백엔드 API (Railway) | https://remon-service-production.up.railway.app |
| Swagger UI | https://remon-service-production.up.railway.app/swagger-ui.html |
| 헬스체크 | https://remon-service-production.up.railway.app/actuator/health |

---

## 기술 스택

### 백엔드 (`backend/`)
- **언어/프레임워크**: Java 17, Spring Boot 3.5.5
- **인증**: Spring Security + JWT (jjwt 0.12.6), 카카오 OAuth 2.0
- **DB**: MySQL 8 (Railway) / H2 (테스트)
- **ORM**: Spring Data JPA + Hibernate
- **AI**: Google Gemini API (gemini-2.5-flash)
- **Rate Limiting**: bucket4j-core 8.10.1
- **API 문서**: springdoc-openapi 2.8.3 (Swagger UI)
- **빌드**: Gradle, nixpacks (Railway)
- **배포**: Railway (JVM `-Xms128m -Xmx400m`)

### 프론트엔드 (`frontend/`)
- **프레임워크**: React 19
- **라우팅**: react-router-dom v7
- **HTTP**: axios (공통 인스턴스, 401 자동 재발급)
- **책 뷰어**: react-pageflip 2.0.3
- **상태관리**: useState / useEffect (전역 라이브러리 없음)
- **스타일링**: CSS + CSS 변수 (다크/라이트 모드)
- **코드 스플리팅**: React.lazy + Suspense
- **배포**: Vercel

### 인프라
- **로컬 개발**: Docker + docker-compose (MySQL 8 + Spring Boot)
- **DB 호스팅**: MySQL on Railway (내부 연결)
- **환경변수**: Railway 환경변수 (백엔드) / Vercel 환경변수 (프론트엔드)

---

## 모노레포 구조
```
remon-service/
├── backend/           — Java Spring Boot 백엔드
│   ├── src/main/java/com/remon/
│   ├── src/main/resources/
│   │   ├── application.properties          (운영 설정)
│   │   └── application-local.properties    (로컬 Docker 설정)
│   ├── build.gradle
│   ├── nixpacks.toml                        (Railway 빌드 플랜)
│   └── CLAUDE.md                            (백엔드 작업 규칙)
├── frontend/          — React 19 프론트엔드
│   ├── src/
│   │   ├── api/, components/, hooks/, pages/, styles/, utils/
│   ├── public/
│   ├── package.json
│   └── CLAUDE.md                            (프론트엔드 작업 규칙)
├── docker-compose.yml — 로컬 개발 환경 (MySQL + Spring Boot)
├── railway.json       — Railway 배포 설정
├── nixpacks.toml      — Railway 빌드 설정 (JDK17)
└── CLAUDE.md          — 이 파일 (프로젝트 전체 개요)
```

---

## 주요 완성 기능

| 기능 | 설명 |
|------|------|
| 회원가입/로그인 | 이메일 + 카카오 OAuth 2.0 |
| JWT 인증 | Access Token 15분 + Refresh Token 7일 자동 재발급 |
| AI 책 생성 | 키워드·장르·분위기·결말·주인공 이름 → Gemini 비동기 생성 (폴링) |
| 레몬 시스템 | 하루 1개 자동 충전, 책 생성 시 소모, 1일 3회 제한 |
| 레몬트리 UI | 레몬 개수별 나무 시각화, 소모 시 낙하 애니메이션 |
| 내 서재 | 책 저장, 독서 상태(SAVED/READING/FINISHED), 페이지 저장 |
| 책 뷰어 | react-pageflip 두 페이지 모드, 키보드 방향키 지원 |
| 팔로우/언팔로우 | 유저 간 소셜 연결 |
| 별점·리뷰 | 1~5점 별점 + 텍스트 리뷰 (유저당 1개 제한) |
| 탐색 페이지 | 공개 책 목록 + 작가 팔로우 버튼 |
| 피드 | 팔로잉 유저가 만든 책 목록 |
| 알림 | 리뷰/팔로우 이벤트 알림 + 헤더 뱃지 + 드롭다운 |
| 다크모드 | 헤더 토글 + localStorage 유지 + CSS 변수 기반 |
| 성능 최적화 | React.memo, lazy loading, code splitting, SEO 메타 태그 |
| 기본 표지 통일 | 표지 없을 때 🍋 이모지 + 레몬색(#FFF9E6) 배경 |

---

## 로컬 개발 환경 실행

### 백엔드 (Docker)
```bash
# 루트 디렉터리에서
cd backend && ./gradlew bootJar -x test
cd ..
docker compose up
```

### 프론트엔드
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8080 npm start
```

---

## 앞으로 할 작업
- [ ] GitHub Actions CI/CD 파이프라인
- [ ] 무한 스크롤 (커서 기반 페이지네이션)
- [ ] 광고 보고 레몬 추가 획득
- [ ] 테스트 코드 작성 (백엔드 JUnit, 프론트엔드 Jest)
- [ ] React Native 앱 개발 검토
- [ ] Oracle Cloud 이전 검토 (Railway 메모리 제한 대응)

---

## 작업 규칙
- **백엔드 작업**: `backend/CLAUDE.md` 참고
- **프론트엔드 작업**: `frontend/CLAUDE.md` 참고
- 커밋은 사용자가 명시적으로 요청할 때만 수행
- 커밋 메시지: `feat:` / `fix:` / `refactor:` / `docs:` / `style:`
