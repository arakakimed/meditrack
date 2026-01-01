-- =====================================================
-- MEDITRACK - FIX: EXCLUSÃO EM CASCATA
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Remove a restrição atual que bloqueia a exclusão
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_patient_id_fkey;

-- 2. Recria a restrição com ON DELETE CASCADE
-- Isso significa: "Quando um paciente for deletado, delete também o profile vinculado"
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public.patients(id)
ON DELETE CASCADE;
