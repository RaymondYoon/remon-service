import React from "react";
import { Link } from "react-router-dom";
import "./BookCard.css"

const BookCard = ({ book }) => {
    return (
        <div className="book-card">
            <div className="book-cover"></div>

            <h3>{book.title}</h3>
            <p>{book.author}</p>

            <Link to-={'/book/${book.id}'} className="detail-btn">
                자세히 보기
            </Link>
        </div>
    );
};

export default BookCard