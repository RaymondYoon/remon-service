import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API 주소: EXPO_PUBLIC_API_URL 환경변수 (app/.env 또는 EAS 환경변수) — 없으면 운영 서버
// Expo가 번들 시점에 process.env.EXPO_PUBLIC_* 를 인라인하므로 반드시 이 형태 그대로 참조해야 한다.
const DEFAULT_API_URL = 'https://remon-service-production.up.railway.app';
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        await AsyncStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosInstance(original);
      } catch {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
