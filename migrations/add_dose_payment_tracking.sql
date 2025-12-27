-- EXECUTE THIS IN SUPABASE SQL EDITOR
-- Migration: add_dose_payment_tracking

-- Add column to track payment status per injection
ALTER TABLE injections ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN injections.is_paid IS 'Indica se esta dose foi paga pelo paciente';

-- Update existing records: if dose_value > 0, consider it paid (optional)
-- Uncomment the line below if you want to auto-mark existing records with values as paid
-- UPDATE injections SET is_paid = true WHERE dose_value > 0;
