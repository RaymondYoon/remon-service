import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearAuth, isLoggedIn } from "../utils/auth";
import { deleteAccount } from "../api/bookApi";
import "./Header.css";

const Header = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const user = getUser();
  const loggedIn = isLoggedIn();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    clearAuth();
    closeMenu();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("정말 탈퇴하시겠어요? 모든 서재 데이터가 삭제되며 되돌릴 수 없습니다.")) return;
    try {
      await deleteAccount();
      clearAuth();
      closeMenu();
      navigate("/login");
    } catch {
      alert("탈퇴에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="logo" onClick={closeMenu}>
          🍋 Remon
        </Link>

        <div className="header-actions">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="테마 전환"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="메뉴 열기"
          >
            ☰
          </button>
        </div>
      </header>

      {/* 오버레이 */}
      {menuOpen && (
        <div className="drawer-overlay" onClick={closeMenu} />
      )}

      {/* 슬라이드 드로어 */}
      <nav className={`drawer ${menuOpen ? "drawer--open" : ""}`}>
        <button className="drawer-close-btn" onClick={closeMenu} aria-label="메뉴 닫기">
          ✕
        </button>

        <div className="drawer-links">
          <Link to="/" className="drawer-link" onClick={closeMenu}>홈</Link>

          {loggedIn ? (
            <>
              <Link to="/generate" className="drawer-link drawer-link--generate" onClick={closeMenu}>✨ 책 만들기</Link>
              <Link to="/library" className="drawer-link" onClick={closeMenu}>내 서재</Link>
              <Link to="/my-books" className="drawer-link" onClick={closeMenu}>내 책</Link>
              <div className="drawer-user-box">
                <span className="drawer-nickname">{user?.nickname}님</span>
                <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
                <button className="withdraw-btn" onClick={handleDeleteAccount}>계정 탈퇴</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="drawer-link" onClick={closeMenu}>로그인</Link>
              <Link to="/signup" className="drawer-link drawer-link--signup" onClick={closeMenu}>회원가입</Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
};

export default Header;
