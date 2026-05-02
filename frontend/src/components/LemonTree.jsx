import React, { useState, useEffect, useRef } from "react";
import "./LemonTree.css";

let fallId = 0;

// 레몬 위치 (SVG viewBox 0 0 200 230 기준)
const LEMON_SPARSE = [
  { cx: 68,  cy: 112 },
  { cx: 132, cy: 112 },
  { cx: 100, cy: 82  },
];

const LEMON_FULL = [
  { cx: 68,  cy: 112 },
  { cx: 132, cy: 112 },
  { cx: 100, cy: 82  },
  { cx: 78,  cy: 90  },
  { cx: 122, cy: 90  },
  { cx: 55,  cy: 122 },
  { cx: 145, cy: 122 },
  { cx: 100, cy: 64  },
];

const LemonTree = ({ lemonCount = 0 }) => {
  const prevCountRef = useRef(lemonCount);
  const [falling, setFalling] = useState([]);

  useEffect(() => {
    if (prevCountRef.current > lemonCount) {
      const id = ++fallId;
      setFalling((prev) => [...prev, id]);
      setTimeout(() => setFalling((prev) => prev.filter((f) => f !== id)), 950);
    }
    prevCountRef.current = lemonCount;
  }, [lemonCount]);

  const hasLeaves = lemonCount > 0;
  const isFull = lemonCount >= 4;

  const lemons = isFull
    ? LEMON_FULL.slice(0, Math.min(lemonCount, LEMON_FULL.length))
    : LEMON_SPARSE.slice(0, Math.min(lemonCount, LEMON_SPARSE.length));

  return (
    <div className="lemon-tree-wrap">
      <svg
        viewBox="0 0 200 230"
        className="lemon-tree-svg"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="레몬트리"
      >
        {/* 땅 그림자 */}
        <ellipse cx="100" cy="220" rx="44" ry="7" fill="var(--color-primary)" opacity="0.13" />

        {/* 줄기 */}
        <rect x="88" y="150" width="24" height="66" fill="#8b6510" rx="6" />
        <rect x="92" y="156" width="6" height="56" fill="#a07820" rx="3" opacity="0.35" />

        {/* 뿌리 */}
        <path d="M88 202 Q72 215 56 210" stroke="#8b6510" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M112 202 Q128 215 144 210" stroke="#8b6510" strokeWidth="5" fill="none" strokeLinecap="round" />

        {/* 주요 가지 */}
        <path d="M100 153 Q78 133 58 124" stroke="#8b6510" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M100 153 Q122 133 142 124" stroke="#8b6510" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M100 162 Q84 145 68 139" stroke="#8b6510" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M100 162 Q116 145 132 139" stroke="#8b6510" strokeWidth="5" fill="none" strokeLinecap="round" />

        {/* 앙상한 나무 가지 끝 (열매 0개일 때만) */}
        {!hasLeaves && (
          <>
            <path d="M58 124 Q46 114 36 110" stroke="#8b6510" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M58 124 Q50 108 48 100" stroke="#8b6510" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M142 124 Q154 114 164 110" stroke="#8b6510" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M142 124 Q150 108 152 100" stroke="#8b6510" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M100 153 Q100 132 100 116" stroke="#8b6510" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M100 116 Q92 106 88 98" stroke="#8b6510" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M100 116 Q108 106 112 98" stroke="#8b6510" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* 잎 - 조금 (레몬 1~3개) */}
        {hasLeaves && !isFull && (
          <>
            <circle cx="100" cy="98"  r="40" fill="var(--color-primary)" opacity="0.88" />
            <circle cx="68"  cy="113" r="28" fill="var(--color-primary)" opacity="0.85" />
            <circle cx="132" cy="113" r="28" fill="var(--color-primary)" opacity="0.85" />
            <circle cx="100" cy="76"  r="24" fill="var(--color-primary-dark)" opacity="0.72" />
            <circle cx="100" cy="90"  r="16" fill="var(--color-primary-light)" opacity="0.28" />
          </>
        )}

        {/* 잎 - 풍성 (레몬 4개 이상) */}
        {isFull && (
          <>
            <circle cx="100" cy="92"  r="52" fill="var(--color-primary)" opacity="0.90" />
            <circle cx="65"  cy="109" r="38" fill="var(--color-primary)" opacity="0.87" />
            <circle cx="135" cy="109" r="38" fill="var(--color-primary)" opacity="0.87" />
            <circle cx="100" cy="63"  r="34" fill="var(--color-primary-dark)" opacity="0.82" />
            <circle cx="72"  cy="81"  r="26" fill="var(--color-primary)" opacity="0.76" />
            <circle cx="128" cy="81"  r="26" fill="var(--color-primary)" opacity="0.76" />
            <circle cx="90"  cy="83"  r="18" fill="var(--color-primary-light)" opacity="0.26" />
            <circle cx="114" cy="79"  r="14" fill="var(--color-primary-light)" opacity="0.22" />
          </>
        )}

        {/* 레몬 열매 */}
        {lemons.map((pos, i) => (
          <g key={i} className="lemon-fruit">
            <ellipse cx={pos.cx} cy={pos.cy} rx="10" ry="8" fill="var(--color-accent)" />
            <ellipse cx={pos.cx - 9.5} cy={pos.cy} rx="2"   ry="1.5" fill="var(--color-accent)" />
            <ellipse cx={pos.cx + 9.5} cy={pos.cy} rx="2"   ry="1.5" fill="var(--color-accent)" />
            <ellipse cx={pos.cx - 2}   cy={pos.cy - 2} rx="4" ry="2.5" fill="#fff9d0" opacity="0.6" />
            <line
              x1={pos.cx} y1={pos.cy - 8}
              x2={pos.cx} y2={pos.cy - 13}
              stroke="var(--color-primary-dark)" strokeWidth="1.5" strokeLinecap="round"
            />
          </g>
        ))}
      </svg>

      {/* 떨어지는 레몬 애니메이션 */}
      {falling.map((id) => (
        <span key={id} className="lemon-tree-falling" aria-hidden="true">🍋</span>
      ))}
    </div>
  );
};

export default LemonTree;
