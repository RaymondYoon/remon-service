import axiosInstance from "./axiosInstance";

export const getNotifications = () =>
  axiosInstance.get("/api/notifications").then((res) => res.data);

export const markAsRead = (id) =>
  axiosInstance.patch(`/api/notifications/${id}/read`).then((res) => res.data);

export const markAllAsRead = () =>
  axiosInstance.patch("/api/notifications/read-all");

export const getUnreadCount = () =>
  axiosInstance.get("/api/notifications/unread-count").then((res) => res.data.count);
