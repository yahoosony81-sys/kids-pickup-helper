"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProviderDocument } from "@/lib/types/admin";
import { approveDocument, rejectDocument } from "@/actions/admin";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface DocumentLightboxProps {
    document: ProviderDocument | null;
    onClose: () => void;
}

export function DocumentLightbox({ document, onClose }: DocumentLightboxProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectInput, setShowRejectInput] = useState(false);
    const router = useRouter();

    if (!document) return null;

    const handleApprove = async () => {
        if (!confirm("이 서류를 승인하시겠습니까?")) return;

        setIsProcessing(true);
        const res = await approveDocument(document.id);
        if (res.success) {
            alert("승인되었습니다.");
            onClose();
            router.refresh();
        } else {
            alert(res.error || "승인 처리에 실패했습니다.");
        }
        setIsProcessing(false);
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert("거절 사유를 입력해주세요.");
            return;
        }

        if (!confirm("이 서류를 거절하시겠습니까?")) return;

        setIsProcessing(true);
        const res = await rejectDocument(document.id, rejectReason);
        if (res.success) {
            alert("거절되었습니다.");
            onClose();
            router.refresh();
        } else {
            alert(res.error || "거절 처리에 실패했습니다.");
        }
        setIsProcessing(false);
    };

    const REJECT_TEMPLATES = [
        "서류 식별 불가 (흐릿함)",
        "학교 정보 불일치",
        "유효 기간 만료",
        "필수 정보 누락",
    ];

    return (
        <Dialog open={!!document} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>서류 상세 보기</DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex gap-4 min-h-0">
                    {/* Image Viewer */}
                    <div className="flex-1 relative bg-black/5 rounded-lg overflow-hidden flex items-center justify-center">
                        {/* Note: In real app, use Supabase Storage URL. Assuming file_path is a public URL or signed URL for now. 
                If file_path is just a path, we need to generate a signed URL in the server action.
                For MVP, let's assume we can display it if it's a valid URL, or show a placeholder.
             */}
                        {/* MVP: Displaying placeholder or actual image if URL is valid */}
                        <div className="relative w-full h-full">
                            <Image
                                src={document.file_path.startsWith('http') ? document.file_path : '/placeholder-document.png'}
                                alt="Document"
                                fill
                                className="object-contain"
                                unoptimized // For external URLs
                            />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="w-80 flex flex-col gap-4 overflow-y-auto p-1">
                        <div className="space-y-2">
                            <h3 className="font-semibold">제출자 정보</h3>
                            <div className="text-sm text-muted-foreground">
                                <p>User ID: {document.profiles?.clerk_user_id}</p>
                                <p>학교: {document.profiles?.school_name || "미지정"}</p>
                                <p>제출일: {new Date(document.created_at).toLocaleDateString()}</p>
                                <p>유형: {document.document_type}</p>
                            </div>
                        </div>

                        <div className="flex-1"></div>

                        {!showRejectInput ? (
                            <div className="flex flex-col gap-2">
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={handleApprove}
                                    disabled={isProcessing}
                                >
                                    승인하기
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => setShowRejectInput(true)}
                                    disabled={isProcessing}
                                >
                                    거절하기
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 border-t pt-4">
                                <h4 className="font-medium">거절 사유 입력</h4>
                                <div className="flex flex-wrap gap-2">
                                    {REJECT_TEMPLATES.map((template) => (
                                        <Button
                                            key={template}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => setRejectReason(template)}
                                        >
                                            {template}
                                        </Button>
                                    ))}
                                </div>
                                <Textarea
                                    placeholder="거절 사유를 입력하세요..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="min-h-[100px]"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowRejectInput(false)}
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={handleReject}
                                        disabled={isProcessing}
                                    >
                                        거절 확정
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
