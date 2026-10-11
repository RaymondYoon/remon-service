# CHANGELOG — Remon Service

변경 이력을 모은 문서. 현재 구조·규칙은 각 폴더의 `CLAUDE.md` 를 본다.
(2026-10-11 이전 이력은 각 CLAUDE.md 의 "완료된 작업" / 루트 "주요 완성 기능" 표에서 그대로 옮겨 왔다)

---

## 2026-10-11 — 표지 생성 타임아웃 수정
- gpt-image-1 표지 생성이 60초 읽기 타임아웃에 걸려 실패하던 문제 → 180초로 늘리고 설정값(`openai.image.timeout-ms`)으로 분리
- 표지 품질 `auto` → `medium` (`openai.image.quality`) — 생성 시간·비용 절감

---

## 2026-10-11 — `refactor/stabilize-and-cleanup` (PR #1)

### 안정화 (책 생성)
- 책 생성 비동기 작업을 트랜잭션 커밋 후(`@TransactionalEventListener(AFTER_COMMIT)`)에만 시작 — 커밋 전 비동기 스레드가 상태를 갱신하던 경쟁 조건 제거
- Gemini 호출 타임아웃 적용 (연결 10초 / 읽기 `gemini.timeout-ms` = 120초)
- 생성 실패 시 레몬 자동 환불 (`book.lemon_refunded` 조건부 UPDATE로 중복 환불 방지)
- 멈춘 생성 작업 자동 복구 — 시작 시 + 5분마다, 15분 넘게 PENDING/GENERATING 인 책을 FAILED + 환불
- 모든 생성 상태 전이를 조건부 UPDATE 로 변경 (FAILED/삭제된 책을 DONE 으로 되살리지 않음)
- Flyway V6: `book.created_at`, `book.lemon_refunded`

### 버그 수정
- 책 상세 조회마다 정렬 캐시를 전부 비우던 `@CacheEvict(allEntries)` 제거
- 평점순/조회수순 정렬이 전체 책을 반환하던 문제 → `size`(기본 12, 최대 50)개로 제한
- 목록 API 응답에서 본문(`content`) 제외 (`BookSummaryResponse`)
- Rate Limit: 만료되는 Caffeine 캐시로 교체(메모리 누수 해결), X-Forwarded-For 위조 우회 차단
- 보안: `POST /api/books` ADMIN 전용, 비로그인 `/api/books/my`·`/feed` 500(NPE) → 401
- 인증 실패 응답 403 → 401 (클라이언트의 401 토큰 자동 재발급이 실제로 동작하도록)
- Gemini API 키를 URL 쿼리스트링에서 `x-goog-api-key` 헤더로 이동
- 책 삭제 시 관련 알림 삭제 + Cloudinary 표지 삭제
- 운영 Flyway `repair-on-migrate` / `out-of-order` 비활성화 (로컬 프로파일은 유지)

### 리팩토링
- `OpenAiService`(실제 Gemini) → `book.ai.GeminiTextGenerator`, `ImagenService`(실제 OpenAI) → `book.ai.OpenAiCoverImageGenerator` (인터페이스 `StoryTextGenerator` / `CoverImageGenerator`)
- `StoryPrompt` / `GeneratedStory` 값 객체, `Map` 응답 → record DTO (JSON 키 동일)
- `ErrorCode` / `BusinessException` 도입 — 오류 응답에 `code` 추가 (`error` 키 유지)
- `UserRepository.getByEmail` 로 `findByEmail(...).orElseThrow` 25곳 통합
- 관리자 API 의 Repository 직접 호출 제거, `BookRepository` 중복/미사용 JPQL 정리
- 웹: `ReadPage` → `usePagination` 훅 + `paginateContent` 유틸, `GeneratePage` → 섹션 컴포넌트 분리
- 미사용 파일 제거 (`usdBooks.js`, `App.test.js`, `logo.svg`, 앱 `ExploreScreen`/`FeedScreen`)
- 앱 API 주소를 `EXPO_PUBLIC_API_URL` 환경변수로 분리

### 품질
- 백엔드 테스트 H2 실행 환경 추가, 기존에 컴파일되지 않던 테스트 수정, 테스트 38 → 60개
- CI 에서 백엔드 테스트 실행 (`-x test` 제거) + JaCoCo 커버리지 리포트 아티팩트 업로드

---

## 기능 추가 이력 (기존 루트 CLAUDE.md "주요 완성 기능" 표)

