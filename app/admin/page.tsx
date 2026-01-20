import { getAdminStats, getSchoolStats } from "@/actions/admin";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { SchoolStatsTable } from "@/components/admin/SchoolStatsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
    const [adminStatsRes, schoolStatsRes] = await Promise.all([
        getAdminStats(),
        getSchoolStats(),
    ]);

    if (!adminStatsRes.success || !schoolStatsRes.success) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>오류 발생</AlertTitle>
                <AlertDescription>
                    데이터를 불러오는 중 오류가 발생했습니다.
                    <br />
                    {adminStatsRes.error || schoolStatsRes.error}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-8">
            <DashboardStats stats={adminStatsRes.data!} />
            <SchoolStatsTable stats={schoolStatsRes.data!} />
        </div>
    );
}
