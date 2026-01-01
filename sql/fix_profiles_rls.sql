-- =======================================================
-- FIX: PERMISSÕES DE ACESSO (RLS) PARA PROFILES
-- Execute isso para corrigir a lista "Gerenciamento de Usuários" vazia
-- =======================================================

-- 1. Garante que RLS está ativo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. LEITURA (SELECT): Permite que qualquer usuário logado veja a lista
-- Isso fará o Admin aparecer na lista novamente
DROP POLICY IF EXISTS "Allow all authenticated to select" ON public.profiles;
CREATE POLICY "Allow all authenticated to select" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- 3. EDIÇÃO (UPDATE): Usuários editam a si mesmos
DROP POLICY IF EXISTS "Users can edit own profile" ON public.profiles;
CREATE POLICY "Users can edit own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 4. INSERÇÃO (INSERT): Necessário para novos cadastros
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- 5. EXCLUSÃO (DELETE): Admins podem deletar (simplificado para users deletarem a si mesmos por enquanto)
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (auth.uid() = id);
