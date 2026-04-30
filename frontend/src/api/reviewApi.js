import axiosInstance from "./axiosInstance";

// 리뷰 목록 조회 (비로그인 가능)
export const getReviews = async (bookId) => {
  return await axiosInstance.get(`/api/books/${bookId}/reviews`);
};

// 리뷰 작성 (인증 필요)
export const createReview = async (bookId, data) => {
  return await axiosInstance.post(`/api/books/${bookId}/reviews`, data);
};

// 내 리뷰 삭제 (인증 필요)
export const deleteReview = async (bookId, reviewId) => {
  return await axiosInstance.delete(`/api/books/${bookId}/reviews/${reviewId}`);
};
