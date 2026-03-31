-- Widen CPSC recall string columns to avoid varchar(255) import failures.
-- Run in Supabase SQL Editor against the main DB.
-- Safe: changes storage type only; no data loss (Postgres can cast varchar -> text).

ALTER TABLE public.recall
  ALTER COLUMN recall_number TYPE text,
  ALTER COLUMN recall_title TYPE text,
  ALTER COLUMN remedy_option TYPE text,
  ALTER COLUMN manufacturer TYPE text,
  ALTER COLUMN manufacturer_country TYPE text,
  ALTER COLUMN importer TYPE text,
  ALTER COLUMN distributor TYPE text,
  ALTER COLUMN retailer TYPE text,
  ALTER COLUMN product_name TYPE text,
  ALTER COLUMN product_type TYPE text,
  ALTER COLUMN upc TYPE text;

