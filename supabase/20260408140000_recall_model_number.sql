-- Add model_number to recall for better listing matching
ALTER TABLE recall
  ADD COLUMN IF NOT EXISTS model_number TEXT;
