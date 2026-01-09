/**
 * @file components/my/arrived-box.tsx
 * @description 도착 완료 박스 컴포넌트
 *
 * 주요 기능:
 * 1. "도착 완료" 메시지 표시
 * 2. CSS 애니메이션: 3회 깜빡임 후 정지
 *
 * @dependencies
 * - Tailwind CSS (커스텀 애니메이션)
 */

"use client";

import { useEffect, useState } from "react";

export function ArrivedBox() {
  const [isBlinking, setIsBlinking] = useState(true);
  const [blinkCount, setBlinkCount] = useState(0);

  useEffect(() => {
    if (blinkCount >= 3) {
      setIsBlinking(false);
      return;
    }

    const interval = setInterval(() => {
      setBlinkCount((prev) => {
        if (prev >= 2) {
          setIsBlinking(false);
          return 3;
        }
        return prev + 1;
      });
    }, 600); // 0.6초 간격으로 깜빡임

    return () => clearInterval(interval);
  }, [blinkCount]);

  return (
    <div
      className={`p-4 bg-green-50 dark:bg-green-950 border-2 border-green-300 dark:border-green-700 rounded-lg ${
        isBlinking ? "animate-pulse" : ""
      }`}
    >
      <p className="text-center font-semibold text-green-800 dark:text-green-200">
        도착 완료
      </p>
    </div>
  );
}

