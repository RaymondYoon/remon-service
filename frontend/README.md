📘 Remon-Service Frontend

이 프로젝트는 React 기반 전자책(e-book) 서비스 프론트엔드입니다.
사용자가 도서 목록을 조회하고, 로그인/회원가입을 통해 개인 라이브러리를 관리할 수 있는 UI를 제공합니다.

🚀 기술 스택

React 18

React Router v6

Axios

CSS Modules or Global CSS

Create React App (CRA) 기반

📁 프로젝트 구조
frontend/
 ├─ public/
 ├─ src/
 │   ├─ api/
 │   │   ├─ bookApi.js
 │   │   └─ userApi.js
 │   ├─ components/
 │   │   ├─ Header.jsx
 │   │   ├─ Header.css
 │   │   ├─ BookCard.jsx
 │   │   ├─ BookCard.css
 │   │   └─ BookList.jsx
 │   ├─ pages/
 │   │   ├─ Home.jsx
 │   │   ├─ Login.jsx
 │   │   ├─ Login.css
 │   │   ├─ Signup.jsx
 │   │   ├─ BookDetail.jsx
 │   │   └─ MyLibrary.jsx
 │   ├─ hooks/
 │   │   └─ useBooks.js
 │   ├─ styles/
 │   │   ├─ global.css
 │   │   └─ variables.css
 │   ├─ App.js
 │   └─ index.js
 ├─ package.json
 └─ README.md

📄 주요 기능
🔐 사용자 인증

로그인 / 로그아웃

회원가입

JWT 기반 인증 (백엔드 연동)

📚 도서 기능

전체 도서 목록 조회

개별 도서 상세 페이지

내 서재(My Library) 기능 (추가 예정)

🧩 공통 컴포넌트

Header

BookCard

BookList

🛠 실행 방법
1️⃣ 패키지 설치
npm install

2️⃣ 개발 서버 실행
npm start


브라우저가 자동으로 열리며 다음 주소에서 확인할 수 있습니다:

👉 http://localhost:3000

🔗 API 연동

프론트엔드는 다음 엔드포인트들과 통신합니다.

/api/user/login

/api/user/signup

/api/books

/api/books/{id}

src/api/userApi.js, src/api/bookApi.js 에 정리되어 있습니다.

📌 앞으로 추가될 기능 (계획)

 로그인 후 토큰 저장 및 상태관리 개선

 My Library 페이지 기능 완성

 도서 검색 기능

 반응형 UI 개선

 크로스 플랫폼 환경 대비 UX 최적화

© Author

Remon Service Frontend Developer – YOON