| 기능 | 설명 |
|------|------|
| 회원가입/로그인 | 이메일 + 카카오 OAuth 2.0 |
| JWT 인증 | Access Token 15분 + Refresh Token 7일 자동 재발급 |
| AI 책 생성 | 키워드·장르·분위기(다중)·결말·주인공(최대 3명)·성격(다중)·서술 시점·시놉시스·조연(최대 4명) → Gemini 비동기 생성 (폴링) |
| AI 소설 품질 향상 | 서사구조(훅+기승전결) / Showing>Telling / 오감 묘사 / CoT 집필 구상 내부 단계 / 6000자 |
| 레몬 시스템 | 하루 1개 자동 충전, 책 생성 시 소모, 1일 2회 제한 |
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
| 장르별 제목 생성 | Gemini 프롬프트 — 본문 기반 장르별 문학적 제목 스타일 지침 추가 (9개 장르 커버) |
| 조회수 카운트 | `GET /api/books/{id}` 호출 시 `viewCount` 1 증가, `BookResponse`에 viewCount 포함 |
| 홈 정렬 탭 | "추천 전자책" 섹션에 최신순/평점순/조회수순 탭 — 정렬 변경 시 목록 초기화 후 재조회 |
| 앱 탭바 FAB | 중앙 만들기 버튼 원형 FAB 스타일 (🍋, #5B7E5A, top:-20, 60px) — `tabBarButton` prop |
| 앱 리뷰 작성 | BookDetailScreen 별점+텍스트 리뷰 작성 폼 (로그인 시 노출), `addReview` API 연동 |
| 앱 UI 버그 수정 | 카드 이미지 height 고정(Android), 서재 탭 높이, 장르 필터 빈공간, coverImageUrl 표시 |
| 앱 GenerateScreen 옵션 | 서술 시점(1인칭/3인칭) + 주인공 성격(6종 칩) 선택 — 웹과 동일한 옵션 세트 |
| Flyway 마이그레이션 | `ddl-auto=validate` 전환 + `db/migration/V1~V3` SQL로 스키마 버전 관리 — 데이터 유실 방지 |
| Redis 캐싱 | `books-rating` / `books-views` 캐시 (TTL 5분) — `@Cacheable` on BookRepository, `CacheManager` evict on DONE |
| DB 인덱스 | `book` 테이블 `status`, `view_count DESC`, `(status, id DESC)` 인덱스 — Flyway V1 SQL로 관리 |
| 장르 9종 확장 | SF/판타지/로맨스/일상/공포 + 액션/스릴러/드라마/느와르 추가, 제목 스타일 가이드 4개 장르 확장 |
| 분위기 10종 | 따뜻하게/긴장감/유쾌하게/신비로운/쓸쓸한/웅장한/잔혹한/몽환적인/냉소적인 + TENSE(긴장감) |
| 성격 17종 | 소심한/까칠한/비밀있는/천재적인/상처받은/엉뚱한/고집스러운/순수한/냉소적인/외로운/야망있는/겁쟁이/반항적인/활발한/긍정적인/다정한/유쾌한 |
| 소설 분량 3000자 | buildPrompt 분량 2500자 → 3000자로 변경 |
| 공유 버튼 개선 | BookDetail 공유 버튼 위치 재배치 (내서재 오른쪽) + 44px 원형 아이콘 스타일 |
| 소설 분량 6000자 | buildPrompt 분량 4000자 → 6000자로 증가 |
| 검색 범위 제한 | BookRepository LIKE 쿼리에서 description 제거, title + author만 검색 (7개 JPQL 수정) |
| 닉네임 주 2회 제한 | ISO Week 기준 주 2회 초과 시 오류, Flyway V4 마이그레이션 (`nickname_change_count`, `nickname_changed_at`) |
| 웹 작가 이름→프로필 링크 | BookCard 저자명 클릭 시 `/profile/:id` 이동 (`e.stopPropagation()` 처리) |
| 탐색 장르 필터 | ExplorePage 장르 10종 칩 필터 + 엣지-투-엣지 커버 이미지 카드 구조 |
| 피드 UI 개선 | FeedPage 작가 아바타 가로 스크롤 행 + 책 그리드 카드 + 빈 화면 안내 |
| 마이페이지 팔로워/팔로잉 | 클릭 가능 카운트 버튼 + 탭 전환 모달 목록 (아바타 + 프로필 링크) |
| 웹 둘러보기 메뉴 제거 | Header 드로어에서 "둘러보기" 링크 제거 (라우트 `/explore`는 유지) |
| 앱 4탭 구성 | ExploreScreen 탭 제거 → 홈/만들기(FAB)/서재/마이 4탭, UserProfile Stack 스크린 추가 |
| 앱 작가 프로필 화면 | `UserProfileScreen.js` — 72px 아바타, 팔로워/팔로잉 수, 공개 책 목록 |
| 앱 공유 버튼 | BookDetailScreen 🔗 공유 버튼 (`Share.share()` API, 44px 원형) |
| 앱 BookCard 컴포넌트 | `app/src/components/BookCard.js` 신규 — 저자명 클릭 시 UserProfile 이동 |
| OAuth 단기 코드 보안 | 카카오 로그인 redirect URL에서 JWT 토큰 제거 → 30초 유효 UUID 코드 발급 → `POST /api/auth/code-exchange`로 토큰 교환 (브라우저 히스토리·로그 토큰 노출 차단) |
| 마이페이지 userId 실시간 조회 | 로컬 스토리지 캐시 제거, 서버에서 userId 직접 조회 — 로그인 직후 팔로워/팔로잉 모달 즉시 반영 |
| Flyway V5 마이그레이션 | `oauth_codes` 테이블 추가 (code VARCHAR UNIQUE, access_token TEXT, expires_at DATETIME) |
| 이메일/닉네임 중복 방지 | `UserRepository.existsByEmail()` / `existsByNickname()` 추가 — 회원가입·닉네임 변경 시 즉시 검증 |
| 생성 옵션 확장 | `GenerateBookRequest`: 시놉시스·주인공 복수(최대 3명)·조연(최대 4명)·분위기/성격 다중 선택 지원 |
| 전역 책 생성 폴링 | `BookGenerationContext` — 페이지 이동해도 생성 상태 유지, 완료 시 알림 토스트 |
| 책 읽기 UI 개선 | 라이트모드: 나무 책상 텍스처(repeating-linear-gradient) 배경 + 명조체 + 종이 질감 / 다크모드: 따뜻한 브라운 톤(`#1c1614`) + 스탠드 불빛(radial-gradient) 효과 / 글래스모피즘 물방울 이전/다음 버튼 |
| 모바일 뷰포트 수정 | `clientWidth` 기반 페이지 너비 계산 — iOS Safari innerWidth 불일치로 인한 텍스트 잘림 해결 |
| 글래스모피즘 UI | 장르 배지, 리뷰 폼, 읽기 화면 헤더/버튼, BookDetail 원형 버튼, 마이페이지·서재 카드 전반에 backdrop-filter 적용 |
| 마이페이지/서재 디자인 통일 | 글래스모피즘 카드 + 레몬 옐로우(`#F0C75E/#E0AD3C`) 강조 — 통계 숫자·선택 탭·변경 버튼·서재 카드 hover 일관성 확보 |
| 책 포스터 상세 | BookDetail 전면 포스터 스타일 — 블러 배경, 레몬옐로우 본문보기 버튼, 원형 보조버튼 |
| 페이지 분할 개선 | 창 크기 변경 시 재분할, 문장 단위 분리로 빈공간 제거 |
| 전역 생성 폴링 | BookGenerationContext — 페이지 이동해도 생성 상태 유지, 완료 알림 토스트 |

---

## 백엔드 변경 이력 (기존 backend/CLAUDE.md)

#### 2026-04-26
- [x] JWT Refresh Token 구조 도입 (Access 15분 + Refresh 7일, DB 저장)
- [x] `POST /api/auth/refresh` 구현
- [x] 카카오 OAuth redirect에 accessToken + refreshToken 파라미터 연동
- [x] `createRefreshToken`에서 `deleteByEmail` 후 `flush()` 추가 — duplicate key 버그 수정
- [x] Docker + docker-compose 로컬 개발환경 구축

#### 2026-04-30
- [x] 팔로우/언팔로우 API
- [x] 유저 프로필 API (`GET /api/users/{userId}/profile`)
- [x] 공개 책 탐색 API (`GET /api/books/explore`)
- [x] 팔로잉 피드 API (`GET /api/books/feed`)
- [x] 별점·리뷰 CRUD (중복 방지, N+1 방지 배치 쿼리, averageRating 포함)
- [x] AI 책 생성 비동기 처리 (@Async + PENDING→DONE/FAILED)
- [x] nixpacks.toml 추가 — Railway JAVA_HOME 빌드 문제 해결

#### 2026-05-01
- [x] 알림 기능 (REVIEW/FOLLOW 타입)
- [x] 레몬 시스템 (`UserLemon` 엔티티, 책 생성 시 서버측 소모)
- [x] OpenAI → Groq → Gemini API 마이그레이션 (gemini-2.5-flash)
- [x] Railway 메모리 부족 해결 — JVM 옵션 `-Xms128m -Xmx400m`

#### 2026-05-08
- [x] 책 생성 옵션 확장: `ending`(결말), `protagonistName`(주인공 이름) 추가
- [x] 분량 선택 제거 — 3000자 내외로 고정

#### 2026-05-11
- [x] Gemini 응답 파싱 방식 변경: JSON → `[TITLE]`/`[CONTENT]` 구분자 (파싱 오류 근본 해결)
- [x] `GET /api/library/my-reading-book-ids` 신규 엔드포인트 (READING+DONE bookId 목록)
- [x] `startReading` upsert 방식으로 변경 — 서재에 없어도 ReadPage 방문 시 READING 자동 등록

#### 2026-05-27
- [x] AI 표지 이미지 생성 파이프라인 구축: `ImagenService`(gpt-image-1) + `CloudinaryService`(CDN 업로드)
- [x] `Book` 엔티티 / `BookResponse` DTO에 `coverImageUrl` 필드 추가
- [x] gpt-image-1 모델: size `"1024x1536"`, quality `"auto"`, 응답 형식 `b64_json` → `Base64.getDecoder().decode()`
- [x] `OpenAiService` Gemini 500/503 재시도 로직 추가 (maxAttempts=3, 3초 대기 후 재시도)

#### 2026-05-28
- [x] 레몬 차감 비관적 락 적용 (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) — `findByUserIdWithLock` 추가, 차감 전 잔량 재확인(`< 1` 시 예외), `consumeLemon` `@Transactional` 명시
- [x] 관리자 API 표지 일괄 생성 (`POST /api/admin/books/generate-covers`) — 표지 없는 DONE 책 전체 대상, 즉시 202 반환 후 `@Async` 백그라운드 처리
- [x] 커서 기반 페이지네이션 (`GET /api/books/cursor?cursor=&keyword=&size=`) — `findBooksWithCursor` JPQL, `{ books, nextCursor, hasMore }` 응답
- [x] 책 생성 완료 알림 (`NotificationType.BOOK_GENERATED`) — `createBookNotification(userId, type, message, bookId)` 자기 자신 알림 허용, `Notification` 엔티티 `bookId` nullable 필드 추가, `NotificationResponse` `bookId` 포함
- [x] `BookGenerationTask.run`: DONE 직후 알림 발송 + `book` 조회를 알림·표지 이미지 공유하여 중복 쿼리 제거

#### 2026-05-30
- [x] `BookGenerationTask.run`: 알림 발송 위치 변경 — 텍스트 완료 직후 → 이미지 저장 완료 후 발송 (이미지 실패 시에도 알림 발송)
- [x] `BookGenerationTask.run`: 상태 흐름 변경 — 텍스트 완료 후 GENERATING 유지 → 이미지 처리 완료 후 `updateStatus(DONE)` (폴링 클라이언트가 coverImageUrl 포함된 완성 책 수신)
- [x] `Notification` 엔티티 `type` 컬럼 `length = 20` 명시 — `BOOK_GENERATED`(14자) DB truncation 방지

#### 2026-06-01
- [x] `OpenAiService.buildPrompt` 프롬프트 전면 개선 — 서사구조(훅+기승전결) / Showing > Telling / 오감 묘사 / 서술 시점 적용 / 타겟독자(성인) / 분량 3000자→2500자
- [x] `GenerateBookRequest` DTO에 `protagonistTrait`(주인공 성격), `viewpoint`(서술 시점) 필드 추가
- [x] `OpenAiService.generate()` / `BookGenerationTask.run()` / `BookService.generateBook()` 메서드 시그니처 확장 (7개 파라미터로)
- [x] `buildPrompt`에 CoT(Chain-of-Thought) 집필 구상 단계 추가 — 출력 금지 내부 구상(주인공 비밀·갈등·오감 묘사 요소)으로 소설 품질 향상
- [x] `ReadPage.css` GPU 가속 강제 활성화 — 안드로이드 모바일 책 넘김 버벅임 수정 (`will-change: transform`, `translateZ(0)`, `backface-visibility: hidden`)

#### 2026-06-05
- [x] `OpenAiService.buildPrompt` 제목 생성 지침 개선 — 본문 기반 장르별 문학적 제목 스타일 가이드 추가 (SF/판타지/로맨스/일상/공포 각 예시 포함, 10자 내외)
- [x] `BookRepository` DONE 필터 쿼리 추가 — `findBooksWithCursor`에 `doneStatus` 파라미터 추가, `searchByKeywordAndDone` / `searchByKeywordPageableAndDone` / `findAllDone` / `findAllDonePageable` 신규 메서드
- [x] `BookService.getAllBooks` / `getAllBooksPageable` — DONE 필터 쿼리로 교체 (PENDING/GENERATING AI 책 제외)
- [x] `BookService.getBooksCursor` — `findBooksWithCursor`에 `BookStatus.DONE` 파라미터 추가
- [x] `BookService.getBookStatus` 반환 타입 `String` → `Map<String, String>` 변경 + `step` 필드 추가
  - GENERATING + content 없음 → `step: "TEXT"` (텍스트 생성 중)
  - GENERATING + content 있음 → `step: "IMAGE"` (이미지 생성 중)
  - DONE → `step: "DONE"` / FAILED → `step: "FAILED"`
- [x] `BookController.getBookStatus` — `bookService.getBookStatus(id)` 반환값 그대로 전달 (Map)

#### 2026-06-07
- [x] `Book` 엔티티에 `viewCount` 필드 추가 (`@Builder.Default`, `@Column(columnDefinition = "bigint default 0")`) — DDL-auto=update로 DB 컬럼 자동 추가
- [x] `BookResponse` DTO에 `viewCount` 필드 추가 및 `buildResponse`에서 매핑
- [x] `BookRepository` — `incrementViewCount` (`@Modifying` JPQL UPDATE), `findBooksSortedByViews` (ORDER BY viewCount DESC), `findBooksSortedByRating` (상관 서브쿼리: AVG(r.rating) DESC) 추가
- [x] `BookService.getBookById` — 조회 시 `bookRepository.incrementViewCount(id)` 호출로 조회수 1 증가
- [x] `BookService.getBooksCursor` — `sort` 파라미터 추가: `latest`(기존 cursor 방식) / `rating`·`views`(상위 size개 고정 반환, hasMore=false)
- [x] `BookController.getBooksCursor` — `@RequestParam(defaultValue = "latest") String sort` 추가

#### 2026-06-10
- [x] `OpenAiService.buildPrompt` 장르 확장 — 액션/스릴러/드라마/느와르 4개 추가 (총 9개 장르 지원)
- [x] `OpenAiService.buildPrompt` 제목 스타일 가이드 확장 — 액션("강렬한 동사 + 대상") / 스릴러("긴장감·불안감 조성") / 드라마("인물 관계·감정 핵심") / 느와르("어둠·배신·도시 이미지") 예시 추가
- [x] `OpenAiService.buildPrompt` 분위기(tone) 확장 — MYSTERIOUS(신비롭고 미스터리하게) / MELANCHOLY(쓸쓸하고 애잔하게) / TENSE(긴장감 넘치게) / EPIC(웅장하고 압도적으로) 추가 (총 7종)
- [x] 소설 분량 2500자 → 3000자로 변경

#### 2026-06-11
- [x] `OpenAiService.buildPrompt` 소설 분량 3000자 → 4000자로 증가
- [x] `BookRepository` 검색 LIKE 범위 제한 — `description` 컬럼 제거, `title` + `author`만 검색 (7개 JPQL 쿼리 수정: `searchByKeyword`, `searchByKeywordPageable`, `findBooksWithCursor`, `searchByKeywordAndDone`, `searchByKeywordPageableAndDone`, `findBooksSortedByViews`, `findBooksSortedByRating`)
- [x] `User` 엔티티 `nicknameChangedAt`(LocalDateTime), `nicknameChangeCount`(int, @Builder.Default 0) 필드 추가
- [x] `User` 엔티티 `updateNickname()` / `resetNicknameCountAndUpdate()` 메서드 추가 — 닉네임 변경 시 count 누적 / 주 리셋 후 변경
- [x] `UserService.updateNickname` 닉네임 주 2회 제한 로직 추가 — ISO Week(`IsoFields.WEEK_OF_WEEK_BASED_YEAR` + `IsoFields.WEEK_BASED_YEAR`) 기준, 같은 주 2회 초과 시 `IllegalStateException` 발생
- [x] Flyway `V4__add_nickname_change_columns.sql` 마이그레이션 추가 — `user` 테이블에 `nickname_change_count INT NOT NULL DEFAULT 0`, `nickname_changed_at DATETIME NULL` 컬럼 추가

#### 2026-06-14
- [x] OAuth 단기 코드 방식 도입 — `OAuthCode` 엔티티 / `OAuthCodeRepository` / `OAuthCodeService` 신규 생성
  - `generateCode(email, accessToken, refreshToken)`: UUID 단기 코드 생성 → `oauth_codes` 저장 (30초 유효), 기존 코드 먼저 삭제
  - `exchangeCode(code)`: 코드 조회 → 만료 확인 → `{ accessToken, refreshToken, email }` Map 반환 → 코드 즉시 삭제, 만료/미존재 시 `IllegalStateException`
- [x] `KakaoAuthController.kakaoCallback` 변경 — redirect URL에서 `accessToken`·`refreshToken` 제거, `OAuthCodeService.generateCode`로 단기 코드 발급 후 `?code={uuid}&nickname={}&email={}` 파라미터로 redirect
- [x] `POST /api/auth/code-exchange` 신규 엔드포인트 추가 — Request `{ "code": "uuid" }` → Response `{ "accessToken", "refreshToken", "email" }`, 오류 시 400 반환
- [x] `SecurityConfig` — `/api/auth/code-exchange` permitAll 추가
- [x] Flyway `V5__add_oauth_codes_table.sql` 마이그레이션 추가 — `oauth_codes` 테이블 생성 (code UNIQUE, access_token/refresh_token TEXT, expires_at/created_at DATETIME)

#### 2026-06-15
- [x] `LemonService` `MAX_DAILY` 3 → 2로 변경 — 하루 레몬 생성 제한 2회로 하향
- [x] `UserRepository` `existsByEmail(String email)` Spring Data 메서드 추가 — 회원가입 시 이메일 중복 확인
- [x] `UserService.registerUser` 이메일 중복 방지 — `existsByEmail()` 사용, 중복 시 `"이미 사용 중인 이메일입니다."` 오류 반환
- [x] `UserRepository` `existsByNickname(String nickname)` Spring Data 메서드 추가 — 닉네임 변경 시 중복 확인
- [x] `UserService.updateNickname` 닉네임 중복 방지 — 현재 닉네임과 다를 때만 `existsByNickname()` 검사, 중복 시 `"이미 사용 중인 닉네임입니다."` 오류 반환
- [x] `GenerateBookRequest` DTO 확장:
  - `String protagonistName` → `List<String> protagonistNames` (주인공 복수 지원, 최대 3명)
  - `String protagonistTrait` → `List<String> protagonistTrait` (다중 선택, 최대 3개)
  - `List<String> tone` (`@NotEmpty`, 다중 선택, 최대 2개) — 기존 `String`에서 변경
  - `String synopsis` 신규 (한 줄 시놉시스, 선택사항)
  - `List<String> characters` 신규 (조연 등장인물, 최대 4명, 선택사항)
- [x] `OpenAiService.generate()` / `BookGenerationTask.run()` / `BookService.generateBook()` 메서드 시그니처 전체 확장 — `protagonistNames`, `characters` 파라미터 추가
- [x] `OpenAiService.buildPrompt` 전면 확장:
  - `toneDesc`: `List<String>` 스트림 → 한국어 묘사 + `", "` 조인
  - `protagonistLine`: 복수 주인공 필터·조인, 2명 이상 시 "여러 명이 함께 이야기를 이끌어갈 것" 문구 추가
  - `protagonistTraitLine`: `List<String>` → `", "` 조인
  - `charactersLine`: 조연 목록 조인 + "조연은 자연스럽게 등장, 주인공 서사 보조" 지시
  - `synopsisLine`: 시놉시스 기반 확장 지시 조건부 삽입
- [x] `OpenAiService.buildPrompt` 소설 분량 4000자 → 6000자로 증가

#### 2026-06-14~22
- [x] 카카오 OAuth Rate Limit 상향 — `@KakaoRateLimiter` 허용량 증가 (동시 로그인 급증 대응)
- [x] 레몬 하루 2개 제한 — `LemonService.useLemon()` 일일 사용 횟수 2회로 제한 (기존 3회)
- [x] 이메일/닉네임 중복 가입 방지 — `UserRepository.existsByEmail()` / `existsByNickname()` 추가, 회원가입·닉네임 변경 시 즉시 검증
- [x] `GenerateBookRequest` 확장 — `synopsis` (String), `characters` (List<CharacterDto>), `protagonistNames` (List<String>), `tone` (List<String>), `protagonistTrait` (List<String>) 다중값 지원
- [x] `OpenAiService.buildPrompt()` 전면 확장 — 시놉시스·조연 설명·다중 성격·다중 분위기 프롬프트 삽입, 문단 구분 강화, 서사 구조(훅+기승전결) / Showing>Telling / 오감 묘사 / CoT 집필 구상
- [x] 소설 분량 6000자 — `buildPrompt` 목표 분량 4000자 → 6000자
- [x] 분위기 10종 확장 — 잔혹한(BRUTAL)/몽환적인(DREAMY)/냉소적인(CYNICAL) 추가 (기존 7종 → 10종)
- [x] 성격 17종 확장 — 활발한/긍정적인/다정한/유쾌한 추가 (기존 13종 → 17종)
- [x] Flyway V4 마이그레이션 — `users` 테이블에 `nickname_change_count`, `nickname_changed_at` 컬럼 추가 (주 2회 닉네임 변경 제한)
- [x] Flyway V5 마이그레이션 — `oauth_codes` 테이블 추가 (`code` VARCHAR UNIQUE, `access_token` TEXT, `expires_at` DATETIME)
- [x] OAuth 단기 코드 보안 개선 — 카카오 로그인 redirect URL에서 JWT 토큰 제거 → 30초 유효 UUID 코드 발급 → `POST /api/auth/code-exchange`로 토큰 교환 (브라우저 히스토리·로그 토큰 노출 차단)

---

## 프론트엔드 변경 이력 (기존 frontend/CLAUDE.md)

#### 2026-04-26
- [x] JWT Refresh Token 구조 도입 (Access 15분 + Refresh 7일)
- [x] axiosInstance 401 자동 재발급 로직 추가 (큐 처리 포함)
- [x] OAuthCallback.jsx에서 accessToken + refreshToken 파라미터 파싱

#### 2026-04-30
- [x] 팔로우/언팔로우 기능 (followApi.js)
- [x] 공개 책 탐색 페이지 `/explore` (작가별 팔로우 버튼 포함)
- [x] 팔로잉 피드 페이지 `/feed`
- [x] 유저 프로필 페이지 `/profile/:userId`
- [x] 별점·리뷰 기능 (BookDetail.jsx에 별점 선택 폼 + 리뷰 목록)
- [x] BookCard에 평균 별점 표시
- [x] 검색 기능 개선 — 장르 드롭다운, debounce 300ms

#### 2026-05-01
- [x] 알림 기능 — 헤더 🔔 뱃지 + 드롭다운 UI
- [x] 레몬 시스템 UI — 레몬트리 + 낙하 애니메이션
- [x] ReadPage: react-pageflip 책 넘기기 애니메이션 구현

#### 2026-05-02
- [x] Lighthouse 성능 최적화 (React.memo, lazy loading, code splitting, SEO 메타 태그)
- [x] 레몬트리 UI (LemonTree.jsx — CSS/SVG 직접 구현)
- [x] MyPage.jsx 신규 `/mypage` 라우트

#### 2026-05-04
- [x] AI 책 생성 키워드 입력 4개로 확장
- [x] BookCard 전체 영역 클릭 가능 처리
- [x] ReadPage 페이지 번호 겹침 문제 수정

#### 2026-05-08
- [x] 책 표지 없을 때 🍋 이모지 + 레몬색(#FFF9E6) 배경으로 통일 (전 페이지)
- [x] 분량 선택 UI 제거 (3000자 고정)
- [x] 책 생성 옵션 추가: 결말 방향(해피/새드/열린결말) + 주인공 이름 입력
- [x] ReadPage 한/두 페이지 토글 버튼 제거 (두 페이지 고정)

#### 2026-05-11
- [x] 홈 ✓ 배지 기준 변경: 서재 담기 → 읽기 시작한 책 (READING+DONE)
- [x] `getMyReadingBookIds` API 함수 추가 (`bookApi.js`)

#### 2026-05-27
- [x] `BookCard.jsx` 디자인 개선 — 그리드 레이아웃, 장르 배지, hover 효과, `coverImageUrl` 필드 반영
- [x] `Home.jsx` 스켈레톤 로딩 UI 추가 (로딩 중 카드 형태 플레이스홀더)
- [x] `Home.jsx` 서버 다운 에러 화면 추가 (API 연결 실패 시 안내 화면)

#### 2026-05-28
- [x] `BookDetail.jsx` `book.coverImage` → `book.coverImageUrl` 필드명 수정
- [x] `MyLibrary.jsx` 탭 순서 변경 (ALL → READING → SAVED → DONE) + SAVED 레이블 "담은 책" → "읽고 싶어요"
- [x] `useInfiniteBooks.js` 페이지 기반 → 커서 기반으로 전환 (`getBooksCursor`, `cursorRef`, `isResetRef` 사용, stale closure 방지)
- [x] `bookApi.js` `getBooksCursor(params)` 함수 추가 (`GET /api/books/cursor`)

#### 2026-05-30
- [x] `ReadPage.jsx` 모바일 반응형 개선 — 단일 페이지 모드(`usePortrait={dim.isMobile}`), `contentH` 40px 안전 마진, `pageNumBarRef` DOM 높이 측정, 모바일 너비/높이 최적화 (아이폰 14 Pro 하단 잘림 해결)
- [x] `BookList.jsx` 모바일 그리드 중앙정렬 개선

#### 2026-06-01
- [x] `ReadPage.css` GPU 가속 강제 활성화 — `will-change: transform`, `translateZ(0)`, `backface-visibility: hidden` 추가 → 안드로이드 모바일 책 넘김 버벅임 해소
- [x] `GeneratePage.jsx` 서술 시점 칩 UI 추가 (`VIEWPOINTS`: 3인칭/1인칭, 기본 3인칭)
- [x] `GeneratePage.jsx` 주인공 성격 칩 UI 추가 (`PROTAGONIST_TRAITS`: 6가지, 단일 선택, 재클릭 시 해제)
- [x] `generateBook` API 호출 시 `viewpoint`, `protagonistTrait` 필드 전송
- [x] 키워드 placeholder 예시 문구 개선 (`"예: 우주, 고양이, 우주선 탈출 / 지우, 하늘, 까칠한 천재"`)

#### 2026-06-05
- [x] `GeneratePage.jsx` 생성 진행도 표시 — `progress` state + `stepRef` + `progressIntervalRef` 추가
  - 생성 요청 직후 10% 설정, 200ms 인터벌로 부드럽게 증가
  - `step="TEXT"` 구간: 10→50% (최대 50%에서 멈춤)
  - `step="IMAGE"` 감지 시 50%로 점프 후 50→90% (최대 90%에서 멈춤)
  - DONE 수신 시 100% → 800ms 후 navigate
  - 단계별 메시지: "✍️ 이야기를 쓰고 있어요..." / "🎨 표지를 그리고 있어요..." / "✨ 완성됐어요!"
- [x] `GeneratePage.css` 프로그레스 바 스타일 추가 — `.generate-progress-wrap` / `.generate-progress-fill` / `.generate-progress-pct` / `.generate-progress-msg`
- [x] `BookDetail.jsx` 공유 버튼 추가 — "본문 보기" 옆 📤 공유 버튼
  - `handleShare`: `navigator.share()` 호출 (Web Share API)
  - 미지원 브라우저: `navigator.clipboard.writeText(url)` + "링크가 복사됐어요!" 토스트
- [x] `BookDetail.css` `.share-btn` 스타일 추가 (테두리형, hover 시 primary 색상)

#### 2026-06-07
- [x] `Home.jsx` 정렬 탭 UI 추가 — "추천 전자책" 타이틀 오른쪽에 최신순/평점순/조회수순 버튼 3개
  - `sort` state (기본값 `"latest"`) 및 `SORT_OPTIONS` 상수 추가
  - `params` useMemo에 `sort` 포함 → 정렬 변경 시 `paramsKey` 변경으로 자동 초기화·재조회
- [x] `Home.css` 정렬 탭 스타일 추가 — `.home-section-header` (flex, space-between), `.sort-tabs`, `.sort-tab`, `.sort-tab--active` (primary 색상, color-mix 배경)

#### 2026-06-10
- [x] `GeneratePage.jsx` 장르 확장 — `GENRES` 9개 (`SF/판타지/로맨스/일상/공포/액션/스릴러/드라마/느와르`)
- [x] `GeneratePage.jsx` 분위기 확장 — `TONES` 7개 (기존 3개 + 신비로운/쓸쓸한/긴장감/웅장한 추가)
- [x] `GeneratePage.jsx` 주인공 성격 확장 — `PROTAGONIST_TRAITS` 13개 (기존 6개 + 고집스러운/순수한/냉소적인/외로운/야망있는/겁쟁이/반항적인 추가)
- [x] `BookDetail.jsx` 공유 버튼 순서 변경 — 본문보기 → **내서재담기** → **공유** 순으로 재배치
- [x] `BookDetail.css` 공유 버튼 스타일 변경 — 44×44px 원형 (`border-radius: 50%`), 배경 `var(--color-card)`, 테두리 `1px solid var(--color-border)`, 🔗 아이콘만 표시, hover 시 primary 색상

#### 2026-06-11
- [x] `BookCard.jsx` 작가 이름 클릭 시 작가 프로필 페이지 이동 — `publishedBy` 있을 때 `<Link to="/profile/{id}">` 렌더링, `onClick stopPropagation`으로 카드 전체 클릭 이벤트와 분리
- [x] `BookCard.css` `.book-author-link` 스타일 추가 — hover 시 `color: var(--color-primary)` + `text-decoration: underline`
- [x] `Header.jsx` 드로어 메뉴에서 "둘러보기" 링크 제거 (라우트 `/explore`는 App.jsx에 유지)
- [x] `ExplorePage.jsx` 장르 필터 칩 추가 — `GENRES` 10개 상수, `selectedGenre` state, `filteredBooks` computed value
- [x] `ExplorePage.jsx` 카드 표지 이미지 구조 추가 — `explore-card-cover` div (coverImageUrl 있으면 `<img>`, 없으면 🍋 이모지)
- [x] `ExplorePage.css` 이미지 잘림 수정 — `max-height:200px` 제거, 카드 `padding:0; overflow:hidden`, 커버 `aspect-ratio:3/4`로 교체. 팔로우 버튼 스타일: 팔로우=primary bg+white / 팔로잉=border only
- [x] `FeedPage.jsx` 전면 재작성 — 팔로잉 작가 아바타 가로 스크롤 행 + 책 그리드 커버 카드 + 빈 화면 안내 ("둘러보기 →" 버튼)
- [x] `FeedPage.css` 전면 재작성 — 작가 아바타 행 (52px 원형, 가로 스크롤, `scrollbar-width:none`), 책 그리드 엣지-투-엣지 카드
- [x] `UserProfilePage.jsx` 책 카드에 표지 이미지 추가 — `profile-book-cover` div (`coverImageUrl` 있으면 `<img>`, 없으면 🍋 이모지)
- [x] `UserProfilePage.css` `.profile-book-cover`, `.profile-book-img`, `.profile-book-emoji` 스타일 추가, 팔로우 버튼 크기 개선 (padding 10px 28px)
- [x] `MyPage.jsx` 팔로워/팔로잉 통계 및 모달 추가 — 프로필 카드 내 클릭 가능 카운트 버튼, 탭 전환 모달로 목록 표시 (36px 아바타 + 프로필 링크)
- [x] `MyPage.css` 팔로우 통계/모달 관련 스타일 추가 (`.mypage-follow-stats`, `.mypage-modal-overlay`, `.mypage-modal` 등)

#### 2026-06-14
- [x] `OAuthCallback.jsx` 보안 개선 — URL에서 `code`(단기 UUID)·`nickname`·`email`만 파싱, `exchangeOAuthCode(code)` 호출로 `POST /api/auth/code-exchange` 요청 → 응답에서 `accessToken`·`refreshToken` 수신 후 `saveAuth` 저장 (토큰이 URL에 노출되지 않음)
- [x] `userApi.js` `exchangeOAuthCode(code)` 함수 추가 — `POST /api/auth/code-exchange { code }`
- [x] `MyPage.jsx` userId 서버 조회로 변경 — `GET /api/users/me/lemon` 응답 or `/api/users/{email}` 기반으로 서버에서 userId 실시간 조회 (로컬 스토리지 캐시 제거로 로그인 직후 즉시 반영)

#### 2026-06-15
- [x] `GeneratePage.jsx` 한 줄 시놉시스 입력 추가 — `synopsis` state, `<textarea>` UI (maxLength 100), API 전송 시 빈 문자열이면 `null`
- [x] `GeneratePage.jsx` 분위기 다중 선택 (최대 2개) — `tones: ["WARM"]` 배열 state, `toggleTone()`: 마지막 1개 유지 강제, 2개 초과 시 `"최대 2개까지 선택 가능해요"` 토스트
- [x] `GeneratePage.jsx` 주인공 성격 다중 선택 (최대 3개) — `protagonistTraits: []` 배열 state, `toggleTrait()`: 재클릭 해제, 3개 초과 시 `"최대 3개까지 선택 가능해요"` 토스트
- [x] `GeneratePage.jsx` 주인공 여러 명 (최대 3명) — `protagonistNames: [""]` 배열 state, 동적 추가/삭제 UI (`+ 주인공 추가` 버튼, × 삭제 버튼)
- [x] `GeneratePage.jsx` 조연 등장인물 (최대 4명) — `characters: []` 배열 state, 동적 추가/삭제 UI
- [x] 다중 선택 칩에 `✓` 체크 아이콘 표시 (`chip-check` span), `chip-group--multi` 클래스 구분
- [x] `GeneratePage.css` 캐릭터 입력 스타일 추가 — `.character-list`, `.character-input-row`, `.character-remove-btn` (원형 ×), `.character-add-btn` (dashed border)
- [x] `ReadPage.jsx` 모바일 텍스트 잘림 근본 해결 — `getPageDimensions()`에서 `window.innerWidth` → `document.documentElement.clientWidth` 사용 (iOS Safari 스크롤바·노치 제외 실제 콘텐츠 너비)
- [x] `ReadPage.jsx` 모바일 단일 페이지 강제 적용 — 모바일 감지 로직 확정 (`clientWidth ≤ 640`), `usePortrait={dim.isMobile}` 유지
- [x] `BookDetail.jsx` 다크모드 별점 색상 수정 — `[data-theme="dark"] .review-star-btn` inactive `color: #888`, active `color: #f5c842` 추가
- [x] 텍스트 입력 `onKeyDown` 엔터 제출 방지 — 주인공·조연 `<input>`에 `e.key === 'Enter'` 시 `e.preventDefault()` 추가
- [x] `BookGenerationContext` 전역 책 생성 폴링 — 페이지 이동해도 생성 상태 유지, 완료 시 알림 토스트

#### 2026-06-16~22
- [x] `ReadPage.jsx` 모바일 텍스트 잘림 근본 해결 — `document.documentElement.clientWidth` 사용 (iOS Safari `innerWidth` 불일치 해결)
- [x] `ReadPage.jsx` 데스크톱/모바일 그림자 분리 — `drawShadow={!dim.isMobile}` (모바일은 정적 CSS 그림자, 데스크톱은 JS 동적 그림자)
- [x] `ReadPage.css` 중앙 그라데이션 — `.html-flipbook::after` (데스크톱만, 모바일 `display: none`)
- [x] `ReadPage.css` 책 읽기 화면 글래스모피즘 통일 — 헤더(`rgba(255,255,255,0.6)` + `backdrop-filter: blur(12px)`), 진행바(`height: 2px`, 레몬→그린 그라데이션), 네비게이션 버튼(`rgba(255,255,255,0.6)` + `blur(10px)`), 페이지 번호(`opacity: 0.5`)
- [x] `ReadPage` 페이지 분할 로직 개선 — 창 크기(높이) 변경 시 자동 재분할, 문장 단위 분리로 빈공간 제거
- [x] `BookGenerationContext` 전역 책 생성 폴링 — 페이지 이동해도 생성 상태 유지, 완료 시 알림 토스트, 최소화 버블 UI
- [x] `BookCard.css` 디자인 개선 — 그린 계열 그림자, `translateY(-6px) scale(1.02)` hover, 글래스모피즘 장르 배지
- [x] `BookDetail.jsx` 전면 포스터 스타일 재설계 — 블러 배경(`position:fixed`, `blur(60px)`), 세로 정렬, 명조체 제목, 레몬옐로우 `본문보기` 버튼(240×52px), 원형 보조버튼(서재담기/공유)
- [x] `BookDetail.css` 레몬 옐로우 통일 — `.btn-read-primary` `linear-gradient(135deg, #F0C75E, #E0AD3C)`, `.btn-icon-circle` 글래스모피즘, `genre-pill` 옐로우 틴트
- [x] `BookDetail.css` 리뷰 폼 디자인 통일 — 폼 컨테이너 글래스모피즘, 별점 26px + `#F0C75E`, textarea focus 레몬 링, 제출버튼 레몬 그라데이션
- [x] `GeneratePage.jsx` 시놉시스 입력 추가 — `synopsis` state, `<textarea>` UI (maxLength 100)
- [x] `GeneratePage.jsx` 분위기 다중 선택 (최대 2개), 성격 다중 선택 (최대 3개)
- [x] `GeneratePage.jsx` 주인공 여러 명 (최대 3명), 조연 등장인물 (최대 4명) — 동적 추가/삭제 UI
- [x] `OAuthCallback.jsx` 보안 개선 — URL에서 단기 UUID 코드 파싱 → `POST /api/auth/code-exchange` 교환
- [x] `MyPage.jsx` 팔로워/팔로잉 모달 추가 — 클릭 가능 카운트, 탭 전환 목록
- [x] `Header.jsx` 둘러보기 드로어 링크 제거
- [x] 다크모드 별점 색상 수정, 닉네임 에러 메시지, 엔터 제출 방지

#### 2026-06-23
- [x] `MyPage.css` / `MyLibrary.css` 디자인 통일 — 글래스모피즘 + 레몬 옐로우 톤
  - 프로필·레몬트리·계정 카드: `rgba(255,255,255,0.6)` + `backdrop-filter: blur(12px)` + `box-shadow: 0 4px 20px rgba(0,0,0,0.04)`, 테두리 `rgba(61,43,31,0.08)`
  - 아바타: `linear-gradient(135deg, #5b7e5a, #4a6b49)` 그라데이션
  - 레몬트리 통계 박스·empty 메시지: `rgba(240,199,94,0.1)` 옐로우 틴트
  - 닉네임 input focus: `border-color: rgba(240,199,94,0.6)` + 옐로우 glow, 변경 버튼: `linear-gradient(135deg, #F0C75E, #E0AD3C)` + `color: #3D2B1F`
  - 탈퇴 버튼: 테두리 제거, hover 시만 `rgba(220,53,69,0.08)` 틴트
  - 서재 통계 카드: 글래스모피즘 + 숫자 `#E0AD3C` 강조
  - 서재 필터 탭 선택: `linear-gradient(135deg, #F0C75E, #E0AD3C)` + `color: #3D2B1F`, 비선택: `rgba(61,43,31,0.15)` 테두리
  - 서재 책 카드: 글래스모피즘 + hover `translateY(-3px)` + 그린 그림자
- [x] `variables.css` 독서 다크모드 변수 교체 — `--color-read-bg: #1c1614`, `--color-read-page: #2a2220`, `--color-read-text: #e8ddd0`, `--color-read-page-num: #a89888`
- [x] `ReadPage.css` 다크모드 전면 개편 — 차가운 네이비(`#1a1a2e`) → 따뜻한 브라운 블랙(`#1c1614`)
  - `[data-theme="dark"] .read-container::before`: `position: fixed`, `radial-gradient(rgba(240,199,94,0.06))` 은은한 스탠드 불빛
  - 다크 헤더: `rgba(28,22,20,0.7)`, 진행바: `linear-gradient(90deg, #d4a04a, #8a6a3a)`, 버튼: `rgba(255,255,255,0.08)` + 흰 테두리
- [x] `ReadPage.css` 라이트모드 배경 나무 책상 텍스처 — `repeating-linear-gradient(91deg)` + `repeating-linear-gradient(90deg)` 나무 결 + `linear-gradient(180deg, #e0b888, #c99a64)`
- [x] `ReadPage.css` 다크모드 배경 누수 버그 수정 — `[data-theme="dark"] .read-container`에 `background-color: #1c1614; background-image: none` 명시
- [x] `ReadPage.jsx` 데스크톱 큰 화면(≥1400px) 책 너비 확장 → 재조정 — `Math.min(vw * 0.58, 950) / 2` (비율 0.68→0.58, 상한 1100→950px)
- [x] `ReadPage.jsx` `.read-book` 동적 `maxWidth` 인라인 스타일 추가 — CSS `max-width: 800px` 고정 한계 해소, 책 너비에 맞춰 자동 확장
- [x] `ReadPage.jsx` `VERTICAL_CHROME` 215→230, 모바일 높이 `vh-200`→`vh-220` (세로 스크롤바 방지 버퍼)
- [x] `ReadPage.css` `.flip-page-inner` `overflow: hidden` 추가 (내용 넘침 스크롤 차단)
- [x] `ReadPage.jsx` 이전/다음 버튼 라벨 단순화 — `"이전 페이지"/"다음 페이지"` → `"이전"/"다음"`
- [x] `ReadPage.css` 이전/다음 버튼 글래스모피즘 물방울 스타일 — `backdrop-filter: blur(16px) saturate(180%)`, 라이트 `rgba(255,255,255,0.35)` / 다크 `rgba(255,255,255,0.08)`, `inset 0 1px 1px rgba(255,255,255,0.4)` 하이라이트
- [x] `ReadPage.css` 하단 버튼 영역 잘림 수정 — `padding-bottom: 24px`, `.read-book` `overflow-x: hidden`(수직 잘림 제거), `.read-nav` `padding-bottom: env(safe-area-inset-bottom, 8px)`
- [x] `ReadPage.css` 페이지 번호 `font-size: 13px` + `opacity: 0.6`, 헤더·진행바 `max-width: 1100px`으로 확장

#### 2026-06-16
- [x] `ReadPage.css` 책 읽기 화면 전면 디자인 개선:
  - 배경: 라이트 `#f5f0e8` (크림) / 다크 `#1a1a2e` (딥 네이비)
  - 페이지: 라이트 `#fefcf7` (아이보리) / 다크 `#16213e`
  - `.flip-page` `border: 1px solid rgba(0,0,0,0.08)` + `box-shadow: 0 4px 20px rgba(0,0,0,0.08)`
  - `.read-para` `font-family: 'Georgia', 'Nanum Myeongjo', serif` + `font-size: 16px` + `text-indent: 1.5em`
  - `.flip-page-num` `font-family: Georgia, serif` + `font-size: 12px` + `color: #999`
  - `.read-header` `background: rgba(255,255,255,0.95)` + `backdrop-filter: blur(8px)` + `border-bottom`
  - `.read-progress-fill` `height: 3px` + `background: linear-gradient(to right, #5b7e5a, #8ab87a)`
  - `.read-nav-btn` `border-radius: 24px`
- [x] `variables.css` 독서 페이지 CSS 변수 업데이트 — 라이트 `--color-read-bg: #f5f0e8`, 다크 `--color-read-bg: #1a1a2e` / `--color-read-page: #16213e`

---

## 앱 변경 이력 (기존 app/CLAUDE.md)

#### 2026-05-12
| 작업 | 내용 |
|------|------|
| 회원가입 화면 | SignupScreen — 이메일/비밀번호 8자+/닉네임, 비밀번호 조건 실시간 표시 |
| 책 상세 화면 | BookDetailScreen — 🍋 표지, 장르/별점, 읽기/서재담기 버튼, 리뷰 목록 |
| 둘러보기/피드 | ExploreScreen(전체+피드 탭), FeedScreen 생성 |
| 앱 아이콘/스플래시 | name: Remon, splash backgroundColor: #FFF9E6, Android 배경 #FFF9E6 |
| 페이지 슬라이드 | Animated.spring 슬라이드 (아웃+인 동시), useNativeDriver 유지 |
| 텍스트 단락 개선 | \n\n 기준 단락 분리, marginBottom: 16, 들여쓰기 |
| 마이페이지 탭 | 프로필·레몬·닉네임 변경·로그아웃 |
| 장르 필터 버튼 | height: 28 고정 (하단 잘림 방지, 선택 시 크기 변화 없음) |
| 하단 탭 5개 구성 | 홈 / 둘러보기 / 만들기 / 서재 / 마이 |
| 네비게이션 구조 | 비로그인(Login+Signup 스택) / 로그인(탭+BookDetail+Read 스택) |
| 오류 메시지 수정 | `data.message` → `data.error` (백엔드 응답 형식 맞춤) |
| 닉네임 저장 수정 | 로그인 시 `data.email + data.nickname` 정상 저장 |

#### 2026-05-28
| 작업 | 내용 |
|------|------|
| coverImageUrl 필드 확인 | HomeScreen, LibraryScreen, ExploreScreen 모두 `coverImageUrl` 정상 사용 확인 |
| BookDetailScreen 표지 | 현재 🍋 이모지 하드코딩 — `coverImageUrl` 필드 연동은 미구현 (앞으로 할 작업) |

#### 2026-06-07
| 작업 | 내용 |
|------|------|
| GenerateScreen 시점/성격 옵션 | 서술 시점(3인칭/1인칭 선택), 주인공 성격(6종 칩 토글), `viewpoint`·`protagonistTrait` API 전송 |
| 탭바 FAB 스타일 | 중앙 만들기 버튼 → 원형 FAB (🍋, #5B7E5A, top:-20, 60px, 그림자) — `tabBarButton` prop 사용 |
| 전체 배경색 흰색 | theme.js `background: '#FFF9E6'` → `'#FFFFFF'` |
| 카드 이미지 height 고정 | `coverImg height:'100%'` → `120`(홈/탐색), `110`(서재) — Android 0px 렌더 버그 수정 |
| 서재 title/author fallback | `item.book?.title ?? item.title`, `item.book?.author ?? item.author` |
| BookDetail coverImageUrl | `coverImageUrl` 있으면 `<Image>` 렌더링, 없으면 🍋 이모지 유지 |
| 서재 담기 Alert → Toast | `Alert.alert` 제거, `showToast()` 시스템 도입 (2.2초 자동 사라짐) |
| 서재 탭 버튼 height 고정 | `filterContainer height:52`, `filterChip height:36`, `alignItems`/`justifyContent: center` |
| LibraryScreen coverImageUrl | `width:80, height:110, borderRadius:8` Image 표시 |
| BookDetail 리뷰 작성 폼 | 별점(☆/⭐ 터치), TextInput, 등록 버튼 — 로그인 시에만 표시, `addReview` API 연동 |
| HomeScreen 장르 필터 빈 공간 | `contentContainerStyle flexGrow:1`, ListEmptyComponent 중앙 정렬 |
| addReview API 추가 | `bookApi.js`: `POST /api/books/:id/reviews { rating, content }` |

#### 2026-06-10
| 작업 | 내용 |
|------|------|
| GenerateScreen 장르 확장 | `GENRES` 9개 (`SF/판타지/로맨스/일상/공포/액션/스릴러/드라마/느와르`) |
| GenerateScreen 분위기 확장 | `TONES` 7개 (기존 3개 + 신비로운/쓸쓸한/긴장감/웅장한 추가) |
| GenerateScreen 성격 확장 | `PROTAGONIST_TRAITS` 13개 (기존 6개 + 고집스러운/순수한/냉소적인/외로운/야망있는/겁쟁이/반항적인 추가) |

#### 2026-06-11
| 작업 | 내용 |
|------|------|
| BookDetailScreen 공유 버튼 | `Share.share()` API로 🔗 공유 버튼 추가 (44px 원형 흰색 테두리 버튼, 읽기 버튼과 서재 버튼 사이 배치) |
| AppNavigator 4탭 구성 | `ExploreScreen` 탭 제거 → 홈 / 만들기(FAB) / 서재 / 마이 4탭으로 개편. `UserProfile` Stack 스크린 추가 |
| `app/src/components/BookCard.js` 신규 | 공유 BookCard 컴포넌트 — 저자명을 `TouchableOpacity`로 감싸 `UserProfile` 화면 이동 연결 (이벤트 버블링 차단) |
| `app/src/screens/UserProfileScreen.js` 신규 | 작가 프로필 화면 — 72px 원형 아바타(이니셜), 닉네임, 팔로워/팔로잉 수, 공개 책 목록. `axiosInstance` 직접 사용 |

#### 2026-06-14
| 작업 | 내용 |
|------|------|
| 확인: 앱 공유 버튼 | `BookDetailScreen` 🔗 공유 버튼 — `Share.share()` API, 44px 원형 (2026-06-11에 구현 완료) |
| 확인: 둘러보기 탭 제거 | `AppNavigator` 4탭 구성 (홈/만들기FAB/서재/마이) — `ExploreScreen` 탭 제거 (2026-06-11에 구현 완료) |
| 확인: UserProfileScreen 신규 | 작가 프로필 화면 `UserProfileScreen.js` — 아바타, 팔로워/팔로잉 수, 공개 책 목록 (2026-06-11에 구현 완료) |

#### 2026-06-15
| 작업 | 내용 |
|------|------|
| ReadScreen 단일 페이지 확인 | 모바일 단일 페이지 모드 — `Dimensions.get('window').width` 기반 자동 분할 (기존 구현 유지) |
| GenerateScreen 시놉시스 미반영 | 웹과 달리 `synopsis`·`characters`·`protagonistNames` 배열 미지원 — 추후 웹과 동기화 예정 (앞으로 할 작업 추가) |

#### 2026-06-11~22
- [x] 앱 공유 버튼 — `BookDetailScreen` 🔗 공유 버튼 (`Share.share()` API, 44px 원형)
- [x] 앱 4탭 구성 — ExploreScreen 탭 제거 → 홈/만들기(FAB)/서재/마이 4탭, 중앙 FAB 스타일(🍋, #5B7E5A, top:-20, 60px)
- [x] 앱 `UserProfileScreen.js` — 72px 아바타, 팔로워/팔로잉 수, 공개 책 목록
- [x] 앱 `BookCard.js` 컴포넌트 — 저자명 클릭 시 UserProfile 이동
- [x] 앱 단일 페이지 모드 — `ReadScreen` 모바일 화면 크기 기반 자동 분할, PanGestureHandler 스와이프
- [x] 앱 리뷰 작성 — `BookDetailScreen` 별점+텍스트 리뷰 폼, `addReview` API 연동
- [x] 앱 UI 버그 수정 — 카드 이미지 `height` 고정(Android), 서재 탭 높이, `coverImageUrl` 표시
