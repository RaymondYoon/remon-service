# CLAUDE.md — Remon 앱 (React Native / Expo)

## 프로젝트 개요
React Native(Expo SDK 54) 기반 모바일 앱.
백엔드 API 주소는 `EXPO_PUBLIC_API_URL` 환경변수(`app/.env`)로 지정하고, 없으면 운영 서버 `https://remon-service-production.up.railway.app`을 사용한다.

---

## 기술 스택
- **플랫폼**: React Native (Expo SDK 54)
- **네비게이션**: @react-navigation/native v7, Stack + BottomTabs
- **HTTP**: axios (공통 인스턴스, 401 자동 재발급)
- **제스처**: react-native-gesture-handler (PanGestureHandler)
- **저장소**: @react-native-async-storage/async-storage (토큰/유저 정보)
- **SafeArea**: react-native-safe-area-context
- **배포**: Expo Go (개발) / EAS Build (배포 예정)

---

## 폴더 구조
```
app/
├── App.js                      — 앱 진입점, 인증 상태 관리
├── app.json                    — Expo 설정 (name: Remon, splash: #FFF9E6)
├── .env.example                — EXPO_PUBLIC_API_URL 예시 (복사해서 .env 로 사용)
├── babel.config.js             — babel-preset-expo 설정
├── metro.config.js             — Metro 번들러 설정
├── assets/                     — 아이콘, 스플래시 이미지
└── src/
    ├── api/
    │   ├── axiosInstance.js    — axios 기본 설정(BASE_URL = EXPO_PUBLIC_API_URL), 토큰 인터셉터, 401 자동 갱신
    │   └── bookApi.js          — API 함수 모음
    ├── components/
    │   └── BookCard.js         — 책 카드 (저자명 클릭 → UserProfile)
    ├── navigation/
    │   └── AppNavigator.js     — Stack + BottomTab 네비게이터
    ├── screens/
    │   ├── LoginScreen.js      — 로그인 (이메일/비밀번호)
    │   ├── SignupScreen.js     — 회원가입 (이메일/비밀번호 8자+/닉네임)
    │   ├── HomeScreen.js       — 책 목록 (검색, 장르 필터)
    │   ├── BookDetailScreen.js — 책 상세 (표지, 별점, 읽기/서재담기, 리뷰)
    │   ├── GenerateScreen.js   — AI 책 생성 (키워드/장르/분위기/결말)
    │   ├── ReadScreen.js       — 책 읽기 (슬라이드 페이지 전환, 단락 렌더링)
    │   ├── LibraryScreen.js    — 내 서재 (독서 상태별 목록)
    │   ├── MyPageScreen.js     — 마이페이지 (프로필, 레몬, 닉네임 변경, 로그아웃)
    │   └── UserProfileScreen.js — 작가 프로필 (팔로워/팔로잉 수, 공개 책 목록)
    ├── shims/
    │   └── react-native-linear-gradient.js  — 미사용 라이브러리 shim (빌드 오류 방지)
    ├── utils/
    │   └── auth.js             — AsyncStorage 토큰/유저 저장·조회·삭제
    └── theme.js                — 색상 팔레트 (colors.primary 등)
```

---

## 네비게이션 구조
```
NavigationContainer
  Stack.Navigator
    ▸ 비로그인:
        Login → Signup (stack)
    ▸ 로그인:
        Main (BottomTab)
          홈(🏠) | 만들기(🍋 FAB) | 서재(📚) | 마이(👤)  ← 4탭
        Read        (stack, 책 읽기)
        BookDetail  (stack, 책 상세)
        UserProfile (stack, 작가 프로필)
```

---

## API 함수 목록 (src/api/bookApi.js)

