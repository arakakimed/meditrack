-- ============================================================================
-- ADD GENDER COLUMN TO PROFILES TABLE
-- ============================================================================
-- OBJETIVO: Adicionar coluna 'gender' na tabela 'profiles' para permitir
-- saudações personalizadas (Dr. / Dra.) no dashboard.
-- ============================================================================

-- 1. Adicionar coluna 'gender' na tabela profiles (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'gender'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN gender text;
        
        RAISE NOTICE 'Coluna gender adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna gender já existe.';
    END IF;
END $$;

-- 2. Adicionar comentário para documentação
COMMENT ON COLUMN public.profiles.gender IS 'Gênero do usuário: male, female, ou null';

-- 3. (Opcional) Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);

-- ============================================================================
-- VERIFICAÇÃO: Execute para confirmar
-- ============================================================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'gender';
