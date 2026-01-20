"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { overrideTripStatus } from "@/actions/admin";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface AdminTripControlsProps {
    tripId: string;
    currentStatus: string;
}

export function AdminTripControls({ tripId, currentStatus }: AdminTripControlsProps) {
    const [status, setStatus] = useState(currentStatus);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleStatusChange = async () => {
        if (status === currentStatus) return;
        if (!confirm(`관리자 권한으로 상태를 '${status}'(으)로 변경하시겠습니까?`)) return;

        setIsLoading(true);
        const res = await overrideTripStatus(tripId, status);

        if (res.success) {
            alert("상태가 변경되었습니다.");
            router.refresh();
        } else {
            alert(res.error || "상태 변경 실패");
        }
        setIsLoading(false);
    };

    const STATUS_OPTIONS = [
        { value: "OPEN", label: "OPEN (모집중)" },
        { value: "LOCKED", label: "LOCKED (마감)" },
        { value: "IN_PROGRESS", label: "IN_PROGRESS (운행중)" },
        { value: "ARRIVED", label: "ARRIVED (도착)" },
        { value: "COMPLETED", label: "COMPLETED (완료)" },
        { value: "CANCELLED", label: "CANCELLED (취소)" },
        { value: "EXPIRED", label: "EXPIRED (만료)" },
    ];

    return (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-bold text-red-800 mr-2">관리자 비상 제어:</div>
            <Select value={status} onValueChange={setStatus} disabled={isLoading}>
                <SelectTrigger className="w-[180px] h-8 bg-white">
                    <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button
                size="sm"
                variant="destructive"
                onClick={handleStatusChange}
                disabled={isLoading || status === currentStatus}
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "변경 적용"}
            </Button>
        </div>
    );
}
