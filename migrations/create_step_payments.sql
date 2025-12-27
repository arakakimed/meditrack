-- EXECUTE THIS IN SUPABASE SQL EDITOR
-- Migration: create_step_payments_table

-- Create table for step payments
CREATE TABLE IF NOT EXISTS step_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES medication_steps(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    value DECIMAL(10,2) DEFAULT 0,
    pix_account TEXT,
    notes TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index to ensure one payment per step
CREATE UNIQUE INDEX IF NOT EXISTS idx_step_payments_step_id ON step_payments(step_id);

-- Enable RLS
ALTER TABLE step_payments ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can manage their own step payments" ON step_payments
    FOR ALL USING (auth.uid() = user_id);
