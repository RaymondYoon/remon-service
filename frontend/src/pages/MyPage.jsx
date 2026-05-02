import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, clearAuth } from "../utils/auth";
import { getLemonInfo } from "../api/userApi";
import { deleteAccount } from "../api/bookApi";
import LemonTree from "../components/LemonTree";
import "./MyPage.css";

const MyPage = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [lemonInfo, setLemonInfo] = useState({ lemonCount: 0, maxDaily: 3, usedToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLemonInfo()
      .then((res) => setLemonInfo(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteAccount = async () => {
    if (!window.confirm("정말 탈퇴하시겠어요? 모든 데이터가 삭제되며 되돌릴 수 없습니다.")) return;
    try {
      await deleteAccount();
      clearAuth();
      navigate("/login");
    } catch {
      alert("탈퇴에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="mypage-container">
      {/* 프로필 */}
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

      {/* 계정 설정 */}
      <div className="mypage-account-section">
        <h3 className="mypage-account-title">계정 설정</h3>
        <button className="mypage-withdraw-btn" onClick={handleDeleteAccount}>
          회원 탈퇴
        </button>
      </div>
    </div>
  );
};

export default MyPage;
