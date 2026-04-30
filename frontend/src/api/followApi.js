import axiosInstance from "./axiosInstance";

// 팔로우 (인증 필요)
export const followUser = async (userId) => {
  return await axiosInstance.post(`/api/users/${userId}/follow`);
};

// 언팔로우 (인증 필요)
export const unfollowUser = async (userId) => {
  return await axiosInstance.delete(`/api/users/${userId}/follow`);
};

// 팔로워 목록 (비로그인 가능)
export const getFollowers = async (userId) => {
  return await axiosInstance.get(`/api/users/${userId}/followers`);
};

// 팔로잉 목록 (비로그인 가능)
export const getFollowing = async (userId) => {
  return await axiosInstance.get(`/api/users/${userId}/following`);
};

// 유저 프로필 조회 (비로그인 가능)
export const getUserProfile = async (userId) => {
  return await axiosInstance.get(`/api/users/${userId}/profile`);
};

// 해당 유저의 공개 책 목록 (피드에서 필터링)
export const getUserPublicBooks = async (userId) => {
  const res = await axiosInstance.get("/api/books/public");
  return { data: res.data.filter((b) => b.publishedBy === Number(userId)) };
};
