-- EXECUTE THIS IN SUPABASE SQL EDITOR
-- Migration: add_historical_doses_support

-- Adicionar coluna de data de aplicação customizada
ALTER TABLE injections ADD COLUMN IF NOT EXISTS application_date DATE;

-- Para registros existentes, usar a data de criação
UPDATE injections SET application_date = DATE(created_at) WHERE application_date IS NULL;

-- Adicionar coluna de valor da dose (para cálculo financeiro)
ALTER TABLE injections ADD COLUMN IF NOT EXISTS dose_value DECIMAL(10,2) DEFAULT 0;

-- Adicionar coluna is_historical para marcar doses inseridas retroativamente
ALTER TABLE injections ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT false;
