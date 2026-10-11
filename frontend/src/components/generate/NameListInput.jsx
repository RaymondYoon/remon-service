import React from "react";

/**
 * 이름 목록 입력 (주인공 / 조연) — 동적 추가·삭제.
 * @param minCount  이 개수 이하로는 삭제 버튼을 숨김 (주인공은 1칸 유지, 조연은 0)
 */
const NameListInput = ({ names, onChange, max, minCount = 0, placeholder, addLabel }) => (
  <div className="character-list">
    {names.map((name, i) => (
      <div key={i} className="character-input-row">
        <input
          type="text"
          className="generate-text-input"
          placeholder={placeholder}
          value={name}
          onChange={(e) => {
            const next = [...names];
            next[i] = e.target.value;
            onChange(next);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
          maxLength={20}
        />
        {names.length > minCount && (
          <button
            type="button"
            className="character-remove-btn"
            onClick={() => onChange(names.filter((_, j) => j !== i))}
          >×</button>
        )}
      </div>
    ))}
    {names.length < max && (
      <button
        type="button"
        className="character-add-btn"
        onClick={() => onChange([...names, ""])}
      >{addLabel}</button>
    )}
  </div>
);

export default NameListInput;
