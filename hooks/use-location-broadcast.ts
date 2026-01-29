/**
 * @file hooks/use-location-broadcast.ts
 * @description 실시간 위치 브로드캐스트 훅
 *
 * 주요 기능:
 * 1. 제공자의 현재 위치를 2초마다 Supabase Realtime으로 브로드캐스트
 * 2. 위치 추적 시작/종료 제어
 *
 * @dependencies
 * - @supabase/supabase-js: Supabase 클라이언트
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase 클라이언트 (Realtime용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LocationData {
    lat: number;
    lng: number;
    timestamp: number;
}

interface UseLocationBroadcastReturn {
    isTracking: boolean;
    currentLocation: LocationData | null;
    error: string | null;
    startTracking: (tripId: string) => void;
    stopTracking: () => void;
}

/**
 * 위치 브로드캐스트 훅
 * 
 * 제공자가 출발하기 버튼을 누르면 위치를 2초마다 브로드캐스트
 */
export function useLocationBroadcast(): UseLocationBroadcastReturn {
    const [isTracking, setIsTracking] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const watchIdRef = useRef<number | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const tripIdRef = useRef<string | null>(null);
    const lastLocationRef = useRef<LocationData | null>(null);

    // 위치 브로드캐스트
    const broadcastLocation = useCallback((location: LocationData) => {
        if (!channelRef.current || !tripIdRef.current) return;

        channelRef.current.send({
            type: "broadcast",
            event: "location",
            payload: {
                tripId: tripIdRef.current,
                ...location,
            },
        });

        console.log("📍 위치 브로드캐스트:", location);
    }, []);

    // 위치 추적 시작
    const startTracking = useCallback((tripId: string) => {
        if (isTracking) return;

        // Geolocation API 지원 확인
        if (!navigator.geolocation) {
            setError("이 브라우저는 위치 추적을 지원하지 않습니다.");
            return;
        }

        tripIdRef.current = tripId;
        setError(null);

        // Supabase Realtime 채널 생성
        const channelName = `trip-location-${tripId}`;
        channelRef.current = supabase.channel(channelName);

        channelRef.current.subscribe((status) => {
            console.log("📡 채널 상태:", status);
        });

        // 위치 추적 시작
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const location: LocationData = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    timestamp: Date.now(),
                };
                setCurrentLocation(location);
                lastLocationRef.current = location;
            },
            (err) => {
                console.error("위치 추적 에러:", err);
                setError("위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.");
            },
            {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 5000,
            }
        );

        // 2초마다 위치 브로드캐스트
        intervalRef.current = setInterval(() => {
            if (lastLocationRef.current) {
                broadcastLocation(lastLocationRef.current);
            }
        }, 2000);

        setIsTracking(true);
        console.log("🚗 위치 추적 시작:", tripId);
    }, [isTracking, broadcastLocation]);

    // 위치 추적 종료
    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (channelRef.current) {
            // 종료 메시지 전송
            channelRef.current.send({
                type: "broadcast",
                event: "tracking_ended",
                payload: { tripId: tripIdRef.current },
            });

            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        tripIdRef.current = null;
        lastLocationRef.current = null;
        setIsTracking(false);
        setCurrentLocation(null);
        console.log("🛑 위치 추적 종료");
    }, []);

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (isTracking) {
                stopTracking();
            }
        };
    }, [isTracking, stopTracking]);

    return {
        isTracking,
        currentLocation,
        error,
        startTracking,
        stopTracking,
    };
}
