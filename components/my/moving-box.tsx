/**
 * @file components/my/moving-box.tsx
 * @description 이동 중 박스 컴포넌트
 *
 * 주요 기능:
 * 1. "이동 중입니다" 메시지 표시
 * 2. CSS 애니메이션: pulse 무한 반복
 *
 * @dependencies
 * - Tailwind CSS (pulse 애니메이션)
 */

export function MovingBox() {
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700 rounded-lg animate-pulse">
      <p className="text-center font-semibold text-blue-800 dark:text-blue-200">
        이동 중입니다
      </p>
    </div>
  );
}

