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

// AI 책 생성 (인증 필요) — OpenAI 응답 대기로 60초 타임아웃 적용
export const generateBook = async (data) => {
  return await axiosInstance.post("/api/books/generate", data, { timeout: 60000 });
};
