import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import BookDetail from "./pages/BookDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MyLibrary from "./pages/MyLibrary";
import MyBooks from "./pages/MyBooks";
import OAuthCallback from "./pages/OAuthCallback";
import GeneratePage from "./pages/GeneratePage";
import ReadPage from "./pages/ReadPage";
import { migrateOrClearLegacyAuth } from "./utils/auth";
import "./styles/global.css";

// 앱 최초 로드 시 구 형식 localStorage 정리 (재로그인 유도)
migrateOrClearLegacyAuth();

function App() {
  return (
    <Router>
      <Header />

      <main>
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/" element={<Home />} />
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
        </Routes>
      </main>
    </Router>
  );
}

export default App;
