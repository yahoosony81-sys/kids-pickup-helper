/**
 * @file components/my/moving-box.tsx
 * @description 이동 중 박스 컴포넌트
 *
 * 주요 기능:
 * 1. "목적지로 이동중" 메시지 표시
 * 2. 활성화/비활성화 상태에 따른 스타일 변경
 * 3. 활성화 시 CSS 애니메이션: pulse 무한 반복
 * 4. 활성화 시 실시간 위치 지도 표시
 * 5. 출발지와 목적지 정보 전달
 *
 * @dependencies
 * - Tailwind CSS (pulse 애니메이션)
 * - @/components/realtime/location-map: 실시간 위치 지도
 */

"use client";

import dynamic from "next/dynamic";

// 카카오맵은 SSR을 지원하지 않으므로 dynamic import 사용
const LocationMap = dynamic(
  () => import("@/components/realtime/location-map").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-sm text-gray-500">지도 로딩 중...</span>
      </div>
    ),
  }
);

interface MovingBoxProps {
  isActive?: boolean;
  tripId?: string;
  showMap?: boolean;
  // 출발지 정보
  originLat?: number;
  originLng?: number;
  originText?: string;
  // 목적지 정보
  destinationLat?: number;
  destinationLng?: number;
  destinationText?: string;
}

export function MovingBox({
  isActive = true,
  tripId,
  showMap = true,
  originLat,
  originLng,
  originText,
  destinationLat,
  destinationLng,
  destinationText,
}: MovingBoxProps) {
  return (
    <div className="space-y-3">
      {/* 목적지로 이동중 박스 */}
      <div
        className={`p-4 rounded-lg border-2 transition-all ${isActive
          ? "bg-blue-100 dark:bg-blue-950 border-blue-400 dark:border-blue-700 opacity-100 animate-pulse"
          : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 opacity-50"
          }`}
      >
        <p
          className={`text-center font-semibold ${isActive
            ? "text-blue-800 dark:text-blue-200"
            : "text-blue-600 dark:text-blue-400"
            }`}
        >
          목적지로 이동중
        </p>
      </div>

      {/* 실시간 위치 지도 (활성화 상태이고 tripId가 있을 때만 표시) */}
      {isActive && showMap && tripId && (
        <div className="mt-2">
          <LocationMap
            tripId={tripId}
            originLat={originLat}
            originLng={originLng}
            originText={originText}
            destinationLat={destinationLat}
            destinationLng={destinationLng}
            destinationText={destinationText}
          />
        </div>
      )}
    </div>
  );
}
