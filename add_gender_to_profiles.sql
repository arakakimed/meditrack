-- ============================================================================
-- ADD GENDER TO PROFILES
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Male', 'Female'));

-- Update existing profiles (optional default)
-- UPDATE public.profiles SET gender = 'Male' WHERE gender IS NULL;
