export type AdminStats = {
    totalUsers: number;
    pendingDocuments: number;
    activeTrips: number;
};

export type SchoolStats = {
    schoolName: string;
    requestCount: number;
    providerCount: number;
    matchRate: number;
};

export type ProviderDocument = {
    id: string;
    provider_profile_id: string;
    document_type: string;
    file_path: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejection_reason?: string | null;
    created_at: string;
    updated_at: string;
    profiles?: {
        school_name: string | null;
        clerk_user_id: string;
    };
};
