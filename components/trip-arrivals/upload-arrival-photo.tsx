/**
 * @file components/trip-arrivals/upload-arrival-photo.tsx
 * @description 도착 사진 업로드 컴포넌트
 *
 * 주요 기능:
 * 1. 파일 선택 UI
 * 2. 이미지 미리보기
 * 3. Supabase Storage에 파일 업로드
 * 4. uploadArrivalPhoto Server Action 호출 (경로 전달)
 * 5. 로딩 상태 관리 및 에러 처리
 *
 * @dependencies
 * - @/actions/trip-arrivals: uploadArrivalPhoto Server Action
 * - @/lib/supabase/clerk-client: useClerkSupabaseClient hook
 * - @/components/ui/button: 버튼 컴포넌트
 * - @/components/ui/input: 입력 컴포넌트
 */

"use client";

import { useState, useRef } from "react";
import { uploadArrivalPhoto } from "@/actions/trip-arrivals";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "uploads";

interface UploadArrivalPhotoProps {
  tripId: string;
  pickupRequestId: string;
  isAlreadyUploaded: boolean;
  existingPhotoUrl?: string | null;
}

export function UploadArrivalPhoto({
  tripId,
  pickupRequestId,
  isAlreadyUploaded,
  existingPhotoUrl,
}: UploadArrivalPhotoProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    existingPhotoUrl || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = useClerkSupabaseClient();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 크기 검증 (6MB 제한)
    const maxSize = 6 * 1024 * 1024; // 6MB
    if (file.size > maxSize) {
      setError("파일 크기는 6MB 이하여야 합니다.");
      return;
    }

    // 파일 형식 검증 (이미지만 허용)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("이미지 파일만 업로드할 수 있습니다. (JPG, PNG, WEBP)");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // 미리보기 URL 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(existingPhotoUrl || null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("파일을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Supabase Storage에 파일 업로드
      const fileExt = selectedFile.name.split(".").pop() || "jpg";
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${timestamp}-${randomStr}.${fileExt}`;
      const filePath = `trips/${tripId}/arrivals/${pickupRequestId}/${fileName}`;

      console.log("📤 Storage 업로드 시작:", filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Storage 업로드 실패:", uploadError);
        throw new Error(`파일 업로드에 실패했습니다: ${uploadError.message}`);
      }

      console.log("✅ Storage 업로드 완료:", uploadData.path);

      // 2. Server Action 호출 (경로 전달)
      const result = await uploadArrivalPhoto(tripId, pickupRequestId, filePath);

      if (!result.success) {
        // 업로드 실패 시 파일 삭제 시도
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        throw new Error(result.error || "도착 사진 업로드에 실패했습니다.");
      }

      console.log("✅ 도착 사진 업로드 완료");

      // 성공 시 페이지 새로고침
      router.refresh();
    } catch (err) {
      console.error("도착 사진 업로드 에러:", err);
      setError(
        err instanceof Error ? err.message : "예상치 못한 오류가 발생했습니다."
      );
      setIsUploading(false);
    }
  };

  if (isAlreadyUploaded && existingPhotoUrl) {
    return (
      <div className="space-y-2">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
          <Image
            src={existingPhotoUrl}
            alt="도착 사진"
            fill
            className="object-cover"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          도착 사진이 이미 업로드되었습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 파일 선택 */}
      <div className="space-y-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={isUploading || isAlreadyUploaded}
          className="cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          이미지 파일만 업로드 가능합니다. (최대 6MB)
        </p>
      </div>

      {/* 미리보기 */}
      {previewUrl && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
          <Image
            src={previewUrl}
            alt="미리보기"
            fill
            className="object-cover"
          />
          {selectedFile && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemoveFile}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* 업로드 버튼 */}
      {selectedFile && !isAlreadyUploaded && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              업로드 중...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              도착 사진 업로드
            </>
          )}
        </Button>
      )}

      {/* 에러 메시지 */}
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}

      {/* 안내 메시지 */}
      {!selectedFile && !isAlreadyUploaded && (
        <div className="text-center py-4 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">도착 사진을 선택해주세요.</p>
        </div>
      )}
    </div>
  );
}

