import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearAuth, isLoggedIn } from "../utils/auth";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();
  const user = getUser();
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <header className="header">
      <Link to="/" className="logo">
        🍋 Remon
      </Link>

      <nav className="nav">
        <Link to="/" className="nav-link">홈</Link>

        {loggedIn ? (
          <>
            <Link to="/generate" className="nav-link nav-link--generate">✨ 책 만들기</Link>
            <Link to="/library" className="nav-link">내 서재</Link>
            <div className="user-box">
              <span className="nickname">{user?.nickname}님</span>
              <button className="logout-btn" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">로그인</Link>
            <Link to="/signup" className="nav-link nav-link--signup">회원가입</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
