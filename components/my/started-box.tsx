/**
 * @file components/my/started-box.tsx
 * @description 픽업 시작 박스 컴포넌트
 *
 * 주요 기능:
 * 1. "픽업이 시작되었습니다" 메시지 표시
 * 2. 활성화/비활성화 상태에 따른 스타일 변경
 *
 * @dependencies
 * - Tailwind CSS
 */

interface StartedBoxProps {
  isActive?: boolean;
}

export function StartedBox({ isActive = true }: StartedBoxProps) {
  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        isActive
          ? "bg-yellow-100 dark:bg-yellow-950 border-yellow-400 dark:border-yellow-700 opacity-100"
          : "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 opacity-50"
      }`}
    >
      <p
        className={`text-center font-semibold ${
          isActive
            ? "text-yellow-800 dark:text-yellow-200"
            : "text-yellow-600 dark:text-yellow-400"
        }`}
      >
        픽업이 시작되었습니다
      </p>
    </div>
  );
}
