-- Migration: Add 'height' column to 'patients' table

-- Check if column exists, if not adds it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='height') THEN
        ALTER TABLE patients ADD COLUMN height numeric NULL;
    END IF;
END
$$;
