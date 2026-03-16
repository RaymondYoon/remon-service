import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginUser } from "../api/userApi";
import { saveAuth } from "../utils/auth";
import "./Login.css";

// 백엔드 수동 카카오 OAuth 진입점
// 백엔드가 카카오 인증 URL로 redirect → 카카오 → /api/auth/kakao/callback → 프론트 /oauth-callback
const KAKAO_LOGIN_URL = "http://localhost:8080/api/auth/kakao";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser({ email, password });
      // JWT 토큰 및 유저 정보 저장
      saveAuth(response.data);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || "이메일 또는 비밀번호가 올바르지 않습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    window.location.href = KAKAO_LOGIN_URL;
  };

  return (
    <div className="login-container">
      <h2>로그인</h2>

      <form className="login-form" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="이메일 입력"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="비밀번호 입력"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="login-divider">
        <span>또는</span>
      </div>

      <button className="kakao-btn" onClick={handleKakaoLogin}>
        <span className="kakao-icon">💬</span>
        카카오로 로그인
      </button>

      <p className="login-helper">
        계정이 없나요?{" "}
        <Link to="/signup" className="signup-link">회원가입</Link>
      </p>
    </div>
  );
}

export default Login;
