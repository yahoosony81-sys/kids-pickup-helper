import { getPendingDocuments } from "@/actions/admin";
import DocumentList from "@/components/admin/DocumentList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
    const { success, data, error } = await getPendingDocuments();

    if (!success) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>오류 발생</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">서류 승인 대기 목록</h2>
                <div className="text-sm text-muted-foreground">
                    총 {data?.length || 0}건
                </div>
            </div>

            <DocumentList documents={data || []} />
        </div>
    );
}
