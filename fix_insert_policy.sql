-- ============================================================================
-- FIX: Permitir que Admins criem perfis para outros usuários
-- ============================================================================

-- 1. Remover a policy restritiva de INSERT anterior (se existir, ou criar uma nova complementar)
-- Na verdade, vamos ADICIONAR uma permissão para Admins. 
-- Como as policies são "PERMISSIVE" (OU), basta adicionar uma nova.

DROP POLICY IF EXISTS "insert_admin_any" ON public.profiles;

CREATE POLICY "insert_admin_any"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Permite se quem está tentando inserir (auth.uid) for Admin
    get_user_role(auth.uid()) = 'Admin'
  );

-- ============================================================================
-- 2. Tentar recuperar o usuário perdido (nanizox)
-- ============================================================================
-- Se o usuário foi criado no Auth mas não no Profiles, precisamos inseri-lo manualmente.
-- Mas como não sabemos o ID gerado pelo Auth (sem acesso direto à tabela auth.users),
-- o ideal é DELETAR o usuário do AUTH e criar de novo.

-- Mas podemos tentar uma "correção de orfãos" se houvesse uma trigger, mas aqui não tem.

-- RECOMENDAÇÃO: 
-- O usuário 'nanizox@gmail.com' provavelmente ficou "corrompido" (tem login, sem perfil).
-- Tente criar de novo com OUTRO email, ou exclua o usuário pelo painel do Supabase se tiver acesso.
