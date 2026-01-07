/**
 * @file components/trip-reviews/review-form.tsx
 * @description 리뷰 작성 폼 컴포넌트
 *
 * 주요 기능:
 * 1. 평점 입력 (1~5)
 * 2. 코멘트 입력 (선택사항)
 * 3. React Hook Form + Zod resolver 사용
 * 4. 리뷰 제출 처리
 *
 * @dependencies
 * - react-hook-form: 폼 상태 관리
 * - @hookform/resolvers/zod: Zod 스키마 resolver
 * - @/components/ui/form: shadcn/ui Form 컴포넌트
 * - @/components/trip-reviews/submit-review-button: 리뷰 제출 버튼
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  tripReviewSchema,
  type TripReviewFormData,
} from "@/lib/validations/trip-review";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { SubmitReviewButton } from "@/components/trip-reviews/submit-review-button";
import { Star } from "lucide-react";
import { useState } from "react";

interface ReviewFormProps {
  pickupRequestId: string;
  tripId: string;
  providerProfileId: string;
}

export function ReviewForm({
  pickupRequestId,
  tripId,
  providerProfileId,
}: ReviewFormProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const form = useForm<TripReviewFormData>({
    resolver: zodResolver(tripReviewSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating);
    form.setValue("rating", rating);
  };

  const currentRating = form.watch("rating") || selectedRating || 0;

  return (
    <Form {...form}>
      <form className="space-y-6">
        {/* 평점 입력 */}
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>평점 *</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingClick(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= currentRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormDescription>
                별을 클릭하여 평점을 선택해주세요. (1~5점)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 코멘트 입력 */}
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>코멘트 (선택사항)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="서비스에 대한 의견을 남겨주세요. (최대 1000자)"
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                서비스에 대한 자세한 의견을 남겨주시면 도움이 됩니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 제출 버튼 */}
        <div>
          <SubmitReviewButton
            pickupRequestId={pickupRequestId}
            tripId={tripId}
            providerProfileId={providerProfileId}
            formData={form.getValues()}
            onValidate={() => form.trigger()}
            isValid={form.formState.isValid}
          />
        </div>
      </form>
    </Form>
  );
}

