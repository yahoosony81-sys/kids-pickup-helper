import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    if (!userId) {
        redirect("/");
    }

    const supabase = createClerkSupabaseClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("clerk_user_id", userId)
        .single();

    if (profile?.role !== 'ADMIN') {
        // For MVP, we redirect to home. In real app, show 403.
        redirect("/");
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">관리자 대시보드</h1>
                <div className="text-sm text-gray-500">
                    관리자 모드
                </div>
            </div>
            {children}
        </div>
    );
}
