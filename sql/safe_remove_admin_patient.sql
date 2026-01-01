-- ==============================================================
-- CORREÇÃO SEGURA: Remover Admin da tabela de Pacientes
-- ==============================================================

-- 1. DESVINCULAR: Remove a referência ao paciente no perfil do Admin
-- Isso previne que o CASCADE delete a conta de Admin
UPDATE public.profiles
SET patient_id = NULL
WHERE email ILIKE 'arakaki.med@gmail.com';

-- 2. LIMPEZA: Agora pode deletar o registro desnecessário na tabela patients
DELETE FROM public.patients
WHERE email ILIKE 'arakaki.med@gmail.com';

-- 3. RESTAURAÇÃO: Garante que a role do usuário seja Admin
UPDATE public.profiles
SET role = 'Admin'
WHERE email ILIKE 'arakaki.med@gmail.com';

-- (Opcional) Limpa outros Staffs que possam estar na mesma situação
UPDATE public.profiles SET patient_id = NULL WHERE role IN ('Admin', 'Staff');
DELETE FROM public.patients WHERE email IN (SELECT email FROM public.profiles WHERE role IN ('Admin', 'Staff'));
