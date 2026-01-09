/**
 * @file components/my/pickup-progress-timeline.tsx
 * @description 픽업 진행 타임라인 컴포넌트
 *
 * 주요 기능:
 * 1. progress_stage 값에 따라 단계별 UI 표시
 * 2. MATCHED: 배지만 표시
 * 3. STARTED: 메시지 표시
 * 4. PICKED_UP: STARTED UI + 이동 중 박스
 * 5. ARRIVED: PICKED_UP UI + 도착 완료 박스 + 확인 버튼
 *
 * @dependencies
 * - @/components/my/moving-box: MovingBox 컴포넌트
 * - @/components/my/arrived-box: ArrivedBox 컴포넌트
 */

import { MovingBox } from "./moving-box";
import { ArrivedBox } from "./arrived-box";

interface PickupProgressTimelineProps {
  progressStage: string | null;
  showConfirmButton?: boolean;
}

export function PickupProgressTimeline({
  progressStage,
  showConfirmButton = false,
}: PickupProgressTimelineProps) {
  // 기본값은 MATCHED
  const stage = progressStage || "MATCHED";

  return (
    <div className="space-y-3 mt-4">
      {/* MATCHED: 배지만 표시 (상위 컴포넌트에서 처리) */}
      {stage === "MATCHED" && null}

      {/* STARTED: 메시지 표시 */}
      {stage === "STARTED" && (
        <>
          <p className="text-sm text-muted-foreground">
            픽업 서비스가 시작되었습니다.
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>···</span>
          </div>
        </>
      )}

      {/* PICKED_UP: STARTED UI + 이동 중 박스 */}
      {stage === "PICKED_UP" && (
        <>
          <p className="text-sm text-muted-foreground">
            픽업 서비스가 시작되었습니다.
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>···</span>
          </div>
          <MovingBox />
        </>
      )}

      {/* ARRIVED: PICKED_UP UI + 도착 완료 박스 + 확인 버튼 */}
      {stage === "ARRIVED" && (
        <>
          <p className="text-sm text-muted-foreground">
            픽업 서비스가 시작되었습니다.
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>···</span>
          </div>
          <div className="opacity-50">
            <MovingBox />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>···</span>
          </div>
          <ArrivedBox />
        </>
      )}
    </div>
  );
}

