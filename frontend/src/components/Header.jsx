import React from "react";
import { Link } from "react-router-dom";
import "./Header.css";

const Header = () => {
    return (
        <header className="header">
            <Link to="/" className="logo">📚 Remon E-Book</Link>

            <nav>
                <Link to="/library">내 서재</Link>
                <Link to="/login">로그인</Link>
            </nav>
        </header>
    );
};

export default Header;