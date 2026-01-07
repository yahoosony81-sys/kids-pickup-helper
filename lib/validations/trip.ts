/**
 * @file lib/validations/trip.ts
 * @description 픽업 그룹 생성 폼의 Zod 스키마 정의
 *
 * 주요 기능:
 * 1. 출발 예정 시각 유효성 검사 (미래 시간만 허용)
 * 2. 그룹명 검증 (선택사항, 최대 100자)
 *
 * @dependencies
 * - zod: 스키마 검증 라이브러리
 */

import { z } from "zod";

/**
 * 픽업 그룹 생성 폼 스키마
 */
export const tripSchema = z.object({
  scheduled_start_at: z
    .string()
    .min(1, "출발 예정 시각을 선택해주세요.")
    .refine(
      (val) => {
        const selectedDate = new Date(val);
        const now = new Date();
        return selectedDate > now;
      },
      {
        message: "출발 예정 시각은 현재 시간 이후여야 합니다.",
      }
    ),
  title: z
    .string()
    .min(1, "그룹명을 입력해주세요.")
    .max(100, "그룹명은 최대 100자까지 입력 가능합니다."),
});

export type TripFormData = z.infer<typeof tripSchema>;

