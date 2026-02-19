
-- Enable Realtime for pickup_requests table
alter publication supabase_realtime add table pickup_requests;

-- Ensure RLS policy allows reading for authenticated users
-- Drop existing policies if they exist (to be safe/clean)
-- This might fail if policy doesn't exist, so usually we use DO block or just create if not exists style, 
-- but for simplicity let's just create a new permissive policy for now or check if we can list them.

-- Actually, better to just ensuring the table is in the publication.
-- And make sure the policy allows SELECT for the requester.

-- Policy for Requester to view their own requests
create policy "Individuals can view their own pickup requests"
on pickup_requests for select
using ( auth.uid() = requester_profile_id );

-- Policy for Provider to view requests they are matched with (via trip_participants or similar)
-- This is more complex, but for now let's ensure the Requester can see it.
