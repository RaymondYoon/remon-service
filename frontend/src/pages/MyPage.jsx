import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getUser } from "../utils/auth";
import { getLemonInfo } from "../api/userApi";
import LemonTree from "../components/LemonTree";
import "./MyPage.css";

const MyPage = () => {
  const user = getUser();
  const [lemonInfo, setLemonInfo] = useState({ lemonCount: 0, maxDaily: 3, usedToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLemonInfo()
      .then((res) => setLemonInfo(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mypage-container">
      {/* 프로필 헤더 */}
      <div className="mypage-profile">
        <div className="mypage-avatar">
          {user?.nickname ? user.nickname.charAt(0).toUpperCase() : "?"}
        </div>
        <div className="mypage-profile-info">
          <h2 className="mypage-nickname">{user?.nickname ?? "사용자"}님</h2>
          <p className="mypage-email">{user?.email ?? ""}</p>
        </div>
      </div>

      {/* 레몬트리 카드 */}
      <div className="mypage-lemon-card">
        <h3 className="mypage-lemon-title">🍋 나의 레몬트리</h3>

        {loading ? (
          <div className="mypage-lemon-loading">
            <div className="mypage-lemon-spinner" />
          </div>
        ) : (
          <>
            <LemonTree lemonCount={lemonInfo.lemonCount} />

            <div className="mypage-lemon-stats">
              <div className="mypage-lemon-stat">
                <span className="mypage-lemon-stat-num">{lemonInfo.lemonCount}</span>
                <span className="mypage-lemon-stat-label">남은 레몬</span>
              </div>
              <div className="mypage-lemon-divider" />
              <div className="mypage-lemon-stat">
                <span className="mypage-lemon-stat-num">{lemonInfo.usedToday}</span>
                <span className="mypage-lemon-stat-label">오늘 사용</span>
              </div>
              <div className="mypage-lemon-divider" />
              <div className="mypage-lemon-stat">
                <span className="mypage-lemon-stat-num">{lemonInfo.maxDaily}</span>
                <span className="mypage-lemon-stat-label">일일 한도</span>
              </div>
            </div>

            {lemonInfo.lemonCount === 0 && (
              <p className="mypage-lemon-empty">
                오늘 레몬을 모두 사용했어요. 내일 자정에 다시 충전돼요 🌙
              </p>
            )}
          </>
        )}
      </div>

      {/* 바로가기 */}
      <div className="mypage-shortcuts">
        <Link to="/generate" className="mypage-shortcut-btn mypage-shortcut-btn--primary">
          ✨ 책 만들러 가기
        </Link>
        <Link to="/library" className="mypage-shortcut-btn">
          📚 내 서재
        </Link>
        <Link to="/my-books" className="mypage-shortcut-btn">
          📖 내 책 목록
        </Link>
      </div>
    </div>
  );
};

export default MyPage;
