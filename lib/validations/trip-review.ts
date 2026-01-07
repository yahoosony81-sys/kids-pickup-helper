/**
 * @file lib/validations/trip-review.ts
 * @description 리뷰 작성 폼 유효성 검사 스키마
 *
 * 주요 기능:
 * 1. 평점 검증 (1~5)
 * 2. 코멘트 검증 (선택사항, 최대 1000자)
 *
 * @dependencies
 * - zod: 스키마 검증 라이브러리
 */

import { z } from "zod";

/**
 * 리뷰 작성 폼 스키마
 *
 * - rating: 평점 (1~5, 필수)
 * - comment: 코멘트 (선택사항, 최대 1000자)
 */
export const tripReviewSchema = z.object({
  rating: z
    .number({
      required_error: "평점을 선택해주세요.",
      invalid_type_error: "평점은 숫자여야 합니다.",
    })
    .int("평점은 정수여야 합니다.")
    .min(1, "평점은 최소 1점 이상이어야 합니다.")
    .max(5, "평점은 최대 5점까지 가능합니다."),
  comment: z
    .string()
    .max(1000, "코멘트는 최대 1000자까지 입력 가능합니다.")
    .optional()
    .or(z.literal("")), // 빈 문자열도 허용
});

/**
 * 리뷰 작성 폼 데이터 타입
 */
export type TripReviewFormData = z.infer<typeof tripReviewSchema>;


