import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Signup.css";

function Signup() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value});
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (form.password !== form.confirmPassword) {
            alert("비밀번호가 일치하지 않습니다.");
            return;
        }

        console.log("회원가입 요청 데이터:", form);

        navigate("/login");
    };

    return (
      <div className="signup-container">
        <h2>회원가입</h2>

        <form className="signup-form" onSubmit={handleSubmit}>
            <input
            type="text"
            name="username"
            placeholder="이름"
            className="signup-input"
            value={form.username}
            onChange={handleChange}
            required
            />

            <input
            type="email"
            name="email"
            placeholder="이메일"
            className="signup-input"
            value={form.email}
            onChange={handleChange}
            required
            />

            <input
            type="password"
            name="password"
            placeholder="비밀번호"
            className="signup-input"
            value={form.password}
            onChange={handleChange}
            required
            />

            <input
            type="password"
            name="confirmPassword"
            placeholder="비밀번호 확인"
            className="signup-input"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            />

            <button type="submit" className="signup-button">
                회원가입
            </button>
        </form>

        <p className="signup-back">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="login-text">로그인</Link>
        </p>

      </div>
    );
}

export default Signup;