import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import { migrateOrClearLegacyAuth } from "./utils/auth";
import { useTheme } from "./hooks/useTheme";
import "./styles/global.css";
import "./App.css";

// 앱 최초 로드 시 구 형식 localStorage 정리 (재로그인 유도)
migrateOrClearLegacyAuth();

// Code splitting: 페이지 컴포넌트 lazy load
const Home = lazy(() => import("./pages/Home"));
const BookDetail = lazy(() => import("./pages/BookDetail"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const MyLibrary = lazy(() => import("./pages/MyLibrary"));
const MyBooks = lazy(() => import("./pages/MyBooks"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const GeneratePage = lazy(() => import("./pages/GeneratePage"));
const ReadPage = lazy(() => import("./pages/ReadPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const FeedPage = lazy(() => import("./pages/FeedPage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const MyPage = lazy(() => import("./pages/MyPage"));

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Router>
      <Header theme={theme} toggleTheme={toggleTheme} />

      <main>
        <Suspense fallback={<div className="page-loading"><div className="page-spinner" /></div>}>
          <Routes>
            {/* 공개 라우트 */}
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/profile/:userId" element={<UserProfilePage />} />
            <Route path="/book/:id" element={<BookDetail />} />
            <Route path="/book/:id/read" element={<ReadPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/oauth-callback" element={<OAuthCallback />} />

            {/* 인증 필요 라우트 */}
            <Route
              path="/library"
              element={
                <ProtectedRoute>
                  <MyLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/generate"
              element={
                <ProtectedRoute>
                  <GeneratePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-books"
              element={
                <ProtectedRoute>
                  <MyBooks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <FeedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mypage"
              element={
                <ProtectedRoute>
                  <MyPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </main>
    </Router>
  );
}

export default App;
