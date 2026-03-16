import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "../utils/auth";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isLoggedIn()) {
    // 로그인 후 원래 페이지로 돌아올 수 있도록 state로 경로 전달
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
