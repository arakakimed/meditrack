-- =========================================================
-- LIMPEZA FINAL SUPER ADMIN (force delete)
-- Execute para remover qualquer vestígio do admin na tabela patients
-- =========================================================

-- 1. Garante que o profile original está correto e DESVINCULADO
UPDATE public.profiles
SET role = 'Admin', patient_id = NULL
WHERE email ILIKE 'arakaki.med@gmail.com';

-- 2. Apaga qualquer registro na tabela patients com este email
-- Devido ao passo 1, o profile não será afetado pelo Delete Cascade
DELETE FROM public.patients 
WHERE email ILIKE 'arakaki.med@gmail.com';

-- 3. Confirmação
SELECT * FROM public.patients WHERE email ILIKE 'arakaki.med@gmail.com';
-- Resultado deve ser vazio
