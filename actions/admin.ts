"use server";

import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { AdminStats, SchoolStats, ProviderDocument } from "@/lib/types/admin";
import { revalidatePath } from "next/cache";

async function checkAdmin() {
    const { userId } = await auth();
    if (!userId) return false;

    const supabase = createClerkSupabaseClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("clerk_user_id", userId)
        .single();

    return profile?.role === 'ADMIN';
}

export async function getAdminStats(): Promise<{ success: boolean; data?: AdminStats; error?: string }> {
    try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) return { success: false, error: "관리자 권한이 없습니다." };

        const supabase = createClerkSupabaseClient();

        const [
            { count: totalUsers },
            { count: pendingDocuments },
            { count: activeTrips }
        ] = await Promise.all([
            supabase.from("profiles").select("*", { count: 'exact', head: true }),
            supabase.from("provider_documents").select("*", { count: 'exact', head: true }).eq("status", "PENDING"),
            supabase.from("trips").select("*", { count: 'exact', head: true }).eq("status", "IN_PROGRESS")
        ]);

        return {
            success: true,
            data: {
                totalUsers: totalUsers || 0,
                pendingDocuments: pendingDocuments || 0,
                activeTrips: activeTrips || 0
            }
        };
    } catch (error) {
        console.error("getAdminStats error:", error);
        return { success: false, error: "통계 조회 실패" };
    }
}

export async function getSchoolStats(): Promise<{ success: boolean; data?: SchoolStats[]; error?: string }> {
    try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) return { success: false, error: "관리자 권한이 없습니다." };

        const supabase = createClerkSupabaseClient();

        // 1. Get all profiles with school_name
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, school_name");

        if (!profiles) return { success: true, data: [] };

        // 2. Get all requests
        const { data: requests } = await supabase
            .from("pickup_requests")
            .select("requester_profile_id, status");

        // 3. Get all providers (users who created trips)
        const { data: trips } = await supabase
            .from("trips")
            .select("provider_profile_id");

        const providerIds = new Set(trips?.map(t => t.provider_profile_id));

        // Aggregation
        const statsMap = new Map<string, { requests: number; matched: number; providers: number }>();

        profiles.forEach(profile => {
            const school = profile.school_name || "미지정";
            if (!statsMap.has(school)) {
                statsMap.set(school, { requests: 0, matched: 0, providers: 0 });
            }
            const stats = statsMap.get(school)!;

            // Count providers
            if (providerIds.has(profile.id)) {
                stats.providers++;
            }

            // Count requests
            const userRequests = requests?.filter(r => r.requester_profile_id === profile.id) || [];
            stats.requests += userRequests.length;
            stats.matched += userRequests.filter(r => r.status === 'MATCHED' || r.status === 'IN_PROGRESS' || r.status === 'ARRIVED' || r.status === 'COMPLETED').length;
        });

        const result: SchoolStats[] = Array.from(statsMap.entries()).map(([schoolName, stats]) => ({
            schoolName,
            requestCount: stats.requests,
            providerCount: stats.providers,
            matchRate: stats.requests > 0 ? Math.round((stats.matched / stats.requests) * 100) : 0
        }));

        // Sort by request count desc
        result.sort((a, b) => b.requestCount - a.requestCount);

        return { success: true, data: result };

    } catch (error) {
        console.error("getSchoolStats error:", error);
        return { success: false, error: "학교 통계 조회 실패" };
    }
}

export async function getPendingDocuments(): Promise<{ success: boolean; data?: ProviderDocument[]; error?: string }> {
    try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) return { success: false, error: "관리자 권한이 없습니다." };

        const supabase = createClerkSupabaseClient();
        const { data, error } = await supabase
            .from("provider_documents")
            .select(`
                *,
                profiles:provider_profile_id (
                    school_name,
                    clerk_user_id
                )
            `)
            .eq("status", "PENDING")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return { success: true, data: data as unknown as ProviderDocument[] };
    } catch (error) {
        console.error("getPendingDocuments error:", error);
        return { success: false, error: "서류 목록 조회 실패" };
    }
}

