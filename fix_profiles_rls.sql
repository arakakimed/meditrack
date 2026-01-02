
-- CORREÇÃO DE RLS PARA TABELA PROFILES
-- Este comando garante que todo usuário autenticado consiga ler APENAS sua própria linha na tabela profiles.

-- 1. Habilitar RLS na tabela (garantia)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
-- (Opcional) Remover políticas genéricas que podem estar bloqueando
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 3. Criar Política de LEITURA (SELECT)
-- Permite que o usuário veja a linha onde o ID é igual ao seu UID de autenticação
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING ( auth.uid() = id );

-- 4. Criar Política de ATUALIZAÇÃO (UPDATE)
-- Permite que o usuário edite seus próprios dados (ex: avatar, nome)
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING ( auth.uid() = id );

-- 5. Criar Política de INSERÇÃO (INSERT)
-- Necessário para o primeiro login/cadastro (gatilho de criação de usuário)
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK ( auth.uid() = id );

-- 6. Garantir acesso para ADMINS (Opcional, mas recomendado)
-- Se você tiver uma coluna 'role' definindo admins, pode criar uma policy global para eles:
-- CREATE POLICY "Admins can view all profiles"
-- ON public.profiles
-- FOR ALL
-- USING (auth.jwt() ->> 'role' = 'service_role'); 
-- (Nota: Geralmente admins usam a service_role key no backend, mas se usar cliente, precisa de lógica específica)
