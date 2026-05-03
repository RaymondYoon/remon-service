import axiosInstance from "./axiosInstance";

// 책 목록 조회 (검색 파라미터 선택적)
export const getBooks = async (params = {}) => {
  return await axiosInstance.get("/api/books", { params });
};

// 책 단건 조회
export const getBookById = async (id) => {
  return await axiosInstance.get(`/api/books/${id}`);
};

// 내 서재 조회 (인증 필요)
export const getMyLibrary = async () => {
  return await axiosInstance.get("/api/library");
};

// 내 서재에 책 추가 (인증 필요)
export const addToLibrary = async (bookId) => {
  return await axiosInstance.post("/api/library", { bookId });
};

// 읽기 상태 변경 (인증 필요) — SAVED | READING | DONE
export const updateBookStatus = async (bookId, status) => {
  return await axiosInstance.patch(`/api/library/${bookId}/status`, { status });
};

// 읽기 시작 — SAVED일 때만 READING으로 변경, DONE은 유지 (인증 필요)
export const startReading = async (bookId) => {
  return await axiosInstance.patch(`/api/library/${bookId}/start-reading`);
};

// 서재에서 삭제 (인증 필요)
export const deleteFromLibrary = async (bookId) => {
  return await axiosInstance.delete(`/api/library/${bookId}`);
};

// AI 책 생성 (인증 필요) — 202 즉시 반환, 백그라운드에서 생성 진행
export const generateBook = async (data) => {
  return await axiosInstance.post("/api/books/generate", data);
};

// AI 책 생성 상태 조회 (폴링용) — PENDING | GENERATING | DONE | FAILED
export const getBookGenerationStatus = async (id) => {
  return await axiosInstance.get(`/api/books/${id}/status`);
};

// 현재 읽은 페이지 저장 (인증 필요)
export const savePage = async (bookId, page) => {
  return await axiosInstance.patch(`/api/library/${bookId}/page`, { page });
};

// 마지막 페이지 완독 처리 (인증 필요)
export const markAsDone = async (bookId) => {
  return await axiosInstance.patch(`/api/library/${bookId}/finish`);
};

// 내가 만든 AI 책 목록 조회 (인증 필요)
export const getMyBooks = async () => {
  return await axiosInstance.get("/api/books/my");
};

// 내가 만든 AI 책 삭제 (인증 필요)
export const deleteMyBook = async (bookId) => {
  return await axiosInstance.delete(`/api/books/${bookId}`);
};

// 회원 탈퇴 (인증 필요)
export const deleteAccount = async () => {
  return await axiosInstance.delete("/api/users/me");
};

// 모든 공개 책 목록 — 둘러보기 (비로그인 가능)
export const getExploreBooks = async () => {
  return await axiosInstance.get("/api/books/explore");
};

// 팔로우한 사람들의 책 피드 (인증 필요)
export const getFeedBooks = async () => {
  return await axiosInstance.get("/api/books/feed");
};

// 내 서재 책 ID 목록 (인증 필요) — 홈 체크 배지용
export const getMyBookIds = async () => {
  return await axiosInstance.get("/api/library/my-book-ids");
};

// 어드민 전용 — 책 강제 삭제
export const adminDeleteBook = async (bookId) => {
  return await axiosInstance.delete(`/api/admin/books/${bookId}`);
};

// 어드민 전용 — 리뷰 강제 삭제
export const adminDeleteReview = async (reviewId) => {
  return await axiosInstance.delete(`/api/admin/reviews/${reviewId}`);
};
