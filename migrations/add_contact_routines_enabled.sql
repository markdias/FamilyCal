-- Add routines_enabled to contacts table
ALTER TABLE contacts ADD COLUMN routines_enabled BOOLEAN DEFAULT true;

-- Update existing contacts to have routines enabled by default
UPDATE contacts SET routines_enabled = true WHERE routines_enabled IS NULL;