export async function approveDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) return { success: false, error: "관리자 권한이 없습니다." };

        const supabase = createClerkSupabaseClient();
        const { error } = await supabase
            .from("provider_documents")
            .update({ status: "APPROVED", rejection_reason: null })
            .eq("id", documentId);

        if (error) throw error;

        revalidatePath("/admin/approvals");
        revalidatePath("/admin"); // Update stats

        await logAdminAction(supabase, "APPROVE_DOCUMENT", documentId, {});

        return { success: true };
    } catch (error) {
        console.error("approveDocument error:", error);
        return { success: false, error: "승인 처리 실패" };
    }
}

export async function rejectDocument(documentId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) return { success: false, error: "관리자 권한이 없습니다." };

        const supabase = createClerkSupabaseClient();
        const { error } = await supabase
            .from("provider_documents")
            .update({ status: "REJECTED", rejection_reason: reason })
            .eq("id", documentId);

        if (error) throw error;

        revalidatePath("/admin/approvals");
        revalidatePath("/admin"); // Update stats

        await logAdminAction(supabase, "REJECT_DOCUMENT", documentId, { reason });

        return { success: true };
    } catch (error) {
        console.error("rejectDocument error:", error);
        return { success: false, error: "거절 처리 실패" };
    }
}

export async function overrideTripStatus(tripId: string, newStatus: string): Promise<{ success: boolean; error?: string }> {
    try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) return { success: false, error: "관리자 권한이 없습니다." };

        const supabase = createClerkSupabaseClient();

        // 1. Update trip status
        const { error: tripError } = await supabase
            .from("trips")
            .update({
                status: newStatus,
                is_locked: newStatus !== 'OPEN', // Lock if not OPEN
                // Set timestamps based on status
                start_at: newStatus === 'IN_PROGRESS' ? new Date().toISOString() : undefined,
                arrived_at: newStatus === 'ARRIVED' ? new Date().toISOString() : undefined,
                completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
            })
            .eq("id", tripId);

        if (tripError) throw tripError;

        // 2. Update related pickup requests if needed
        // For MVP, we might want to sync request status too, but let's keep it simple for now.
        // If trip is COMPLETED, requests should probably be COMPLETED too.
        if (newStatus === 'COMPLETED' || newStatus === 'ARRIVED' || newStatus === 'IN_PROGRESS') {
            // Get participants
            const { data: participants } = await supabase
                .from("trip_participants")
                .select("pickup_request_id")
                .eq("trip_id", tripId);

            if (participants && participants.length > 0) {
                const requestIds = participants.map(p => p.pickup_request_id);
                await supabase
                    .from("pickup_requests")
                    .update({ status: newStatus }) // Request status enum matches Trip status mostly
                    .in("id", requestIds);
            }
        }

        revalidatePath(`/trips/${tripId}`);
        revalidatePath("/admin");

        // 3. Log action
        await logAdminAction(supabase, "OVERRIDE_TRIP_STATUS", tripId, {
            old_status: "UNKNOWN", // We didn't fetch it, but that's okay for MVP
            new_status: newStatus
        });

        return { success: true };
    } catch (error) {
        console.error("overrideTripStatus error:", error);
        return { success: false, error: "상태 변경 실패" };
    }
}

/**
 * Helper to log admin actions
 */
async function logAdminAction(
    supabase: any,
    actionType: string,
    targetId: string,
    details: any
) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get profile id
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("clerk_user_id", user.id)
            .single();

        if (!profile) return;

        await supabase.from("admin_logs").insert({
            admin_id: profile.id,
            action_type: actionType,
            target_id: targetId,
            details: details
        });
    } catch (e) {
        console.error("Failed to log admin action:", e);
        // Don't throw, logging failure shouldn't block action
    }
}

export async function getAdminLogs() {
    try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) return { success: false, error: "관리자 권한이 없습니다." };

        const supabase = createClerkSupabaseClient();
        const { data, error } = await supabase
            .from("admin_logs")
            .select(`
                *,
                profiles:admin_id (
                    clerk_user_id,
                    school_name
                )
            `)
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error("getAdminLogs error:", error);
        return { success: false, error: "로그 조회 실패" };
    }
}
