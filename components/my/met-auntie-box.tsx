
"use client";

import { useEffect, useState } from "react";

interface MetAuntieBoxProps {
    isActive?: boolean;
}

export function MetAuntieBox({ isActive = false }: MetAuntieBoxProps) {
    const [isBlinking, setIsBlinking] = useState(false);

    useEffect(() => {
        if (isActive) {
            setIsBlinking(true);
            const timer = setTimeout(() => {
                setIsBlinking(false);
            }, 3000); // 3초간 깜빡임
            return () => clearTimeout(timer);
        } else {
            setIsBlinking(false);
        }
    }, [isActive]);

    // 애니메이션 클래스
    const blinkClass = isBlinking ? "animate-pulse ring-4 ring-blue-300" : "";

    return (
        <div
            className={`p-4 rounded-lg border-2 transition-all duration-300 ${blinkClass} ${isActive
                    ? "bg-blue-100 dark:bg-blue-950 border-blue-400 dark:border-blue-700 opacity-100"
                    : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 opacity-50"
                }`}
        >
            <p
                className={`text-center font-semibold ${isActive
                        ? "text-blue-800 dark:text-blue-200"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
            >
                픽업장소에서 이모를 만났습니다
            </p>
        </div>
    );
}
