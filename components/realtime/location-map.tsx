/**
 * @file components/realtime/location-map.tsx
 * @description 실시간 위치 표시 지도 컴포넌트
 *
 * 주요 기능:
 * 1. 카카오맵에 차량 위치 표시
 * 2. 실시간 위치 업데이트 시 마커 이동
 * 3. 차량 아이콘으로 표시
 *
 * @dependencies
 * - react-kakao-maps-sdk: 카카오맵 React 컴포넌트
 * - @/hooks/use-location-subscribe: 위치 구독 훅
 */

"use client";

import { useEffect, useState } from "react";
import { Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";
import { useLocationSubscribe } from "@/hooks/use-location-subscribe";
import { Car, Loader2 } from "lucide-react";

interface LocationMapProps {
    tripId: string;
    className?: string;
}

/**
 * 실시간 위치 표시 지도 컴포넌트
 */
export function LocationMap({ tripId, className }: LocationMapProps) {
    const [loading, error] = useKakaoLoader({
        appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY!,
    });

    const { isSubscribed, currentLocation, isTrackingEnded, subscribe, unsubscribe } =
        useLocationSubscribe();

    // 기본 위치 (서울 시청)
    const [center, setCenter] = useState({ lat: 37.5665, lng: 126.978 });

    // tripId 변경 시 구독 시작
    useEffect(() => {
        if (tripId) {
            subscribe(tripId);
        }

        return () => {
            unsubscribe();
        };
    }, [tripId, subscribe, unsubscribe]);

    // 위치 업데이트 시 지도 중심 이동
    useEffect(() => {
        if (currentLocation) {
            setCenter({ lat: currentLocation.lat, lng: currentLocation.lng });
        }
    }, [currentLocation]);

    // 로딩 중
    if (loading) {
        return (
            <div className={`flex items-center justify-center h-48 bg-gray-100 rounded-lg ${className}`}>
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-600">지도 로딩 중...</span>
            </div>
        );
    }

    // 에러
    if (error) {
        return (
            <div className={`flex items-center justify-center h-48 bg-red-50 rounded-lg ${className}`}>
                <span className="text-sm text-red-600">지도를 불러올 수 없습니다.</span>
            </div>
        );
    }

    // 추적 종료
    if (isTrackingEnded) {
        return (
            <div className={`flex items-center justify-center h-48 bg-gray-100 rounded-lg ${className}`}>
                <span className="text-sm text-gray-600">위치 추적이 종료되었습니다.</span>
            </div>
        );
    }

    // 위치 데이터 없음
    if (!currentLocation && isSubscribed) {
        return (
            <div className={`flex items-center justify-center h-48 bg-blue-50 rounded-lg ${className}`}>
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-blue-600">위치 데이터 대기 중...</span>
            </div>
        );
    }

    return (
        <div className={`rounded-lg overflow-hidden ${className}`}>
            <Map
                center={center}
                style={{ width: "100%", height: "200px" }}
                level={4}
            >
                {currentLocation && (
                    <MapMarker
                        position={{ lat: currentLocation.lat, lng: currentLocation.lng }}
                        image={{
                            src: "https://cdn-icons-png.flaticon.com/512/3097/3097144.png", // 차량 아이콘
                            size: { width: 40, height: 40 },
                            options: { offset: { x: 20, y: 20 } },
                        }}
                    />
                )}
            </Map>

            {/* 마지막 업데이트 시간 */}
            {currentLocation && (
                <div className="bg-gray-100 px-3 py-1 text-xs text-gray-500 text-center">
                    마지막 업데이트: {new Date(currentLocation.timestamp).toLocaleTimeString("ko-KR")}
                </div>
            )}
        </div>
    );
}
