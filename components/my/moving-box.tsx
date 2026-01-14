/**
 * @file components/my/moving-box.tsx
 * @description 이동 중 박스 컴포넌트
 *
 * 주요 기능:
 * 1. "목적지로 이동중" 메시지 표시
 * 2. 활성화/비활성화 상태에 따른 스타일 변경
 * 3. 활성화 시 CSS 애니메이션: pulse 무한 반복
 *
 * @dependencies
 * - Tailwind CSS (pulse 애니메이션)
 */

interface MovingBoxProps {
  isActive?: boolean;
}

export function MovingBox({ isActive = true }: MovingBoxProps) {
  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        isActive
          ? "bg-blue-100 dark:bg-blue-950 border-blue-400 dark:border-blue-700 opacity-100 animate-pulse"
          : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 opacity-50"
      }`}
    >
      <p
        className={`text-center font-semibold ${
          isActive
            ? "text-blue-800 dark:text-blue-200"
            : "text-blue-600 dark:text-blue-400"
        }`}
      >
        목적지로 이동중
      </p>
    </div>
  );
}

