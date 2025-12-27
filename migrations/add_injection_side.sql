-- EXECUTE THIS IN SUPABASE SQL EDITOR
-- Migration: add_injection_side_column

-- Add column for injection side (Left/Right)
ALTER TABLE injections ADD COLUMN IF NOT EXISTS injection_side TEXT;

-- Comment for documentation
COMMENT ON COLUMN injections.injection_side IS 'Lado da aplicação: Esquerdo ou Direito';
