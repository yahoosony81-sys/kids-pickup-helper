/**
 * @file components/my/pickup-progress-timeline.tsx
 * @description 픽업 진행 타임라인 컴포넌트
 *
 * 주요 기능:
 * 1. progress_stage 값에 따라 단계별 UI 표시
 * 2. 모든 상태를 사각박스 버튼으로 통일
 * 3. 경우1: STARTED 상태 - "픽업이 시작되었습니다" 버튼 3초 활성화 → 비활성화, "목적지로 이동중" 버튼 활성화
 * 4. 경우2: ARRIVED 상태 - "목적지로 이동중" 버튼 비활성화, "도착완료" 버튼 3초 활성화 → 비활성화
 * 5. 화살표 구분자 표시 (버튼 중앙 아래쪽)
 *
 * @dependencies
 * - @/components/my/started-box: StartedBox 컴포넌트
 * - @/components/my/moving-box: MovingBox 컴포넌트
 * - @/components/my/arrived-box: ArrivedBox 컴포넌트
 * - lucide-react: ArrowDown 아이콘
 */

"use client";

import { useState, useEffect } from "react";
import { ArrowDown } from "lucide-react";
import { StartedBox } from "./started-box";
import { MovingBox } from "./moving-box";
import { ArrivedBox } from "./arrived-box";

interface PickupProgressTimelineProps {
  progressStage: string | null;
  showConfirmButton?: boolean;
}

export function PickupProgressTimeline({
  progressStage,
}: PickupProgressTimelineProps) {
  // 기본값은 MATCHED
  const stage = progressStage || "MATCHED";

  // 경우1: STARTED 상태일 때 활성화/비활성화 상태
  const [startedActive, setStartedActive] = useState(true);
  const [movingActive, setMovingActive] = useState(false);

  // 경우2: ARRIVED 상태일 때 활성화/비활성화 상태
  const [arrivedActive, setArrivedActive] = useState(true);

  // 경우1: 제공자가 출발하기 버튼을 누른 경우
  useEffect(() => {
    if (stage === "STARTED") {
      // 초기화: StartedBox 활성화, MovingBox 비활성화
      setStartedActive(true);
      setMovingActive(false);

      // 3초 후 StartedBox 비활성화, MovingBox 활성화
      const timer = setTimeout(() => {
        setStartedActive(false);
        setMovingActive(true);
      }, 3000);

      return () => clearTimeout(timer);
    } else if (stage === "PICKED_UP") {
      // PICKED_UP 상태: StartedBox 비활성화, MovingBox 활성화
      setStartedActive(false);
      setMovingActive(true);
    } else {
      // 다른 상태로 변경되면 초기화
      setStartedActive(false);
      setMovingActive(false);
    }
  }, [stage]);

  // 경우2: 제공자가 도착완료 사진을 올린 경우
  useEffect(() => {
    if (stage === "ARRIVED") {
      // 초기화: ArrivedBox 활성화
      setArrivedActive(true);
      setMovingActive(false);

      // 3초 후 ArrivedBox 비활성화
      const timer = setTimeout(() => {
        setArrivedActive(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setArrivedActive(false);
    }
  }, [stage]);

  // 화살표 구분자 컴포넌트
  const ArrowSeparator = () => (
    <div className="flex justify-center py-1">
      <ArrowDown className="h-5 w-5 text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-0 mt-4">
      {/* MATCHED: 배지만 표시 (상위 컴포넌트에서 처리) */}
      {stage === "MATCHED" && null}

      {/* STARTED 또는 PICKED_UP 상태: StartedBox + MovingBox */}
      {(stage === "STARTED" || stage === "PICKED_UP") && (
        <>
          <StartedBox isActive={startedActive} />
          <ArrowSeparator />
          <MovingBox isActive={movingActive} />
        </>
      )}

      {/* ARRIVED 상태: StartedBox + MovingBox + ArrivedBox */}
      {stage === "ARRIVED" && (
        <>
          <StartedBox isActive={false} />
          <ArrowSeparator />
          <MovingBox isActive={false} />
          <ArrowSeparator />
          <ArrivedBox isActive={arrivedActive} />
        </>
      )}
    </div>
  );
}

