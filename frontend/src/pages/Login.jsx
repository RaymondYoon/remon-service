import React, { useState } from "react";
import {Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = (e) => {
        e.preventDefault();
    

     if (!email || !password) {
         setError("이메일과 비밀번호를 입력해주세요.")
         return;
     }
 
     navigate("/");
 };
 
 return (
   <div className="login-container">
     <h2>로그인</h2>
 
     <form className="login-form" onSubmit={handleLogin}>
       <input
         type="email"
         placeholder="이메일 입력"
         value={email}
         onChange={(e) => setEmail(e.target.value)}
         />
 
         <input
         type="password"
         placeholder="비밀번호 입력"
         value={password}
         onChange={(e) => setPassword(e.target.value)}
         />
 
         {error && <p className="login-error">{error}</p>}
 
         <button type="submit" className="login-btn">
             로그인
         </button>
     </form>
 
     <p className="login-helper">
      계정이 없나요?
      <Link to="/signup" className="signup-link">회원가입</Link>
     </p>
 </div>
 );
}

export default Login;