# CLAUDE.md — Remon Service 프로젝트 전체 개요

## 프로젝트 개요
**Remon**은 AI가 전자책/소설을 자동 생성해주는 웹 서비스다.
사용자가 키워드(최대 4개), 장르(9종), 분위기(10종, 다중 선택), 결말 방향, 주인공 이름(최대 3명)·성격(17종, 다중 선택)·서술 시점·한 줄 시놉시스·조연(최대 4명)을 입력하면
Google Gemini(gemini-2.5-flash)가 6000자 내외의 단편 소설을 생성한다.
레몬 경제 시스템(하루 2회 제한)과 소셜 기능(팔로우, 리뷰, 피드)을 갖추고 있다.

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
- **AI (텍스트)**: Google Gemini API (gemini-2.5-flash)
- **AI (이미지)**: OpenAI API (gpt-image-1) — 표지 이미지 생성, b64_json 응답
- **이미지 CDN**: Cloudinary (cloudinary-http45:1.39.0)
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

### 앱 (`app/`)
- **플랫폼**: React Native 0.81.5 (Expo SDK 54)
- **네비게이션**: @react-navigation/native v7, Stack + BottomTabs (4탭)
- **HTTP**: axios (공통 인스턴스, 401 자동 재발급)
- **제스처**: react-native-gesture-handler (PanGestureHandler 스와이프)
- **저장소**: @react-native-async-storage/async-storage (토큰 관리)
- **SafeArea**: react-native-safe-area-context (노치/다이나믹 아일랜드 대응)
- **배포**: Expo Go (개발) / EAS Build (배포 예정)

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
├── frontend/          — React 19 웹 프론트엔드
│   ├── src/
│   │   ├── api/, components/, hooks/, pages/, styles/, utils/
│   ├── public/
│   ├── package.json
│   └── CLAUDE.md                            (프론트엔드 작업 규칙)
├── app/               — React Native 모바일 앱 (Expo SDK 54)
│   ├── src/
│   │   ├── api/       — axiosInstance, bookApi (16개 API 함수)
│   │   ├── components/ — BookCard.js (저자명 클릭 → UserProfile 이동)
│   │   ├── navigation/ — AppNavigator (Stack + BottomTabs 4탭)
│   │   ├── screens/   — LoginScreen, SignupScreen, HomeScreen,
│   │   │                BookDetailScreen, GenerateScreen,
│   │   │                ReadScreen, LibraryScreen, MyPageScreen,
│   │   │                UserProfileScreen (9개 화면)
│   │   ├── utils/     — auth.js (AsyncStorage 토큰 관리)
│   │   └── theme.js   — 색상 팔레트
│   ├── App.js
│   ├── app.json
│   └── package.json
├── .github/workflows/ci.yml — CI (백엔드 빌드·테스트·JaCoCo, 프론트 빌드)
├── docker-compose.yml — 로컬 개발 환경 (MySQL + Spring Boot)
├── railway.json       — Railway 배포 설정
├── nixpacks.toml      — Railway 빌드 설정 (JDK17)
├── CHANGELOG.md       — 변경 이력
└── CLAUDE.md          — 이 파일 (프로젝트 전체 개요, 현재 상태)
```

---

## 주요 기능 (현재 상태)
> 기능이 추가·변경된 이력은 [`CHANGELOG.md`](CHANGELOG.md) 참고

### 책 생성
- **입력 옵션**: 키워드(최대 4) · 장르 9종 · 분위기 10종(최대 2) · 결말(해피/새드/열린) · 주인공(최대 3명) · 성격 17종(최대 3) · 서술 시점(1/3인칭) · 한 줄 시놉시스 · 조연(최대 4명)
- **본문**: Gemini 2.5 Flash, 6000자 내외(프롬프트 지침 5500~6500자), 서사구조·Showing>Telling·오감 묘사·CoT 구상, 장르별 제목 가이드, `[TITLE]`/`[CONTENT]` 구분자 파싱
- **표지**: gpt-image-1(Studio Ghibli 스타일) → Cloudinary CDN, 실패해도 책은 완성 / 표지 없으면 🍋 + `#FFF9E6` 기본 표지 / 관리자 일괄 생성 API
- **파이프라인**: `PENDING` → (트랜잭션 커밋 후) `GENERATING`(텍스트 → 표지) → `DONE`, 실패 시 `FAILED` + 레몬 자동 환불, 15분 넘게 멈춘 작업 자동 복구
- **진행 표시**: 상태 API `step`(TEXT/IMAGE/DONE/FAILED) 기반 진행 바, 웹은 전역 폴링(`BookGenerationContext`) + 완료 토스트, 완료 시 `BOOK_GENERATED` 알림

### 레몬
- 하루 2개(`MAX_DAILY=2`) 충전, 생성 시 1개 소모(비관적 락으로 동시 요청 중복 차감 방지), 생성 실패 시 환불
- 레몬트리 시각화 + 소모 시 낙하 애니메이션

