-- =============================================================
-- Expense Tracker — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New query
-- =============================================================

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL,
  merchant      TEXT NOT NULL,
  amount        NUMERIC(10, 2) NOT NULL,
  category      TEXT NOT NULL,
  is_business   BOOLEAN NOT NULL DEFAULT FALSE,
  notes         TEXT,
  source_type   TEXT CHECK (source_type IN ('receipt', 'statement', 'manual')) DEFAULT 'manual',
  image_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common filter patterns
CREATE INDEX IF NOT EXISTS expenses_date_idx      ON expenses (date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx  ON expenses (category);
CREATE INDEX IF NOT EXISTS expenses_is_business_idx ON expenses (is_business);

-- Row Level Security (RLS)
-- For a personal single-user app you can either:
--   A) Disable RLS entirely (simpler, fine for personal use with anon key kept private)
--   B) Enable RLS + anon select/insert/update/delete (below)
-- Option B is safer even for personal use:

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated AND anonymous users
-- (since this is a single-user personal app with no auth layer yet)
-- If you add Supabase Auth later, change 'anon' to 'authenticated'
CREATE POLICY "allow_all_for_anon" ON expenses
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- =============================================================
-- Storage bucket for receipt images
-- Run this OR create the bucket manually in the Supabase dashboard
-- Dashboard → Storage → New bucket → name: "expense-receipts" → Public
-- =============================================================

-- If you prefer SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow anon uploads and reads
CREATE POLICY "allow_anon_upload" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'expense-receipts');

CREATE POLICY "allow_anon_read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'expense-receipts');

CREATE POLICY "allow_anon_delete" ON storage.objects
  FOR DELETE TO anon
  USING (bucket_id = 'expense-receipts');
