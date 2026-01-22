/**
 * @file components/trip-arrivals/arrival-photo-viewer.tsx
 * @description 도착 사진 조회 컴포넌트
 *
 * 주요 기능:
 * 1. Trip별 도착 사진 목록 조회
 * 2. 사진 그리드 표시
 * 3. 이미지 확대 보기 (모달)
 * 4. 각 사진에 참여자 정보 표시
 *
 * @dependencies
 * - @/actions/trip-arrivals: getTripArrivals Server Action
 * - @/components/ui/card: 카드 컴포넌트
 * - @/components/ui/dialog: 다이얼로그 컴포넌트
 */

"use client";

import { useState, useEffect } from "react";
import { getTripArrivals } from "@/actions/trip-arrivals";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Image as ImageIcon, MapPin, Clock } from "lucide-react";
import Image from "next/image";
import { formatDateTime } from "@/lib/utils";

interface ArrivalPhoto {
  id: string;
  trip_id: string;
  pickup_request_id: string;
  photo_path: string;
  photoUrl: string | null;
  created_at: string;
  pickup_request: {
    id: string;
    pickup_time: string;
    origin_text: string;
    destination_text: string;
    status: string;
    requester_profile_id: string;
  };
}

interface ArrivalPhotoViewerProps {
  tripId: string;
}

export function ArrivalPhotoViewer({
  tripId,
}: ArrivalPhotoViewerProps) {
  const [arrivals, setArrivals] = useState<ArrivalPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ArrivalPhoto | null>(null);

  useEffect(() => {
    const fetchArrivals = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getTripArrivals(tripId);

        if (!result.success) {
          setError(result.error || "도착 사진 목록을 불러오는데 실패했습니다.");
          setIsLoading(false);
          return;
        }

        setArrivals(result.data || []);
      } catch (err) {
        console.error("도착 사진 조회 에러:", err);
        setError("예상치 못한 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchArrivals();
  }, [tripId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (arrivals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>아직 업로드된 도착 사진이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {arrivals.map((arrival) => (
          <Card
            key={arrival.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedPhoto(arrival)}
          >
            <CardContent className="p-0">
              <div className="relative w-full aspect-video rounded-t-lg overflow-hidden">
                {arrival.photoUrl ? (
                  <Image
                    src={arrival.photoUrl}
                    alt="도착 사진"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {formatDateTime(arrival.pickup_request.pickup_time)}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div>
                      <span className="text-muted-foreground">목적지:</span>
                      <span className="font-medium ml-2">
                        {arrival.pickup_request.destination_text}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  업로드: {formatDateTime(arrival.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 이미지 확대 보기 모달 */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={(open) => !open && setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>도착 사진</DialogTitle>
            <DialogDescription>
              {selectedPhoto &&
                formatDateTime(selectedPhoto.pickup_request.pickup_time)}
            </DialogDescription>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                {selectedPhoto.photoUrl ? (
                  <Image
                    src={selectedPhoto.photoUrl}
                    alt="도착 사진"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">픽업 시간:</span>
                  <span className="font-medium">
                    {formatDateTime(selectedPhoto.pickup_request.pickup_time)}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div>
                      <span className="text-muted-foreground">출발지:</span>
                      <span className="font-medium ml-2">
                        {selectedPhoto.pickup_request.origin_text}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-muted-foreground">목적지:</span>
                      <span className="font-medium ml-2">
                        {selectedPhoto.pickup_request.destination_text}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  업로드 시간: {formatDateTime(selectedPhoto.created_at)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

