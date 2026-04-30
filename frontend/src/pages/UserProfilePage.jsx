import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getUserProfile, getUserPublicBooks, followUser, unfollowUser } from "../api/followApi";
import { isLoggedIn, getUser } from "../utils/auth";
import "./UserProfilePage.css";

const UserProfilePage = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const loggedIn = isLoggedIn();
  const me = getUser();
  const isMe = me && String(me.id) === String(userId);

  useEffect(() => {
    Promise.all([
      getUserProfile(userId),
      getUserPublicBooks(userId),
    ])
      .then(([profileRes, booksRes]) => {
        setProfile(profileRes.data);
        setFollowing(profileRes.data.following);
        setBooks(booksRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleFollow = async () => {
    try {
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
        setProfile((prev) => ({ ...prev, followerCount: prev.followerCount - 1 }));
      } else {
        await followUser(userId);
        setFollowing(true);
        setProfile((prev) => ({ ...prev, followerCount: prev.followerCount + 1 }));
      }
    } catch {
      alert("팔로우 처리에 실패했습니다.");
    }
  };

  if (loading) return <div className="profile-loading">불러오는 중...</div>;
  if (!profile) return <div className="profile-loading">사용자를 찾을 수 없습니다.</div>;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">{profile.nickname?.charAt(0) || "?"}</div>
        <div className="profile-info">
          <h1 className="profile-nickname">{profile.nickname}</h1>
          <div className="profile-stats">
            <span className="profile-stat">
              <strong>{profile.followerCount}</strong> 팔로워
            </span>
            <span className="profile-stat-divider">·</span>
            <span className="profile-stat">
              <strong>{profile.followingCount}</strong> 팔로잉
            </span>
          </div>
        </div>
        {loggedIn && !isMe && (
          <button
            className={`profile-follow-btn ${following ? "following" : ""}`}
            onClick={handleFollow}
          >
            {following ? "팔로잉" : "팔로우"}
          </button>
        )}
      </div>

      <div className="profile-books">
        <h2 className="profile-books-title">공개 책 ({books.length})</h2>
        {books.length === 0 ? (
          <div className="profile-books-empty">아직 공개된 책이 없습니다.</div>
        ) : (
          <div className="profile-books-grid">
            {books.map((book) => (
              <Link to={`/book/${book.id}`} key={book.id} className="profile-book-card">
                {book.genre && (
                  <span className="profile-book-genre">{book.genre}</span>
                )}
                <h3 className="profile-book-title">{book.title}</h3>
                {book.description && (
                  <p className="profile-book-desc">
                    {book.description.slice(0, 60)}
                    {book.description.length > 60 ? "..." : ""}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
