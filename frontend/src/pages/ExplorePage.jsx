import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExploreBooks } from "../api/bookApi";
import { followUser, unfollowUser } from "../api/followApi";
import { isLoggedIn, getUser } from "../utils/auth";
import { useToast } from "../hooks/useToast";
import "./ExplorePage.css";

const GENRES = ['전체', 'SF', '판타지', '로맨스', '일상', '공포', '액션', '스릴러', '드라마', '느와르'];

const ExplorePage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});
  const [selectedGenre, setSelectedGenre] = useState('전체');
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

  const filteredBooks = selectedGenre === '전체' ? books : books.filter(b => b.genre === selectedGenre);

  if (loading) return <div className="explore-loading">불러오는 중...</div>;

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h1 className="explore-title">둘러보기</h1>
        <p className="explore-subtitle">모든 사람들의 공개 책을 탐색해보세요</p>
      </div>

      <div className="explore-genre-filter">
        {GENRES.map(g => (
          <button
            key={g}
            className={`explore-genre-chip${selectedGenre === g ? ' active' : ''}`}
            onClick={() => setSelectedGenre(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {filteredBooks.length === 0 ? (
        <div className="explore-empty">해당 장르의 공개된 책이 없습니다.</div>
      ) : (
        <div className="explore-grid">
          {filteredBooks.map((book) => {
            const isMe = me && book.publishedBy === me.id;
            const isFollowing = followingMap[book.publishedBy];
            return (
              <div key={book.id} className="explore-card">
                <Link to={`/book/${book.id}`} className="explore-card-link">
                  <div className="explore-card-cover">
                    {book.coverImageUrl
                      ? <img src={book.coverImageUrl} alt={book.title} className="explore-card-img" />
                      : <span className="explore-card-cover-emoji">🍋</span>
                    }
                  </div>
                  <div className="explore-card-body">
                    <div className="explore-card-genre">{book.genre || "일반"}</div>
                    <h3 className="explore-card-title">{book.title}</h3>
                  </div>
                </Link>
                <div className="explore-card-footer">
                  <Link
                    to={`/profile/${book.publishedBy}`}
                    className="explore-card-author"
                  >
                    ✍️ {book.authorNickname || book.author || "알 수 없음"}
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
