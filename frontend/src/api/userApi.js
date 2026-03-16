import axiosInstance from "./axiosInstance";

export const registerUser = async (data) => {
  return await axiosInstance.post("/api/users/register", data);
};

export const loginUser = async (data) => {
  return await axiosInstance.post("/api/users/login", data);
};
