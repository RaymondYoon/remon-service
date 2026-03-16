// ── 저장 ──────────────────────────────────────────────────────────────────
export const saveAuth = (data) => {
  const token = data.token || data.accessToken;
  if (token) {
    localStorage.setItem("token", token);
  }
  const user = {
    nickname: data.nickname || data.username || "",
    email: data.email || "",
  };
  localStorage.setItem("user", JSON.stringify(user));
};

// ── 조회 ──────────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem("token");

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

// ── JWT 만료 확인 (atob으로 payload 디코드, 추가 라이브러리 불필요) ─────────
export const isTokenExpired = () => {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp는 초 단위 Unix timestamp
    return payload.exp * 1000 < Date.now();
  } catch {
    // 파싱 실패 = 잘못된 토큰 → 만료 처리
    return true;
  }
};

// ── 로그인 여부 (토큰 존재 + 만료 여부 모두 확인) ─────────────────────────
export const isLoggedIn = () => {
  if (!getToken()) return false;
  if (isTokenExpired()) {
    // 만료된 토큰은 즉시 제거
    clearAuth();
    return false;
  }
  return true;
};

// ── 삭제 ──────────────────────────────────────────────────────────────────
export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

/**
 * 앱 시작 시 구 형식 localStorage 정리
 *
 * 이전 버전은 response.data 전체를 "user" 키에 저장했고
 * "token" 키는 따로 쓰지 않았음.
 * → "token" 키가 없는데 "user" 안에 token 필드가 있으면 구 형식으로 판단,
 *   마이그레이션하거나 제거해 재로그인 유도.
 */
export const migrateOrClearLegacyAuth = () => {
  const hasNewToken = !!localStorage.getItem("token");
  if (hasNewToken) return; // 이미 새 형식 → 처리 불필요

  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) return;
    const parsed = JSON.parse(rawUser);

    // 구 형식: user 객체 안에 token/accessToken 필드가 있음
    const legacyToken = parsed?.token || parsed?.accessToken;
    if (legacyToken) {
      // 마이그레이션: 분리 저장 후 기존 키 덮어쓰기
      saveAuth(parsed);
    } else {
      // 구 형식이지만 token 없음 → 무효 데이터 제거
      clearAuth();
    }
  } catch {
    clearAuth();
  }
};
