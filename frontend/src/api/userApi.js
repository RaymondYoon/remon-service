import axiosInstance from "./axiosInstance";

export const registerUser = async (data) => {
  return await axiosInstance.post("/api/users/register", data);
};

export const loginUser = async (data) => {
  return await axiosInstance.post("/api/users/login", data);
};

export const getLemonInfo = async () => {
  return await axiosInstance.get("/api/users/me/lemon");
};

export const updateNickname = async (nickname) => {
  return await axiosInstance.patch("/api/users/me/nickname", { nickname });
};

export const getUserByEmail = async (email) => {
  return await axiosInstance.get(`/api/users/${encodeURIComponent(email)}`);
};
