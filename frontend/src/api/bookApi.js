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

// AI 책 생성 (인증 필요) — OpenAI 응답 대기로 60초 타임아웃 적용
export const generateBook = async (data) => {
  return await axiosInstance.post("/api/books/generate", data, { timeout: 60000 });
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
