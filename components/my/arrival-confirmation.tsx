/**
 * @file components/my/arrival-confirmation.tsx
 * @description 도착 확인 컴포넌트
 *
 * 주요 기능:
 * 1. 제공자가 업로드한 도착 사진 표시
 * 2. "서비스 평가하기" 버튼 연결 (기존 리뷰 페이지)
 *
 * @dependencies
 * - @/actions/trip-arrivals: getMyArrivalPhotos Server Action
 * - @/components/ui/button: 버튼 컴포넌트
 */

"use client";

import { useEffect, useState } from "react";
import { getMyArrivalPhotos } from "@/actions/trip-arrivals";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Star, Image as ImageIcon } from "lucide-react";

interface ArrivalConfirmationProps {
  pickupRequestId: string;
}

export function ArrivalConfirmation({
  pickupRequestId,
}: ArrivalConfirmationProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhoto = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getMyArrivalPhotos(pickupRequestId);
        if (result.success && result.data?.photoUrl) {
          setPhotoUrl(result.data.photoUrl);
        } else {
          setError("도착 사진을 불러올 수 없습니다.");
        }
      } catch (err) {
        console.error("도착 사진 조회 에러:", err);
        setError("도착 사진을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhoto();
  }, [pickupRequestId]);

  return (
    <div className="space-y-4 mt-4 pt-4 border-t">
      <h3 className="text-lg font-semibold">도착 확인</h3>

      {/* 도착 사진 표시 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <span className="animate-spin mr-2">⏳</span>
          사진을 불러오는 중...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-8 text-destructive">
          <ImageIcon className="h-5 w-5 mr-2" />
          {error}
        </div>
      ) : photoUrl ? (
        <div className="space-y-2">
          <Image
            src={photoUrl}
            alt="도착 사진"
            width={500}
            height={300}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-800"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <ImageIcon className="h-5 w-5 mr-2" />
          도착 사진이 아직 업로드되지 않았습니다.
        </div>
      )}

      {/* 서비스 평가하기 버튼 */}
      <div className="mt-4">
        <Button asChild className="w-full">
          <Link href={`/pickup-requests/${pickupRequestId}/review`}>
            <Star className="mr-2 h-4 w-4" />
            서비스 평가하기
          </Link>
        </Button>
      </div>
    </div>
  );
}

