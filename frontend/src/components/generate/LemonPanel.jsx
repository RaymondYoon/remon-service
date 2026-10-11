import React from "react";
import LemonTree from "../LemonTree";

// 생성 페이지 상단 레몬트리 + 보유/사용 현황
const LemonPanel = ({ lemonInfo }) => (
  <div className="generate-lemon-panel">
    <LemonTree lemonCount={lemonInfo.lemonCount} />
    <div className="generate-lemon-info">
      {lemonInfo.lemonCount > 0 ? (
        <>
          <p className="generate-lemon-count">
            보유 레몬 🍋 <strong>{lemonInfo.lemonCount}개</strong>
          </p>
          <p className="generate-lemon-used">
            오늘 {lemonInfo.usedToday}/{lemonInfo.maxDaily}회 사용
          </p>
        </>
      ) : (
        <>
          <p className="generate-lemon-empty">오늘 레몬이 없어요!</p>
          <p className="generate-lemon-empty-sub">내일 자정에 다시 충전됩니다 🌙</p>
        </>
      )}
    </div>
  </div>
);

export default LemonPanel;
