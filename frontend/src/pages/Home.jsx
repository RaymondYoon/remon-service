import React from "react";
import BookCard from "../components/BookCard";

const Home = () => {
    const dummyBooks = [
        { id: 1, title: "어린왕자", author: "생택쥐페리"},
        { id: 2, title: "데미안", author: "헤르만 헤세"},
    ];

    return (
        <div style={{ padding: "20px"}}>
            <h2>추천 전자책</h2>

            <div style={{ display: "flex", gap: "20px"}}>
                {dummyBooks.map((b) => (
                    <BookCard key = {b.id} book={b} />
                ))}
            </div>
        </div>
    )
}

export default Home;