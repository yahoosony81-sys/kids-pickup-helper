/**
 * @file hooks/use-location-subscribe.ts
 * @description 실시간 위치 구독 훅
 *
 * 주요 기능:
 * 1. 요청자가 제공자의 위치를 실시간으로 구독
 * 2. 위치 업데이트 시 콜백 호출
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
    tripId?: string;
}

interface UseLocationSubscribeReturn {
    isSubscribed: boolean;
    currentLocation: LocationData | null;
    isTrackingEnded: boolean;
    subscribe: (tripId: string) => void;
    unsubscribe: () => void;
}

/**
 * 위치 구독 훅
 * 
 * 요청자가 제공자의 실시간 위치를 받아 지도에 표시
 */
export function useLocationSubscribe(): UseLocationSubscribeReturn {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
    const [isTrackingEnded, setIsTrackingEnded] = useState(false);

    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // 구독 시작
    const subscribe = useCallback((tripId: string) => {
        if (isSubscribed) return;

        const channelName = `trip-location-${tripId}`;
        channelRef.current = supabase.channel(channelName);

        channelRef.current
            .on("broadcast", { event: "location" }, (payload) => {
                console.log("📍 위치 수신:", payload.payload);
                setCurrentLocation(payload.payload as LocationData);
                setIsTrackingEnded(false);
            })
            .on("broadcast", { event: "tracking_ended" }, () => {
                console.log("🛑 추적 종료 수신");
                setIsTrackingEnded(true);
            })
            .subscribe((status) => {
                console.log("📡 구독 상태:", status);
                if (status === "SUBSCRIBED") {
                    setIsSubscribed(true);
                }
            });

        console.log("👀 위치 구독 시작:", tripId);
    }, [isSubscribed]);

    // 구독 해제
    const unsubscribe = useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        setIsSubscribed(false);
        setCurrentLocation(null);
        setIsTrackingEnded(false);
        console.log("👋 위치 구독 해제");
    }, []);

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (isSubscribed) {
                unsubscribe();
            }
        };
    }, [isSubscribed, unsubscribe]);

    return {
        isSubscribed,
        currentLocation,
        isTrackingEnded,
        subscribe,
        unsubscribe,
    };
}
