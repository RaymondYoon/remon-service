# CLAUDE.md — Remon Service 프로젝트 전체 개요

## 프로젝트 개요
**Remon**은 AI가 전자책/소설을 자동 생성해주는 웹 서비스다.
사용자가 키워드(최대 4개), 장르, 분위기, 결말 방향, 주인공 이름·성격·서술 시점(선택)을 입력하면
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
- **네비게이션**: @react-navigation/native v7, Stack + BottomTabs (5탭)
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
│   │   ├── navigation/ — AppNavigator (Stack + BottomTabs 5탭)
│   │   ├── screens/   — LoginScreen, SignupScreen, HomeScreen, ExploreScreen,
│   │   │                FeedScreen, BookDetailScreen, GenerateScreen,
│   │   │                ReadScreen, LibraryScreen, MyPageScreen (10개)
│   │   ├── utils/     — auth.js (AsyncStorage 토큰 관리)
│   │   └── theme.js   — 색상 팔레트
│   ├── App.js
│   ├── app.json
│   └── package.json
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
| AI 책 생성 | 키워드·장르·분위기·결말·주인공 이름·성격·서술 시점 → Gemini 비동기 생성 (폴링) |
| AI 소설 품질 향상 | 서사구조(훅+기승전결) / Showing>Telling / 오감 묘사 / CoT 집필 구상 내부 단계 / 2500자 고정 |
| 레몬 시스템 | 하루 1개 자동 충전, 책 생성 시 소모, 1일 3회 제한 |
| 레몬트리 UI | 레몬 개수별 나무 시각화, 소모 시 낙하 애니메이션 |
| 내 서재 | 책 저장, 독서 상태(SAVED/READING/DONE), 페이지 저장 |
| 책 뷰어 (웹) | react-pageflip 두 페이지(데스크톱)/단일 페이지(모바일), DOM 높이 기반 자동 분할, 모바일 40px 안전 마진·DOM 높이 측정, 키보드 방향키 지원 |
| 책 뷰어 (앱) | PanGestureHandler 스와이프 애니메이션, 화면 크기 기반 자동 분할 |
| 팔로우/언팔로우 | 유저 간 소셜 연결 |
| 별점·리뷰 | 1~5점 별점 + 텍스트 리뷰 (유저당 1개 제한) |
| 탐색 페이지 | 공개 책 목록 + 작가 팔로우 버튼 |
| 피드 | 팔로잉 유저가 만든 책 목록 |
| 알림 | 리뷰/팔로우 이벤트 알림 + 헤더 뱃지 + 드롭다운 |
| 다크모드 | 헤더 토글 + localStorage 유지 + CSS 변수 기반 |
| 성능 최적화 | React.memo, lazy loading, code splitting, SEO 메타 태그 |
| 기본 표지 통일 | 표지 없을 때 🍋 이모지 + 레몬색(#FFF9E6) 배경 |
| AI 표지 이미지 | gpt-image-1으로 책 생성 시 Studio Ghibli 스타일 표지 자동 생성 → Cloudinary CDN 저장 |
| 표지 일괄 생성 | 관리자 API (`POST /api/admin/books/generate-covers`) — 표지 없는 DONE 책 전체 백그라운드 생성 |
| 홈 스켈레톤 로딩 | 홈 화면 로딩 중 카드 형태 플레이스홀더 + 서버 다운 에러 화면 |
| BookCard 개선 | 그리드 레이아웃, 장르 배지, hover 효과, coverImageUrl 표지 |
| 홈 읽기 배지 | 읽기 시작한 책(READING+DONE)에 ✓ 배지 표시 |
| 레몬 동시성 처리 | 레몬 차감에 비관적 락(`PESSIMISTIC_WRITE`) 적용 — 동시 요청 시 중복 차감 방지 |
| 커서 기반 무한 스크롤 | `GET /api/books/cursor` — nextCursor/hasMore 기반 페이지네이션, 프론트 useInfiniteBooks 연동 |
| 책 생성 완료 알림 | 이미지 저장 완료 후 `BOOK_GENERATED` 알림 자동 발송 (이미지 실패 시에도 발송, bookId 포함) |
| 서재 탭 필터 | 전체/읽는 중/읽고 싶어요/완독 탭 필터 (프론트에서 즉시 처리) |
| 모바일 앱 | React Native (Expo SDK 54) — 10개 화면, 로그인/회원가입/홈/탐색/생성/읽기/서재/마이페이지 |
| 홈 DONE 책만 노출 | `GET /api/books`, `GET /api/books/cursor` — AI 생성 책 중 DONE 상태만 반환 (PENDING/GENERATING 제외) |
| 생성 진행도 바 | 생성 중 단계별 프로그레스 바 (TEXT 10→50% / IMAGE 50→90% / 완료 100%) + 단계 메시지 |
| 생성 상태 step 필드 | `GET /api/books/{id}/status` 응답에 `step` 추가 (TEXT/IMAGE/DONE/FAILED) |
| 책 공유 버튼 | BookDetail "본문 보기" 옆 📤 공유 버튼 — Web Share API / 미지원 시 URL 클립보드 복사 |
| 장르별 제목 생성 | Gemini 프롬프트 — 본문 기반 장르별 문학적 제목 스타일 지침 추가 |

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
- API URL은 `src/api/axiosInstance.js`의 `BASE_URL`에서 변경

---

## 앞으로 할 작업
- [ ] 앱 EAS Build 설정 및 스토어 배포 (iOS/Android)
- [ ] 앱 아이콘 레몬 이미지로 교체 (assets/icon.png, adaptive-icon.png)
- [ ] 앱 팔로우/알림 기능 연동 (BOOK_GENERATED, REVIEW, FOLLOW)
- [ ] 앱 BookDetailScreen 표지 이미지 연동 (coverImageUrl → Image 컴포넌트)
- [ ] 앱 서재 탭 필터 연동 (LibraryScreen)
- [ ] 앱 GenerateScreen 시점/성격 옵션 UI 추가 (웹 GeneratePage와 동일하게)
- [ ] GitHub Actions CI/CD 파이프라인
- [ ] Redis 캐싱 도입 (책 목록, 탐색 API 응답)
- [ ] Elasticsearch 도입 (키워드 검색 고도화)
- [ ] 광고 보고 레몬 추가 획득
- [ ] 서비스 스크린샷 촬영 및 README 갱신
- [ ] 테스트 코드 작성 (백엔드 JUnit, 프론트엔드 Jest)
- [ ] Python 분석 스크립트 (생성 책 장르·분위기 분포, 사용자 활동 통계)
- [ ] Oracle Cloud 이전 검토 (Railway 메모리 제한 대응)

---

## 작업 규칙
- **백엔드 작업**: `backend/CLAUDE.md` 참고
- **프론트엔드 작업**: `frontend/CLAUDE.md` 참고
- **앱 작업**: `app/` 폴더 — React Native (Expo SDK 54), API BASE_URL은 `app/src/api/axiosInstance.js`
- 커밋은 사용자가 명시적으로 요청할 때만 수행
- 커밋 메시지: `feat:` / `fix:` / `refactor:` / `docs:` / `style:`
