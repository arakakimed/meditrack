-- EXECUTE THIS IN SUPABASE SQL EDITOR
-- Migration: add_dose_packages_column

-- Add column for dose packages (JSON array with dosage and price)
ALTER TABLE medications ADD COLUMN IF NOT EXISTS dose_packages JSONB;

-- Comment for documentation
COMMENT ON COLUMN medications.dose_packages IS 'Array de pacotes com doses padronizadas e seus preços fixos';

-- Example of dose_packages structure:
-- [
--   {"dosage": 2.5, "price": 150.00, "enabled": true},
--   {"dosage": 5.0, "price": 280.00, "enabled": true},
--   {"dosage": 7.5, "price": 400.00, "enabled": true}
-- ]
