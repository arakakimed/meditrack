-- ==============================================================================
-- FIX CHART CRASH: Permissions for 'weight_measurements'
-- ==============================================================================
-- O erro NaN ocorre porque o staff não consegue ler os pesos, retornando array vazio ou nulo.
-- Este script garante permissões completas na tabela de pesos para Staff e Admin.

-- 1. Habilitar RLS (caso não esteja)
ALTER TABLE public.weight_measurements ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas que possam estar conflitantes ou restritivas
DROP POLICY IF EXISTS "Permitir leitura para Staff e Admin" ON public.weight_measurements;
DROP POLICY IF EXISTS "Permitir inserção para Staff e Admin" ON public.weight_measurements;
DROP POLICY IF EXISTS "Permitir atualização para Staff e Admin" ON public.weight_measurements;
DROP POLICY IF EXISTS "Permitir exclusão para Staff e Admin" ON public.weight_measurements;
DROP POLICY IF EXISTS "Staff e Admin podem ver pesos" ON public.weight_measurements;

-- 3. Criar função auxiliar (se não existir) para verificar staff/admin
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

-- 4. Criar Novas Políticas (SELECT, INSERT, UPDATE, DELETE)
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

-- 5. Garantir permissões nas tabelas relacionadas que alimentam o gráfico (Injections)
ALTER TABLE public.injections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura para Staff e Admin" ON public.injections;

CREATE POLICY "Permitir leitura para Staff e Admin"
ON public.injections FOR SELECT
USING (public.is_staff_or_admin());

-- (Opcional) Grant no schema public para garantir acesso básico
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.weight_measurements TO authenticated;
GRANT ALL ON public.injections TO authenticated;
