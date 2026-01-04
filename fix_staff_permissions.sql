-- ==============================================================================
-- SCRIPT DE CORREÇÃO DE PERMISSÕES (RLS) - MEDITRACK
-- Habilita acesso total (Select, Insert, Update, Delete) para Staff e Admin
-- nas tabelas clínicas essenciais.
-- ==============================================================================

-- 1. Criação/Verificação da função helper de segurança (caso não exista)
-- Esta função verifica se o usuário atual tem role 'admin' ou 'staff' na tabela profiles.
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. Tabela: weight_measurements (Histórico de Peso)
-- ==============================================================================
ALTER TABLE public.weight_measurements ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Staff e Admin podem ver pesos" ON public.weight_measurements;
DROP POLICY IF EXISTS "Staff e Admin podem inserir pesos" ON public.weight_measurements;
DROP POLICY IF EXISTS "Staff e Admin podem atualizar pesos" ON public.weight_measurements;
DROP POLICY IF EXISTS "Staff e Admin podem deletar pesos" ON public.weight_measurements;

-- Criar novas políticas abrangentes
CREATE POLICY "Permitir leitura para Staff e Admin"
ON public.weight_measurements FOR SELECT
USING (public.is_staff_or_admin());

CREATE POLICY "Permitir inserção para Staff e Admin"
ON public.weight_measurements FOR INSERT
WITH CHECK (public.is_staff_or_admin());

CREATE POLICY "Permitir atualização para Staff e Admin"
ON public.weight_measurements FOR UPDATE
USING (public.is_staff_or_admin());

CREATE POLICY "Permitir exclusão para Staff e Admin"
ON public.weight_measurements FOR DELETE
USING (public.is_staff_or_admin());


-- ==============================================================================
-- 3. Tabela: injections (Histórico de Aplicações e Doses)
-- ==============================================================================
ALTER TABLE public.injections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura para Staff e Admin" ON public.injections;
DROP POLICY IF EXISTS "Permitir inserção para Staff e Admin" ON public.injections;
DROP POLICY IF EXISTS "Permitir atualização para Staff e Admin" ON public.injections;
DROP POLICY IF EXISTS "Permitir exclusão para Staff e Admin" ON public.injections;
-- ... e quaisquer outras variações de nome

CREATE POLICY "Permitir leitura para Staff e Admin"
ON public.injections FOR SELECT
USING (public.is_staff_or_admin());

CREATE POLICY "Permitir inserção para Staff e Admin"
ON public.injections FOR INSERT
WITH CHECK (public.is_staff_or_admin());

CREATE POLICY "Permitir atualização para Staff e Admin"
ON public.injections FOR UPDATE
USING (public.is_staff_or_admin());

CREATE POLICY "Permitir exclusão para Staff e Admin"
ON public.injections FOR DELETE
USING (public.is_staff_or_admin());


-- ==============================================================================
-- 4. Tabela: medication_steps (Jornada/Planejamento de Doses)
-- ==============================================================================
ALTER TABLE public.medication_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura para Staff e Admin" ON public.medication_steps;
DROP POLICY IF EXISTS "Permitir inserção para Staff e Admin" ON public.medication_steps;
DROP POLICY IF EXISTS "Permitir atualização para Staff e Admin" ON public.medication_steps;
DROP POLICY IF EXISTS "Permitir exclusão para Staff e Admin" ON public.medication_steps;

CREATE POLICY "Permitir leitura para Staff e Admin"
ON public.medication_steps FOR SELECT
USING (public.is_staff_or_admin());

CREATE POLICY "Permitir inserção para Staff e Admin"
ON public.medication_steps FOR INSERT
WITH CHECK (public.is_staff_or_admin());

CREATE POLICY "Permitir atualização para Staff e Admin"
ON public.medication_steps FOR UPDATE
USING (public.is_staff_or_admin());

CREATE POLICY "Permitir exclusão para Staff e Admin"
ON public.medication_steps FOR DELETE
USING (public.is_staff_or_admin());


-- ==============================================================================
-- 5. Tabelas Auxiliares (Opcional, mas recomendado)
-- ==============================================================================

-- patients (Garantir que Staff veja todos)
DROP POLICY IF EXISTS "Staff e Admin veem todos pacientes" ON public.patients;
CREATE POLICY "Staff e Admin veem todos pacientes"
ON public.patients FOR SELECT
USING (public.is_staff_or_admin());
-- Nota: Patients já deve ter policies, adicionei apenas reforço de leitura.

-- clinic_tags (Tags do sistema)
ALTER TABLE public.clinic_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de tags para Staff e Admin"
ON public.clinic_tags FOR SELECT
USING (public.is_staff_or_admin());

-- profiles (Para poder checar a própria role e nomes de outros)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de perfis para Staff e Admin"
ON public.profiles FOR SELECT
USING (public.is_staff_or_admin());