### 읽기 · 서재
- 웹 뷰어: react-pageflip, 데스크톱 2쪽 / 모바일 1쪽, 렌더 높이 기반 문장 단위 페이지 분할(`usePagination`), 창 크기 변경 시 재분할, 방향키 지원, 나무 책상/스탠드 불빛 테마
- 앱 뷰어: 스와이프 애니메이션, 화면 크기 기반 분할
- 서재: SAVED/READING/DONE 상태, 마지막 페이지 저장, 탭 필터, 홈 ✓ 배지(읽기 시작한 책)

### 탐색 · 소셜
- 홈: 최신순 커서 무한 스크롤, 평점순/조회수순 상위 12개(Redis 5분 캐시), 스켈레톤 로딩, 제목·작가 검색
- 탐색(장르 필터) · 피드(팔로잉 작가) · 작가 프로필 · 팔로우 · 별점 리뷰(1인 1개) · 공유 · 조회수
- 알림: REVIEW / FOLLOW / BOOK_GENERATED, 헤더 뱃지 + 드롭다운

### 계정 · 보안
- 이메일 + 카카오 OAuth(30초 단기 코드 교환 방식), JWT Access 15분 / Refresh 7일, 401 시 자동 재발급
- 닉네임 주 2회 변경 제한, 이메일·닉네임 중복 방지
- IP 기준 Rate Limit (인증 10회/분, 그 외 60회/분), 책 직접 등록·관리자 API 는 ADMIN 전용
- 오류 응답 형식: `{ "error": "메시지", "code": "BOOK_NOT_FOUND" }`

### 인프라 · 품질
- Flyway(V1~V6) + `ddl-auto=validate`, DB 인덱스, Redis 캐시(`books-rating`/`books-views`)
- GitHub Actions CI: 백엔드 빌드 + 테스트(H2) + JaCoCo 리포트, 프론트 빌드
- 다크모드(CSS 변수), 글래스모피즘 UI, React.lazy 코드 스플리팅, SEO 메타 태그

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

### 앱 (React Native / Expo)
```bash
cd app
npm install
npx expo start            # 기본 실행 (LAN)
npx expo start --tunnel   # 실기기 테스트 시 (방화벽 환경)
npx expo start --clear    # 캐시 초기화 후 실행
```
- Expo Go 앱에서 QR 코드 스캔 또는 iOS/Android 시뮬레이터 실행
- API URL: `app/.env`의 `EXPO_PUBLIC_API_URL` (없으면 운영 서버, `app/.env.example` 참고)

---

## 앞으로 할 작업
- [ ] **기본 관리자 계정 비밀번호 교체** — `DataInitializer`가 `admin@remon.com / admin1234` 계정을 생성함 (운영 확인 필요)
- [ ] 책 생성 스트리밍(SSE) / DB·Redis 기반 작업 큐 / 시리즈(이어쓰기) / 토큰 httpOnly 쿠키 전환
- [ ] 웹·앱 공용 상수·API 패키지 (현재 CRA·Metro 빌드 구조상 보류 — 워크스페이스 구성 필요)
- [ ] 앱 EAS Build 설정 및 스토어 배포 (iOS/Android)
- [ ] 앱 아이콘 레몬 이미지로 교체 (assets/icon.png, adaptive-icon.png)
- [ ] 앱 팔로우/알림 기능 연동 (BOOK_GENERATED, REVIEW, FOLLOW)
- [ ] 앱 GenerateScreen 시놉시스·조연·주인공 여러 명 UI 추가 (웹과 동기화)
- [ ] CD (main 머지 시 자동 배포) — CI 는 구축됨
- [ ] Elasticsearch 도입 (키워드 검색 고도화)
- [ ] 광고 보고 레몬 추가 획득
- [ ] 서비스 스크린샷 촬영 및 README 갱신 (`docs/screenshots/`)
- [ ] 프로필 사진 업로드 기능 (아바타 이미지 → Cloudinary)
- [x] 테스트 코드 작성 (백엔드 JUnit — LemonService 동시성·BookGenerationTask·UserController 완료)
- [ ] 테스트 코드 작성 (프론트엔드 Jest)
- [ ] 평점순/조회수순 정렬 무한 스크롤 지원 (현재 상위 12개 고정 반환)
- [ ] Python 분석 스크립트 (생성 책 장르·분위기 분포, 사용자 활동 통계)
- [ ] Oracle Cloud 이전 검토 (Railway 메모리 제한 대응)
- [ ] `oauth_codes` 만료 코드 정기 정리 스케줄러 (`@Scheduled` + `deleteByExpiresAtBefore`)
- [ ] Gemini 유료 플랜 전환 검토 (무료 한도 초과 시 503 — 현재 보류)
- [ ] 커스텀 도메인 연결 (Vercel + Railway)

---

## 작업 규칙
- **백엔드 작업**: `backend/CLAUDE.md` 참고
- **프론트엔드 작업**: `frontend/CLAUDE.md` 참고
- **앱 작업**: `app/` 폴더 — React Native (Expo SDK 54), API BASE_URL은 `app/src/api/axiosInstance.js`
- 커밋은 사용자가 명시적으로 요청할 때만 수행
- 커밋 메시지: `feat:` / `fix:` / `refactor:` / `docs:` / `style:`
