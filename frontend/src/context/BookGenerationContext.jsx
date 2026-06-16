import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { getBookGenerationStatus } from "../api/bookApi";

const BookGenerationContext = createContext(null);

export const BookGenerationProvider = ({ children }) => {
  const [bookId, setBookId] = useState(null);
  const [status, setStatus] = useState(null); // null | "generating" | "done" | "failed"
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [minimized, setMinimized] = useState(false);

  const intervalRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const stepRef = useRef("TEXT");

  const stopAll = useCallback(() => {
    clearInterval(intervalRef.current);
    clearInterval(progressIntervalRef.current);
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const minimize = useCallback(() => setMinimized(true), []);
  const restore = useCallback(() => setMinimized(false), []);

  const startGeneration = useCallback((newBookId) => {
    stopAll();
    setBookId(newBookId);
    setStatus("generating");
    setProgress(10);
    setMessage("✍️ 이야기를 쓰고 있어요...");
    setMinimized(false);
    stepRef.current = "TEXT";

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (stepRef.current === "TEXT" && prev < 50) return Math.min(prev + 0.4, 50);
        if (stepRef.current === "IMAGE" && prev < 90) return Math.min(prev + 0.4, 90);
        return prev;
      });
    }, 200);

    intervalRef.current = setInterval(async () => {
      try {
        const res = await getBookGenerationStatus(newBookId);
        const { status: s, step } = res.data;
        if (s === "DONE") {
          stopAll();
          setProgress(100);
          setMessage("✨ 이야기가 완성됐어요!");
          setStatus("done");
        } else if (s === "FAILED") {
          stopAll();
          setMessage("❌ 생성에 실패했어요. 다시 시도해주세요.");
          setStatus("failed");
        } else if (step === "IMAGE" && stepRef.current !== "IMAGE") {
          stepRef.current = "IMAGE";
          setProgress((prev) => Math.max(prev, 50));
          setMessage("🎨 표지를 그리고 있어요...");
        }
      } catch {
        // 네트워크 오류는 무시하고 계속 폴링
      }
    }, 2000);
  }, [stopAll]);

  const dismiss = useCallback(() => {
    stopAll();
    setBookId(null);
    setStatus(null);
    setProgress(0);
    setMessage("");
    setMinimized(false);
  }, [stopAll]);

  return (
    <BookGenerationContext.Provider value={{ bookId, status, progress, message, minimized, startGeneration, minimize, restore, dismiss }}>
      {children}
    </BookGenerationContext.Provider>
  );
};

export const useBookGeneration = () => {
  const ctx = useContext(BookGenerationContext);
  if (!ctx) throw new Error("useBookGeneration must be used within BookGenerationProvider");
  return ctx;
};
