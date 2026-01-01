-- =====================================================
-- MEDITRACK - FLUXO DE CADASTRO COM APROVAÇÃO
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. ADICIONAR COLUNAS NECESSÁRIAS NA TABELA PATIENTS
-- =====================================================

-- Adiciona coluna de status do cadastro se não existir
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Adiciona coluna de telefone se não existir
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Adiciona coluna de CPF se não existir
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Garante que access_granted existe
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS access_granted BOOLEAN DEFAULT false;

-- Adiciona data de solicitação
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();

-- Adiciona data de aprovação
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. POLÍTICAS RLS PARA O FLUXO DE CADASTRO
-- =====================================================

-- Habilita RLS na tabela patients (se ainda não estiver)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "Pacientes podem inserir seu próprio registro" ON public.patients;
DROP POLICY IF EXISTS "Pacientes podem ver apenas seus dados aprovados" ON public.patients;
DROP POLICY IF EXISTS "Admins podem ver todos os pacientes" ON public.patients;
DROP POLICY IF EXISTS "Admins podem atualizar pacientes" ON public.patients;
DROP POLICY IF EXISTS "Admins podem deletar pacientes" ON public.patients;

-- Permite que qualquer usuário autenticado INSIRA seu próprio registro (pré-cadastro)
CREATE POLICY "Pacientes podem inserir seu próprio registro"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- Pacientes só podem VER seus dados se estiverem aprovados
CREATE POLICY "Pacientes podem ver apenas seus dados aprovados"
ON public.patients
FOR SELECT
TO authenticated
USING (
    -- Paciente pode ver seu próprio registro se aprovado
    (user_id = auth.uid() AND access_granted = true)
    OR
    -- OU se for admin (verificar na tabela profiles)
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'Admin'
    )
);

-- Admins podem atualizar qualquer paciente
CREATE POLICY "Admins podem atualizar pacientes"
ON public.patients
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'Admin'
    )
);

-- Admins podem deletar pacientes
CREATE POLICY "Admins podem deletar pacientes"
ON public.patients
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'Admin'
    )
);

-- 3. FUNÇÃO PARA APROVAR PACIENTE
-- =====================================================

CREATE OR REPLACE FUNCTION approve_patient(patient_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verifica se o usuário é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'Admin'
    ) THEN
        RAISE EXCEPTION 'Apenas administradores podem aprovar pacientes';
    END IF;

    -- Atualiza o paciente
    UPDATE public.patients
    SET 
        access_granted = true,
        status = 'approved',
        approved_at = NOW()
    WHERE id = patient_id;
END;
$$;

-- 4. FUNÇÃO PARA REJEITAR E DELETAR PACIENTE
-- =====================================================

CREATE OR REPLACE FUNCTION reject_patient(patient_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    patient_user_id UUID;
BEGIN
    -- Verifica se o usuário é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'Admin'
    ) THEN
        RAISE EXCEPTION 'Apenas administradores podem rejeitar pacientes';
    END IF;

    -- Pega o user_id do paciente
    SELECT user_id INTO patient_user_id
    FROM public.patients
    WHERE id = patient_id_param;

    -- Deleta o registro do paciente
    DELETE FROM public.patients WHERE id = patient_id_param;
    
    -- Deleta o perfil associado
    DELETE FROM public.profiles WHERE id = patient_user_id;
    
    -- Nota: Para deletar o usuário do auth.users, você precisa usar
    -- a Admin API do Supabase (não é possível via SQL direto)
END;
$$;

-- 5. VIEW PARA LISTAR PENDENTES (útil para o Admin)
-- =====================================================

CREATE OR REPLACE VIEW pending_patients AS
SELECT 
    p.id,
    p.name,
    p.email,
    p.phone,
    p.cpf,
    p.requested_at,
    p.user_id
FROM public.patients p
WHERE p.access_granted = false 
  AND p.status = 'pending'
ORDER BY p.requested_at ASC;

-- Dar permissão para admins verem a view
GRANT SELECT ON pending_patients TO authenticated;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- RESUMO:
-- 1. Pacientes podem se cadastrar (INSERT seu próprio registro)
-- 2. Pacientes só veem seus dados SE access_granted = true
-- 3. Admins veem todos os pacientes
-- 4. Admins podem aprovar/rejeitar pacientes
-- 5. View pending_patients lista os que aguardam aprovação
