-- Create admin_logs table
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id),
    action_type TEXT NOT NULL, -- e.g., 'APPROVE_DOCUMENT', 'REJECT_DOCUMENT', 'OVERRIDE_TRIP_STATUS'
    target_id UUID, -- ID of the object being modified (document_id, trip_id, etc.)
    details JSONB, -- Additional details (e.g., rejection reason, old status -> new status)
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all logs" ON public.admin_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- Policy: Admins can insert logs (usually done via server action with service role or admin check, but good to have)
CREATE POLICY "Admins can insert logs" ON public.admin_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- Comment
COMMENT ON TABLE public.admin_logs IS 'Audit logs for administrative actions';
