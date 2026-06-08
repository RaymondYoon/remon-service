# 🍋 Remon — AI 전자책 생성 서비스

![Java](https://img.shields.io/badge/Java_17-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_3.5-6DB33F?style=flat&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo_SDK_54-000020?style=flat&logo=expo&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=flat&logo=mysql&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

> 키워드 몇 개를 입력하면 AI가 나만의 단편 소설을 만들어주는 풀스택 웹 + 모바일 서비스

**서비스 URL**: https://remon-service.vercel.app
**Swagger API 문서**: https://remon-service-production.up.railway.app/swagger-ui.html

---

## 목차
1. [프로젝트 소개](#프로젝트-소개)
2. [스크린샷](#스크린샷)
3. [기술 스택](#기술-스택)
4. [주요 기능](#주요-기능)
5. [아키텍처](#아키텍처)
6. [핵심 구현 내용 (STAR)](#핵심-구현-내용)
7. [트러블슈팅](#트러블슈팅)
8. [로컬 실행 방법](#로컬-실행-방법)
9. [프로젝트 구조](#프로젝트-구조)

---

## 프로젝트 소개

Remon은 "레몬처럼 상큼한 독서 경험"을 모티프로 한 AI 전자책 생성 플랫폼입니다.

- 키워드(최대 4개), 장르, 분위기, 결말 방향, 주인공 이름·성격·서술 시점을 입력하면 Google Gemini가 2,500자 내외의 단편 소설을 비동기로 생성합니다.
- 생성된 책은 **웹**에서는 react-pageflip 기반 책 넘기기 뷰어로, **앱**에서는 PanGestureHandler 스와이프 애니메이션으로 읽을 수 있습니다.
- 레몬 경제 시스템(하루 1개 자동 충전, 1일 3회 생성 제한)으로 생성 횟수를 관리합니다.
- 팔로우, 별점·리뷰, 피드, 알림 등 소셜 기능으로 다른 사용자의 책도 탐색할 수 있습니다.

---

## 스크린샷

### 웹 (React 19)

| 홈 화면 | AI 책 생성 | 책 뷰어 |
|--------|-----------|--------|
| ![홈](docs/screenshots/web-home.png) | ![생성](docs/screenshots/web-generate.png) | ![뷰어](docs/screenshots/web-reader.png) |

| 책 상세 | 내 서재 | 마이페이지 |
|--------|--------|-----------|
| ![상세](docs/screenshots/web-detail.png) | ![서재](docs/screenshots/web-library.png) | ![마이](docs/screenshots/web-mypage.png) |

### 앱 (React Native / Expo)

| 홈 | 탐색 | 책 생성 | 책 읽기 | 서재 |
|----|-----|--------|--------|-----|
| ![홈](docs/screenshots/app-home.png) | ![탐색](docs/screenshots/app-explore.png) | ![생성](docs/screenshots/app-generate.png) | ![읽기](docs/screenshots/app-read.png) | ![서재](docs/screenshots/app-library.png) |

> 스크린샷 이미지는 `docs/screenshots/` 디렉터리에 추가하세요.

---

## 기술 스택

### Backend
| 분류 | 기술 |
|------|------|
| 언어 / 프레임워크 | Java 17, Spring Boot 3.5.5 |
| 인증 | Spring Security, JWT (jjwt 0.12.6), 카카오 OAuth 2.0 |
| DB / ORM | MySQL 8, Spring Data JPA, Hibernate |
| AI (텍스트) | Google Gemini API (gemini-2.5-flash) |
| AI (이미지) | OpenAI API gpt-image-1 (표지 이미지, b64_json 응답) |
| 이미지 CDN | Cloudinary (cloudinary-http45:1.39.0) |
| Rate Limiting | Bucket4j 8.10.1 |
| API 문서 | springdoc-openapi 2.8.3 (Swagger UI) |
| DB 마이그레이션 | Flyway (flyway-mysql) — V1~V3 SQL, baseline-on-migrate, repair-on-migrate |
| 캐싱 | Spring Cache + Redis — books-rating / books-views TTL 5분, GenericJackson2JsonRedisSerializer |
| 빌드 / 배포 | Gradle, nixpacks, Railway (JVM -Xms128m -Xmx400m) |

### Frontend (Web)
| 분류 | 기술 |
|------|------|
| 프레임워크 | React 19, react-router-dom v7 |
| HTTP 클라이언트 | axios (공통 인스턴스, 401 자동 재발급, failedQueue) |
| 책 뷰어 | react-pageflip 2.0.3 (두 페이지 고정, DOM 높이 기반 분할) |
| 상태관리 | useState / useEffect (전역 라이브러리 없음) |
| 스타일링 | CSS + CSS 변수 (다크/라이트 모드) |
| 성능 | React.memo, React.lazy + Suspense, code splitting |
| 배포 | Vercel |

### Mobile App
| 분류 | 기술 |
|------|------|
| 플랫폼 | React Native 0.81.5 (Expo SDK 54) |
| 네비게이션 | @react-navigation/native v7 (Stack + BottomTabs 5탭, 중앙 FAB 버튼) |
| HTTP 클라이언트 | axios (공통 인스턴스, 401 자동 재발급) |
| 제스처 | react-native-gesture-handler (PanGestureHandler 스와이프) |
| 저장소 | @react-native-async-storage/async-storage (토큰 관리) |
| 배포 | Expo Go (개발) / EAS Build (예정) |

#### 앱 주요 기능
- 10개 화면: 로그인/회원가입/홈/둘러보기/AI책생성/책읽기/서재/마이페이지
- 탭바 중앙 만들기(🍋) 버튼 — 원형 FAB (top:-20, `tabBarButton` prop)
- BookDetailScreen: `coverImageUrl` 표지 이미지 + 별점·리뷰 작성 폼 (로그인 시 노출)
- GenerateScreen: 서술 시점(1인칭/3인칭) + 주인공 성격(6종 칩) 옵션 — 웹과 동일한 세트
- LibraryScreen: 독서 상태별 필터 탭 (전체/읽는 중/완독/저장됨)
- Toast 피드백: 서재 담기·리뷰 등록 결과 비차단(non-blocking) 토스트 메시지

### Infra
| 분류 | 기술 |
|------|------|
| 컨테이너 | Docker, docker-compose |
| 백엔드 호스팅 | Railway |
| 프론트엔드 호스팅 | Vercel |
| DB 호스팅 | MySQL 8 on Railway (내부 연결) |
| 로컬 개발 | Docker Compose (MySQL + Spring Boot) |

---

## 주요 기능

### AI 책 생성
- 키워드(최대 4개), 장르(SF/판타지/로맨스/일상/공포), 분위기(따뜻/긴장감/유쾌), 결말(해피/새드/열린결말), 주인공 이름·성격(6종 칩), 서술 시점(1인칭/3인칭) → Google Gemini API로 2,500자 소설 자동 생성
- 프롬프트 엔지니어링: 서사구조(강렬한 훅+기승전결) / Showing>Telling / 오감 묘사 / CoT 집필 내부 구상 단계 / 장르별 문학적 제목 생성 가이드 포함
- `202 Accepted` + 폴링 방식 비동기 처리 — UI 블로킹 없이 생성 진행 상태 실시간 확인
- 생성 진행도 프로그레스 바: `step` 필드(TEXT/IMAGE/DONE) 기반 단계별 메시지 + 퍼센티지 표시 (✍️ 10→50% / 🎨 50→90% / ✨ 100%)

### 책 뷰어
- **웹**: react-pageflip 두 페이지 모드 고정, DOM 높이 기반 자동 페이지 분할, 키보드 방향키(←→) 지원
- **앱**: `Animated.spring` 슬라이드 전환, PanGestureHandler 스와이프, `useNativeDriver: true`
- 이어 읽기: 마지막 읽은 페이지 localStorage + 서버 동시 저장 (debounce 1500ms)

### 레몬 경제 시스템
- DB 기반 레몬 보유량 관리, 자정에 1개 자동 충전
- 책 생성 시 레몬 1개 소모 / 하루 최대 3회 생성 제한 (서버측 처리)
- 레몬트리 UI: 보유 개수에 따라 나무가 자라는 3단계 시각화 (CSS/SVG 직접 구현)

### 소셜 기능
- 팔로우/언팔로우, 팔로잉 유저의 책 피드
- 별점(1~5점) + 리뷰 작성 (유저당 1개 제한, 중복 방지)
- 리뷰/팔로우/책 생성 완료 이벤트 알림 + 헤더 미읽음 뱃지

### 커서 기반 무한 스크롤 & 정렬
- `GET /api/books/cursor?cursor=&keyword=&size=12&sort=latest|rating|views` — sort 파라미터로 정렬 방식 선택
- `sort=latest`(기본): 마지막 book ID 커서 기반 무한 스크롤 / `sort=rating`·`sort=views`: 상위 12개 고정 반환
- 프론트엔드 `useInfiniteBooks` 훅 — params에 `sort` 포함, 정렬 변경 시 `paramsKey` 변동으로 목록 자동 초기화·재조회
- 홈 화면 "추천 전자책" 섹션 우측에 최신순/평점순/조회수순 탭 UI

### 조회수 카운트
- `GET /api/books/{id}` 호출 시 `BookRepository.incrementViewCount` (@Modifying JPQL)로 viewCount 1 증가
- `BookResponse`에 `viewCount` 포함하여 클라이언트에 반환

### 동시성 처리
- 레몬 차감 시 `@Lock(LockModeType.PESSIMISTIC_WRITE)` 적용 — 동시 요청에서 중복 차감 방지
- 차감 전 잔량 재확인 (`< 1` 시 예외) + `@Transactional` 보장

### 책 공유
- BookDetail 페이지 📤 공유 버튼 — `navigator.share()` (Web Share API) 호출
- 미지원 브라우저(데스크톱 Chrome 등)는 URL을 클립보드에 복사 후 "링크가 복사됐어요!" 토스트 표시

### 인증
- 이메일 회원가입/로그인 + 카카오 OAuth 2.0
- JWT Access Token(15분) + Refresh Token(7일) 자동 재발급
- 401 응답 시 axiosInstance 인터셉터에서 자동으로 토큰 갱신 후 요청 재시도

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│              Vercel (Web Frontend)                           │
│  React 19 · react-router-dom v7 · react-pageflip           │
│  axios (JWT 자동첨부, 401 자동재발급, failedQueue)            │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┤  HTTPS
│  Expo Go / EAS Build  │
│  (Mobile App)         │
│  React Native 0.81.5  │
│  Expo SDK 54          │
│  axios + AsyncStorage │
└───────────────────────┼─────────────────────────────────────┐
                        │ HTTPS                               │
┌───────────────────────▼─────────────────────────────────────┤
│                  Railway (Backend)                           │
│  Spring Boot 3.5.5 / Java 17                                │
│  Spring Security + JWT + Kakao OAuth 2.0                    │
│  @Async AI 생성 파이프라인 / bucket4j Rate Limiting          │
│  Swagger UI (/swagger-ui.html)                               │
└───────┬───────────────────────────┬──────────────────────────┘
        │                           │
┌───────▼────────┐        ┌─────────▼──────────────┐
│  MySQL 8       │        │  Google Gemini API      │        │  OpenAI gpt-image-1  │
│  (Railway 내부) │        │  gemini-2.5-flash       │        │  표지 이미지 생성     │
│  8개 테이블    │        │  30초 타임아웃           │        │  b64_json 응답        │
└────────────────┘        └────────────────────────┘        └──────────┬───────────┘
                                                                        │
                                                             ┌──────────▼───────────┐
                                                             │  Cloudinary CDN       │
                                                             │  이미지 영구 저장     │
                                                             └──────────────────────┘
```

**모노레포 구조**
```
remon-service/
├── backend/      — Spring Boot (com.remon 패키지 12개 모듈, 60+ REST API)
├── frontend/     — React 19 웹 (13개 페이지, 8개 컴포넌트)
├── app/          — React Native (Expo SDK 54, 10개 화면, 5탭 네비게이션)
└── docker-compose.yml  — 로컬 개발 환경 (MySQL + Spring Boot)
```

**외부 API 의존성**

| API | 용도 | 비고 |
|-----|------|------|
| Google Gemini (gemini-2.5-flash) | 소설 텍스트 생성 | 30초 타임아웃, 500/503 재시도 (3회) |
| OpenAI (gpt-image-1) | 표지 이미지 생성 | size 1024x1536, quality auto, b64_json 반환 |
| Cloudinary | 이미지 CDN 업로드·저장 | book-{id} public_id |
| Kakao OAuth 2.0 | 소셜 로그인 | redirect → JWT 발급 |

---

## 핵심 구현 내용

### 1. AI 비동기 책 생성 파이프라인

**Situation**: Gemini API 호출은 최대 30초 소요 → 동기 처리 시 요청 타임아웃 및 UX 차단 발생

**Task**: 생성 버튼 클릭 시 즉시 응답하면서 백그라운드에서 생성 진행, 완료·실패 상태를 실시간으로 사용자에게 전달

**Action**:
- `POST /api/books/generate`에서 Book을 PENDING 상태로 즉시 DB 저장, `202 Accepted + { id }` 반환
- Spring `@Async`로 별도 스레드(`BookGenerationTask`)에서 Gemini API 호출 → 텍스트 완료 시 GENERATING 유지 → 표지 이미지 저장 완료 후 DONE, 실패 시 FAILED 업데이트
- 상태 흐름: `PENDING → GENERATING(시작) → GENERATING(텍스트 완료) → DONE(표지 포함)/FAILED`
- 프론트엔드에서 `GET /api/books/{id}/status`를 3초 간격(최대 60회)으로 폴링하여 DONE 감지 → 뷰어로 자동 이동 (DONE 수신 시 `coverImageUrl` 포함된 완성 책 보장)
- 레몬 소모도 서버측에서 처리하여 클라이언트 조작 불가

**Result**: 30초 생성 대기 중에도 UI 블로킹 없음. FAILED 상태로 사용자에게 명확한 피드백 제공, 레몬 차감은 서버 신뢰 보장

---

### 2. DOM 높이 기반 책 페이지 자동 분할

**Situation**: 소설 본문 길이·폰트·화면 크기가 제각각이라 고정 글자 수로 페이지를 나누면 텍스트가 넘치거나 잘림

**Task**: 실제 렌더링 높이를 기준으로 모든 환경에서 정확한 페이지 구성

**Action**:
- 화면 밖 숨김 DOM probe 요소에 단락을 순서대로 추가하며 `offsetHeight`로 실제 렌더 높이 측정
- 단락 하나만으로도 한 페이지를 초과하는 경우 binary search로 단어 경계에서 분할
- 창 크기 변경(resize) 시 debounce 150ms 후 전체 페이지 재계산
- 앱(ReadScreen)에서는 `Dimensions.get('window').height` 기준으로 동일 로직 구현

**Result**: 단락 잘림 없이 정확한 페이지 구성. 모바일·태블릿·데스크톱, 웹·앱 모두 동일하게 동작

---

### 3. JWT + Refresh Token 자동 재발급

**Situation**: Access Token 15분 만료 시 사용자가 수동으로 재로그인해야 하는 UX 문제

**Task**: 사용자가 인식하지 못하는 투명한 토큰 갱신 구현

**Action**:
- axiosInstance 응답 인터셉터에서 401 감지 → `POST /api/auth/refresh`로 Refresh Token 전송
- 동시에 여러 API가 401을 받는 경우 `failedQueue`로 큐잉하여 갱신 완료 후 일괄 재시도 (Race Condition 방지)
- 갱신 실패(Refresh Token 만료) 시 `clearAuth()` + 로그인 페이지 리다이렉트
- 백엔드: `deleteByEmail() + entityManager.flush()` 후 새 Refresh Token 저장 → duplicate key 방지
- 앱(React Native)도 동일한 인터셉터 구조를 AsyncStorage 기반으로 구현

**Result**: Access Token 만료와 무관하게 로그인 상태 유지, 사용자 경험 저하 없음

---

### 4. Gemini 응답 파싱 안정화

**Situation**: Gemini API에 JSON 형식 응답 요청 시 소설 본문 내 따옴표·쉼표·줄바꿈으로 JSON parse error 빈발

**Task**: 소설 내용과 무관하게 안정적으로 제목/본문을 파싱

**Action**:
- `responseMimeType: "application/json"` 제거, 프롬프트에서 `[TITLE]` / `[CONTENT]` 구분자 방식으로 변경
- 백엔드에서 정규식 `\[TITLE\]\s*(.+?)\s*\[CONTENT\]\s*(.+)` (DOTALL 플래그)으로 title/content 추출
- 구분자 파싱 실패 시 첫 줄 = title, 나머지 = content로 fallback 처리

**Result**: JSON 파싱 오류 근본 해결. fallback으로 극단적 케이스도 처리 가능

---

### 5. Gemini 프롬프트 엔지니어링 — 소설 품질 향상

**Situation**: 초기 프롬프트는 단순 조건 나열 방식이라 AI가 직접 서술(Telling), 평이한 도입부, 단조로운 문체의 소설을 생성함

**Task**: 독자가 처음부터 몰입할 수 있는 문학적 완성도 높은 소설을 안정적으로 생성

**Action**:
- 서사구조 강제: 첫 문장을 강렬한 훅(Hook)으로 시작, 기승전결 구조 명시
- Showing > Telling: "그는 화가 났다" 같은 직접 서술 금지, 행동·감각 묘사만 허용
- 오감 활용: 시각·청각·후각·촉각·미각을 적극 활용하는 배경 묘사 지시
- 서술 시점 선택: 사용자가 1인칭(나 시점) / 3인칭(전지적 시점) 선택 → 프롬프트에 반영
- 주인공 성격 옵션: 6가지 칩 중 선택 시 "이 특징이 이야기 전반에 자연스럽게 드러나도록"으로 프롬프트에 삽입
- CoT(Chain-of-Thought) 집필 구상: 출력 금지 내부 단계("주인공 비밀/결핍 → 갈등·반전 → 클라이맥스 오감 요소") 추가 — AI가 구조를 계획한 뒤 본문을 작성하도록 유도

**Result**: 훅이 있는 도입부, 감각적 묘사, 일관된 시점의 소설 생성. 사용자 선택 옵션이 실제 서사에 반영됨

---

### 6. Flyway 마이그레이션 도입 — 스키마 버전 관리

**Situation**: `ddl-auto=update`로 운영 중 Railway 재배포 시 Hibernate가 스키마를 임의 변경하거나 데이터가 유실될 위험이 있었음

**Task**: 스키마 변경을 코드로 관리하고 데이터 유실을 원천 차단

**Action**:
- `spring.jpa.hibernate.ddl-auto=update` → `validate`로 전환 — Hibernate는 검증만 수행, DDL 실행 불가
- `org.flywaydb:flyway-mysql` 의존성 추가, `baseline-on-migrate=true` + `repair-on-migrate=true` 설정
- `V1__init_schema.sql`: 8개 테이블 전체 `CREATE TABLE IF NOT EXISTS` 정의 (기존 테이블 무손상)
- `V2__cleanup_wrong_tables.sql`: 초기 마이그레이션 시 잘못 생성된 `books`/`users` 테이블 제거
- `V3__cleanup_duplicate_tables.sql`: 잘못 생성된 `user_lemons` 테이블 제거
- 엔티티에 `@Table(name = "...")` 명시 — Hibernate naming strategy 의존 제거 (`book`, `user`, `user_lemon`)

**Result**: 스키마 변경 이력이 `flyway_schema_history` 테이블로 추적됨. 재배포 시 validate 실패로 데이터 유실성 DDL 사전 차단

---

### 7. Redis 캐싱 — 평점순/조회수순 쿼리 최적화

**Situation**: `findBooksSortedByRating`은 상관 서브쿼리(AVG)를 포함한 무거운 쿼리로 정렬 탭 전환 시마다 풀스캔 발생

**Task**: 자주 바뀌지 않는 정렬 결과를 캐싱하여 DB 부하 절감

**Action**:
- `spring-boot-starter-data-redis` 추가, `RedisConfig.java`에서 `RedisCacheManager` 빈 직접 구성
- `GenericJackson2JsonRedisSerializer` + `activateDefaultTyping`으로 Book 엔티티 JSON 직렬화
- `BookRepository`의 `findBooksSortedByViews` / `findBooksSortedByRating`에 `@Cacheable("books-views")` / `@Cacheable("books-rating")` 적용 (TTL 5분)
- `BookService.getBookById`에 `@CacheEvict(allEntries = true)` — 조회수 변경 시 캐시 무효화
- `BookGenerationTask.run`에서 DONE 전환 후 `CacheManager.getCache().clear()` — 신규 책 등록 시 캐시 갱신

**Result**: 평점순/조회수순 탭 재전환 시 DB 쿼리 없이 Redis에서 즉시 반환, 신규 책/조회수 변경 시 자동 무효화

---

### 8. 읽기 시작 upsert — 서재 없이도 독서 상태 등록

**Situation**: ReadPage 방문 시 서재에 책이 없으면 독서 상태(READING)를 등록할 수 없어 홈의 ✓ 배지가 표시되지 않음

**Task**: 서재에 없는 책도 ReadPage 방문 즉시 READING 상태로 자동 등록

**Action**:
- `PATCH /api/library/{bookId}/start-reading`을 upsert 방식으로 변경 — UserBook이 없으면 READING으로 신규 생성, 있으면 상태만 업데이트
- `GET /api/library/my-reading-book-ids` 신규 엔드포인트 추가 — READING + DONE bookId 목록 반환
- 홈 화면에서 해당 목록을 기준으로 BookCard에 ✓ 배지 표시

**Result**: 서재 담기 없이 읽기만 해도 ✓ 배지 표시, 독서 이력 자동 추적

---

## 트러블슈팅

| 문제 | 원인 | 해결 |
|------|------|------|
| Railway 컨테이너 OOM 재시작 반복 | Spring Boot 기본 힙 크기가 Railway 512MB 메모리 제한 초과 | 시작 명령에 `-Xms128m -Xmx400m` 추가 |
| 카카오 로그인 간헐적 500 오류 | `deleteByEmail` 후 flush 없이 save 시 동일 트랜잭션에서 duplicate key 감지 | `deleteByEmail()` 직후 `entityManager.flush()` 추가 |
| 책 뷰어 nav 버튼 클릭 불가 | HTMLFlipBook DOM이 버튼 영역 위에 z-index로 덮음 | `.read-nav`에 `position: relative; z-index: 10` 추가 |
| 홈 ✓ 배지 미표시 | `startReading`이 서재에 없으면 아무것도 안 하는 구조 | upsert 방식으로 변경 — 서재 없으면 READING으로 자동 추가 |
| Gemini JSON parse error 빈발 | 소설 본문 내 따옴표·쉼표·줄바꿈이 JSON 파싱 오류 유발 | JSON 대신 `[TITLE]`/`[CONTENT]` 구분자 방식으로 전면 변경 |
| 책 뷰어 텍스트 잘림 | 고정 글자 수 기반 페이지 분할로 폰트/화면 크기 미반영 | DOM probe + offsetHeight 기반 동적 분할로 교체 |
| 앱 401 오류 메시지 파싱 실패 | `data.message` 키로 읽었으나 백엔드 GlobalExceptionHandler는 `data.error` 반환 | 오류 파싱을 `e.response?.data?.error ?? e.response?.data?.message` 로 수정 |
| Railway nixpacks JAVA_HOME 미설정 | Railway 기본 빌드 시 JDK가 PATH에 없어 Gradle 빌드 실패 | `nixpacks.toml`에 `nixPkgs = ["jdk17_headless"]` 추가 |
| 표지 이미지 항상 null | gpt-image-1은 URL이 아닌 `b64_json`(Base64 인코딩 이미지) 반환 — 코드가 `url` 필드만 조회 | `data.get("b64_json")` 우선 처리, `Base64.getDecoder().decode()`로 바이트 변환 |
| gpt-image-1 `400 Bad Request` | 구 DALL-E 3 파라미터(`style`, `response_format`) 포함 전송 | gpt-image-1 스펙에 맞게 `size`, `quality`, `n`만 전달 |
| Gemini 간헐적 500/503 | Google 측 일시 과부하 | `HttpServerErrorException` catch → 3초 대기 후 최대 3회 재시도 |
| `coverImageUrl` DB 미저장 | `Book` 엔티티 및 `BookResponse` DTO에 `coverImageUrl` 필드 누락 | 엔티티·DTO 양쪽에 필드 추가 및 로그 확인 |
| 표지 일괄 생성 curl 타임아웃 | 책 수 × OpenAI 호출(30~60초)이 Railway HTTP 타임아웃 초과 | 컨트롤러 즉시 202 반환 + `@Async` 백그라운드 처리로 분리 |
| 커서 쿼리 결과 항상 0건 | JPQL `b.status = 'DONE'` 문자열 리터럴 — Hibernate가 enum 필드와 비교 시 결과 없음 | `@Query` + `@Param("status") BookStatus status` 명시적 파라미터 바인딩으로 교체 |
| 모바일 ReadPage 하단 텍스트 잘림 | `contentH` 계산 시 페이지 번호 바 높이를 하드코딩(48px)으로 고정해 실제보다 낮은 높이 반영 + 마지막 줄 경계 잘림 | `pageNumBarRef`로 실제 DOM 높이 측정, 모바일 `contentH`에 40px 안전 마진 추가 |
| 책 생성 DONE 수신 시 표지 없음 | 텍스트 완료 직후 DONE으로 상태 변경 → 클라이언트가 DONE 감지 시 아직 이미지 업로드 전 | 상태 흐름 변경: 텍스트 완료 후 GENERATING 유지 → 이미지 저장 완료 후 `updateStatus(DONE)` 호출 |
| `BOOK_GENERATED` 알림 저장 시 `Data truncated for column 'type'` | `notifications.type` 컬럼 길이가 `BOOK_GENERATED`(14자)보다 짧게 생성됨 | `@Column(nullable = false, length = 20)` 명시 → Hibernate DDL-auto=update로 컬럼 자동 확장 |
| OpenAI API `429 / insufficient_quota` — 표지 이미지 전체 실패 | OpenAI 계정 크레딧 소진 (billing limit 초과) — gpt-image-1 호출 시 429 반환 | `BookGenerationTask`의 이미지 예외 `catch` 블록이 작동하여 책은 DONE 유지됨. 크레딧 충전으로 해결 |
| 안드로이드 모바일 책 넘김 버벅임 | 브라우저가 CSS transform 애니메이션을 CPU로 처리 — 60fps 미달 | `ReadPage.css`에 `will-change: transform`, `translateZ(0)`, `backface-visibility: hidden` 추가로 GPU 합성 레이어 강제 활성화 |
| Windows bash curl 한글 페이로드 → 403 오류 | Windows bash의 curl이 `-d` 문자열을 시스템 인코딩(CP949)으로 전송 → Spring이 JSON 파싱 실패 | Python `urllib`로 `json.dumps(..., ensure_ascii=False).encode('utf-8')` 후 전송. Content-Type 헤더에 `charset=utf-8` 명시 |
| 홈에 생성 중인 AI 책(PENDING/GENERATING)이 노출 | `GET /api/books`와 `GET /api/books/cursor`가 status 구분 없이 모든 AI 생성 책을 반환 | `BookRepository`에 DONE 필터 쿼리 추가 (`isAiGenerated = false OR status = DONE`), `BookService`에서 해당 쿼리 사용으로 교체 |
| 평점순/조회수순 커서 페이지네이션 불가 | 커서가 `b.id < :cursor` 조건 기반이라 다른 정렬 기준과 혼용 시 중복·누락 발생 | `sort=rating`·`sort=views`는 커서 없이 상위 12개 고정 반환(`hasMore=false`)으로 처리 |
| `ddl-auto=update` 데이터 유실 | Railway 재배포 시 Hibernate가 스키마를 임의 변경하여 기존 데이터 유실 가능 | Flyway 도입 + `ddl-auto=validate` 전환 — V1~V3 SQL로 스키마 버전 관리, IF NOT EXISTS로 멱등성 보장 |
| Flyway 체크섬 불일치 | V1 SQL 내용 수정 후 재배포 시 기존 `flyway_schema_history`와 체크섬 불일치로 기동 실패 | `repair-on-migrate=true` 설정 추가 + Railway MySQL Console에서 `UPDATE flyway_schema_history SET checksum=... WHERE version='1'`로 직접 수정 |
| `user_lemons` 테이블 잘못 생성 | V1 SQL에 `user_lemons`로 생성했으나 실제 엔티티는 `user_lemon` (단수) 매핑 → validate 실패 | `@Table(name = "user_lemon")` 명시 + V3 마이그레이션으로 잘못된 `user_lemons` 테이블 DROP |

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
OPENAI_API_KEY=your_openai_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 2. 백엔드 실행 (Docker)
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

### 4. 앱 실행 (React Native / Expo)
```bash
cd app
npm install
npx expo start            # 기본 (LAN)
npx expo start --tunnel   # 실기기 테스트 시 (방화벽 환경)
```
- Expo Go 앱에서 QR 코드 스캔 또는 iOS/Android 시뮬레이터 실행

---

## 프로젝트 구조

```
remon-service/
├── backend/src/main/java/com/remon/
│   ├── book/          책 CRUD, AI 생성 비동기 처리 (@Async, PENDING→DONE/FAILED)
│   │                  ImagenService (gpt-image-1 표지), CloudinaryService (CDN 업로드)
│   ├── user/          인증, JWT, 카카오 OAuth 2.0
│   ├── library/       내 서재, 독서 상태 (SAVED/READING/DONE), upsert
│   ├── lemon/         레몬 경제 시스템 (1/day 자동 충전, 3/day 생성 제한)
│   ├── review/        별점·리뷰 CRUD (유저당 1개 제한, averageRating 포함)
│   ├── follow/        팔로우/언팔로우, 팔로워·팔로잉 목록
│   ├── notification/  알림 (REVIEW/FOLLOW/BOOK_GENERATED 이벤트, bookId 포함)
│   ├── security/      JwtTokenProvider, JwtAuthenticationFilter
│   ├── ratelimit/     bucket4j Rate Limiting (RateLimitFilter)
│   ├── admin/         관리자 전용 (책/리뷰 삭제, 표지 일괄 생성)
│   ├── logging/       로그 마스킹 (MaskingMessageConverter)
│   └── config/        SecurityConfig, AsyncConfig, SwaggerConfig, CloudinaryConfig, DataInitializer
│
├── frontend/src/
│   ├── api/           axiosInstance, bookApi, userApi, followApi, reviewApi, notificationApi
│   ├── components/    Header, BookCard(memo), BookList(memo), LemonTree, LemonFall, Toast, ProtectedRoute, Footer
│   ├── hooks/         useBooks, useInfiniteBooks, useTheme, useToast
│   ├── pages/         Home, BookDetail, ReadPage, GeneratePage, MyLibrary, MyBooks,
│   │                  MyPage, ExplorePage, FeedPage, UserProfilePage,
│   │                  Login, Signup, OAuthCallback
│   ├── styles/        variables.css (CSS 변수, 다크/라이트 토큰), global.css
│   └── utils/         auth.js (localStorage 토큰), lemonStorage.js (일일 사용 횟수)
│
└── app/src/
    ├── api/           axiosInstance (AsyncStorage 기반 401 자동갱신), bookApi (16개 함수)
    ├── navigation/    AppNavigator (Stack + BottomTabs 5탭)
    ├── screens/       LoginScreen, SignupScreen, HomeScreen, ExploreScreen, FeedScreen,
    │                  BookDetailScreen, GenerateScreen, ReadScreen, LibraryScreen, MyPageScreen
    ├── utils/         auth.js (AsyncStorage 토큰/유저 관리)
    └── theme.js       색상 팔레트 (colors.primary 등)
```
