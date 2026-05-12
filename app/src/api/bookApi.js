import axiosInstance from './axiosInstance';

export const login = (email, password) =>
  axiosInstance.post('/api/users/login', { email, password });

export const getBooks = (params = {}) =>
  axiosInstance.get('/api/books', { params });

export const getBookById = (id) =>
  axiosInstance.get(`/api/books/${id}`);

export const generateBook = (data) =>
  axiosInstance.post('/api/books/generate', data);

export const getGenerationStatus = (id) =>
  axiosInstance.get(`/api/books/${id}/status`);

export const getMyLibrary = () =>
  axiosInstance.get('/api/library');

export const startReading = (bookId) =>
  axiosInstance.patch(`/api/library/${bookId}/start-reading`);

export const savePage = (bookId, page) =>
  axiosInstance.patch(`/api/library/${bookId}/page`, { page });

export const markAsDone = (bookId) =>
  axiosInstance.patch(`/api/library/${bookId}/finish`);

export const getLemon = () =>
  axiosInstance.get('/api/users/me/lemon');

export const updateNickname = (nickname) =>
  axiosInstance.patch('/api/users/me/nickname', { nickname });

export const logoutApi = () =>
  axiosInstance.post('/api/users/logout');
