/**
 * @file components/my/arrived-box.tsx
 * @description 도착 완료 박스 컴포넌트
 *
 * 주요 기능:
 * 1. "도착 완료" 메시지 표시
 * 2. 활성화/비활성화 상태에 따른 스타일 변경
 * 3. 활성화 시 CSS 애니메이션: 3회 깜빡임 후 정지
 *
 * @dependencies
 * - Tailwind CSS (커스텀 애니메이션)
 */

"use client";

import { useEffect, useState } from "react";

interface ArrivedBoxProps {
  isActive?: boolean;
}

export function ArrivedBox({ isActive = true }: ArrivedBoxProps) {
  const [isBlinking, setIsBlinking] = useState(true);
  const [blinkCount, setBlinkCount] = useState(0);

  useEffect(() => {
    // 활성화 상태일 때만 깜빡임 애니메이션 작동
    if (!isActive || blinkCount >= 3) {
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
  }, [blinkCount, isActive]);

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        isActive
          ? `bg-green-100 dark:bg-green-950 border-green-400 dark:border-green-700 opacity-100 ${
              isBlinking ? "animate-pulse" : ""
            }`
          : "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 opacity-50"
      }`}
    >
      <p
        className={`text-center font-semibold ${
          isActive
            ? "text-green-800 dark:text-green-200"
            : "text-green-600 dark:text-green-400"
        }`}
      >
        도착 완료
      </p>
    </div>
  );
}

