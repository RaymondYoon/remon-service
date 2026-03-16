# Remon Service — Frontend

AI가 짧은 전자책/소설을 생성해주는 서비스 **Remon**의 프론트엔드입니다.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| Framework | React 19 |
| 라우팅 | react-router-dom v7 |
| HTTP | axios (공통 인스턴스 기반) |
| 상태 관리 | useState / useEffect (전역 라이브러리 없음) |
| 스타일 | 컴포넌트별 CSS + CSS 변수 (`variables.css`) |

---

## 실행 방법

```bash
npm install
npm start
```

기본 포트: `http://localhost:3000`
백엔드 서버가 `http://localhost:8080`에서 실행 중이어야 합니다.

---

## 현재 구현 페이지

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | Home | 책 목록 + 키워드 검색 |
| `/book/:id` | BookDetail | 책 상세, 본문 읽기, 서재 담기 |
| `/login` | Login | 이메일 로그인 + 카카오 로그인 |
| `/signup` | Signup | 회원가입 |
| `/library` | MyLibrary | 내 서재 (로그인 필수) |
| `/oauth-callback` | OAuthCallback | 카카오 로그인 콜백 처리 |
| `/generate` | GeneratePage | AI 책 생성 폼 + 로딩 화면 (로그인 필수) |

---

## 로그인 흐름

### 이메일 로그인

```
POST /api/users/login → JWT 수신 → localStorage 저장 → 홈으로 이동
```

### 카카오 로그인

```
카카오 로그인 버튼 클릭
→ GET http://localhost:8080/api/auth/kakao (백엔드 경유)
→ 카카오 인증 페이지
→ /oauth-callback?token=...&nickname=...&email=...
→ localStorage 저장 → 홈으로 이동
```

- JWT와 사용자 정보는 `localStorage`에 `token` / `user` 키로 분리 저장
- JWT 만료는 payload `exp` 기준으로 클라이언트에서 직접 확인 (별도 라이브러리 없음)
- 401 응답 시 자동 로그아웃 + `/login` 리다이렉트 (axios 인터셉터 처리)

---

## AI 책 생성 흐름 (`/generate`)

`/generate`는 단일 페이지로 구현되어 있으며, 생성 중에는 같은 페이지 내에서 로딩 화면으로 전환됩니다.

```
키워드 입력 (최대 3개, Enter로 추가)
+ 장르 선택 (SF / 판타지 / 로맨스 / 일상 / 공포)
+ 분량 선택 (짧게 / 보통 / 길게)
+ 분위기 선택 (따뜻하게 / 긴장감 있게 / 유쾌하게)
↓
"이야기 만들기" 클릭
↓
로딩 화면 전환 ("Remon이 이야기를 쓰고 있어요", 10~30초)
↓
완료 → /book/:id 이동 + "이야기가 완성됐어요!" 배너 표시
```

- 비로그인 접근 시 `/login`으로 리다이렉트 (ProtectedRoute)
- axios timeout 60초 설정 (AI 응답 대기)

---

## 디자인 방향 (Remon 톤)

따뜻하고 차분한 전자책 서비스. 레몬빛 청량함 + 독서의 편안함.

| 역할 | 색상 | 값 |
|------|------|----|
| Primary | 세이지 그린 | `#5b7e5a` |
| Background | 크림 화이트 | `#fafaf7` |
| Accent | 레몬 옐로우 | `#f5c842` |

- 둥근 카드 (14~16px radius), 안정적인 여백, 미니멀한 구성
- 과한 애니메이션 지양 — 필요한 곳에만 subtle한 transition

---

## 다음 작업

- [ ] 내 서재 삭제 기능 (백엔드 API 준비 후)
- [ ] 생성한 책 목록 별도 조회 페이지
- [ ] 반응형 모바일 레이아웃 개선
- [ ] 로딩/에러 상태 토스트 메시지 통일
