import React, { useEffect, useState } from "react";
import "./LemonFall.css";

let idCounter = 0;

const LemonFall = ({ trigger }) => {
  const [lemons, setLemons] = useState([]);

  useEffect(() => {
    if (!trigger) return;
    const id = ++idCounter;
    const x = 20 + Math.random() * 60; // 화면 너비 20~80% 사이
    setLemons((prev) => [...prev, { id, x }]);
    const timer = setTimeout(() => {
      setLemons((prev) => prev.filter((l) => l.id !== id));
    }, 1400);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <>
      {lemons.map((lemon) => (
        <span
          key={lemon.id}
          className="lemon-fall"
          style={{ left: `${lemon.x}%` }}
        >
          🍋
        </span>
      ))}
    </>
  );
};

export default LemonFall;
