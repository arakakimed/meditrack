-- ==============================================================================
-- 1. GARANTIR ADMIN (Bypass de constraints anteriores)
-- ==============================================================================
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Tenta pegar ID pelo email do super admin
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'arakaki.med@gmail.com';

  IF v_user_id IS NOT NULL THEN
    -- Inserir ou Atualizar com ROLE MINÚSCULO ('admin')
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (v_user_id, 'arakaki.med@gmail.com', 'Super Admin', 'admin')
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        name = 'Super Admin';
    
    RAISE NOTICE 'Admin garantido com sucesso para %', v_user_id;
  ELSE
    RAISE NOTICE 'EMAIL arakaki.med@gmail.com NÃO ENCONTRADO NO AUTH!';
  END IF;
END $$;
