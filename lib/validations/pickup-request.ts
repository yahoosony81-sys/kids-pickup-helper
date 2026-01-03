/**
 * @file lib/validations/pickup-request.ts
 * @description 픽업 요청 등록 폼의 Zod 스키마 정의
 *
 * 주요 기능:
 * 1. 픽업 시간 유효성 검사 (미래 시간만 허용)
 * 2. 출발지/목적지 주소 및 좌표 검증
 * 3. 좌표 범위 검증 (한국 지역)
 *
 * @dependencies
 * - zod: 스키마 검증 라이브러리
 */

import { z } from "zod";

/**
 * 픽업 요청 등록 폼 스키마
 */
export const pickupRequestSchema = z.object({
  pickup_time: z
    .string()
    .min(1, "픽업 시간을 선택해주세요.")
    .refine(
      (val) => {
        const selectedDate = new Date(val);
        const now = new Date();
        return selectedDate > now;
      },
      {
        message: "픽업 시간은 현재 시간 이후여야 합니다.",
      }
    ),
  origin_text: z.string().min(1, "출발지를 선택해주세요."),
  origin_lat: z
    .number()
    .min(33.0, "올바른 출발지 좌표를 선택해주세요.")
    .max(38.6, "올바른 출발지 좌표를 선택해주세요."),
  origin_lng: z
    .number()
    .min(124.5, "올바른 출발지 좌표를 선택해주세요.")
    .max(132.0, "올바른 출발지 좌표를 선택해주세요."),
  destination_text: z.string().min(1, "목적지를 선택해주세요."),
  destination_lat: z
    .number()
    .min(33.0, "올바른 목적지 좌표를 선택해주세요.")
    .max(38.6, "올바른 목적지 좌표를 선택해주세요."),
  destination_lng: z
    .number()
    .min(124.5, "올바른 목적지 좌표를 선택해주세요.")
    .max(132.0, "올바른 목적지 좌표를 선택해주세요."),
});

export type PickupRequestFormData = z.infer<typeof pickupRequestSchema>;

