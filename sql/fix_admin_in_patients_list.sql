-- Remove registros da tabela 'patients' que pertencem a Admins ou Staff
-- para evitar que eles apareçam duplicados ou pendentes nas listas de aprovação.

-- 1. Remove baseado no ID do usuário (vínculo forte)
DELETE FROM public.patients
WHERE user_id IN (
    SELECT id FROM public.profiles
    WHERE role IN ('Admin', 'Staff')
);

-- 2. Remove baseado no E-mail (caso o user_id esteja nulo/desvinculado)
DELETE FROM public.patients
WHERE email IN (
    SELECT email FROM public.profiles
    WHERE role IN ('Admin', 'Staff')
);
