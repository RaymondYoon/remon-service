import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearAuth, isLoggedIn } from "../utils/auth";
import { getLemonInfo } from "../api/userApi";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../api/notificationApi";
import "./Header.css";

const Header = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const user = getUser();
  const loggedIn = isLoggedIn();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lemonCount, setLemonCount] = useState(null);
  const notiRef = useRef(null);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!loggedIn) return;
    const fetchUnread = () => {
      getUnreadCount().then(setUnreadCount).catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn) return;
    const fetchLemon = () => {
      getLemonInfo()
        .then((res) => setLemonCount(res.data.lemonCount))
        .catch(() => {});
    };
    fetchLemon();
    const interval = setInterval(fetchLemon, 60000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setNotiOpen(false);
      }
    };
    if (notiOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notiOpen]);

  const handleNotiOpen = async () => {
    if (!notiOpen) {
      try {
        const data = await getNotifications();
        setNotifications(data);
      } catch {}
    }
    setNotiOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotiClick = async (noti) => {
    if (!noti.isRead) {
      await handleMarkAsRead(noti.id);
    }
    setNotiOpen(false);
    if (noti.type === "FOLLOW") {
      navigate(`/profile/${noti.senderId}`);
    } else if (noti.type === "REVIEW") {
      navigate("/my-books");
    }
  };

  const handleLogout = () => {
    clearAuth();
    closeMenu();
    navigate("/login");
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="logo" onClick={closeMenu}>
          🍋 Remon
        </Link>

        <div className="header-actions">
          {loggedIn && lemonCount !== null && (
            <span className="header-lemon-badge" title="오늘 남은 레몬">
              🍋 {lemonCount}
            </span>
          )}

          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="테마 전환"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          {loggedIn && (
            <div className="noti-wrapper" ref={notiRef}>
              <button
                className="noti-btn"
                onClick={handleNotiOpen}
                aria-label="알림"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="noti-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </button>

              {notiOpen && (
                <div className="noti-dropdown">
                  <div className="noti-header">
                    <span className="noti-title">알림</span>
                    {notifications.some((n) => !n.isRead) && (
                      <button className="noti-read-all-btn" onClick={handleMarkAllAsRead}>
                        전체 읽음
                      </button>
                    )}
                  </div>
                  <div className="noti-list">
                    {notifications.length === 0 ? (
                      <p className="noti-empty">알림이 없습니다.</p>
                    ) : (
                      notifications.map((noti) => (
                        <div
                          key={noti.id}
                          className={`noti-item${noti.isRead ? "" : " noti-item--unread"}`}
                          onClick={() => handleNotiClick(noti)}
                        >
                          <span className="noti-icon">
                            {noti.type === "REVIEW" ? "📝" : noti.type === "FOLLOW" ? "👤" : "❤️"}
                          </span>
                          <div className="noti-content">
                            <p className="noti-message">{noti.message}</p>
                            <p className="noti-date">{noti.createdAt}</p>
                          </div>
                          {!noti.isRead && <span className="noti-dot" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
              <Link to="/explore" className="drawer-link" onClick={closeMenu}>둘러보기</Link>
              <Link to="/feed" className="drawer-link" onClick={closeMenu}>피드</Link>
              <Link to="/my-books" className="drawer-link" onClick={closeMenu}>내 책</Link>
              <Link to="/library" className="drawer-link" onClick={closeMenu}>내 서재</Link>
              <Link to="/mypage" className="drawer-link" onClick={closeMenu}>🍋 마이페이지</Link>
              <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/explore" className="drawer-link" onClick={closeMenu}>둘러보기</Link>
              <Link to="/login" className="drawer-link" onClick={closeMenu}>로그인</Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
};

export default Header;
