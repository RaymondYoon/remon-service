import React from "react";

// 생성 폼의 한 항목 (라벨 + 힌트 + 입력 영역)
const GenerateField = ({ label, hint, children }) => (
  <div className="generate-field">
    <label className="generate-label">
      {label}
      {hint && <> <span className="generate-label-hint">{hint}</span></>}
    </label>
    {children}
  </div>
);

export default GenerateField;
