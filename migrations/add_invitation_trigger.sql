-- 1. Enable the pg_net extension to allow HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.on_invitation_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function
  -- Call the Edge Function
  -- IMPORTANT: Replace 'YOUR_PROJECT_REF' with your actual Supabase Project Ref
  -- You can find it in your Browser URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
  PERFORM
    net.http_post(
      url := 'https://hywoxyqwcpzagxwgusoj.functions.supabase.co/send-invitation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5d294eXF3Y3B6YWd4d2d1c29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NTAzNjYsImV4cCI6MjA4MzEyNjM2Nn0.PO6HyPJhOZ-o8y6dd-elQ_Tp2DHn7jwSEHItwsgo9OQ',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5d294eXF3Y3B6YWd4d2d1c29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NTAzNjYsImV4cCI6MjA4MzEyNjM2Nn0.PO6HyPJhOZ-o8y6dd-elQ_Tp2DHn7jwSEHItwsgo9OQ'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'family_invitations',
        'record', row_to_json(NEW),
        'schema', 'public'
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trigger_on_invitation_created ON public.family_invitations;
CREATE TRIGGER trigger_on_invitation_created
AFTER INSERT ON public.family_invitations
FOR EACH ROW
EXECUTE FUNCTION public.on_invitation_created();
