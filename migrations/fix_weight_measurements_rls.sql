-- ==============================================================================
-- CORREÇÃO DE ERRO DE PERMISSÃO (RLS) AO SALVAR PESO
-- Execute este script no Editor SQL do Supabase para corrigir o erro "new row violates row-level security policy"
-- ==============================================================================

-- 1. Habilitar RLS na tabela (garantia)
ALTER TABLE weight_measurements ENABLE ROW LEVEL SECURITY;

-- REMOVER POLÍTICAS ANTIGAS (PARA EVITAR ERRO "ALREADY EXISTS")
DROP POLICY IF EXISTS "Allow Admin and Staff Full Access" ON weight_measurements;
DROP POLICY IF EXISTS "Allow Patients Manage Own Data" ON weight_measurements;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON weight_measurements;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON weight_measurements;

-- 2. Política para permitir que Admins e Staff tenham acesso total
CREATE POLICY "Allow Admin and Staff Full Access" ON weight_measurements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Staff')
  )
);

-- 3. Política para permitir que PACIENTES gerenciem SEUS PRÓPRIOS pesos
-- Assume que weight_measurements.patient_id é igual ao ID do usuário logado (auth.uid())
-- Faz o cast de auth.uid() para text para evitar erro de tipo (uuid vs text)
CREATE POLICY "Allow Patients Manage Own Data" ON weight_measurements
FOR ALL
USING ( patient_id = auth.uid()::text )
WITH CHECK ( patient_id = auth.uid()::text );

-- 4. Permitir leitura para todos (backup/fallback, pode ser removido se as acima cobrirem tudo)
-- CREATE POLICY "Enable read access for authenticated users" ON weight_measurements
-- FOR SELECT
-- USING (auth.role() = 'authenticated');
