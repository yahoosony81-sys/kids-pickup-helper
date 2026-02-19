
"use client";

import { useState } from "react";
import { arriveAtPickup } from "@/actions/trips";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

interface ArriveAtPickupButtonProps {
    tripId: string;
    isArrivedAtPickup: boolean; // 이미 눌렀는지 여부
}

export function ArriveAtPickupButton({
    tripId,
    isArrivedAtPickup,
}: ArriveAtPickupButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleArrive = async () => {
        try {
            setIsLoading(true);
            const result = await arriveAtPickup(tripId);
            if (!result.success) {
                alert(result.error || "처리 실패");
            } else {
                router.refresh();
            }
        } catch (error) {
            console.error(error);
            alert("오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isArrivedAtPickup) {
        return (
            <Button variant="outline" className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800" disabled>
                <MapPin className="mr-2 h-4 w-4" />
                픽업장소 도착 완료
            </Button>
        );
    }

    return (
        <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleArrive}
            disabled={isLoading}
        >
            {isLoading ? "처리 중..." : (
                <>
                    <MapPin className="mr-2 h-4 w-4" />
                    픽업장소 도착
                </>
            )}
        </Button>
    );
}
