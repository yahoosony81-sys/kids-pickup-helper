
-- 1. Enable Realtime for pickup_requests table (if not already enabled)
begin;
  alter publication supabase_realtime add table pickup_requests;
commit;

-- 2. Clean up potentially incorrect policies
-- Note: 'if exists' prevents errors if the policy wasn't created
drop policy if exists "Users can view their own pickup requests" on pickup_requests;
drop policy if exists "Individuals can view their own pickup requests" on pickup_requests;

-- 3. Create Correct RLS Policy via profiles join
-- Allow users to SELECT pickup_requests if they own the linked profile
create policy "Users can view their own pickup requests"
on pickup_requests for select
using (
  requester_profile_id in (
    select id from profiles where clerk_user_id = auth.uid()
  )
);

-- 4. Ensure profiles table is readable by the user themselves
-- (Assuming profiles table already has a policy, but just in case)
drop policy if exists "Users can view their own profile" on profiles;

create policy "Users can view their own profile"
on profiles for select
using ( clerk_user_id = auth.uid() );
