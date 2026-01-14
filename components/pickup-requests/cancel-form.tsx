/**
 * @file components/pickup-requests/cancel-form.tsx
 * @description 픽업 요청 취소 폼 컴포넌트
 *
 * 주요 기능:
 * 1. 취소 사유 선택 (CANCEL 또는 NO_SHOW)
 * 2. 상세 사유 입력 (선택사항)
 * 3. React Hook Form + Zod resolver 사용
 * 4. 취소 처리
 *
 * @dependencies
 * - react-hook-form: 폼 상태 관리
 * - @hookform/resolvers/zod: Zod 스키마 resolver
 * - @/components/ui/form: shadcn/ui Form 컴포넌트
 * - @/components/pickup-requests/cancel-pickup-request-button: 취소 버튼
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  cancelPickupRequestSchema,
  type CancelPickupRequestFormData,
} from "@/lib/validations/pickup-request";
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
import { CancelPickupRequestButton } from "@/components/pickup-requests/cancel-pickup-request-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface CancelFormProps {
  pickupRequestId: string;
}

export function CancelForm({ pickupRequestId }: CancelFormProps) {
  const form = useForm<CancelPickupRequestFormData>({
    resolver: zodResolver(cancelPickupRequestSchema),
    defaultValues: {
      cancel_reason_code: undefined,
      cancel_reason_text: "",
    },
  });

  return (
    <Form {...form}>
      <form className="space-y-6">
        {/* 취소 사유 선택 */}
        <FormField
          control={form.control}
          name="cancel_reason_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>취소 사유 *</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CANCEL" id="cancel" />
                    <Label htmlFor="cancel" className="font-normal cursor-pointer">
                      일반 취소
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NO_SHOW" id="no-show" />
                    <Label htmlFor="no-show" className="font-normal cursor-pointer">
                      노쇼 (예정 시간에 나타나지 않음)
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                취소 사유를 선택해주세요.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 상세 사유 입력 */}
        <FormField
          control={form.control}
          name="cancel_reason_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>상세 사유 (선택사항)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="취소 사유를 자세히 설명해주세요. (최대 500자)"
                  className="min-h-[100px]"
                  maxLength={500}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                취소 사유를 자세히 남겨주시면 도움이 됩니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 취소 버튼 */}
        <div>
          <CancelPickupRequestButton
            pickupRequestId={pickupRequestId}
            formData={form.getValues()}
          />
        </div>
      </form>
    </Form>
  );
}
