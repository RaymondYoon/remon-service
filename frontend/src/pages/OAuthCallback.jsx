import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveAuth } from "../utils/auth";
import "./OAuthCallback.css";

/**
 * 카카오 OAuth 콜백 페이지 (수동 Kakao OAuth 구조)
 *
 * 흐름:
 *  1. /login 에서 카카오 버튼 클릭
 *  2. → http://localhost:8080/api/auth/kakao  (백엔드가 카카오 인증 URL로 redirect)
 *  3. → 카카오 로그인 완료
 *  4. → http://localhost:8080/api/auth/kakao/callback?code=...  (백엔드 처리)
 *  5. → 백엔드가 JWT 발급 후 이 페이지로 redirect
 *       예) http://localhost:3000/oauth-callback?token=eyJ...&nickname=홍길동&email=test@kakao.com
 *  6. → 이 페이지가 token/nickname/email 파싱·저장 후 홈으로 이동
 *
 * 백엔드 확인 사항:
 *   - /api/auth/kakao/callback 처리 후 프론트 redirect URL이
 *     http://localhost:3000/oauth-callback 으로 설정되어 있어야 함
 *   - 쿼리 파라미터로 token(또는 accessToken), nickname, email 을 전달해야 함
 */
const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token") || searchParams.get("accessToken");
    const nickname = searchParams.get("nickname");
    const email = searchParams.get("email");

    if (token) {
      saveAuth({ token, nickname, email });
      navigate("/", { replace: true });
    } else {
      setError("카카오 로그인에 실패했습니다. 다시 시도해주세요.");
    }
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
