/**
 * @file components/realtime/location-map.tsx
 * @description 실시간 위치 표시 지도 컴포넌트
 *
 * 주요 기능:
 * 1. 카카오맵에 차량 위치 표시
 * 2. 실시간 위치 업데이트 시 마커 이동
 * 3. 차량 아이콘으로 표시
 * 4. 출발지와 목적지 마커 표시
 * 5. 현재 위치에서 목적지까지의 경로 표시
 *
 * @dependencies
 * - react-kakao-maps-sdk: 카카오맵 React 컴포넌트
 * - @/hooks/use-location-subscribe: 위치 구독 훅
 */

"use client";

import { useEffect, useState } from "react";
import { Map, MapMarker, Polyline, CustomOverlayMap, useKakaoLoader } from "react-kakao-maps-sdk";
import { useLocationSubscribe } from "@/hooks/use-location-subscribe";
import { Car, Loader2 } from "lucide-react";

interface LocationMapProps {
    tripId: string;
    className?: string;
    // 출발지 정보
    originLat?: number;
    originLng?: number;
    originText?: string;
    // 목적지 정보
    destinationLat?: number;
    destinationLng?: number;
    destinationText?: string;
}

/**
 * 실시간 위치 표시 지도 컴포넌트
 */
export function LocationMap({
    tripId,
    className,
    originLat,
    originLng,
    originText,
    destinationLat,
    destinationLng,
    destinationText,
}: LocationMapProps) {
    const [loading, error] = useKakaoLoader({
        appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY!,
    });

    const { isSubscribed, currentLocation, isTrackingEnded, subscribe, unsubscribe } =
        useLocationSubscribe();

    // 기본 위치 (서울 시청)
    const [center, setCenter] = useState({ lat: 37.5665, lng: 126.978 });

    // 지도 인스턴스 저장 (동적 줌 조정용)
    const [map, setMap] = useState<kakao.maps.Map | null>(null);

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
        } else if (originLat && originLng) {
            // 현재 위치가 없으면 출발지를 중심으로
            setCenter({ lat: originLat, lng: originLng });
        }
    }, [currentLocation, originLat, originLng]);

    // 동적 줌 레벨 조정
    useEffect(() => {
        if (!map) return;

        // 차량이 없을 때: 출발지와 목적지를 모두 포함하도록 bounds 설정
        if (!currentLocation && originLat && originLng && destinationLat && destinationLng) {
            const bounds = new kakao.maps.LatLngBounds();
            bounds.extend(new kakao.maps.LatLng(originLat, originLng));
            bounds.extend(new kakao.maps.LatLng(destinationLat, destinationLng));

            // padding을 주어 마커가 화면 가장자리에 붙지 않도록
            map.setBounds(bounds, 50, 50, 50, 50);
        }
        // 차량이 이동 중일 때: 차량 위치 중심으로 부드럽게 이동
        else if (currentLocation) {
            const moveLatLon = new kakao.maps.LatLng(currentLocation.lat, currentLocation.lng);
            map.panTo(moveLatLon);

            // 적절한 줌 레벨 설정 (너무 가깝지도 멀지도 않게)
            if (map.getLevel() > 5) {
                map.setLevel(4);
            }
        }
    }, [map, currentLocation, originLat, originLng, destinationLat, destinationLng]);

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
    if (!currentLocation && isSubscribed && !originLat) {
        return (
            <div className={`flex items-center justify-center h-48 bg-blue-50 rounded-lg ${className}`}>
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-blue-600">위치 데이터 대기 중...</span>
            </div>
        );
    }

    // 경로선 좌표 배열 생성 (차량 위치 -> 목적지)
    const pathCoords = [];
    if (currentLocation && destinationLat && destinationLng) {
        pathCoords.push(
            { lat: currentLocation.lat, lng: currentLocation.lng },
            { lat: destinationLat, lng: destinationLng }
        );
    }

    return (
        <div className={`rounded-lg overflow-hidden ${className}`}>
            <Map
                center={center}
                style={{ width: "100%", height: "300px" }}
                level={5}
                onCreate={setMap}
            >
                {/* 출발지 마커 (빨간색 깃발 - 출발) */}
                {originLat && originLng && (
                    <MapMarker
                        position={{ lat: originLat, lng: originLng }}
                        image={{
                            src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png",
                            size: { width: 50, height: 45 },
                        }}
                    />
                )}

                {/* 차량 현재 위치 마커 */}
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

                {/* 목적지 마커 (파란색 깃발 - 도착) */}
                {destinationLat && destinationLng && (
                    <MapMarker
                        position={{ lat: destinationLat, lng: destinationLng }}
                        image={{
                            src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png",
                            size: { width: 50, height: 45 },
                        }}
                    />
                )}

                {/* 경로선 (차량 위치 -> 목적지) */}
                {pathCoords.length > 0 && (
                    <Polyline
                        path={pathCoords}
                        strokeWeight={5}
                        strokeColor="#3B82F6"
                        strokeOpacity={0.7}
                        strokeStyle="solid"
                    />
                )}
            </Map>

            {/* 위치 정보 표시 */}
            <div className="bg-gray-100 px-3 py-2 text-xs space-y-1">
                {originText && (
                    <div className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span className="text-gray-600">출발지:</span>
                        <span className="text-gray-800 font-medium">{originText}</span>
                    </div>
                )}
                {destinationText && (
                    <div className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="text-gray-600">목적지:</span>
                        <span className="text-gray-800 font-medium">{destinationText}</span>
                    </div>
                )}
                {currentLocation && (
                    <div className="flex items-center gap-1 text-gray-500">
                        <span>마지막 업데이트: {new Date(currentLocation.timestamp).toLocaleTimeString("ko-KR")}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
