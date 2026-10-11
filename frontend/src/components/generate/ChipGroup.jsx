import React from "react";

/**
 * 칩 선택 그룹.
 * @param options   [{ value, label }]
 * @param isActive  (value) => boolean
 * @param onSelect  (value) => void
 * @param multi     다중 선택 그룹이면 true (✓ 표시 + chip-group--multi 클래스)
 */
const ChipGroup = ({ options, isActive, onSelect, multi = false }) => (
  <div className={`chip-group${multi ? " chip-group--multi" : ""}`}>
    {options.map((opt) => {
      const active = isActive(opt.value);
      return (
        <button
          key={opt.value}
          type="button"
          className={`chip ${active ? "chip--active" : ""}`}
          onClick={() => onSelect(opt.value)}
        >
          {multi && active && <span className="chip-check">✓ </span>}{opt.label}
        </button>
      );
    })}
  </div>
);

export default ChipGroup;
