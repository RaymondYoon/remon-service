import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExploreBooks } from "../api/bookApi";
import { followUser, unfollowUser } from "../api/followApi";
import { isLoggedIn, getUser } from "../utils/auth";
import { useToast } from "../hooks/useToast";
import "./ExplorePage.css";

const ExplorePage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});
  const loggedIn = isLoggedIn();
  const me = getUser();
  const showToast = useToast();

  useEffect(() => {
    getExploreBooks()
      .then((res) => setBooks(res.data))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = async (book) => {
    const authorId = book.publishedBy;
    if (!authorId) return;
    const isFollowing = followingMap[authorId];
    try {
      if (isFollowing) {
        await unfollowUser(authorId);
        setFollowingMap((prev) => ({ ...prev, [authorId]: false }));
      } else {
        await followUser(authorId);
        setFollowingMap((prev) => ({ ...prev, [authorId]: true }));
      }
    } catch {
      showToast("팔로우 처리에 실패했습니다.", "error");
    }
  };

  if (loading) return <div className="explore-loading">불러오는 중...</div>;

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h1 className="explore-title">둘러보기</h1>
        <p className="explore-subtitle">모든 사람들의 공개 책을 탐색해보세요</p>
      </div>

      {books.length === 0 ? (
        <div className="explore-empty">아직 공개된 책이 없습니다.</div>
      ) : (
        <div className="explore-grid">
          {books.map((book) => {
            const isMe = me && book.publishedBy === me.id;
            const isFollowing = followingMap[book.publishedBy];
            return (
              <div key={book.id} className="explore-card">
                <Link to={`/book/${book.id}`} className="explore-card-link">
                  <div className="explore-card-genre">{book.genre || "일반"}</div>
                  <h3 className="explore-card-title">{book.title}</h3>
                  <p className="explore-card-desc">
                    {book.description
                      ? book.description.slice(0, 80) + (book.description.length > 80 ? "..." : "")
                      : ""}
                  </p>
                </Link>
                <div className="explore-card-footer">
                  <Link
                    to={`/profile/${book.publishedBy}`}
                    className="explore-card-author"
                  >
                    {book.authorNickname || book.author || "알 수 없음"}
                  </Link>
                  {loggedIn && !isMe && book.publishedBy && (
                    <button
                      className={`explore-follow-btn ${isFollowing ? "following" : ""}`}
                      onClick={() => handleFollow(book)}
                    >
                      {isFollowing ? "팔로잉" : "팔로우"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
