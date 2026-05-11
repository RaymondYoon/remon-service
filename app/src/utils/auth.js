import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
};

export const saveAuth = async ({ accessToken, refreshToken, user }) => {
  await AsyncStorage.multiSet([
    [KEYS.ACCESS_TOKEN, accessToken],
    [KEYS.REFRESH_TOKEN, refreshToken],
    [KEYS.USER, JSON.stringify(user)],
  ]);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
};

export const getRefreshToken = async () => {
  return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
};

export const getUser = async () => {
  const raw = await AsyncStorage.getItem(KEYS.USER);
  return raw ? JSON.parse(raw) : null;
};

export const clearAuth = async () => {
  await AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.REFRESH_TOKEN, KEYS.USER]);
};

export const isLoggedIn = async () => {
  const token = await getToken();
  return !!token;
};
