-- =======================================================
-- FIX PERMISSÕES (IDEMPOTENTE)
-- Pode rodar quantas vezes quiser.
-- =======================================================

-- 1. TABELA PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas (nomes variados que usamos antes)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow all authenticated to select" ON public.profiles;
DROP POLICY IF EXISTS "Allow all authenticated to select profiles" ON public.profiles; -- CORREÇÃO DO ERRO

-- 1.1 LEITURA
CREATE POLICY "Allow all authenticated to select profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- 1.2 INSERÇÃO (USERS)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- 1.3 INSERÇÃO (ADMINS) - CRÍTICO PARA O ADDUSERMODAL
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
CREATE POLICY "Admins can insert any profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- 1.4 ATUALIZAÇÃO (USERS)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 1.5 ATUALIZAÇÃO (ADMINS)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- 1.6 EXCLUSÃO (ADMINS)
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
);


-- 2. TABELA PATIENTS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Limpeza
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.patients;
DROP POLICY IF EXISTS "Allow select for authenticated patients" ON public.patients;
DROP POLICY IF EXISTS "Allow full access for Staff and Admin" ON public.patients;
DROP POLICY IF EXISTS "Allow full access for Staff and Admin patients" ON public.patients;

-- 2.1 LEITURA
CREATE POLICY "Allow select for authenticated patients" 
ON public.patients FOR SELECT 
TO authenticated 
USING (true);

-- 2.2 GESTÃO TOTAL (ADMIN/STAFF)
CREATE POLICY "Allow full access for Staff and Admin patients" 
ON public.patients FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Staff')
  )
);
