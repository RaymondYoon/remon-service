import React, { useEffect, useState } from "react";
import "./Toast.css";

const ICONS = { success: "✓", error: "✕", info: "ℹ" };

const Toast = ({ toasts, removeToast }) => (
  <div className="toast-container" aria-live="polite">
    {toasts.map((t) => (
      <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
    ))}
  </div>
);

const ToastItem = ({ toast, onRemove }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const hide = setTimeout(() => setExiting(true), 2700);
    const remove = setTimeout(() => onRemove(), 3000);
    return () => { clearTimeout(hide); clearTimeout(remove); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`toast toast--${toast.type}${exiting ? " toast--exit" : ""}`}>
      <span className="toast-icon">{ICONS[toast.type]}</span>
      <span className="toast-msg">{toast.message}</span>
      <button className="toast-close" onClick={() => { setExiting(true); setTimeout(onRemove, 300); }}>✕</button>
    </div>
  );
};

export default Toast;
