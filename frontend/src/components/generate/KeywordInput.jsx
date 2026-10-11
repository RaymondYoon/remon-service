import React from "react";
import { MAX_KEYWORDS } from "./generateOptions";

// 키워드 태그 입력 (Enter / 쉼표로 추가, 포커스 아웃 시 추가)
const KeywordInput = ({ keywords, inputValue, onInputChange, onAdd, onRemove }) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <div className="keyword-input-wrap">
      {keywords.map((kw) => (
        <span key={kw} className="keyword-tag">
          {kw}
          <button type="button" className="keyword-tag-remove" onClick={() => onRemove(kw)}>×</button>
        </span>
      ))}
      {keywords.length < MAX_KEYWORDS && (
        <input
          type="text"
          className="keyword-input"
          placeholder={keywords.length === 0 ? "예: 우주, 고양이, 우주선 탈출 / 지우, 하늘, 까칠한 천재" : ""}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onAdd}
        />
      )}
    </div>
  );
};

export default KeywordInput;
