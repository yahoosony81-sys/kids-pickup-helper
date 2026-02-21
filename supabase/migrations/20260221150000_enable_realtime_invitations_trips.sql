-- Enable Realtime events for invitations and trips tables
-- These are required for real-time UI updates (Trip status, invitation list, etc.)

DO $$
BEGIN
  -- Add invitations to publication
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'invitations' 
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
  END IF;

  -- Add trips to publication
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'trips' 
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
  END IF;
END $$;
