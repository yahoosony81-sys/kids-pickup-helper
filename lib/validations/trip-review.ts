/**
 * @file lib/validations/trip-review.ts
 * @description 리뷰 작성 폼의 Zod 스키마 정의
 *
 * 주요 기능:
 * 1. 평점 유효성 검사 (1~5 정수)
 * 2. 코멘트 검증 (선택사항, 최대 길이 제한)
 *
 * @dependencies
 * - zod: 스키마 검증 라이브러리
 */

import { z } from "zod";

/**
 * 리뷰 작성 폼 스키마
 */
export const tripReviewSchema = z.object({
  rating: z
    .number()
    .int("평점은 정수여야 합니다.")
    .min(1, "평점은 1점 이상이어야 합니다.")
    .max(5, "평점은 5점 이하여야 합니다."),
  comment: z
    .string()
    .max(1000, "코멘트는 1000자 이하여야 합니다.")
    .optional()
    .or(z.literal("")),
});

export type TripReviewFormData = z.infer<typeof tripReviewSchema>;

