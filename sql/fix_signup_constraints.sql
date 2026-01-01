-- =====================================================
-- MEDITRACK - FIX: PERMITIR CADASTRO SEM IDADE
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. TORNAR COLUNA AGE OPCIONAL (NULLABLE)
ALTER TABLE public.patients ALTER COLUMN age DROP NOT NULL;

-- 2. TORNAR OUTRAS COLUNAS OPCIONAIS QUE PODEM BLOQUEAR O CADASTRO
ALTER TABLE public.patients ALTER COLUMN gender DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN current_weight DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN initial_weight DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN target_weight DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN height DROP NOT NULL;

-- 3. ADICIONAR COLUNAS PARA O FLUXO DE APROVAÇÃO (SE NÃO EXISTIREM)
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' 
CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 4. GARANTIR QUE ACCESS_GRANTED TEM DEFAULT
ALTER TABLE public.patients 
ALTER COLUMN access_granted SET DEFAULT false;

-- 5. POLÍTICAS RLS (Se necessário)
-- Habilita RLS na tabela patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Remove políticas existentes para recriar
DROP POLICY IF EXISTS "Permitir insert para usuarios autenticados" ON public.patients;
DROP POLICY IF EXISTS "Permitir select para usuarios autenticados" ON public.patients;
DROP POLICY IF EXISTS "Permitir update para usuarios autenticados" ON public.patients;
DROP POLICY IF EXISTS "Permitir delete para usuarios autenticados" ON public.patients;

-- Política simples: usuários autenticados podem fazer tudo
-- (Para produção, refine baseado em roles)
CREATE POLICY "Permitir insert para usuarios autenticados"
ON public.patients FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir select para usuarios autenticados"
ON public.patients FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Permitir update para usuarios autenticados"
ON public.patients FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Permitir delete para usuarios autenticados"
ON public.patients FOR DELETE TO authenticated
USING (true);

-- =====================================================
-- FIM - Execute e teste o cadastro novamente
-- =====================================================
