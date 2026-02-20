-- Enable Realtime events for pickup_messages table
-- This allows clients to subscribe to INSERT/UPDATE/DELETE changes on this table

-- Check if the publication 'supabase_realtime' exists (it should by default in Supabase)
-- and add 'pickup_messages' table to it.

DO $$
BEGIN
  -- Check if the table is already in the publication
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'pickup_messages' 
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_messages;
    RAISE NOTICE 'Added pickup_messages to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'pickup_messages is already in supabase_realtime publication';
  END IF;
END $$;

-- Verify RLS policies allow reading (implied by existing setup, just a note)
-- Realtime respects RLS. Users must have SELECT permission to receive broadcasts.
