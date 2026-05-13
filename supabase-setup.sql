-- ═══════════════════════════════════════════════════════════════
-- PRIMER Group NXT — Complete Supabase Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. CREATE TABLES ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fabrics (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  type          TEXT,
  unit          TEXT,
  cost_per_unit NUMERIC,
  supplier      TEXT,
  width         NUMERIC,
  image_preview TEXT,
  note          TEXT
);

CREATE TABLE IF NOT EXISTS accessories (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  unit          TEXT,
  cost_per_unit NUMERIC,
  supplier      TEXT,
  image_preview TEXT,
  note          TEXT
);

CREATE TABLE IF NOT EXISTS patterns (
  id              TEXT PRIMARY KEY,
  name            TEXT,
  category        TEXT,
  fabric_id       TEXT,
  fabric_per_unit NUMERIC,
  accessories     JSONB DEFAULT '[]',
  labor_cut       NUMERIC,
  labor_sew       NUMERIC,
  labor_qc        NUMERIC,
  image_preview   TEXT
);

CREATE TABLE IF NOT EXISTS print_types (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  cost_per_unit NUMERIC DEFAULT 0,
  image_preview TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  contact       TEXT DEFAULT '',
  category      TEXT DEFAULT 'Fabric',
  image_preview TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  customer       TEXT,
  pattern_id     TEXT,
  print_type_id  TEXT,
  qty            INTEGER,
  target_price   NUMERIC,
  status         TEXT,
  date           TEXT,
  due_date       TEXT,
  channel        TEXT,
  contact        TEXT,
  slots          JSONB DEFAULT '[]',
  special_notice TEXT
);

CREATE TABLE IF NOT EXISTS bills (
  id            TEXT PRIMARY KEY,
  invoice_no    TEXT,
  supplier      TEXT,
  date          TEXT,
  items         JSONB DEFAULT '[]',
  receipt_image TEXT,
  status        TEXT DEFAULT 'pending',
  paid_date     TEXT
);

CREATE TABLE IF NOT EXISTS stock (
  item_id TEXT PRIMARY KEY,
  qty     NUMERIC DEFAULT 0
);

-- ─── 2. SCREENS TABLE (new) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS screens (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  type          TEXT DEFAULT 'Silk',
  rate_a1       NUMERIC DEFAULT 0,
  rate_a2       NUMERIC DEFAULT 0,
  rate_a3       NUMERIC DEFAULT 0,
  rate_a4       NUMERIC DEFAULT 0,
  note          TEXT DEFAULT '',
  image_preview TEXT
);

-- ─── 3. ADD MISSING COLUMNS (safe to run multiple times) ─────────

ALTER TABLE patterns    ADD COLUMN IF NOT EXISTS image_preview TEXT;
ALTER TABLE patterns    ADD COLUMN IF NOT EXISTS pattern_type  TEXT;
ALTER TABLE patterns    ADD COLUMN IF NOT EXISTS materials     JSONB;
ALTER TABLE print_types ADD COLUMN IF NOT EXISTS image_preview TEXT;
ALTER TABLE suppliers   ADD COLUMN IF NOT EXISTS image_preview TEXT;
ALTER TABLE fabrics     ADD COLUMN IF NOT EXISTS color         TEXT DEFAULT '';
ALTER TABLE fabrics     ADD COLUMN IF NOT EXISTS consumption_kg NUMERIC;

-- ─── 4. GRANT PERMISSIONS ────────────────────────────────────────

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- ─── 5. ROW LEVEL SECURITY — allow all for anonymous access ──────

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fabrics','accessories','patterns','print_types','screens','suppliers','orders','bills','stock']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I', t);
    EXECUTE format(
      'CREATE POLICY allow_all ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END;
$$;