| 함수 | 메서드 | 엔드포인트 | 설명 |
|------|--------|------------|------|
| `login` | POST | `/api/users/login` | 로그인 |
| `register` | POST | `/api/users/register` | 회원가입 |
| `getBooks` | GET | `/api/books` | 책 목록 (검색/페이지) |
| `getBookById` | GET | `/api/books/:id` | 책 상세 |
| `generateBook` | POST | `/api/books/generate` | AI 책 생성 (202) |
| `getGenerationStatus` | GET | `/api/books/:id/status` | 생성 상태 폴링 |
| `getExploreBooks` | GET | `/api/books/explore` | 공개 책 전체 |
| `getFeedBooks` | GET | `/api/books/feed` | 팔로우 피드 |
| `getReviews` | GET | `/api/books/:id/reviews` | 책 리뷰 목록 |
| `addReview` | POST | `/api/books/:id/reviews` | 리뷰 작성 (rating, content) |
| `addToLibrary` | POST | `/api/library` | 서재에 담기 |
| `getMyLibrary` | GET | `/api/library` | 내 서재 |
| `startReading` | PATCH | `/api/library/:id/start-reading` | 읽기 시작 |
| `savePage` | PATCH | `/api/library/:id/page` | 페이지 저장 |
| `markAsDone` | PATCH | `/api/library/:id/finish` | 완독 처리 |
| `getLemon` | GET | `/api/users/me/lemon` | 레몬 잔량 |
| `updateNickname` | PATCH | `/api/users/me/nickname` | 닉네임 변경 |
| `logoutApi` | POST | `/api/users/logout` | 로그아웃 |

---

## 인증 방식
- 로그인 성공 시 `accessToken`, `refreshToken`, `user(email, nickname)` → AsyncStorage 저장
- 모든 요청에 `Authorization: Bearer <accessToken>` 자동 첨부 (axiosInstance 인터셉터)
- 401 응답 시 `POST /api/auth/refresh`로 자동 재발급 후 원래 요청 재시도
- 재발급 실패 시 AsyncStorage 전체 삭제 → 자동 로그아웃

---

## 주요 화면 동작

### ReadScreen (책 읽기)
- 본문을 화면 크기 기준으로 자동 페이지 분할 (`buildPages`)
- 페이지 전환: `Animated.spring` 슬라이드 (현재 페이지 아웃 + 새 페이지 인 동시 실행)
- `useNativeDriver: true` — 네이티브 스레드에서 처리, 렉 없음
- 제스처: PanGestureHandler 스와이프 + 좌우 20% 탭
- 단락 렌더링: `\n\n` 기준 분리 → 단락별 `<Text>` + `marginBottom: 16` + 들여쓰기

### GenerateScreen (AI 책 생성)
- 키워드(최대 4개) / 장르 / 분위기 / 결말 / 주인공 이름(선택) / 서술 시점(1인칭/3인칭) / 주인공 성격(6종 칩 토글) 입력
- `POST /api/books/generate` → 202 Accepted + `{ id }`
- `GET /api/books/:id/status` 폴링 (3초 간격, 최대 60회)
- 오류 메시지: `e.response?.data?.error` (백엔드 GlobalExceptionHandler 형식, `code` 필드도 함께 옴)
- 생성 실패(FAILED) 시 서버가 레몬을 자동 환불 — 실패 메시지에 환불 안내

---

## 앞으로 할 작업
- [ ] 앱 아이콘 레몬 이미지로 교체 (assets/icon.png, adaptive-icon.png)
- [ ] EAS Build 설정 및 내 폰에 직접 설치
- [ ] 플레이스토어 / 앱스토어 배포 검토
- [ ] 팔로우/언팔로우 기능 앱에 연동 (followApi 추가)
- [ ] 알림 기능 앱에 연동 (BOOK_GENERATED, REVIEW, FOLLOW)
- [ ] 카카오 OAuth 앱 지원 (딥링크 설정)
- [ ] GenerateScreen 시놉시스·조연·주인공 여러 명 UI 추가 (웹 GeneratePage와 동기화)

---

## 로컬 실행
```bash
cd app
npm install
npx expo start            # 기본 실행 (LAN)
npx expo start --tunnel   # 실기기 테스트 시 (ngrok 터널 — 방화벽 환경)
npx expo start --clear    # 캐시 초기화 후 실행 (설정 변경 후 권장)
```

- Expo Go 앱에서 QR 코드 스캔 또는 iOS/Android 시뮬레이터 실행
- API 주소: `app/.env`에 `EXPO_PUBLIC_API_URL=http://<PC LAN IP>:8080` (변경 후 `npx expo start --clear`)

## 작업 규칙
- 커밋은 사용자가 명시적으로 요청할 때만 수행
- 커밋 메시지: `feat:` / `fix:` / `refactor:` / `docs:` / `style:`
- 외부 라이브러리 추가 시 Expo SDK 버전 호환 확인 필수 (`npx expo install` 권장)
- 에러 메시지 파싱: `e.response?.data?.error ?? e.response?.data?.message`
