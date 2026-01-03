/**
 * @file app/(routes)/pickup-requests/new/page.tsx
 * @description 픽업 요청 등록 페이지
 *
 * 주요 기능:
 * 1. 픽업 시간 선택
 * 2. 출발지/목적지 선택 (네이버 지도 검색)
 * 3. 폼 유효성 검사 (Zod)
 * 4. Server Action으로 데이터 저장
 *
 * 핵심 구현 로직:
 * - React Hook Form + Zod resolver로 폼 관리
 * - shadcn/ui Form 컴포넌트 사용
 * - 네이버 지도 검색 컴포넌트 연동
 * - 제출 성공 시 목록 페이지로 리다이렉트
 *
 * @dependencies
 * - react-hook-form: 폼 상태 관리
 * - @hookform/resolvers/zod: Zod 스키마 resolver
 * - @/components/map/naver-map-search: 지도 검색 컴포넌트
 * - @/actions/pickup-requests: Server Action
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  pickupRequestSchema,
  type PickupRequestFormData,
} from "@/lib/validations/pickup-request";
import { createPickupRequest } from "@/actions/pickup-requests";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NaverMapSearch } from "@/components/map/naver-map-search";
import { Loader2 } from "lucide-react";

export default function NewPickupRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<PickupRequestFormData>({
    resolver: zodResolver(pickupRequestSchema),
    defaultValues: {
      pickup_time: "",
      origin_text: "",
      origin_lat: 0,
      origin_lng: 0,
      destination_text: "",
      destination_lat: 0,
      destination_lng: 0,
    },
  });

  const onSubmit = async (data: PickupRequestFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createPickupRequest(data);

      if (!result.success) {
        setSubmitError(result.error || "픽업 요청 등록에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }

      // 성공 시 목록 페이지로 리다이렉트
      router.push("/pickup-requests");
    } catch (error) {
      console.error("폼 제출 에러:", error);
      setSubmitError("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>픽업 요청 등록</CardTitle>
          <CardDescription>
            픽업 시간과 출발지, 목적지를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 픽업 시간 */}
              <FormField
                control={form.control}
                name="pickup_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>픽업 시간</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 출발지 */}
              <FormField
                control={form.control}
                name="origin_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>출발지</FormLabel>
                    <FormControl>
                      <NaverMapSearch
                        label="출발지"
                        value={
                          form.watch("origin_lat") && form.watch("origin_lng")
                            ? {
                                text: field.value,
                                lat: form.watch("origin_lat"),
                                lng: form.watch("origin_lng"),
                              }
                            : null
                        }
                        onChange={(value) => {
                          form.setValue("origin_text", value.text);
                          form.setValue("origin_lat", value.lat);
                          form.setValue("origin_lng", value.lng);
                        }}
                        error={form.formState.errors.origin_text?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 목적지 */}
              <FormField
                control={form.control}
                name="destination_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>목적지</FormLabel>
                    <FormControl>
                      <NaverMapSearch
                        label="목적지"
                        value={
                          form.watch("destination_lat") &&
                          form.watch("destination_lng")
                            ? {
                                text: field.value,
                                lat: form.watch("destination_lat"),
                                lng: form.watch("destination_lng"),
                              }
                            : null
                        }
                        onChange={(value) => {
                          form.setValue("destination_text", value.text);
                          form.setValue("destination_lat", value.lat);
                          form.setValue("destination_lng", value.lng);
                        }}
                        error={form.formState.errors.destination_text?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 에러 메시지 */}
              {submitError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {submitError}
                </div>
              )}

              {/* 제출 버튼 */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  등록하기
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

