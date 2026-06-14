import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveAuth } from "../utils/auth";
import { exchangeOAuthCode } from "../api/userApi";
import "./OAuthCallback.css";

/**
 * 카카오 OAuth 콜백 페이지 (단기 코드 교환 방식)
 *
 * 흐름:
 *  1. /login 에서 카카오 버튼 클릭
 *  2. → https://remon-service-production.up.railway.app/api/auth/kakao  (백엔드가 카카오 인증 URL로 redirect)
 *  3. → 카카오 로그인 완료
 *  4. → https://remon-service-production.up.railway.app/api/auth/kakao/callback?code=...  (백엔드 처리)
 *  5. → 백엔드가 단기 코드 발급 후 이 페이지로 redirect
 *       예) https://remon-service.vercel.app/oauth-callback?code=uuid&nickname=홍길동&email=test@kakao.com
 *  6. → 이 페이지가 POST /api/auth/code-exchange 로 단기 코드를 교환하여 accessToken/refreshToken 획득
 *  7. → saveAuth 저장 후 홈으로 이동
 */
const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const nickname = searchParams.get("nickname");
    const email = searchParams.get("email");

    if (!code) {
      setError("카카오 로그인에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    exchangeOAuthCode(code)
      .then((res) => {
        const { accessToken, refreshToken, email: resEmail } = res.data;
        saveAuth({
          accessToken,
          refreshToken,
          nickname,
          email: resEmail || email,
        });
        navigate("/", { replace: true, state: { justLoggedIn: true } });
      })
      .catch(() => {
        setError("카카오 로그인에 실패했습니다. 다시 시도해주세요.");
      });
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="oauth-container">
        <p className="oauth-error">{error}</p>
        <button className="oauth-retry-btn" onClick={() => navigate("/login")}>
          로그인 페이지로
        </button>
      </div>
    );
  }

  return (
    <div className="oauth-container">
      <div className="oauth-spinner" />
      <p>카카오 로그인 처리 중...</p>
    </div>
  );
};

export default OAuthCallback;
