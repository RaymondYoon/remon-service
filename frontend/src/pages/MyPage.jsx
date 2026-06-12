import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUser, clearAuth, saveAuth } from "../utils/auth";
import { getLemonInfo, updateNickname, getUserByEmail } from "../api/userApi";
import { deleteAccount } from "../api/bookApi";
import { getFollowers, getFollowing } from "../api/followApi";
import { useToast } from "../hooks/useToast";
import LemonTree from "../components/LemonTree";
import "./MyPage.css";

const MyPage = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [lemonInfo, setLemonInfo] = useState({ lemonCount: 0, maxDaily: 3, usedToday: 0 });
  const [loading, setLoading] = useState(true);
  const showToast = useToast();
  const [nicknameInput, setNicknameInput] = useState(user?.nickname ?? "");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followModal, setFollowModal] = useState(false);
  const [followTab, setFollowTab] = useState("followers");

  useEffect(() => {
    getLemonInfo()
      .then((res) => setLemonInfo(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    if (user?.email) {
      getUserByEmail(user.email)
        .then((res) => {
          const userId = res.data?.id;
          if (!userId) return;
          getFollowers(userId)
            .then((r) => setFollowers(Array.isArray(r.data) ? r.data : []))
            .catch(() => {});
          getFollowing(userId)
            .then((r) => setFollowing(Array.isArray(r.data) ? r.data : []))
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openModal = (tab) => {
    setFollowTab(tab);
    setFollowModal(true);
  };

  const handleNicknameUpdate = async (e) => {
    e.preventDefault();
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    try {
      await updateNickname(trimmed);
      saveAuth({ ...user, nickname: trimmed });
      showToast("닉네임이 변경되었어요!", "success");
    } catch {
      showToast("변경에 실패했습니다. 다시 시도해주세요.", "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("정말 탈퇴하시겠어요? 모든 데이터가 삭제되며 되돌릴 수 없습니다.")) return;
    try {
      await deleteAccount();
      clearAuth();
      navigate("/login");
    } catch {
      showToast("탈퇴에 실패했습니다. 다시 시도해주세요.", "error");
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
          <div className="mypage-follow-stats">
            <button className="mypage-follow-stat" onClick={() => openModal("followers")}>
              <span className="mypage-follow-num">{followers.length}</span> 팔로워
            </button>
            <span className="mypage-follow-dot">·</span>
            <button className="mypage-follow-stat" onClick={() => openModal("following")}>
              <span className="mypage-follow-num">{following.length}</span> 팔로잉
            </button>
          </div>
        </div>
      </div>

      {/* 팔로워/팔로잉 모달 */}
      {followModal && (
        <div className="mypage-modal-overlay" onClick={() => setFollowModal(false)}>
          <div className="mypage-modal" onClick={(e) => e.stopPropagation()}>
            <button className="mypage-modal-close" onClick={() => setFollowModal(false)}>✕</button>
            <div className="mypage-modal-tabs">
              <button
                className={`mypage-modal-tab${followTab === "followers" ? " active" : ""}`}
                onClick={() => setFollowTab("followers")}
              >
                팔로워 {followers.length}
              </button>
              <button
                className={`mypage-modal-tab${followTab === "following" ? " active" : ""}`}
                onClick={() => setFollowTab("following")}
              >
                팔로잉 {following.length}
              </button>
            </div>
            <div className="mypage-modal-list">
              {(followTab === "followers" ? followers : following).length === 0 ? (
                <p className="mypage-modal-empty">
                  {followTab === "followers" ? "팔로워가 없습니다." : "팔로잉하는 사람이 없습니다."}
                </p>
              ) : (
                (followTab === "followers" ? followers : following).map((u) => (
                  <Link
                    key={u.userId}
                    to={`/profile/${u.userId}`}
                    className="mypage-follow-user"
                    onClick={() => setFollowModal(false)}
                  >
                    <div className="mypage-follow-avatar">
                      {(u.nickname || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="mypage-follow-nickname">{u.nickname}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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

        <form className="mypage-nickname-form" onSubmit={handleNicknameUpdate}>
          <label className="mypage-nickname-label">닉네임 변경</label>
          <div className="mypage-nickname-row">
            <input
              className="mypage-nickname-input"
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              maxLength={20}
              placeholder="새 닉네임 입력"
            />
            <button type="submit" className="mypage-nickname-btn">변경</button>
          </div>
        </form>

        <button className="mypage-withdraw-btn" onClick={handleDeleteAccount}>
          회원 탈퇴
        </button>
      </div>
    </div>
  );
};

export default MyPage;
