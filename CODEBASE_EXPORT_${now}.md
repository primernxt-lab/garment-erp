# PRIMER Group NXT — Complete Codebase Export
# Generated: 2026-05-07
# App.jsx: 4982 lines | db.js: 253 lines
# Supabase URL: https://rlxgvrvmqvezsxjmegtv.supabase.co (key redacted)
# ═══════════════════════════════════════════════════════════════

## PROJECT STRUCTURE
garment-erp/
├── src/
│   ├── App.jsx          — Main React app (~4,982 lines, single-file architecture)
│   ├── db.js            — Supabase DB layer (upsert/delete/load)
│   ├── supabase.js      — Supabase client (key redacted in this export)
│   ├── main.jsx         — React entry point
│   └── items_v3.json    — 1,498 PRIMER SKUs (static, ~906KB)
├── supabase-setup.sql   — Full DB schema + RLS setup
├── package.json
└── vite.config.js

## TECH STACK
- React 18 + Vite 4
- @supabase/supabase-js ^2.105.1
- xlsx ^0.18.5 (lazy-loaded on import)
- Inline styles only (no Tailwind, no CSS files)
- Dark theme: C object (C.bg, C.card, C.border, C.accent, etc.)
- Single-file app architecture (src/App.jsx)

## MODULES (in order in App.jsx)
1. MASTER DATA (MasterModule) — Fabrics, Accessories, Pattern, Print/EMB, Supplier, Cost Rates
2. ORDER MODULE (OrderModule) — Create/Edit orders, Product slots, Pattern picker, SKU search
3. BOM MODULE (BOMModule) — Materials BOM, Purchase Bills, Price Compare
4. INVENTORY MODULE (InventoryModule) — Stock table, Low stock alerts, Adjust modal
5. COSTING MODULE (CostingModule) — Cost breakdown, Pricing calculator
6. REPORTS MODULE (ReportModule) — Quotation, Production sheet, BOM report, Cost report
7. ITEM MASTER MODULE (ItemMasterModule) — 1,498 PRIMER SKUs display
8. IMPORT MODULE (ImportModule) — Multi-sheet Excel import
9. DASHBOARD MODULE (DashboardModule) — KPIs, charts, pipeline
10. App root — Nav, data loading, Supabase sync

## KEY DATA MODELS

### Pattern (Supabase: patterns table)
{ id, name, category, patternType, fabricId, fabricPerUnit,
  accessories: [{accId, qtyPerUnit}],
  laborCut, laborSew, laborQC, imagePreview }

### Order (Supabase: orders table)
{ id, customer, patternId, printTypeId, qty, targetPrice,
  status, date, dueDate, channel, contact, specialNotice,
  slots: [_meta, ...productSlots] }
  — slots[0] = _meta pricing object (includes skuRef, priority, referenceLink)
  — slots[1..] = { id, qty, color, size, note, imagePreview, printTypeId, patternId }

### Slot _meta object (stored in slots[0])
{ _meta:true, targetPrice, priority, referenceLink, skuRef }

### PRIMER_ITEMS_V3 SKU fields
{ code, newSku, gender, ptNumber, fabricType, color, group,
  name, cost, factoryPrice, sellPrice, customer, type }

## COLOR THEME
const C = {
  bg: '#080d18', card: '#0d1526', border: '#1a2540',
  accent: '#e8a020', accent2: '#3b82f6', ok: '#10b981', err: '#ef4444',
  text: '#dde4f0', muted: '#4a5980', sub: '#8393b0',
};

## PATTERN_TYPES ARRAY
['T-Shirt','Polo Shirt','Shirt','Pants','Shorts','Jacket','Dress','Skirt','Other']

## RECENT FEATURES ADDED (this session)
1. Pattern Selector in Order Info tab:
   - Type pill filter (T-Shirt, Polo, etc.) → scrollable card list (max-h 280px)
   - Search input for pattern name
   - Each card shows: name, patternType, fabric name+unit, labor costs, accessories chips

2. Per-slot Pattern Picker (ProductSlot):
   - Each ProductSlot has its own independent pattern picker
   - When slot has patternId → green chip showing pattern name + fabric + labor
   - When no patternId → mini picker (type pills + search + scrollable cards, max-h 160px)
   - 'เปลี่ยน' button to reset

3. Order-level Pattern banner in each ProductSlot:
   - Blue info bar showing the order's selected pattern + master data
   - Only shown if order has a patternId set

4. SKU Reference field in Order Info tab:
   - AutocompleteInput searching 1,498 PRIMER_ITEMS_V3 items
   - Shows badge with: name, newSku, PT code, fabricType, gender, cost/factoryPrice/sellPrice
   - Saved in slots[0]._meta.skuRef (persisted to Supabase via JSONB)

5. Bilingual (EN/TH) toggle throughout all modules

═══════════════════════════════════════════════════════════════
## FILE: package.json
═══════════════════════════════════════════════════════════════
{
  "name": "garment-erp",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.105.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0"
  }
}


═══════════════════════════════════════════════════════════════
## FILE: vite.config.js
═══════════════════════════════════════════════════════════════
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})


═══════════════════════════════════════════════════════════════
## FILE: src/supabase.js  [SECRET KEY REDACTED]
═══════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://rlxgvrvmqvezsxjmegtv.supabase.co',
  'sb_publishable_*****REDACTED*****'
);


═══════════════════════════════════════════════════════════════
## FILE: supabase-setup.sql
═══════════════════════════════════════════════════════════════
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

-- ─── 2. ADD MISSING COLUMNS (safe to run multiple times) ─────────

ALTER TABLE patterns    ADD COLUMN IF NOT EXISTS image_preview TEXT;
ALTER TABLE patterns    ADD COLUMN IF NOT EXISTS pattern_type  TEXT;
ALTER TABLE print_types ADD COLUMN IF NOT EXISTS image_preview TEXT;
ALTER TABLE suppliers   ADD COLUMN IF NOT EXISTS image_preview TEXT;

-- ─── 3. GRANT PERMISSIONS ────────────────────────────────────────

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- ─── 4. ROW LEVEL SECURITY — allow all for anonymous access ──────

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fabrics','accessories','patterns','print_types','suppliers','orders','bills','stock']
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


═══════════════════════════════════════════════════════════════
## FILE: src/db.js
═══════════════════════════════════════════════════════════════
import { supabase } from './supabase.js';

// ─── Row converters ───────────────────────────────────────────────

const fromFabric = r => ({
  id: r.id, name: r.name, type: r.type, unit: r.unit,
  costPerUnit: r.cost_per_unit, supplier: r.supplier,
  width: r.width, imagePreview: r.image_preview, note: r.note,
});
const toFabric = f => ({
  id: f.id, name: f.name, type: f.type, unit: f.unit,
  cost_per_unit: f.costPerUnit, supplier: f.supplier,
  width: f.width ?? null, image_preview: f.imagePreview ?? null, note: f.note ?? '',
});

const fromAccessory = r => ({
  id: r.id, name: r.name, unit: r.unit,
  costPerUnit: r.cost_per_unit, supplier: r.supplier,
  imagePreview: r.image_preview, note: r.note,
});
const toAccessory = a => ({
  id: a.id, name: a.name, unit: a.unit,
  cost_per_unit: a.costPerUnit, supplier: a.supplier,
  image_preview: a.imagePreview ?? null, note: a.note ?? '',
});

const fromPattern = r => ({
  id: r.id, name: r.name, category: r.category,
  patternType: r.pattern_type ?? null,
  fabricId: r.fabric_id, fabricPerUnit: r.fabric_per_unit,
  accessories: r.accessories ?? [],
  laborCut: r.labor_cut, laborSew: r.labor_sew, laborQC: r.labor_qc,
  imagePreview: r.image_preview ?? null,
});
const toPattern = p => ({
  id: p.id, name: p.name, category: p.category,
  pattern_type: p.patternType ?? null,
  fabric_id: p.fabricId, fabric_per_unit: p.fabricPerUnit,
  accessories: p.accessories ?? [],
  labor_cut: p.laborCut, labor_sew: p.laborSew, labor_qc: p.laborQC,
  image_preview: p.imagePreview ?? null,
});

const fromPrintType = r => ({
  id: r.id, name: r.name,
  costPerUnit: r.cost_per_unit,
  imagePreview: r.image_preview ?? null,
});
const toPrintType = pt => ({
  id: pt.id, name: pt.name,
  cost_per_unit: pt.costPerUnit ?? 0,
  image_preview: pt.imagePreview ?? null,
});

const fromSupplier = r => ({
  id: r.id, name: r.name, contact: r.contact,
  category: r.category, imagePreview: r.image_preview ?? null,
});
const toSupplier = s => ({
  id: s.id, name: s.name, contact: s.contact ?? '',
  category: s.category ?? 'Fabric', image_preview: s.imagePreview ?? null,
});

const fromOrder = r => ({
  id: r.id, customer: r.customer,
  patternId: r.pattern_id, printTypeId: r.print_type_id,
  qty: r.qty, targetPrice: r.target_price,
  status: r.status, date: r.date, dueDate: r.due_date,
  channel: r.channel, contact: r.contact,
  slots: r.slots ?? [], specialNotice: r.special_notice ?? '',
});
const toOrder = o => ({
  id: o.id, customer: o.customer,
  pattern_id: o.patternId, print_type_id: o.printTypeId,
  qty: o.qty, target_price: o.targetPrice ?? 0,
  status: o.status, date: o.date, due_date: o.dueDate ?? null,
  channel: o.channel ?? null, contact: o.contact ?? null,
  slots: o.slots ?? [], special_notice: o.specialNotice ?? '',
});

const fromBill = r => ({
  id: r.id, invoiceNo: r.invoice_no, supplier: r.supplier,
  date: r.date, items: r.items ?? [],
  receiptImage: r.receipt_image, status: r.status, paidDate: r.paid_date,
});
const toBill = b => ({
  id: b.id, invoice_no: b.invoiceNo ?? '', supplier: b.supplier ?? '',
  date: b.date ?? '', items: b.items ?? [],
  receipt_image: b.receiptImage ?? null, status: b.status ?? 'pending',
  paid_date: b.paidDate ?? null,
});

// ─── Connection test ──────────────────────────────────────────────

export async function testConnection() {
  console.log('[DB] Testing Supabase connection...');
  const { data, error } = await supabase.from('orders').select('count', { count: 'exact', head: true });
  if (error) {
    console.error('[DB] ❌ Connection FAILED:', error.message, error);
    return false;
  }
  console.log('[DB] ✅ Connection OK');
  return true;
}

// ─── Load all DB data ─────────────────────────────────────────────

export async function loadAllData() {
  try {
    console.log('[DB] Loading all data from Supabase...');
    const [f, a, p, pt, sup, o, b, s] = await Promise.all([
      supabase.from('fabrics').select('*'),
      supabase.from('accessories').select('*'),
      supabase.from('patterns').select('*'),
      supabase.from('print_types').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('orders').select('*'),
      supabase.from('bills').select('*'),
      supabase.from('stock').select('*'),
    ]);

    // Log any errors
    [['fabrics',f],['accessories',a],['patterns',p],['print_types',pt],['suppliers',sup],['orders',o],['bills',b],['stock',s]].forEach(([name, res]) => {
      if (res.error) console.error(`[DB] ❌ SELECT ${name}:`, res.error.message, res.error);
      else console.log(`[DB] ✅ ${name}: ${res.data?.length ?? 0} rows`);
    });

    const stock = {};
    (s.data ?? []).forEach(r => { stock[r.item_id] = r.qty; });

    return {
      fabrics:    (f.data   ?? []).map(fromFabric),
      accessories:(a.data   ?? []).map(fromAccessory),
      patterns:   (p.data   ?? []).map(fromPattern),
      printTypes: (pt.data  ?? []).map(fromPrintType),
      suppliers:  (sup.data ?? []).map(fromSupplier),
      orders:     (o.data   ?? []).map(fromOrder),
      bills:      (b.data   ?? []).map(fromBill),
      stock,
    };
  } catch (err) {
    console.error('[DB] ❌ loadAllData failed:', err);
    return null;
  }
}

// ─── Fabrics ──────────────────────────────────────────────────────

export async function upsertFabric(fabric) {
  console.log('[DB] Saving fabric:', fabric.id);
  const { error } = await supabase.from('fabrics').upsert(toFabric(fabric));
  if (error) console.error('[DB] ❌ upsertFabric:', error.message, error);
  else console.log('[DB] ✅ Fabric saved:', fabric.id);
}
export async function deleteFabric(id) {
  const { error } = await supabase.from('fabrics').delete().eq('id', id);
  if (error) console.error('[DB] ❌ deleteFabric:', error.message);
  else console.log('[DB] ✅ Fabric deleted:', id);
}

// ─── Accessories ─────────────────────────────────────────────────

export async function upsertAccessory(acc) {
  console.log('[DB] Saving accessory:', acc.id);
  const { error } = await supabase.from('accessories').upsert(toAccessory(acc));
  if (error) console.error('[DB] ❌ upsertAccessory:', error.message, error);
  else console.log('[DB] ✅ Accessory saved:', acc.id);
}
export async function deleteAccessory(id) {
  const { error } = await supabase.from('accessories').delete().eq('id', id);
  if (error) console.error('[DB] ❌ deleteAccessory:', error.message);
  else console.log('[DB] ✅ Accessory deleted:', id);
}

// ─── Suppliers ───────────────────────────────────────────────────

export async function upsertSupplier(supplier) {
  console.log('[DB] Saving supplier:', supplier.id);
  const { error } = await supabase.from('suppliers').upsert(toSupplier(supplier));
  if (error) console.error('[DB] ❌ upsertSupplier:', error.message, error);
  else console.log('[DB] ✅ Supplier saved:', supplier.id);
}
export async function deleteSupplier(id) {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) console.error('[DB] ❌ deleteSupplier:', error.message);
  else console.log('[DB] ✅ Supplier deleted:', id);
}

// ─── Print Types ─────────────────────────────────────────────────

export async function upsertPrintType(pt) {
  console.log('[DB] Saving print type:', pt.id);
  const { error } = await supabase.from('print_types').upsert(toPrintType(pt));
  if (error) console.error('[DB] ❌ upsertPrintType:', error.message, error);
  else console.log('[DB] ✅ Print type saved:', pt.id);
}
export async function deletePrintType(id) {
  const { error } = await supabase.from('print_types').delete().eq('id', id);
  if (error) console.error('[DB] ❌ deletePrintType:', error.message);
  else console.log('[DB] ✅ Print type deleted:', id);
}

// ─── Patterns (BOM) ──────────────────────────────────────────────

export async function upsertPattern(pattern) {
  console.log('[DB] Saving pattern:', pattern.id);
  const { error } = await supabase.from('patterns').upsert(toPattern(pattern));
  if (error) console.error('[DB] ❌ upsertPattern:', error.message, error);
  else console.log('[DB] ✅ Pattern saved:', pattern.id);
}
export async function deletePattern(id) {
  const { error } = await supabase.from('patterns').delete().eq('id', id);
  if (error) console.error('[DB] ❌ deletePattern:', error.message);
  else console.log('[DB] ✅ Pattern deleted:', id);
}

// ─── Orders ───────────────────────────────────────────────────────

export async function upsertOrder(order) {
  console.log('[DB] Saving order:', order.id);
  const { data, error } = await supabase.from('orders').upsert(toOrder(order)).select();
  if (error) console.error('[DB] ❌ upsertOrder:', error.message, error);
  else console.log('[DB] ✅ Order saved:', order.id, data);
}
export async function deleteOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) console.error('[DB] ❌ deleteOrder:', error.message);
  else console.log('[DB] ✅ Order deleted:', id);
}

// ─── Stock (Inventory) ───────────────────────────────────────────

export async function upsertStock(itemId, qty) {
  console.log('[DB] Saving stock:', itemId, qty);
  const { error } = await supabase.from('stock').upsert({ item_id: itemId, qty });
  if (error) console.error('[DB] ❌ upsertStock:', error.message, error);
  else console.log('[DB] ✅ Stock saved:', itemId, qty);
}

// ─── Bills ────────────────────────────────────────────────────────

export async function upsertBill(bill) {
  console.log('[DB] Saving bill:', bill.id);
  const { error } = await supabase.from('bills').upsert(toBill(bill));
  if (error) console.error('[DB] ❌ upsertBill:', error.message, error);
  else console.log('[DB] ✅ Bill saved:', bill.id);
}
export async function deleteBill(id) {
  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) console.error('[DB] ❌ deleteBill:', error.message);
  else console.log('[DB] ✅ Bill deleted:', id);
}


═══════════════════════════════════════════════════════════════
## FILE: src/App.jsx  (4982 lines)
═══════════════════════════════════════════════════════════════
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import PRIMER_ITEMS_V3 from './items_v3.json';
// xlsx loaded lazily on first import click — keeps initial bundle small
import {
  loadAllData, testConnection,
  upsertFabric, deleteFabric,
  upsertAccessory, deleteAccessory,
  upsertPrintType, deletePrintType,
  upsertPattern, deletePattern,
  upsertSupplier, deleteSupplier,
  upsertOrder, deleteOrder,
  upsertStock,
  upsertBill, deleteBill as dbDeleteBill,
} from './db.js';

// ═══════════════════════════════════════════════════════════════
// INITIAL MASTER DATA
// ═══════════════════════════════════════════════════════════════

const INIT_FABRICS = [
  { id: "F001", name: "Cotton Jersey 180gsm", type: "Knit", unit: "m", costPerUnit: 85, supplier: "S001" },
  { id: "F002", name: "Woven Poplin 100%C", type: "Woven", unit: "m", costPerUnit: 120, supplier: "S002" },
  { id: "F003", name: "Polyester Interlock", type: "Knit", unit: "m", costPerUnit: 65, supplier: "S001" },
  { id: "F004", name: "Cotton Drill", type: "Woven", unit: "m", costPerUnit: 95, supplier: "S002" },
];

const INIT_ACCESSORIES = [
  { id: "A001", name: "Button 20mm", unit: "pcs", costPerUnit: 3, supplier: "S003" },
  { id: "A002", name: "Zipper YKK 30cm", unit: "pcs", costPerUnit: 22, supplier: "S003" },
  { id: "A003", name: "Elastic Band 3cm", unit: "m", costPerUnit: 12, supplier: "S003" },
  { id: "A004", name: "Woven Label", unit: "pcs", costPerUnit: 4, supplier: "S004" },
  { id: "A005", name: "Main Label", unit: "pcs", costPerUnit: 2, supplier: "S004" },
  { id: "A006", name: "Thread Spun 40s", unit: "spool", costPerUnit: 28, supplier: "S003" },
  { id: "A007", name: "Hang Tag", unit: "set", costPerUnit: 5, supplier: "S004" },
  { id: "A008", name: "Poly Bag", unit: "pcs", costPerUnit: 3, supplier: "S004" },
];

const INIT_PATTERNS = [
  {
    id: "P001", name: "Basic T-Shirt", category: "Tops", patternType: "T-Shirt",
    fabricId: "F001", fabricPerUnit: 1.8,
    accessories: [
      { accId: "A004", qtyPerUnit: 1 }, { accId: "A005", qtyPerUnit: 1 },
      { accId: "A006", qtyPerUnit: 0.2 }, { accId: "A007", qtyPerUnit: 1 },
      { accId: "A008", qtyPerUnit: 1 },
    ],
    laborCut: 12, laborSew: 25, laborQC: 8,
  },
  {
    id: "P002", name: "Polo Shirt", category: "Tops", patternType: "Polo Shirt",
    fabricId: "F001", fabricPerUnit: 2.0,
    accessories: [
      { accId: "A001", qtyPerUnit: 3 }, { accId: "A004", qtyPerUnit: 1 },
      { accId: "A005", qtyPerUnit: 1 }, { accId: "A006", qtyPerUnit: 0.3 },
      { accId: "A007", qtyPerUnit: 1 }, { accId: "A008", qtyPerUnit: 1 },
    ],
    laborCut: 15, laborSew: 40, laborQC: 10,
  },
  {
    id: "P003", name: "Woven Shirt", category: "Tops", patternType: "Shirt",
    fabricId: "F002", fabricPerUnit: 2.4,
    accessories: [
      { accId: "A001", qtyPerUnit: 7 }, { accId: "A004", qtyPerUnit: 1 },
      { accId: "A005", qtyPerUnit: 1 }, { accId: "A006", qtyPerUnit: 0.4 },
      { accId: "A007", qtyPerUnit: 1 }, { accId: "A008", qtyPerUnit: 1 },
    ],
    laborCut: 18, laborSew: 55, laborQC: 12,
  },
  {
    id: "P004", name: "Casual Pants", category: "Bottoms", patternType: "Pants",
    fabricId: "F002", fabricPerUnit: 2.8,
    accessories: [
      { accId: "A002", qtyPerUnit: 1 }, { accId: "A001", qtyPerUnit: 1 },
      { accId: "A003", qtyPerUnit: 0.8 }, { accId: "A004", qtyPerUnit: 1 },
      { accId: "A005", qtyPerUnit: 1 }, { accId: "A006", qtyPerUnit: 0.5 },
      { accId: "A007", qtyPerUnit: 1 }, { accId: "A008", qtyPerUnit: 1 },
    ],
    laborCut: 22, laborSew: 65, laborQC: 13,
  },
  {
    id: "P005", name: "Sports Tee", category: "Tops", patternType: "T-Shirt",
    fabricId: "F003", fabricPerUnit: 1.6,
    accessories: [
      { accId: "A004", qtyPerUnit: 1 }, { accId: "A005", qtyPerUnit: 1 },
      { accId: "A006", qtyPerUnit: 0.2 }, { accId: "A008", qtyPerUnit: 1 },
    ],
    laborCut: 10, laborSew: 22, laborQC: 8,
  },
];

const INIT_PRINT_TYPES = [
  { id: "PT001", name: "None", costPerUnit: 0 },
  { id: "PT002", name: "Silk Screen (1 color)", costPerUnit: 18 },
  { id: "PT003", name: "Silk Screen (4 color)", costPerUnit: 45 },
  { id: "PT004", name: "Embroidery (small)", costPerUnit: 35 },
  { id: "PT005", name: "Embroidery (large)", costPerUnit: 75 },
  { id: "PT006", name: "Digital Print", costPerUnit: 55 },
  { id: "PT007", name: "Heat Transfer", costPerUnit: 28 },
];

const INIT_SUPPLIERS = [
  { id: "S001", name: "Thai Textile Co.", contact: "02-123-4567", category: "Fabric" },
  { id: "S002", name: "Bangkok Weaving", contact: "02-234-5678", category: "Fabric" },
  { id: "S003", name: "Trim & Findings Ltd.", contact: "02-345-6789", category: "Accessories" },
  { id: "S004", name: "Label House", contact: "02-456-7890", category: "Packaging" },
];

const INIT_COST_RATES = {
  overheadRate: 18,
  laborCutRate: 1.0,
  laborSewRate: 1.0,
  laborQCRate: 1.0,
  currency: "THB",
};

const INIT_STOCK = {
  F001: 450, F002: 220, F003: 380, F004: 150,
  A001: 2500, A002: 300, A003: 800, A004: 3000,
  A005: 3000, A006: 120, A007: 2000, A008: 2000,
};

const INIT_ORDERS = [
  { id: "SO-2401", customer: "Brand ABC", patternId: "P002", printTypeId: "PT004", qty: 500, targetPrice: 280, status: "confirmed", date: "2024-01-15" },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const fmt = (n, d = 2) => (isNaN(n) ? "0.00" : Number(n).toLocaleString("th-TH", { minimumFractionDigits: d, maximumFractionDigits: d }));
const genId = (prefix) => `${prefix}${Date.now().toString().slice(-5)}`;

function calcCost(order, patterns, fabrics, accessories, printTypes, costRates) {
  const pat = patterns.find(p => p.id === order.patternId);
  const fab = fabrics.find(f => f.id === pat?.fabricId);
  const pt = printTypes.find(p => p.id === order.printTypeId);
  if (!pat || !fab) return null;

  const fabricCost = pat.fabricPerUnit * fab.costPerUnit;
  const trimCost = pat.accessories.reduce((sum, a) => {
    const acc = accessories.find(x => x.id === a.accId);
    return sum + (acc ? acc.costPerUnit * a.qtyPerUnit : 0);
  }, 0);
  const laborCost = (pat.laborCut * costRates.laborCutRate) + (pat.laborSew * costRates.laborSewRate) + (pat.laborQC * costRates.laborQCRate);
  const printCost = pt?.costPerUnit || 0;
  const subtotal = fabricCost + trimCost + laborCost + printCost;
  const overhead = subtotal * (costRates.overheadRate / 100);
  const totalPerUnit = subtotal + overhead;

  return { fabricCost, trimCost, laborCost, printCost, overhead, subtotal, totalPerUnit, totalCost: totalPerUnit * order.qty };
}

function checkStock(order, patterns, fabrics, stock) {
  const pat = patterns.find(p => p.id === order.patternId);
  if (!pat) return [];
  const items = [];
  const fabNeeded = pat.fabricPerUnit * order.qty;
  const fabHave = stock[pat.fabricId] || 0;
  items.push({ id: pat.fabricId, name: fabrics.find(f => f.id === pat.fabricId)?.name, needed: fabNeeded, have: fabHave, ok: fabHave >= fabNeeded, unit: "m" });
  pat.accessories.forEach(a => {
    const needed = a.qtyPerUnit * order.qty;
    const have = stock[a.accId] || 0;
    items.push({ id: a.accId, name: a.accId, needed: Math.ceil(needed), have, ok: have >= needed, unit: "" });
  });
  return items;
}

// ═══════════════════════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════════════════════

const C = {
  bg: "#080d18", card: "#0d1526", border: "#1a2540",
  accent: "#e8a020", accent2: "#3b82f6", ok: "#10b981", err: "#ef4444",
  text: "#dde4f0", muted: "#4a5980", sub: "#8393b0",
};

const s = {
  input: { width: "100%", padding: "9px 12px", background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontFamily: "inherit", fontSize: 12, outline: "none", boxSizing: "border-box" },
  select: { width: "100%", padding: "9px 12px", background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontFamily: "inherit", fontSize: 12, outline: "none" },
  btn: (col = C.accent, light = false) => ({
    padding: "8px 18px", background: col, color: light ? "#fff" : "#000", border: "none",
    borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
  }),
  btnGhost: { padding: "7px 16px", background: "transparent", color: C.sub, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12 },
  th: { padding: "8px 10px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${C.border}`, background: "#060b16" },
  td: { padding: "8px 10px", fontSize: 12, color: C.text, borderBottom: `1px solid #0a1020` },
};

// ═══════════════════════════════════════════════════════════════
// BILINGUAL TRANSLATION SYSTEM
// ═══════════════════════════════════════════════════════════════

const LANG = {
  EN: {
    // App shell
    appName: "PRIMER Group NXT", appSub: "Production Management System",
    // Nav modules
    navDashboard: "📊 Dashboard",
    navItems: "📁 Item Master", navMaster: "⚙️ Master Data", navOrder: "📋 Orders",
    navBom: "📦 BOM", navInventory: "🏬 Inventory", navCosting: "💹 Costing", navReports: "📄 Reports",
    navImport: "📥 Import",
    // Top bar stats
    statSku: "SKU", statOrders: "Orders", statStock: "Stock", statStockVal: "Stock Value",
    // Common actions
    add: "+ Add", edit: "Edit", delete: "Delete", save: "💾 Save", cancel: "Cancel",
    close: "Close", search: "Search...", selectOrder: "Select Order",
    // Status labels
    draft: "Draft", confirmed: "Confirmed", production: "Production",
    done: "Done", cancelled: "Cancelled",
    paid: "✅ Paid", pending: "⏳ Pending", partial: "💛 Partial",
    // Master Data
    masterTitle: "⚙️ MASTER DATA", masterSub: "Fabrics · Accessories · Suppliers · Patterns · Print Types",
    tabFabric: "Fabric", tabAccessories: "Accessories", tabPattern: "Pattern",
    tabPrint: "Print/EMB", tabSupplier: "Supplier", tabRates: "Cost Rates",
    fabricMaster: "Fabric Master", addFabric: "+ Add",
    colImage: "Image", colId: "ID", colName: "Name", colType: "Type",
    colWidth: "Width", colUnit: "Unit", colPrice: "Price/Unit", colSupplier: "Supplier",
    fabricWidth: "Fabric Width (cm)", fabricName: "Fabric Name", fabricType: "Type",
    fabricUnit: "Unit", fabricCost: "Cost/Unit (฿)", fabricNote: "Fabric Note",
    fabricImg: "Fabric Image", fabricImgHint: "Upload a fabric sample image for the production team",
    fabricImgDel: "× Remove Image", fabricImgClick: "Click to upload",
    unitM: "Meters (m)", unitYard: "Yards", unitKg: "Kilograms (kg)",
    typeKnit: "Knit", typeWoven: "Woven", typeCotton: "Cotton",
    // Order Module
    orderTitle: "📋 ORDER MODULE", orderSub: "Manage Production Orders",
    createOrder: "+ Create Order", editOrder: "Edit Order", newOrder: "New Order",
    colCustomer: "Customer", colSlots: "Items", colQty: "Total Qty", colTarget: "Target Price",
    colDate: "Date", colStatus: "Status",
    tabInfo: "📋 Order Info", tabSlots: "🧩 Products", tabNotice: "⚠️ Special Notice",
    customerName: "Customer Name", targetPrice: "Target Price/Unit (optional)",
    orderDate: "Order Date", dueDate: "Due Date (Delivery)",
    orderStatus: "Status", orderChannel: "Order Channel", contactInfo: "Contact / Line ID",
    channelDirect: "Direct", channelLine: "LINE", channelEmail: "Email",
    channelPhone: "Phone", channelWeb: "Website", channelAgent: "Agent",
    totalQtyLabel: "Total qty all items:", slotAddBtn: "+ Add Item",
    slotPattern: "Pattern / SKU", slotQty: "Qty (pcs)", slotPrint: "Print / EMB",
    slotColor: "Color", slotSize: "Size Breakdown (e.g. S×10, M×20)",
    slotNote: "📝 Item Note", slotImg: "Product Image",
    slotImgDel: "Remove", lowStockWarn: "⚠️ Low stock — reorder needed",
    noticeHint: "⚠️ Use this for special production requirements, packing instructions, urgent deadlines, etc.",
    noticeLabel: "Special Notice for this Order",
    noticePlaceholder: "e.g.:\n- Must ship before April 30\n- Pack by size in separate bags\n- No black thread\n- Customer requires 100% QC before shipping",
    priorityLabel: "Priority", priorityLow: "🟢 Normal (Low)", priorityNormal: "🟡 Medium (Normal)",
    priorityHigh: "🔴 Urgent (High)", priorityUrgent: "🚨 Very Urgent",
    refLink: "Reference File / Link",
    viewBtn: "👁 View", bomBtn: "BOM", editBtn: "Edit", delBtn: "Delete",
    nextBtn: "Next: Products →", saveOrder: "💾 Save Order",
    specialNoticeTitle: "⚠️ SPECIAL NOTICE", totalQtyInfo: "Total Qty",
    productList: "Product Items", noOrders: "No orders yet — click Create Order above",
    // BOM
    bomTitle: "📦 BOM & Materials Purchasing", bomSub: "Bill of Materials · Purchase Bills · Price Comparison",
    tabBom: "📋 BOM", tabBills: "🧾 Purchase Bills", tabCompare: "⚖️ Price Compare",
    bomMaterials: "Materials List", bomCostTotal: "Total Material Cost (excl. labor/overhead)",
    colNeeded: "Required", colHave: "In Stock", colMasterPrice: "Master Price",
    colCostTotal: "Total Cost", colStockStatus: "Status",
    inStock: "✓ Reserved", outStock: "✗ Short", poNeeded: "⚠️ Purchase Order required for:",
    addBillBtn: "+ Record New Bill", billsAll: "🧾 Total Bills", billsPaid: "✅ Paid",
    billsPending: "⏳ Outstanding", noBills: "No bills yet — click 'Record New Bill' to start",
    billInvoiceNo: "Invoice No.", billDate: "Purchase Date", billSupplier: "Supplier Name",
    billStatus: "Payment Status", billReceiptImg: "📷 Receipt / Bill Photo",
    billReceiptHint: "Upload a photo or scan of the receipt to verify against the items below",
    billReceiptDel: "× Remove Image", billItems: "Materials in this Bill",
    billAddItem: "+ Add Item", billColItem: "Item", billColQty: "Qty",
    billColUnit: "Unit", billColPrice: "Price/Unit", billColTotal: "Total",
    billGrandTotal: "Bill Total", saveBill: "💾 Save Bill",
    compareSearch: "Search material name to compare prices",
    compareSearchPlaceholder: "e.g. Cotton, Zipper, Button...",
    compareCheapest: "💚 Cheapest", compareMostExp: "🔴 Most Expensive",
    compareDiff: "📊 Price Difference", compareFound: "bills found",
    compareTitle: "Price Comparison", compareRanked: "— ranked cheapest first",
    compareChart: "Price Chart", compareEmpty: "Type a material name above",
    compareEmptySub: "to compare prices across all your suppliers",
    compareTagCheap: "Cheapest", compareTagExp: "Most Expensive",
    colRank: "Rank", colInvoice: "Invoice No.", colBillDate: "Date",
    compareNoResult: "No results found for",
    // Inventory
    invTitle: "🏬 INVENTORY", invSub: "Manage Material Stock",
    invLowAlert: "⚠️ Low Stock:", invAdjust: "Adjust",
    invColStock: "Stock Qty", invColValue: "Value", invColStockStatus: "Status",
    invStatusEmpty: "Empty", invStatusCrit: "Critical", invStatusLow: "Low", invStatusOk: "Normal",
    invTotalVal: "Total Stock Value", invAdjTitle: "Adjust Stock",
    invAdjCurrent: "Current:", invAdjQty: "Add / Deduct (use - to deduct)",
    invAdjReason: "Reason", invAdjPlaceholder: "Received / Used / Damaged",
    // Costing
    costTitle: "💹 COSTING & PRICING", costSub: "Calculate Cost and Set Selling Price",
    costBreakdown: "Cost / Unit", costLabor: "Labor (Cut+Sew+QC)",
    costOverhead: "Overhead", costTotalUnit: "Total Cost / Unit",
    costTotalAll: "Total for all units", costTargetVsCost: "Target Price vs Cost",
    costProfit: "✓ Profitable", costLoss: "✗ Loss",
    pricingTitle: "Pricing", modeMargin: "Margin %", modeSell: "Set Sell Price",
    marginLabel: "Target Margin (%)", sellPriceLabel: "Sell Price / Unit (฿)",
    profitUnit: "Profit / Unit", profitTotal: "Total Profit", marginActual: "Actual Margin",
    // Reports
    reportTitle: "📄 REPORTS", reportSub: "Business Overview",
    // Item Master
    itemTitle: "📁 ITEM MASTER", itemSub: "SKU Management",
    itemUpload: "📤 Import from Excel",
  },
  TH: {
    // App shell
    appName: "PRIMER Group NXT", appSub: "ระบบบริหารการผลิต",
    // Nav modules
    navDashboard: "📊 แดชบอร์ด",
    navItems: "📁 รายการสินค้า", navMaster: "⚙️ ข้อมูลหลัก", navOrder: "📋 ออเดอร์",
    navBom: "📦 BOM", navInventory: "🏬 คลังสินค้า", navCosting: "💹 ต้นทุน", navReports: "📄 รายงาน",
    navImport: "📥 นำเข้าข้อมูล",
    // Top bar stats
    statSku: "SKU", statOrders: "ออเดอร์", statStock: "สต๊อกต่ำ", statStockVal: "มูลค่าสต๊อก",
    // Common actions
    add: "+ เพิ่ม", edit: "แก้ไข", delete: "ลบ", save: "💾 บันทึก", cancel: "ยกเลิก",
    close: "ปิด", search: "ค้นหา...", selectOrder: "เลือก Order",
    // Status labels
    draft: "ร่าง", confirmed: "ยืนยันแล้ว", production: "กำลังผลิต",
    done: "เสร็จสิ้น", cancelled: "ยกเลิก",
    paid: "✅ จ่ายแล้ว", pending: "⏳ รอชำระ", partial: "💛 จ่ายบางส่วน",
    // Master Data
    masterTitle: "⚙️ ข้อมูลหลัก", masterSub: "ผ้า · อุปกรณ์เสริม · Supplier · Pattern · การพิมพ์",
    tabFabric: "ผ้า", tabAccessories: "อุปกรณ์เสริม", tabPattern: "Pattern",
    tabPrint: "Print/EMB", tabSupplier: "Supplier", tabRates: "อัตราต้นทุน",
    fabricMaster: "รายการผ้า", addFabric: "+ เพิ่ม",
    colImage: "รูป", colId: "รหัส", colName: "ชื่อ", colType: "ประเภท",
    colWidth: "ความกว้าง", colUnit: "หน่วย", colPrice: "ราคา/หน่วย", colSupplier: "Supplier",
    fabricWidth: "ความกว้างผ้า (cm)", fabricName: "ชื่อผ้า", fabricType: "ประเภท",
    fabricUnit: "หน่วย", fabricCost: "ราคา/หน่วย (฿)", fabricNote: "หมายเหตุผ้า",
    fabricImg: "รูปตัวอย่างผ้า", fabricImgHint: "อัปโหลดรูปเนื้อผ้า เพื่อให้ทีมผลิตเห็นลักษณะผ้าได้ง่ายขึ้น",
    fabricImgDel: "× ลบรูป", fabricImgClick: "คลิกอัปโหลด",
    unitM: "เมตร (m)", unitYard: "หลา (Yard)", unitKg: "กิโลกรัม (kg)",
    typeKnit: "Knit", typeWoven: "Woven", typeCotton: "Cotton",
    // Order Module
    orderTitle: "📋 ORDER MODULE", orderSub: "จัดการคำสั่งผลิต",
    createOrder: "+ สร้าง Order", editOrder: "แก้ไข Order", newOrder: "สร้าง Order ใหม่",
    colCustomer: "ลูกค้า", colSlots: "รายการ", colQty: "Qty รวม", colTarget: "ราคาเป้า",
    colDate: "วันที่", colStatus: "Status",
    tabInfo: "📋 ข้อมูล Order", tabSlots: "🧩 รายการสินค้า", tabNotice: "⚠️ หมายเหตุพิเศษ",
    customerName: "ชื่อลูกค้า", targetPrice: "ราคาเป้าหมาย/ตัว (optional)",
    orderDate: "วันที่สั่ง", dueDate: "กำหนดส่ง (Due Date)",
    orderStatus: "Status", orderChannel: "ช่องทางการรับออเดอร์", contactInfo: "เบอร์ติดต่อ / Line ID",
    channelDirect: "Direct", channelLine: "LINE", channelEmail: "Email",
    channelPhone: "โทรศัพท์", channelWeb: "Website", channelAgent: "Agent",
    totalQtyLabel: "Qty รวมทุกรายการ:", slotAddBtn: "+ เพิ่มรายการ",
    slotPattern: "Pattern / SKU", slotQty: "จำนวน (ตัว)", slotPrint: "Print / EMB",
    slotColor: "สี", slotSize: "ไซส์ breakdown (เช่น S×10, M×20)",
    slotNote: "📝 หมายเหตุรายการนี้", slotImg: "รูปสินค้า",
    slotImgDel: "ลบรูป", lowStockWarn: "⚠️ สต๊อกต่ำ — ต้องสั่งซื้อเพิ่ม",
    noticeHint: "⚠️ ใช้สำหรับบันทึกคำแนะนำพิเศษ เช่น ข้อกำหนดการผลิต, การแพ็คพิเศษ, วันที่ต้องส่งด่วน ฯลฯ",
    noticeLabel: "หมายเหตุพิเศษของ Order นี้",
    noticePlaceholder: "เช่น:\n- ต้องส่งก่อนวันที่ 30 เม.ย.\n- แพ็คใส่ถุงแยกไซส์\n- ห้ามใช้ด้ายสีดำ\n- ลูกค้าต้องการ QC ก่อนส่ง 100%",
    priorityLabel: "ลำดับความสำคัญ", priorityLow: "🟢 ปกติ (Low)", priorityNormal: "🟡 กลาง (Normal)",
    priorityHigh: "🔴 ด่วน (High)", priorityUrgent: "🚨 ด่วนมาก (Urgent)",
    refLink: "ไฟล์แนบ / Link อ้างอิง",
    viewBtn: "👁 ดู", bomBtn: "BOM", editBtn: "แก้", delBtn: "ลบ",
    nextBtn: "ถัดไป: รายการสินค้า →", saveOrder: "💾 บันทึก Order",
    specialNoticeTitle: "⚠️ หมายเหตุพิเศษ", totalQtyInfo: "Qty รวม",
    productList: "รายการสินค้า", noOrders: "ยังไม่มี Order — กดสร้าง Order ด้านบน",
    // BOM
    bomTitle: "📦 BOM & ซื้อวัตถุดิบ", bomSub: "Bill of Materials · บิลซื้อ · เปรียบราคา Supplier",
    tabBom: "📋 BOM", tabBills: "🧾 บิลซื้อ", tabCompare: "⚖️ เปรียบราคา",
    bomMaterials: "รายการวัตถุดิบ", bomCostTotal: "ต้นทุนวัตถุดิบรวม (excl. labor/overhead)",
    colNeeded: "รวมต้องการ", colHave: "มีในสต๊อก", colMasterPrice: "ราคา Master",
    colCostTotal: "ต้นทุนรวม", colStockStatus: "สถานะ",
    inStock: "✓ จองสต๊อก", outStock: "✗ ขาด", poNeeded: "⚠️ ต้องออกใบสั่งซื้อ (PO) สำหรับ:",
    addBillBtn: "+ บันทึกบิลใหม่", billsAll: "🧾 บิลทั้งหมด", billsPaid: "✅ จ่ายแล้ว",
    billsPending: "⏳ ค้างชำระ", noBills: "ยังไม่มีบิล — กด 'บันทึกบิลใหม่' เพื่อเริ่ม",
    billInvoiceNo: "เลขที่ใบเสร็จ / Invoice No.", billDate: "วันที่ซื้อ", billSupplier: "ชื่อ Supplier",
    billStatus: "สถานะการชำระ", billReceiptImg: "📷 ถ่ายรูปใบเสร็จ / สแกนบิล",
    billReceiptHint: "อัปโหลดภาพใบเสร็จ หรือรูปถ่ายบิลจากร้านค้า เพื่อใช้ตรวจสอบกับรายการที่กรอกด้านล่าง",
    billReceiptDel: "× ลบรูป", billItems: "รายการวัตถุดิบในบิลนี้",
    billAddItem: "+ เพิ่มรายการ", billColItem: "รายการ", billColQty: "จำนวน",
    billColUnit: "หน่วย", billColPrice: "ราคา/หน่วย", billColTotal: "รวม",
    billGrandTotal: "ยอดรวมบิลนี้", saveBill: "💾 บันทึกบิล",
    compareSearch: "ค้นหาวัตถุดิบเพื่อเปรียบราคา",
    compareSearchPlaceholder: "พิมพ์ชื่อผ้า หรือวัตถุดิบ เช่น Cotton, Zipper...",
    compareCheapest: "💚 ราคาถูกสุด", compareMostExp: "🔴 ราคาแพงสุด",
    compareDiff: "📊 ส่วนต่าง", compareFound: "บิลที่พบ",
    compareTitle: "ผลเปรียบราคา", compareRanked: "— เรียงจากถูกที่สุด",
    compareChart: "กราฟเปรียบราคา", compareEmpty: "พิมพ์ชื่อวัตถุดิบด้านบน",
    compareEmptySub: "เพื่อดูราคาเปรียบเทียบจากทุก Supplier ที่เคยซื้อ",
    compareTagCheap: "ถูกสุด", compareTagExp: "แพงสุด",
    colRank: "อันดับ", colInvoice: "Invoice No.", colBillDate: "วันที่",
    compareNoResult: "ไม่พบรายการ",
    // Inventory
    invTitle: "🏬 INVENTORY", invSub: "จัดการสต๊อกวัตถุดิบ",
    invLowAlert: "⚠️ สต๊อกต่ำ:", invAdjust: "ปรับ",
    invColStock: "Qty ในสต๊อก", invColValue: "มูลค่า", invColStockStatus: "Status",
    invStatusEmpty: "หมด", invStatusCrit: "วิกฤต", invStatusLow: "ต่ำ", invStatusOk: "ปกติ",
    invTotalVal: "มูลค่าสต๊อกรวม", invAdjTitle: "ปรับ Stock",
    invAdjCurrent: "ปัจจุบัน:", invAdjQty: "เพิ่ม/ลด จำนวน (ใส่ - เพื่อตัดสต๊อก)",
    invAdjReason: "เหตุผล", invAdjPlaceholder: "รับของ / ตัดสต๊อก / สต๊อกเสีย",
    // Costing
    costTitle: "💹 COSTING & PRICING", costSub: "คำนวณต้นทุนและตั้งราคาขาย",
    costBreakdown: "ต้นทุน / ตัว", costLabor: "Labor (ตัด+เย็บ+QC)",
    costOverhead: "Overhead", costTotalUnit: "รวมต้นทุน / ตัว",
    costTotalAll: "รวมทั้งหมด", costTargetVsCost: "ราคาเป้าหมายลูกค้า vs ต้นทุน",
    costProfit: "✓ กำไร", costLoss: "✗ ขาดทุน",
    pricingTitle: "ตั้งราคาขาย", modeMargin: "Margin %", modeSell: "กำหนดราคาขาย",
    marginLabel: "Margin เป้าหมาย (%)", sellPriceLabel: "ราคาขาย / ตัว (฿)",
    profitUnit: "กำไร / ตัว", profitTotal: "กำไรรวม", marginActual: "Margin จริง",
    // Reports
    reportTitle: "📄 REPORTS", reportSub: "ภาพรวมธุรกิจ",
    // Item Master
    itemTitle: "📁 ITEM MASTER", itemSub: "จัดการ SKU",
    itemUpload: "📤 นำเข้าจาก Excel",
  }
};

// Language context — read by all modules
let _lang = "EN";
const t = (key) => LANG[_lang][key] || LANG["EN"][key] || key;

function LangToggle({ lang, setLang }) {
  return (
    <div style={{ display: "flex", background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
      {["EN", "TH"].map(l => (
        <button key={l} onClick={() => { setLang(l); _lang = l; }} style={{
          padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
          fontFamily: "inherit", fontSize: 11, fontWeight: 700,
          background: lang === l ? C.accent : "transparent",
          color: lang === l ? "#000" : C.muted,
          transition: "all 0.2s",
        }}>{l === "EN" ? "🇬🇧 EN" : "🇹🇭 TH"}</button>
      ))}
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, ...style }}>{children}</div>;
}

function SectionHead({ title, sub, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, letterSpacing: 1 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function Tag({ text, color = C.ok }) {
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: color + "25", color }}>{text}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000b", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: "100%", maxWidth: 540, maxHeight: "80vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontWeight: 700, color: C.accent, fontSize: 14 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, half }) {
  return (
    <div style={{ marginBottom: 12, flex: half ? "0 0 calc(50% - 6px)" : "1 1 100%" }}>
      <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

function Row2({ children }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{children}</div>;
}

// ── Autocomplete Input ────────────────────────────────────────────
function AutocompleteInput({ value, onChange, options = [], placeholder = "", style: extraStyle = {} }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const wrapRef = useRef(null);

  // Sync external value → internal query
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const matches = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 200)
    : options.slice(0, 200);

  const select = (val) => {
    setQuery(val);
    onChange(val);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        style={{ ...s.input, ...extraStyle }}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={e => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && matches.length === 1) select(matches[0]);
        }}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 999,
          background: C.card, border: `1px solid ${C.accent}60`, borderRadius: 8,
          maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px #00000060",
        }}>
          {matches.map((opt, i) => (
            <div
              key={i}
              onMouseDown={() => select(opt)}
              style={{
                padding: "8px 12px", fontSize: 12, cursor: "pointer",
                color: opt === value ? C.accent : C.text,
                background: opt === value ? C.accent + "15" : "transparent",
                borderBottom: i < matches.length - 1 ? `1px solid ${C.border}` : "none",
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.accent + "22"}
              onMouseLeave={e => e.currentTarget.style.background = opt === value ? C.accent + "15" : "transparent"}
            >
              {opt}
            </div>
          ))}
          {matches.length === 200 && (
            <div style={{ padding: "6px 12px", fontSize: 10, color: C.muted, textAlign: "center" }}>
              พิมพ์เพิ่มเพื่อค้นหาเพิ่มเติม...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODULE: MASTER DATA
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// EXCEL IMPORT UTILITIES
// ═══════════════════════════════════════════════════════════════

const str  = v => String(v ?? '').trim();
const num  = v => parseFloat(v) || 0;

// Read first sheet of an Excel/CSV file → array of row objects (lazy loads xlsx)
async function readExcel(file) {
  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Read full workbook (for multi-sheet import)
async function readWorkbook(file) {
  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        resolve({ wb: XLSX.read(new Uint8Array(e.target.result), { type: 'array' }), XLSX });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── Item Master V3 parser — handles Primer_Master_Data_v3 double-header format ──
function parseItemMasterWb(wb, XLSX) {
  const seen = new Set();
  const items = [];

  // V3 sheets: data starts at row index 4 (0-based), real col headers at row 3
  const parseV3Sheet = (sheetName, m) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    rows.slice(4).filter(r => r[m.newSku]).forEach(r => {
      const pt = String(r[m.pt] || '').trim();
      const key = pt || String(r[m.newSku] || '').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      let name = String(r[m.name] || '').trim();
      // Strip "A001M-S-Color   " prefix that some rows have
      const parts = name.split(/\s{2,}/);
      name = (parts[parts.length - 1] || name).trim();
      items.push({
        code:         pt,
        newSku:       String(r[m.newSku] || '').trim().split('-').slice(0, -1).join('-'),
        gender:       String(r[m.gender] || '').trim(),
        ptNumber:     m.ptNo >= 0 ? String(r[m.ptNo] || '').trim() : '',
        fabricType:   String(r[m.fabric] || '').trim(),
        color:        String(r[m.color] || '').trim(),
        group:        String(r[m.group] || '').trim(),
        name,
        cost:         parseFloat(r[m.cost]) || 0,
        factoryPrice: parseFloat(r[m.fp])   || 0,
        sellPrice:    parseFloat(r[m.rp])   || 0,
        customer:     m.cust >= 0 ? String(r[m.cust] || '').trim() : '',
        type:         m.type,
      });
    });
  };

  // Try V3 format (Primer_Master_Data_v3)
  const shirtSheet = wb.SheetNames.find(n => n.includes('เสื้อ') || (n.toLowerCase().includes('item') && !n.includes('กางเกง')));
  const pantsSheet = wb.SheetNames.find(n => n.includes('กางเกง'));
  if (shirtSheet) {
    // เสื้อ: col1=PT, col4=NewSku, col5=Gender, col8=StyleNo, col9=Name, col10=Fabric, col11=Color, col13=Group, col14=Cost, col15=FP, col16=RP, col17=Customer
    parseV3Sheet(shirtSheet, { pt:1, newSku:4, gender:5, ptNo:8, name:9, fabric:10, color:11, group:13, cost:14, fp:15, rp:16, cust:17, type:'เสื้อ' });
  }
  if (pantsSheet) {
    // กางเกง: col1=PT, col4=NewSku, col5=Gender, col8=Name, col9=Fabric, col10=Color, col12=Group, col13=Cost, col14=FP, col15=RP
    parseV3Sheet(pantsSheet, { pt:1, newSku:4, gender:5, ptNo:-1, name:8, fabric:9, color:10, group:12, cost:13, fp:14, rp:15, cust:-1, type:'กางเกง' });
  }

  // If V3 failed, fall back to classic column-name format (Item_master_Primer.xlsm etc.)
  if (items.length === 0) {
    const sn = wb.SheetNames.find(n => n.toLowerCase().includes('item') || n.toLowerCase().includes('master')) || wb.SheetNames[0];
    const ws = wb.Sheets[sn];
    if (ws) {
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      rows.forEach(row => {
        const code = String(row['โค้ด'] || row['code'] || row['Code'] || '').trim();
        const rCode = String(row['รหัสสินค้า'] || '').trim();
        if (!code && !rCode) return;
        items.push({
          code:         code || rCode,
          newSku:       '',
          gender:       '',
          ptNumber:     String(row['P/T Number'] || row['PT'] || '').trim(),
          fabricType:   String(row['ชนิดผ้า'] || row['fabric'] || '').trim(),
          color:        '',
          group:        String(row['กลุ่ม'] || row['group'] || '').trim(),
          name:         String(row['ชื่อสินค้า'] || row['ชื่อ'] || row['name'] || '').trim(),
          cost:         parseFloat(row['Cost (THB)'] || row['cost'] || 0) || 0,
          factoryPrice: parseFloat(row['ราคาโรงงาน'] || row['factoryPrice'] || 0) || 0,
          sellPrice:    parseFloat(row['ราคาขาย (-VAT)'] || row['sellPrice'] || 0) || 0,
          customer:     '',
          type:         'เสื้อ',
        });
      });
    }
  }
  return items;
}

// Get rows from a named sheet, or first sheet if not found
function getSheetRows({ wb, XLSX }, name) {
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() === name.toLowerCase()) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

// Column name normalizer — supports "cost_per_unit", "costPerUnit", "Cost/Unit", "ราคา/หน่วย"
function col(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k];
  }
  return '';
}

// ── Row mappers (Excel row → app object) ──────────────────────
const mapFabricRow = row => ({
  id:           str(col(row,'id','ID')) || genId('F'),
  name:         str(col(row,'name','Name','ชื่อ')),
  type:         str(col(row,'type','Type','ประเภท')) || 'Knit',
  unit:         str(col(row,'unit','Unit','หน่วย')) || 'm',
  costPerUnit:  num(col(row,'cost_per_unit','costPerUnit','Cost/Unit','ราคา/หน่วย')),
  supplier:     str(col(row,'supplier_id','supplier','Supplier','Supplier ID')),
  width:        parseFloat(col(row,'width_cm','width','Width')) || null,
  note:         str(col(row,'note','Note','หมายเหตุ')),
  imagePreview: null,
});

const mapAccRow = row => ({
  id:           str(col(row,'id','ID')) || genId('A'),
  name:         str(col(row,'name','Name','ชื่อ')),
  unit:         str(col(row,'unit','Unit','หน่วย')) || 'pcs',
  costPerUnit:  num(col(row,'cost_per_unit','costPerUnit','Cost/Unit','ราคา/หน่วย')),
  supplier:     str(col(row,'supplier_id','supplier','Supplier')),
  note:         str(col(row,'note','Note')),
  imagePreview: null,
});

const mapSupplierRow = row => ({
  id:           str(col(row,'id','ID')) || genId('S'),
  name:         str(col(row,'name','Name','ชื่อ')),
  contact:      str(col(row,'contact','Contact','เบอร์ติดต่อ')),
  category:     str(col(row,'category','Category','ประเภท')) || 'Fabric',
  imagePreview: null,
});

const mapPrintRow = row => ({
  id:           str(col(row,'id','ID')) || genId('PT'),
  name:         str(col(row,'name','Name','ชื่อ')),
  costPerUnit:  num(col(row,'cost_per_unit','costPerUnit','Cost/Unit','ราคา/หน่วย')),
  imagePreview: null,
});

const mapPatternRow = row => ({
  id:             str(col(row,'id','ID')) || genId('P'),
  name:           str(col(row,'name','Name','ชื่อ')),
  patternType:    str(col(row,'pattern_type','patternType','Pattern Type','ประเภท')) || null,
  category:       str(col(row,'category','Category')) || 'Tops',
  fabricId:       str(col(row,'fabric_id','fabricId','Fabric ID')),
  fabricPerUnit:  num(col(row,'fabric_per_unit','fabricPerUnit','Fabric/Unit','ผ้า/ตัว')),
  laborCut:       num(col(row,'labor_cut','laborCut','Labor Cut')),
  laborSew:       num(col(row,'labor_sew','laborSew','Labor Sew')),
  laborQC:        num(col(row,'labor_qc','laborQC','Labor QC')),
  accessories:    [],   // filled from Pattern_Accessories sheet
  imagePreview:   null,
});

const mapStockRow = row => ({
  itemId: str(col(row,'item_id','itemId','Item ID','ID','id')),
  qty:    num(col(row,'qty','Qty','quantity','จำนวน')),
});

// ── Import Button component ────────────────────────────────────
function ImportBtn({ onImport }) {
  const ref = useRef(null);
  const [status, setStatus] = useState('');
  const ok = status.startsWith('✅');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus('⏳ กำลังนำเข้า...');
    try {
      const count = await onImport(file);
      setStatus(`✅ นำเข้าแล้ว ${count} รายการ`);
      setTimeout(() => setStatus(''), 5000);
    } catch (err) {
      console.error('[Import]', err);
      setStatus('❌ ไฟล์ผิดรูปแบบ');
      setTimeout(() => setStatus(''), 4000);
    }
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button style={{ ...s.btnGhost, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px' }}
        onClick={() => ref.current?.click()}>
        📥 Import Excel
      </button>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />
      {status && (
        <span style={{ fontSize: 11, fontWeight: 600, color: ok ? C.ok : status.startsWith('⏳') ? C.accent : C.err,
          background: ok ? C.ok+'15' : status.startsWith('⏳') ? C.accent+'15' : C.err+'15',
          padding: '3px 10px', borderRadius: 6 }}>
          {status}
        </span>
      )}
    </div>
  );
}

function MasterModule({ data, setData }) {
  const [tab, setTab] = useState("fabric");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const tabs = [
    { id: "fabric", label: t("tabFabric") },
    { id: "accessories", label: t("tabAccessories") },
    { id: "pattern", label: t("tabPattern") },
    { id: "print", label: t("tabPrint") },
    { id: "supplier", label: t("tabSupplier") },
    { id: "rates", label: t("tabRates") },
  ];

  const openAdd = (type) => {
    setModal(type);
    setForm(type === "rates" ? { ...data.costRates } : {});
  };

  const save = () => {
    if (modal === "fabric") {
      const id = form.id || genId("F");
      const fabric = { ...form, id, costPerUnit: parseFloat(form.costPerUnit) || 0, width: form.width ? parseFloat(form.width) : null, imagePreview: form.imagePreview || null, note: form.note || "" };
      setData(d => ({ ...d, fabrics: [...d.fabrics.filter(x => x.id !== id), fabric] }));
      upsertFabric(fabric);
    } else if (modal === "accessories") {
      const id = form.id || genId("A");
      const acc = { ...form, id, costPerUnit: parseFloat(form.costPerUnit) || 0 };
      setData(d => ({ ...d, accessories: [...d.accessories.filter(x => x.id !== id), acc] }));
      upsertAccessory(acc);
    } else if (modal === "print") {
      const id = form.id || genId("PT");
      const pt = { ...form, id, costPerUnit: parseFloat(form.costPerUnit) || 0 };
      setData(d => ({ ...d, printTypes: [...d.printTypes.filter(x => x.id !== id), pt] }));
      upsertPrintType(pt);
    } else if (modal === "supplier") {
      const id = form.id || genId("S");
      const sup = { ...form, id };
      setData(d => ({ ...d, suppliers: [...d.suppliers.filter(x => x.id !== id), sup] }));
      upsertSupplier(sup);
    } else if (modal === "rates") {
      setData(d => ({ ...d, costRates: { ...d.costRates, overheadRate: parseFloat(form.overheadRate), laborCutRate: parseFloat(form.laborCutRate), laborSewRate: parseFloat(form.laborSewRate), laborQCRate: parseFloat(form.laborQCRate) } }));
    }
    setModal(null);
  };

  const del = (type, id) => {
    if (type === "fabric") { setData(d => ({ ...d, fabrics: d.fabrics.filter(x => x.id !== id) })); deleteFabric(id); }
    else if (type === "accessories") { setData(d => ({ ...d, accessories: d.accessories.filter(x => x.id !== id) })); deleteAccessory(id); }
    else if (type === "print") { setData(d => ({ ...d, printTypes: d.printTypes.filter(x => x.id !== id) })); deletePrintType(id); }
    else if (type === "supplier") { setData(d => ({ ...d, suppliers: d.suppliers.filter(x => x.id !== id) })); deleteSupplier(id); }
  };

  // ── Import handlers ──────────────────────────────────────────
  const importFabrics = async (file) => {
    const rows = await readExcel(file);
    const items = rows.map(mapFabricRow).filter(x => x.name);
    setData(d => {
      const keep = d.fabrics.filter(f => !items.find(i => i.id === f.id));
      return { ...d, fabrics: [...keep, ...items] };
    });
    items.forEach(i => upsertFabric(i));
    return items.length;
  };

  const importAccessories = async (file) => {
    const rows = await readExcel(file);
    const items = rows.map(mapAccRow).filter(x => x.name);
    setData(d => {
      const keep = d.accessories.filter(a => !items.find(i => i.id === a.id));
      return { ...d, accessories: [...keep, ...items] };
    });
    items.forEach(i => upsertAccessory(i));
    return items.length;
  };

  const importSuppliers = async (file) => {
    const rows = await readExcel(file);
    const items = rows.map(mapSupplierRow).filter(x => x.name);
    setData(d => {
      const keep = d.suppliers.filter(s => !items.find(i => i.id === s.id));
      return { ...d, suppliers: [...keep, ...items] };
    });
    items.forEach(i => upsertSupplier(i));
    return items.length;
  };

  const importPrintTypes = async (file) => {
    const rows = await readExcel(file);
    const items = rows.map(mapPrintRow).filter(x => x.name);
    setData(d => {
      const keep = d.printTypes.filter(p => !items.find(i => i.id === p.id));
      return { ...d, printTypes: [...keep, ...items] };
    });
    items.forEach(i => upsertPrintType(i));
    return items.length;
  };

  return (
    <div>
      <SectionHead title={t("masterTitle")} sub={t("masterSub")} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...s.btnGhost, ...(tab === t.id ? { background: C.accent + "20", color: C.accent, borderColor: C.accent + "60" } : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "fabric" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Fabric Master</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ImportBtn onImport={importFabrics} />
              <button style={s.btn()} onClick={() => openAdd("fabric")}>+ เพิ่ม</button>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{[t("colImage"), t("colId"), t("colName"), t("colType"), t("colWidth"), t("colUnit"), t("colPrice"), t("colSupplier"), ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.fabrics.map(f => (
                <tr key={f.id}>
                  <td style={{ ...s.td, padding: "6px 10px" }}>
                    {f.imagePreview
                      ? <img src={f.imagePreview} alt={f.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, display: "block" }} />
                      : <div style={{ width: 40, height: 40, background: "#060b16", border: `1px dashed ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧵</div>
                    }
                  </td>
                  <td style={{ ...s.td, color: C.muted }}>{f.id}</td>
                  <td style={s.td}>{f.name}</td>
                  <td style={s.td}><Tag text={f.type} color={C.accent2} /></td>
                  <td style={{ ...s.td, color: C.accent2 }}>{f.width ? `${f.width} cm` : <span style={{ color: C.muted }}>—</span>}</td>
                  <td style={s.td}>{f.unit}</td>
                  <td style={{ ...s.td, color: C.accent }}>฿{fmt(f.costPerUnit)}</td>
                  <td style={{ ...s.td, color: C.muted }}>{f.supplier}</td>
                  <td style={s.td}>
                    <button onClick={() => { setModal("fabric"); setForm(f); }} style={{ ...s.btnGhost, padding: "3px 10px", marginRight: 4 }}>แก้ไข</button>
                    <button onClick={() => del("fabric", f.id)} style={{ ...s.btnGhost, padding: "3px 10px", color: C.err, borderColor: C.err + "50" }}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "accessories" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Accessories Master</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ImportBtn onImport={importAccessories} />
              <button style={s.btn()} onClick={() => openAdd("accessories")}>+ เพิ่ม</button>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Image", "ID", "ชื่อ", "หน่วย", "ราคา/หน่วย", "Supplier", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.accessories.map(a => (
                <tr key={a.id}>
                  <td style={{ ...s.td, padding: "6px 10px" }}>
                    {a.imagePreview
                      ? <img src={a.imagePreview} alt={a.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, display: "block" }} />
                      : <div style={{ width: 40, height: 40, background: "#060b16", border: `1px dashed ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧵</div>
                    }
                  </td>
                  <td style={{ ...s.td, color: C.muted }}>{a.id}</td>
                  <td style={s.td}>{a.name}</td>
                  <td style={s.td}>{a.unit}</td>
                  <td style={{ ...s.td, color: C.accent }}>฿{fmt(a.costPerUnit)}</td>
                  <td style={{ ...s.td, color: C.muted }}>{a.supplier}</td>
                  <td style={s.td}>
                    <button onClick={() => { setModal("accessories"); setForm(a); }} style={{ ...s.btnGhost, padding: "3px 10px", marginRight: 4 }}>แก้ไข</button>
                    <button onClick={() => del("accessories", a.id)} style={{ ...s.btnGhost, padding: "3px 10px", color: C.err, borderColor: C.err + "50" }}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "pattern" && <PatternMaster data={data} setData={setData} />}

      {tab === "print" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Printing / EMB Type</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ImportBtn onImport={importPrintTypes} />
              <button style={s.btn()} onClick={() => openAdd("print")}>+ เพิ่ม</button>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Image", "ID", "ประเภท", "ราคา/ตัว", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.printTypes.map(pt => (
                <tr key={pt.id}>
                  <td style={{ ...s.td, padding: "6px 10px" }}>
                    {pt.imagePreview
                      ? <img src={pt.imagePreview} alt={pt.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, display: "block" }} />
                      : <div style={{ width: 40, height: 40, background: "#060b16", border: `1px dashed ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🖨️</div>
                    }
                  </td>
                  <td style={{ ...s.td, color: C.muted }}>{pt.id}</td>
                  <td style={s.td}>{pt.name}</td>
                  <td style={{ ...s.td, color: C.accent }}>฿{fmt(pt.costPerUnit)}</td>
                  <td style={s.td}>
                    <button onClick={() => { setModal("print"); setForm(pt); }} style={{ ...s.btnGhost, padding: "3px 10px", marginRight: 4 }}>แก้ไข</button>
                    <button onClick={() => del("print", pt.id)} style={{ ...s.btnGhost, padding: "3px 10px", color: C.err, borderColor: C.err + "50" }}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "supplier" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Supplier</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ImportBtn onImport={importSuppliers} />
              <button style={s.btn()} onClick={() => openAdd("supplier")}>+ เพิ่ม</button>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Image", "ID", "ชื่อ", "ติดต่อ", "หมวด", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.suppliers.map(sup => (
                <tr key={sup.id}>
                  <td style={{ ...s.td, padding: "6px 10px" }}>
                    {sup.imagePreview
                      ? <img src={sup.imagePreview} alt={sup.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, display: "block" }} />
                      : <div style={{ width: 40, height: 40, background: "#060b16", border: `1px dashed ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏭</div>
                    }
                  </td>
                  <td style={{ ...s.td, color: C.muted }}>{sup.id}</td>
                  <td style={s.td}>{sup.name}</td>
                  <td style={{ ...s.td, color: C.sub }}>{sup.contact}</td>
                  <td style={s.td}><Tag text={sup.category} color={C.accent2} /></td>
                  <td style={s.td}>
                    <button onClick={() => { setModal("supplier"); setForm(sup); }} style={{ ...s.btnGhost, padding: "3px 10px", marginRight: 4 }}>แก้ไข</button>
                    <button onClick={() => del("supplier", sup.id)} style={{ ...s.btnGhost, padding: "3px 10px", color: C.err, borderColor: C.err + "50" }}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "rates" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Cost Rate Settings</span>
            <button style={s.btn()} onClick={() => openAdd("rates")}>แก้ไข</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["Overhead Rate", data.costRates.overheadRate + "%"],
              ["Labor Cut Rate", "×" + data.costRates.laborCutRate],
              ["Labor Sew Rate", "×" + data.costRates.laborSewRate],
              ["Labor QC Rate", "×" + data.costRates.laborQCRate],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: C.muted }}>{k}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.accent, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      {modal === "fabric" && (
        <Modal title={form.id ? "แก้ไข Fabric" : "เพิ่ม Fabric"} onClose={() => setModal(null)}>
          {/* Image Upload */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>รูปตัวอย่างผ้า</label>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <label style={{ cursor: "pointer", flexShrink: 0 }}>
                <div style={{
                  width: 100, height: 100, borderRadius: 10,
                  border: `2px dashed ${form.imagePreview ? C.accent : C.border}`,
                  background: form.imagePreview ? "transparent" : "#060b16",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", position: "relative"
                }}>
                  {form.imagePreview
                    ? <img src={form.imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 28, opacity: 0.3 }}>🧵</div>
                        <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>คลิกอัปโหลด</div>
                      </div>
                  }
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setForm(f => ({ ...f, imagePreview: ev.target.result }));
                  reader.readAsDataURL(file);
                }} />
              </label>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.6, marginBottom: 8 }}>
                  อัปโหลดรูปเนื้อผ้า เพื่อให้ทีมผลิตเห็นลักษณะผ้าได้ง่ายขึ้น
                </div>
                {form.imagePreview && (
                  <button onClick={() => setForm(f => ({ ...f, imagePreview: null }))}
                    style={{ ...s.btnGhost, padding: "4px 12px", fontSize: 11, color: C.err, borderColor: C.err + "50" }}>
                    × ลบรูป
                  </button>
                )}
              </div>
            </div>
          </div>

          <Row2>
            <Field label="ชื่อผ้า"><input style={s.input} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="ประเภท" half>
              <select style={s.select} value={form.type || "Knit"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option>Knit</option><option>Woven</option><option>Cotton</option>
              </select>
            </Field>
            <Field label="ความกว้างผ้า (cm)" half>
              <input style={s.input} type="number" placeholder="เช่น 150, 60" value={form.width || ""} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} />
            </Field>
            <Field label="หน่วย" half>
              <select style={s.select} value={form.unit || "m"} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="m">เมตร (m)</option>
                <option value="yard">หลา (Yard)</option>
                <option value="kg">กิโลกรัม (kg)</option>
              </select>
            </Field>
            <Field label="ราคา/หน่วย (฿)" half><input style={s.input} type="number" value={form.costPerUnit || ""} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} /></Field>
            <Field label="Supplier" half>
              <select style={s.select} value={form.supplier || ""} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}>
                {data.suppliers.map(s => <option key={s.id} value={s.id}>{s.id} – {s.name}</option>)}
              </select>
            </Field>
            <Field label="หมายเหตุผ้า">
              <input style={s.input} placeholder="เช่น ห้ามซักร้อน, ยืด 4 ทาง..." value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </Field>
          </Row2>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={s.btn()} onClick={save}>บันทึก</button>
            <button style={s.btnGhost} onClick={() => setModal(null)}>ยกเลิก</button>
          </div>
        </Modal>
      )}
      {modal === "accessories" && (
        <Modal title={form.id ? "แก้ไข Accessories" : "เพิ่ม Accessories"} onClose={() => setModal(null)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>รูปภาพ (Image)</label>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <label style={{ cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 100, height: 100, borderRadius: 10, border: `2px dashed ${form.imagePreview ? C.accent : C.border}`, background: form.imagePreview ? "transparent" : "#060b16", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {form.imagePreview
                    ? <img src={form.imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, opacity: 0.3 }}>🧵</div><div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>คลิกอัปโหลด</div></div>
                  }
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => setForm(f => ({ ...f, imagePreview: ev.target.result })); reader.readAsDataURL(file); }} />
              </label>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.6, marginBottom: 8 }}>อัปโหลดรูปภาพ accessory เพื่อให้ทีมงานอ้างอิงได้ง่ายขึ้น</div>
                {form.imagePreview && <button onClick={() => setForm(f => ({ ...f, imagePreview: null }))} style={{ ...s.btnGhost, padding: "4px 12px", fontSize: 11, color: C.err, borderColor: C.err + "50" }}>× ลบรูป</button>}
              </div>
            </div>
          </div>
          <Row2>
            <Field label="ชื่อ"><input style={s.input} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="หน่วย" half><input style={s.input} value={form.unit || ""} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></Field>
            <Field label="ราคา/หน่วย (฿)" half><input style={s.input} type="number" value={form.costPerUnit || ""} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} /></Field>
            <Field label="Supplier"><select style={s.select} value={form.supplier || ""} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}>{data.suppliers.map(s => <option key={s.id} value={s.id}>{s.id} – {s.name}</option>)}</select></Field>
          </Row2>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={s.btn()} onClick={save}>บันทึก</button>
            <button style={s.btnGhost} onClick={() => setModal(null)}>ยกเลิก</button>
          </div>
        </Modal>
      )}
      {modal === "print" && (
        <Modal title={form.id ? "แก้ไข Print/EMB" : "เพิ่ม Print/EMB"} onClose={() => setModal(null)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>รูปตัวอย่างงาน (Sample Image)</label>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <label style={{ cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 100, height: 100, borderRadius: 10, border: `2px dashed ${form.imagePreview ? C.accent : C.border}`, background: form.imagePreview ? "transparent" : "#060b16", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {form.imagePreview
                    ? <img src={form.imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, opacity: 0.3 }}>🖨️</div><div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>คลิกอัปโหลด</div></div>
                  }
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => setForm(f => ({ ...f, imagePreview: ev.target.result })); reader.readAsDataURL(file); }} />
              </label>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.6, marginBottom: 8 }}>อัปโหลดรูปตัวอย่างการพิมพ์หรืองานปัก เพื่ออ้างอิงในการผลิต</div>
                {form.imagePreview && <button onClick={() => setForm(f => ({ ...f, imagePreview: null }))} style={{ ...s.btnGhost, padding: "4px 12px", fontSize: 11, color: C.err, borderColor: C.err + "50" }}>× ลบรูป</button>}
              </div>
            </div>
          </div>
          <Field label="ชื่อ"><input style={s.input} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="ราคา/ตัว (฿)"><input style={s.input} type="number" value={form.costPerUnit || ""} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={s.btn()} onClick={save}>บันทึก</button>
            <button style={s.btnGhost} onClick={() => setModal(null)}>ยกเลิก</button>
          </div>
        </Modal>
      )}
      {modal === "supplier" && (
        <Modal title={form.id ? "แก้ไข Supplier" : "เพิ่ม Supplier"} onClose={() => setModal(null)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>รูปโลโก้ / บริษัท (Logo / Company Image)</label>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <label style={{ cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 100, height: 100, borderRadius: 10, border: `2px dashed ${form.imagePreview ? C.accent : C.border}`, background: form.imagePreview ? "transparent" : "#060b16", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {form.imagePreview
                    ? <img src={form.imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, opacity: 0.3 }}>🏭</div><div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>คลิกอัปโหลด</div></div>
                  }
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => setForm(f => ({ ...f, imagePreview: ev.target.result })); reader.readAsDataURL(file); }} />
              </label>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.6, marginBottom: 8 }}>อัปโหลดโลโก้หรือรูปบริษัท Supplier เพื่อระบุตัวตนได้ง่ายขึ้น</div>
                {form.imagePreview && <button onClick={() => setForm(f => ({ ...f, imagePreview: null }))} style={{ ...s.btnGhost, padding: "4px 12px", fontSize: 11, color: C.err, borderColor: C.err + "50" }}>× ลบรูป</button>}
              </div>
            </div>
          </div>
          <Row2>
            <Field label="ชื่อบริษัท"><input style={s.input} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="เบอร์โทร" half><input style={s.input} value={form.contact || ""} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></Field>
            <Field label="หมวด" half><select style={s.select} value={form.category || "Fabric"} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}><option>Fabric</option><option>Accessories</option><option>Packaging</option><option>Other</option></select></Field>
          </Row2>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={s.btn()} onClick={save}>บันทึก</button>
            <button style={s.btnGhost} onClick={() => setModal(null)}>ยกเลิก</button>
          </div>
        </Modal>
      )}
      {modal === "rates" && (
        <Modal title="แก้ไข Cost Rates" onClose={() => setModal(null)}>
          <Row2>
            <Field label="Overhead Rate (%)" half><input style={s.input} type="number" value={form.overheadRate} onChange={e => setForm(f => ({ ...f, overheadRate: e.target.value }))} /></Field>
            <Field label="Labor Cut Rate (×)" half><input style={s.input} type="number" step="0.1" value={form.laborCutRate} onChange={e => setForm(f => ({ ...f, laborCutRate: e.target.value }))} /></Field>
            <Field label="Labor Sew Rate (×)" half><input style={s.input} type="number" step="0.1" value={form.laborSewRate} onChange={e => setForm(f => ({ ...f, laborSewRate: e.target.value }))} /></Field>
            <Field label="Labor QC Rate (×)" half><input style={s.input} type="number" step="0.1" value={form.laborQCRate} onChange={e => setForm(f => ({ ...f, laborQCRate: e.target.value }))} /></Field>
          </Row2>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={s.btn()} onClick={save}>บันทึก</button>
            <button style={s.btnGhost} onClick={() => setModal(null)}>ยกเลิก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PatternMaster({ data, setData }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ accessories: [] });

  const openAdd = (p = null) => {
    setForm(p ? { ...p, accessories: [...p.accessories] } : { accessories: [], laborCut: 12, laborSew: 30, laborQC: 8 });
    setModal(true);
  };

  const addAcc = () => setForm(f => ({ ...f, accessories: [...f.accessories, { accId: data.accessories[0]?.id || "", qtyPerUnit: 1 }] }));
  const removeAcc = (i) => setForm(f => ({ ...f, accessories: f.accessories.filter((_, idx) => idx !== i) }));
  const updateAcc = (i, key, val) => setForm(f => ({ ...f, accessories: f.accessories.map((a, idx) => idx === i ? { ...a, [key]: val } : a) }));

  const save = () => {
    const id = form.id || genId("P");
    const pattern = { ...form, id, fabricPerUnit: parseFloat(form.fabricPerUnit), laborCut: parseFloat(form.laborCut), laborSew: parseFloat(form.laborSew), laborQC: parseFloat(form.laborQC) };
    setData(d => ({ ...d, patterns: [...d.patterns.filter(p => p.id !== id), pattern] }));
    upsertPattern(pattern);
    setModal(false);
  };

  const importPatterns = async (file) => {
    const wbData = await readWorkbook(file);
    const { wb, XLSX } = wbData;
    // Sheet 1: Patterns
    const patRows = getSheetRows(wbData, 'Patterns');
    const patterns = patRows.map(mapPatternRow).filter(x => x.name);
    // Sheet 2 (optional): Pattern_Accessories — columns: pattern_id, accessory_id, qty_per_unit
    const accSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('accessories') || n.toLowerCase().includes('bom'));
    const accRows = accSheetName ? XLSX.utils.sheet_to_json(wb.Sheets[accSheetName], { defval: '' }) : [];
    // Build accessories map: { patternId: [{accId, qtyPerUnit}] }
    const accMap = {};
    accRows.forEach(r => {
      const pid = str(col(r,'pattern_id','patternId','Pattern ID'));
      const aid = str(col(r,'accessory_id','acc_id','Accessory ID'));
      const qty = num(col(r,'qty_per_unit','qtyPerUnit','Qty/Unit'));
      if (pid && aid) {
        if (!accMap[pid]) accMap[pid] = [];
        accMap[pid].push({ accId: aid, qtyPerUnit: qty });
      }
    });
    // Attach accessories to patterns
    const finalPatterns = patterns.map(p => ({ ...p, accessories: accMap[p.id] || p.accessories }));
    setData(d => {
      const keep = d.patterns.filter(p => !finalPatterns.find(i => i.id === p.id));
      return { ...d, patterns: [...keep, ...finalPatterns] };
    });
    finalPatterns.forEach(p => upsertPattern(p));
    return finalPatterns.length;
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Pattern Master</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ImportBtn onImport={importPatterns} />
          <button style={s.btn()} onClick={() => openAdd()}>+ เพิ่ม</button>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Image", "ID", "Pattern", "Type", "Category", "Fabric", "ผ้า/ตัว", "Labor", "Trim Items", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>
          {data.patterns.map(p => {
            const fab = data.fabrics.find(f => f.id === p.fabricId);
            return (
              <tr key={p.id}>
                <td style={{ ...s.td, padding: "6px 10px" }}>
                  {p.imagePreview
                    ? <img src={p.imagePreview} alt={p.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, display: "block" }} />
                    : <div style={{ width: 40, height: 40, background: "#060b16", border: `1px dashed ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👗</div>
                  }
                </td>
                <td style={{ ...s.td, color: C.muted }}>{p.id}</td>
                <td style={s.td}>{p.name}</td>
                <td style={s.td}>{p.patternType ? <Tag text={p.patternType} color={C.accent} /> : <span style={{ color: C.muted, fontSize: 11 }}>—</span>}</td>
                <td style={s.td}><Tag text={p.category} color="#8b5cf6" /></td>
                <td style={{ ...s.td, color: C.sub }}>{fab?.name || p.fabricId}</td>
                <td style={{ ...s.td, color: C.accent }}>{p.fabricPerUnit} {fab?.unit || "m"}</td>
                <td style={s.td}>฿{fmt(p.laborCut + p.laborSew + p.laborQC)}</td>
                <td style={s.td}>{p.accessories.length} รายการ</td>
                <td style={s.td}>
                  <button onClick={() => openAdd(p)} style={{ ...s.btnGhost, padding: "3px 10px", marginRight: 4 }}>แก้ไข</button>
                  <button onClick={() => { setData(d => ({ ...d, patterns: d.patterns.filter(x => x.id !== p.id) })); deletePattern(p.id); }} style={{ ...s.btnGhost, padding: "3px 10px", color: C.err, borderColor: C.err + "50" }}>ลบ</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {modal && (
        <Modal title={form.id ? "แก้ไข Pattern" : "เพิ่ม Pattern"} onClose={() => setModal(false)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 10, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>รูป Pattern / ตัวอย่างสินค้า</label>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <label style={{ cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 100, height: 100, borderRadius: 10, border: `2px dashed ${form.imagePreview ? C.accent : C.border}`, background: form.imagePreview ? "transparent" : "#060b16", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {form.imagePreview
                    ? <img src={form.imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, opacity: 0.3 }}>👗</div><div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>คลิกอัปโหลด</div></div>
                  }
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => setForm(f => ({ ...f, imagePreview: ev.target.result })); reader.readAsDataURL(file); }} />
              </label>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.6, marginBottom: 8 }}>อัปโหลดรูป pattern หรือตัวอย่างเสื้อผ้า เพื่อให้ทีมผลิตและฝ่ายขายอ้างอิงได้</div>
                {form.imagePreview && <button onClick={() => setForm(f => ({ ...f, imagePreview: null }))} style={{ ...s.btnGhost, padding: "4px 12px", fontSize: 11, color: C.err, borderColor: C.err + "50" }}>× ลบรูป</button>}
              </div>
            </div>
          </div>
          <Row2>
            <Field label="ชื่อ Pattern"><input style={s.input} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Pattern Type (ประเภทสินค้า)">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {PATTERN_TYPES.map(pt => (
                  <button key={pt} type="button" onClick={() => setForm(f => ({ ...f, patternType: pt }))}
                    style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${form.patternType === pt ? C.accent : C.border}`, background: form.patternType === pt ? C.accent + "25" : "transparent", color: form.patternType === pt ? C.accent : C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: form.patternType === pt ? 700 : 400 }}>
                    {pt}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Category" half><select style={s.select} value={form.category || "Tops"} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}><option>Tops</option><option>Bottoms</option><option>Outerwear</option><option>Accessories</option></select></Field>
            <Field label="Fabric" half><select style={s.select} value={form.fabricId || ""} onChange={e => setForm(f => ({ ...f, fabricId: e.target.value }))}>{data.fabrics.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
            <Field label={`ผ้าต่อตัว (${data.fabrics.find(f => f.id === form.fabricId)?.unit || "m"})`} half><input style={s.input} type="number" step="0.1" value={form.fabricPerUnit || ""} onChange={e => setForm(f => ({ ...f, fabricPerUnit: e.target.value }))} /></Field>
            <Field label="Labor ตัด (฿)" half><input style={s.input} type="number" value={form.laborCut || ""} onChange={e => setForm(f => ({ ...f, laborCut: e.target.value }))} /></Field>
            <Field label="Labor เย็บ (฿)" half><input style={s.input} type="number" value={form.laborSew || ""} onChange={e => setForm(f => ({ ...f, laborSew: e.target.value }))} /></Field>
            <Field label="Labor QC (฿)" half><input style={s.input} type="number" value={form.laborQC || ""} onChange={e => setForm(f => ({ ...f, laborQC: e.target.value }))} /></Field>
          </Row2>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Accessories</span>
              <button style={{ ...s.btnGhost, padding: "3px 10px" }} onClick={addAcc}>+ เพิ่ม</button>
            </div>
            {form.accessories.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                <select style={{ ...s.select, flex: 2 }} value={a.accId} onChange={e => updateAcc(i, "accId", e.target.value)}>
                  {data.accessories.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                <input style={{ ...s.input, flex: 1 }} type="number" step="0.1" value={a.qtyPerUnit} onChange={e => updateAcc(i, "qtyPerUnit", parseFloat(e.target.value))} placeholder="/ตัว" />
                <button onClick={() => removeAcc(i)} style={{ ...s.btnGhost, padding: "5px 10px", color: C.err }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={s.btn()} onClick={save}>บันทึก</button>
            <button style={s.btnGhost} onClick={() => setModal(false)}>ยกเลิก</button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODULE: ORDERS (ENHANCED)
// ═══════════════════════════════════════════════════════════════

const PATTERN_TYPES = ["T-Shirt","Polo Shirt","Pants","Coverall","Apron","Bag","Shirt","Other"];
const SIZES = ["XS","S","M","L","XL","XXL","2XL","3XL","4XL","5XL"];
const FABRIC_OPTIONS = [
  "Cotton 100%","Polyester 100%","TC 65/35","CVC 60/40","Cotton Jersey","Polyester Jersey",
  "Interlock","Pique (Polo)","Oxford","Twill","Canvas","Ripstop","Fleece","Mesh / Dry-Fit",
  "Softshell","Nylon","Linen","Spandex Blend","Bamboo","Modal","Other",
];
const PRESET_COLORS = [
  { name:"White",    hex:"#f5f5f5" },{ name:"Black",    hex:"#1a1a1a" },
  { name:"Navy",     hex:"#1e3a5f" },{ name:"Gray",     hex:"#6b7280" },
  { name:"Red",      hex:"#dc2626" },{ name:"Royal Blue",hex:"#2563eb" },
  { name:"Sky Blue", hex:"#38bdf8" },{ name:"Green",    hex:"#16a34a" },
  { name:"Yellow",   hex:"#eab308" },{ name:"Orange",   hex:"#ea580c" },
  { name:"Pink",     hex:"#ec4899" },{ name:"Purple",   hex:"#9333ea" },
  { name:"Brown",    hex:"#92400e" },{ name:"Maroon",   hex:"#7f1d1d" },
  { name:"Beige",    hex:"#d4b483" },{ name:"Khaki",    hex:"#c4a35a" },
];

const EMPTY_SLOT = () => ({
  id: Date.now() + Math.random(),
  patternType: "T-Shirt",
  patternId: "", printTypeId: "PT001",
  qty: "",
  colors: [], colorNote: "",
  sizes: { male: {}, female: {} },
  fabricType: "",
  specFile: null, specFileName: "",
  image: null, imagePreview: null,
  slotNote: "",
});

function ProductSlot({ slot, idx, data, onChange, onRemove, orderPatternId }) {
  const [slotPatSearch, setSlotPatSearch] = useState("");
  const handleImage = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(idx, { ...slot, image: ev.target.result, imagePreview: ev.target.result });
    reader.readAsDataURL(file);
  };
  const handleSpec = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(idx, { ...slot, specFile: ev.target.result, specFileName: file.name });
    reader.readAsDataURL(file);
  };
  const toggleColor = (name) => {
    const cur = slot.colors || [];
    onChange(idx, { ...slot, colors: cur.includes(name) ? cur.filter(c => c !== name) : [...cur, name] });
  };
  const updateSize = (gender, size, val) => {
    const sizes = { male: { ...(slot.sizes?.male || {}) }, female: { ...(slot.sizes?.female || {}) } };
    sizes[gender][size] = parseInt(val) || 0;
    const qty = Object.values(sizes.male).reduce((a,b)=>a+b,0) + Object.values(sizes.female).reduce((a,b)=>a+b,0);
    onChange(idx, { ...slot, sizes, qty: qty > 0 ? String(qty) : slot.qty });
  };

  const lbl = (txt) => <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{txt}</div>;

  // Linked master data from order-level pattern
  const orderPat    = orderPatternId ? data.patterns.find(p => p.id === orderPatternId) : null;
  const orderFabric = orderPat?.fabricId ? data.fabrics.find(f => f.id === orderPat.fabricId) : null;
  const orderAccList = (orderPat?.accessories || []).map(a => {
    const acc = data.accessories.find(x => x.id === a.accId);
    return acc ? { name: acc.name, qty: a.qtyPerUnit, unit: acc.unit } : null;
  }).filter(Boolean);

  return (
    <div style={{ background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 1 }}>🧩 รายการที่ {idx + 1}</span>
        {idx > 0 && <button onClick={() => onRemove(idx)} style={{ background: "none", border: `1px solid ${C.err}40`, color: C.err, borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>× ลบ</button>}
      </div>

      {/* Pattern master data banner — shown when an order-level pattern is selected */}
      {orderPat && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: C.accent2+"0e", border: `1px solid ${C.accent2}35`, borderRadius: 8 }}>
          <div style={{ fontSize: 9, color: C.accent2+"99", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>🔗 Pattern ที่ใช้กับ Order นี้</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", marginBottom: (orderFabric || orderAccList.length > 0) ? 7 : 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.accent2 }}>{orderPat.name}</span>
            {orderPat.patternType && (
              <span style={{ fontSize: 10, padding: "1px 8px", background: C.accent2+"22", color: C.accent2, borderRadius: 10, fontWeight: 700 }}>{orderPat.patternType}</span>
            )}
            {orderPat.laborCut > 0 && <span style={{ fontSize: 10, color: C.sub }}>✂️ ฿{fmt(orderPat.laborCut)}/ตัว</span>}
            {orderPat.laborSew > 0 && <span style={{ fontSize: 10, color: C.sub }}>🪡 ฿{fmt(orderPat.laborSew)}/ตัว</span>}
            {orderPat.laborQC  > 0 && <span style={{ fontSize: 10, color: C.sub }}>🔍 QC ฿{fmt(orderPat.laborQC)}/ตัว</span>}
          </div>
          {(orderFabric || orderAccList.length > 0) && (
            <div style={{ borderTop: `1px solid ${C.accent2}20`, paddingTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              {orderFabric && (
                <div style={{ fontSize: 10, color: C.sub }}>
                  🧵 ผ้า: <strong style={{ color: C.text }}>{orderFabric.name}</strong>
                  {orderPat.fabricPerUnit && <span style={{ color: C.muted }}> — {orderPat.fabricPerUnit} ม./ตัว</span>}
                  {orderFabric.costPerUnit ? <span style={{ color: C.muted }}>, ฿{fmt(orderFabric.costPerUnit)}/{orderFabric.unit}</span> : null}
                </div>
              )}
              {orderAccList.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: C.muted }}>อุปกรณ์:</span>
                  {orderAccList.map(a => (
                    <span key={a.name} style={{ fontSize: 9, padding: "2px 8px", background: C.border+"90", color: C.sub, borderRadius: 8, border: `1px solid ${C.border}` }}>
                      {a.name} ×{a.qty} {a.unit}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Row 1: Image + Pattern type ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
        {/* Product image */}
        <div style={{ flexShrink: 0 }}>
          {lbl("รูปสินค้า")}
          <label style={{ cursor: "pointer" }}>
            <div style={{ width: 80, height: 80, borderRadius: 8, border: `2px dashed ${slot.imagePreview ? C.accent : C.border}`, background: slot.imagePreview ? "transparent" : "#0a1020", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {slot.imagePreview ? <img src={slot.imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22, opacity: 0.4 }}>📷</span>}
            </div>
            <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
          </label>
          {slot.imagePreview && <button onClick={() => onChange(idx, { ...slot, image: null, imagePreview: null })} style={{ marginTop: 4, fontSize: 9, color: C.err, background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "center" }}>ลบรูป</button>}
        </div>

        <div style={{ flex: 1 }}>
          {/* ── Pattern Picker per Slot ── */}
          {lbl("เลือก Pattern สำหรับรายการนี้")}

          {/* Selected state: show compact chip + change button */}
          {slot.patternId && (() => {
            const sp    = data.patterns.find(p => p.id === slot.patternId);
            const spFab = sp?.fabricId ? data.fabrics.find(f => f.id === sp.fabricId) : null;
            if (!sp) return null;
            return (
              <div style={{ padding: "7px 10px", background: C.ok+"12", border: `1px solid ${C.ok}40`, borderRadius: 7, marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.ok }}>✓ {sp.name}</span>
                    {sp.patternType && <span style={{ fontSize: 9, padding: "1px 7px", background: C.ok+"25", color: C.ok, borderRadius: 8, fontWeight: 700 }}>{sp.patternType}</span>}
                    {sp.laborCut > 0 && <span style={{ fontSize: 9, color: C.sub }}>✂️฿{fmt(sp.laborCut)}</span>}
                    {sp.laborSew > 0 && <span style={{ fontSize: 9, color: C.sub }}>🪡฿{fmt(sp.laborSew)}</span>}
                    {spFab && <span style={{ fontSize: 9, color: C.muted }}>🧵 {spFab.name}</span>}
                  </div>
                  <button onClick={() => { onChange(idx, { ...slot, patternId: "" }); setSlotPatSearch(""); }}
                    style={{ fontSize: 9, color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 7px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                    เปลี่ยน
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Picker: type pills + search + scrollable list (shown when no pattern selected) */}
          {!slot.patternId && (() => {
            const SLOT_PILLS = [
              { label: "👕 T-Shirt",   key: "T-Shirt"    },
              { label: "👔 Polo",       key: "Polo"       },
              { label: "🎽 Active",     key: "Activewear" },
              { label: "👖 Pants",      key: "Pants"      },
              { label: "🧥 Jacket",     key: "Jacket"     },
              { label: "🌐 ทั้งหมด",    key: ""           },
            ];
            const byType = slot.patternType
              ? data.patterns.filter(p => (p.patternType||"").toLowerCase().includes(slot.patternType.toLowerCase()))
              : data.patterns;
            const listPats = slotPatSearch.trim()
              ? byType.filter(p => p.name.toLowerCase().includes(slotPatSearch.toLowerCase()) || (p.patternType||"").toLowerCase().includes(slotPatSearch.toLowerCase()))
              : byType;
            return (
              <div style={{ marginBottom: 6 }}>
                {/* Type pills */}
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 5 }}>
                  {SLOT_PILLS.map(pill => {
                    const active = pill.key === "" ? !slot.patternType : (slot.patternType||"").toLowerCase().includes(pill.key.toLowerCase());
                    const cnt    = pill.key
                      ? data.patterns.filter(p => (p.patternType||"").toLowerCase().includes(pill.key.toLowerCase())).length
                      : data.patterns.length;
                    return (
                      <button key={pill.key || "all"}
                        onClick={() => onChange(idx, { ...slot, patternType: pill.key, patternId: "" })}
                        style={{ padding: "3px 9px", fontSize: 10, borderRadius: 16, fontFamily: "inherit", cursor: "pointer",
                          border: `1px solid ${active ? C.accent : C.border}`,
                          background: active ? C.accent+"25" : "transparent",
                          color: active ? C.accent : C.muted, fontWeight: active ? 700 : 400 }}>
                        {pill.label} <span style={{ fontSize: 8, color: active ? C.accent+"99" : C.muted }}>({cnt})</span>
                      </button>
                    );
                  })}
                </div>
                {/* Search input */}
                <div style={{ position: "relative", marginBottom: 5 }}>
                  <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted, pointerEvents: "none" }}>🔍</span>
                  <input style={{ ...s.input, paddingLeft: 26, fontSize: 11, padding: "5px 8px 5px 26px" }}
                    value={slotPatSearch}
                    onChange={e => setSlotPatSearch(e.target.value)}
                    placeholder="ค้นหา Pattern..." />
                  {slotPatSearch && <button onClick={() => setSlotPatSearch("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>}
                </div>
                {/* Scrollable card list */}
                {data.patterns.length === 0 ? (
                  <div style={{ fontSize: 10, color: "#f59e0b", padding: "6px 10px", background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: 6 }}>ยังไม่มี Pattern ใน Master Data</div>
                ) : listPats.length === 0 ? (
                  <div style={{ fontSize: 10, color: C.muted, padding: "6px 10px", textAlign: "center", background: C.card, border: `1px dashed ${C.border}`, borderRadius: 6 }}>ไม่พบ Pattern</div>
                ) : (
                  <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                    {listPats.map(p => {
                      const fab     = p.fabricId ? data.fabrics.find(f => f.id === p.fabricId) : null;
                      const accList = (p.accessories||[]).map(a => {
                        const acc = data.accessories.find(x => x.id === a.accId);
                        return acc ? `${acc.name}×${a.qtyPerUnit}` : null;
                      }).filter(Boolean);
                      return (
                        <div key={p.id}
                          onClick={() => { onChange(idx, { ...slot, patternId: p.id, patternType: p.patternType || slot.patternType }); setSlotPatSearch(""); }}
                          style={{ padding: "7px 10px", borderRadius: 7, cursor: "pointer", border: `1px solid ${C.border}`, background: "#080d18", transition: "all 0.1s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent+"80"; e.currentTarget.style.background = C.accent+"08"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#080d18"; }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: (fab || accList.length) ? 3 : 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.text, flex: 1 }}>{p.name}</span>
                            {p.patternType && <span style={{ fontSize: 9, padding: "1px 6px", background: C.border+"80", color: C.sub, borderRadius: 8, flexShrink: 0 }}>{p.patternType}</span>}
                          </div>
                          {(fab || p.laborCut > 0 || p.laborSew > 0) && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {fab && <span style={{ fontSize: 9, color: C.muted }}>🧵 {fab.name}{p.fabricPerUnit ? ` ${p.fabricPerUnit}ม/ตัว` : ""}</span>}
                              {p.laborCut > 0 && <span style={{ fontSize: 9, color: C.muted }}>✂️฿{fmt(p.laborCut)}</span>}
                              {p.laborSew > 0 && <span style={{ fontSize: 9, color: C.muted }}>🪡฿{fmt(p.laborSew)}</span>}
                            </div>
                          )}
                          {accList.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
                              {accList.map(a => <span key={a} style={{ fontSize: 8, padding: "1px 5px", background: C.border, color: C.muted, borderRadius: 6 }}>{a}</span>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Qty */}
          <div>
            {lbl("จำนวนรวม (ตัว)")}
            <input style={s.input} type="number" placeholder="0" value={slot.qty} onChange={e => onChange(idx, { ...slot, qty: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ── Row 2: Color palette ── */}
      <div style={{ marginBottom: 10 }}>
        {lbl("🎨 เลือกสี (คลิกเพื่อเลือก / เลือกได้หลายสี)")}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {PRESET_COLORS.map(c => {
            const selected = (slot.colors || []).includes(c.name);
            return (
              <button key={c.name} title={c.name} onClick={() => toggleColor(c.name)} style={{
                width: 26, height: 26, borderRadius: "50%", border: selected ? `3px solid ${C.accent}` : `2px solid ${C.border}`,
                background: c.hex, cursor: "pointer", position: "relative", flexShrink: 0,
                boxShadow: selected ? `0 0 6px ${C.accent}` : "none",
              }}>
                {selected && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: c.hex === "#f5f5f5" ? "#333" : "#fff", fontWeight: 900 }}>✓</span>}
              </button>
            );
          })}
        </div>
        {(slot.colors || []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {(slot.colors || []).map(c => {
              const col = PRESET_COLORS.find(x => x.name === c);
              return <span key={c} style={{ padding: "2px 8px", borderRadius: 10, background: col?.hex + "30", border: `1px solid ${col?.hex}60`, fontSize: 10, color: C.text }}>{c}</span>;
            })}
          </div>
        )}
        <input style={{ ...s.input, fontSize: 11 }} placeholder="หมายเหตุสี เช่น Pantone 286C, โทนพาสเทล..." value={slot.colorNote || ""} onChange={e => onChange(idx, { ...slot, colorNote: e.target.value })} />
      </div>

      {/* ── Row 3: Size table Male / Female ── */}
      <div style={{ marginBottom: 10 }}>
        {lbl("📐 ไซส์ (แยกชาย / หญิง)")}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 60 }}>Gender</th>
                {SIZES.map(sz => <th key={sz} style={{ ...s.th, textAlign: "center", minWidth: 44 }}>{sz}</th>)}
                <th style={{ ...s.th, textAlign: "center", color: C.accent }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {["male", "female"].map(gender => {
                const gLabel = gender === "male" ? "👔 ชาย" : "👗 หญิง";
                const gSizes = slot.sizes?.[gender] || {};
                const gTotal = SIZES.reduce((sum, sz) => sum + (gSizes[sz] || 0), 0);
                return (
                  <tr key={gender}>
                    <td style={{ ...s.td, color: gender === "male" ? C.accent2 : "#ec4899", fontWeight: 700, fontSize: 10 }}>{gLabel}</td>
                    {SIZES.map(sz => (
                      <td key={sz} style={{ ...s.td, padding: "4px" }}>
                        <input type="number" min="0" value={gSizes[sz] || ""}
                          onChange={e => updateSize(gender, sz, e.target.value)}
                          style={{ width: "100%", padding: "4px", background: "#080d18", border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, textAlign: "center", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                      </td>
                    ))}
                    <td style={{ ...s.td, textAlign: "center", fontWeight: 700, color: C.accent }}>{gTotal || "—"}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ ...s.td, color: C.muted, fontSize: 10, fontWeight: 700 }}>รวม</td>
                {SIZES.map(sz => {
                  const total = (slot.sizes?.male?.[sz] || 0) + (slot.sizes?.female?.[sz] || 0);
                  return <td key={sz} style={{ ...s.td, textAlign: "center", fontWeight: 700, color: total > 0 ? C.ok : C.muted, fontSize: 11 }}>{total || "—"}</td>;
                })}
                <td style={{ ...s.td, textAlign: "center", fontWeight: 700, color: C.accent }}>
                  {SIZES.reduce((sum,sz)=>(slot.sizes?.male?.[sz]||0)+(slot.sizes?.female?.[sz]||0)+sum,0) || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 4: Fabric + Print/EMB ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 2 }}>
          {lbl("🧵 เนื้อผ้า (Fabric Type)")}
          <select style={{ ...s.select, maxHeight: 200 }} value={slot.fabricType || ""} onChange={e => onChange(idx, { ...slot, fabricType: e.target.value })}>
            <option value="">— เลือกเนื้อผ้า —</option>
            {FABRIC_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            {data.fabrics.map(f => <option key={f.id} value={f.name}>{f.name} (Master)</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          {lbl("Print / EMB")}
          <select style={s.select} value={slot.printTypeId} onChange={e => onChange(idx, { ...slot, printTypeId: e.target.value })}>
            {data.printTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Row 5: Spec file attachment ── */}
      <div style={{ marginBottom: 10 }}>
        {lbl("📎 แนบไฟล์ Spec / ใบสั่งผลิต")}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ cursor: "pointer" }}>
            <div style={{ padding: "7px 14px", background: "#0a1020", border: `1px dashed ${slot.specFile ? C.ok : C.border}`, borderRadius: 6, fontSize: 11, color: slot.specFile ? C.ok : C.muted, display: "flex", alignItems: "center", gap: 6 }}>
              📎 {slot.specFileName || "เลือกไฟล์ (PDF, Image, Word)"}
            </div>
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={handleSpec} style={{ display: "none" }} />
          </label>
          {slot.specFile && (
            <button onClick={() => onChange(idx, { ...slot, specFile: null, specFileName: "" })}
              style={{ ...s.btnGhost, padding: "4px 10px", fontSize: 11, color: C.err, borderColor: C.err + "50" }}>× ลบ</button>
          )}
        </div>
        {slot.specFile && slot.specFileName?.match(/\.(jpg|jpeg|png|webp)$/i) && (
          <img src={slot.specFile} alt="spec" style={{ marginTop: 6, maxHeight: 80, borderRadius: 6, border: `1px solid ${C.border}` }} />
        )}
      </div>

      {/* ── Row 6: Note ── */}
      <div>
        {lbl("📝 หมายเหตุรายการนี้")}
        <input style={{ ...s.input, borderColor: slot.slotNote ? C.accent + "60" : C.border }}
          placeholder="เช่น ปักโลโก้ด้านหน้า, สกรีนหลัง, บุซับใน..."
          value={slot.slotNote || ""} onChange={e => onChange(idx, { ...slot, slotNote: e.target.value })} />
      </div>
    </div>
  );
}

function OrderDetailModal({ order, data, onClose }) {
  const statusColor = (st) => ({ draft: C.muted, confirmed: C.accent2, production: C.ok, done: "#22c55e", cancelled: C.err }[st] || C.muted);
  const totalQty = (order.slots || []).reduce((s, sl) => s + (parseInt(sl.qty) || 0), 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000c", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1100, padding: 16, overflowY: "auto" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, width: "100%", maxWidth: 700, marginTop: 20, marginBottom: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: "#0a1020", borderRadius: "14px 14px 0 0" }}>
          <div>
            <span style={{ fontWeight: 800, color: C.accent, fontSize: 16 }}>{order.id}</span>
            <Tag text={order.status} color={statusColor(order.status)} style={{ marginLeft: 10 }} />
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22 }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Order info */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {[["ลูกค้า", order.customer], ["วันที่", order.date], ["Qty รวม", totalQty.toLocaleString() + " ตัว"]].map(([k, v]) => (
              <div key={k} style={{ background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Special Notice */}
          {order.specialNotice && (
            <div style={{ background: "#7f1d1d20", border: `1px solid ${C.err}40`, borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.err, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>⚠️ หมายเหตุพิเศษ</div>
              <div style={{ fontSize: 13, color: C.text }}>{order.specialNotice}</div>
            </div>
          )}

          {/* Product Slots */}
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>รายการสินค้า ({(order.slots || []).length} รายการ)</div>
          {(order.slots || []).map((slot, i) => {
            const pat = data.patterns.find(p => p.id === slot.patternId);
            const pt = data.printTypes.find(p => p.id === slot.printTypeId);
            const sizesMale = slot.sizes?.male || {};
            const sizesFemale = slot.sizes?.female || {};
            const hasSizes = SIZES.some(sz => (sizesMale[sz] || 0) + (sizesFemale[sz] || 0) > 0);
            return (
              <div key={i} style={{ background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                {/* Top row: image + name + qty */}
                <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  {slot.imagePreview
                    ? <img src={slot.imagePreview} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    : <div style={{ width: 64, height: 64, background: C.border, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>👕</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{pat?.name || "— ยังไม่เลือก Pattern —"}</span>
                        {slot.patternType && <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 10, background: C.accent + "20", border: `1px solid ${C.accent}50`, fontSize: 10, color: C.accent }}>{slot.patternType}</span>}
                      </div>
                      <span style={{ fontWeight: 700, color: C.accent, fontSize: 15, flexShrink: 0 }}>{parseInt(slot.qty) || 0} ตัว</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.sub }}>
                      {slot.fabricType && <span style={{ marginRight: 8 }}>🧵 {slot.fabricType}</span>}
                      {pt?.name && pt.name !== "None" && <span>🖨 {pt.name}</span>}
                    </div>
                  </div>
                </div>

                {/* Colors */}
                {(slot.colors || []).length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, color: C.muted }}>🎨 สี:</span>
                    {(slot.colors || []).map(c => {
                      const col = PRESET_COLORS.find(x => x.name === c);
                      return <span key={c} title={c} style={{ width: 16, height: 16, borderRadius: "50%", background: col?.hex || "#888", border: `1px solid ${C.border}`, display: "inline-block" }} />;
                    })}
                    {slot.colorNote && <span style={{ fontSize: 10, color: C.sub }}>({slot.colorNote})</span>}
                  </div>
                )}

                {/* Size table */}
                {hasSizes && (
                  <div style={{ overflowX: "auto", marginBottom: 6 }}>
                    <table style={{ borderCollapse: "collapse", fontSize: 10, minWidth: 400 }}>
                      <thead>
                        <tr>
                          <th style={{ ...s.th, padding: "4px 8px", fontSize: 9 }}>Gender</th>
                          {SIZES.map(sz => <th key={sz} style={{ ...s.th, padding: "4px 6px", textAlign: "center", fontSize: 9 }}>{sz}</th>)}
                          <th style={{ ...s.th, padding: "4px 8px", textAlign: "center", fontSize: 9, color: C.accent }}>รวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[["male","👔 ชาย",C.accent2],["female","👗 หญิง","#ec4899"]].map(([g, lbl, clr]) => {
                          const gSizes = slot.sizes?.[g] || {};
                          const tot = SIZES.reduce((s,sz)=>s+(gSizes[sz]||0),0);
                          if (!tot) return null;
                          return (
                            <tr key={g}>
                              <td style={{ ...s.td, padding: "3px 8px", color: clr, fontWeight: 700, fontSize: 10 }}>{lbl}</td>
                              {SIZES.map(sz => <td key={sz} style={{ ...s.td, padding: "3px 6px", textAlign: "center", color: gSizes[sz] ? C.text : C.muted }}>{gSizes[sz] || "—"}</td>)}
                              <td style={{ ...s.td, padding: "3px 8px", textAlign: "center", fontWeight: 700, color: C.accent }}>{tot}</td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td style={{ ...s.td, padding: "3px 8px", color: C.muted, fontSize: 10 }}>รวม</td>
                          {SIZES.map(sz => {
                            const tot = (sizesMale[sz]||0)+(sizesFemale[sz]||0);
                            return <td key={sz} style={{ ...s.td, padding: "3px 6px", textAlign: "center", fontWeight: 700, color: tot ? C.ok : C.muted }}>{tot || "—"}</td>;
                          })}
                          <td style={{ ...s.td, padding: "3px 8px", textAlign: "center", fontWeight: 700, color: C.accent }}>
                            {SIZES.reduce((s,sz)=>(sizesMale[sz]||0)+(sizesFemale[sz]||0)+s,0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Spec file + note */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {slot.specFileName && (
                    <span style={{ fontSize: 10, color: C.ok, background: C.ok + "15", borderRadius: 4, padding: "2px 8px" }}>📎 {slot.specFileName}</span>
                  )}
                  {slot.slotNote && (
                    <span style={{ fontSize: 11, color: C.accent, background: C.accent + "12", borderRadius: 4, padding: "3px 7px" }}>📝 {slot.slotNote}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderModule({ data, setData, setActiveOrder }) {
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [form, setForm] = useState({});
  const [slots, setSlots] = useState([EMPTY_SLOT()]);
  const [activeTab, setActiveTab] = useState("info");
  const [patTypeFilter, setPatTypeFilter] = useState("");
  const [patSearch, setPatSearch] = useState("");

  const statusColor = (st) => ({ draft: C.muted, confirmed: C.accent2, production: C.ok, done: "#22c55e", cancelled: C.err }[st] || C.muted);

  // Customer autocomplete — union of item master customers + past orders
  const customerOptions = useMemo(() => {
    const fromItems  = PRIMER_ITEMS_V3.map(i => i.customer).filter(Boolean);
    const fromOrders = data.orders.map(o => o.customer).filter(Boolean);
    return [...new Set([...fromOrders, ...fromItems])].sort();
  }, [data.orders]);

  // SKU search options — name + newSku + code from items_v3
  const skuOptions = useMemo(() =>
    PRIMER_ITEMS_V3.map(i => {
      const parts = [i.name];
      if (i.newSku) parts.push(`[${i.newSku}]`);
      if (i.code)   parts.push(`(${i.code})`);
      return parts.join("  ");
    }),
  []);

  const openAdd = (o = null) => {
    if (o) {
      const rawSlots = o.slots || [];
      const metaSlot = rawSlots.find(sl => sl._meta);
      const actualSlots = rawSlots.filter(sl => !sl._meta);
      setForm({
        ...o,
        pricingMode:     metaSlot?.pricingMode     || "fob",
        cuttingFee:      metaSlot?.cuttingFee      || "",
        sewingFee:       metaSlot?.sewingFee        || "",
        accessoriesFee:  metaSlot?.accessoriesFee   || "",
        adminFee:        metaSlot?.adminFee         || "",
        freightCost:     metaSlot?.freightCost      || "",
        fobCuttingFee:   metaSlot?.fobCuttingFee    || "",
        fobSewingFee:    metaSlot?.fobSewingFee     || "",
        fobFreightCost:  metaSlot?.fobFreightCost   || "",
        fobOtherCost:    metaSlot?.fobOtherCost     || "",
        fobUsePattern:   metaSlot?.fobUsePattern    !== false,
        skuRef:          metaSlot?.skuRef            || "",
      });
      setSlots(actualSlots.length > 0 ? actualSlots : [EMPTY_SLOT()]);
    } else {
      setForm({ date: new Date().toISOString().slice(0, 10), status: "draft", pricingMode: "fob" });
      setSlots([EMPTY_SLOT()]);
    }
    setActiveTab("info");
    setModal(true);
  };

  const save = () => {
    const id = form.id || ("SO-" + Date.now().toString().slice(-4));
    const actualSlots = slots.filter(sl => !sl._meta);
    const totalQty = actualSlots.reduce((s, sl) => s + (parseInt(sl.qty) || 0), 0);
    const primarySlot = actualSlots[0] || {};
    const pricingMeta = {
      _meta: true,
      pricingMode:    form.pricingMode    || "fob",
      cuttingFee:     parseFloat(form.cuttingFee)     || 0,
      sewingFee:      parseFloat(form.sewingFee)       || 0,
      accessoriesFee: parseFloat(form.accessoriesFee)  || 0,
      adminFee:       parseFloat(form.adminFee)        || 0,
      freightCost:    parseFloat(form.freightCost)     || 0,
      fobCuttingFee:  parseFloat(form.fobCuttingFee)  || 0,
      fobSewingFee:   parseFloat(form.fobSewingFee)   || 0,
      fobFreightCost: parseFloat(form.fobFreightCost) || 0,
      fobOtherCost:   parseFloat(form.fobOtherCost)   || 0,
      fobUsePattern:  form.fobUsePattern !== false,
      skuRef:         form.skuRef || "",
    };
    const order = {
      ...form, id,
      qty: totalQty,
      patternId: form.patternId || data.patterns[0]?.id,
      printTypeId: primarySlot.printTypeId || form.printTypeId || "PT001",
      targetPrice: parseFloat(form.targetPrice) || 0,
      slots: [pricingMeta, ...actualSlots],
      specialNotice: form.specialNotice || "",
    };
    setData(d => ({ ...d, orders: [...d.orders.filter(o => o.id !== id), order] }));
    upsertOrder(order);
    setModal(false);
  };

  const del = (id) => { setData(d => ({ ...d, orders: d.orders.filter(o => o.id !== id) })); deleteOrder(id); };

  const updateSlot = (idx, updated) => setSlots(sl => sl.map((s, i) => i === idx ? updated : s));
  const removeSlot = (idx) => setSlots(sl => sl.filter((_, i) => i !== idx));
  const addSlot = () => setSlots(sl => [...sl, EMPTY_SLOT()]);

  const actualSlots = slots.filter(sl => !sl._meta);
  const totalSlotsQty = actualSlots.reduce((s, sl) => s + (parseInt(sl.qty) || 0), 0);

  return (
    <div>
      <SectionHead title={t("orderTitle")} sub={t("orderSub")}
        action={<button style={s.btn()} onClick={() => openAdd()}>{t("createOrder")}</button>} />

      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{[t("colId"), t("colCustomer"), t("colSlots"), t("colQty"), t("colTarget"), t("colDate"), t("colStatus"), ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.orders.length === 0 && (
              <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: C.muted, padding: 32 }}>ยังไม่มี Order — กดสร้าง Order ด้านบน</td></tr>
            )}
            {data.orders.map(o => (
              <tr key={o.id} style={{ cursor: "pointer" }}>
                <td style={{ ...s.td, color: C.accent, fontWeight: 700 }}>{o.id}</td>
                <td style={s.td}>{o.customer}</td>
                <td style={{ ...s.td, color: C.sub }}>
                  {(() => {
                    const meta = (o.slots||[]).find(sl => sl._meta);
                    const realSlots = (o.slots||[]).filter(sl => !sl._meta);
                    return realSlots.length > 0
                      ? <span>
                          {realSlots.length} รายการ
                          {meta?.pricingMode === "cmt"  && <span style={{ marginLeft: 5, fontSize: 9, background: C.ok+"25", color: C.ok, borderRadius: 3, padding: "1px 5px" }}>📐 CMT</span>}
                          {meta?.pricingMode === "fob"  && <span style={{ marginLeft: 5, fontSize: 9, background: C.accent2+"25", color: C.accent2, borderRadius: 3, padding: "1px 5px" }}>📦 FOB</span>}
                          {o.slots?.some(sl => sl.imagePreview) ? " 📷" : ""}
                          {o.specialNotice ? " ⚠️" : ""}
                        </span>
                      : <span style={{ color: C.muted }}>—</span>;
                  })()}
                </td>
                <td style={{ ...s.td, color: C.accent, fontWeight: 700 }}>{o.qty?.toLocaleString()} ตัว</td>
                <td style={s.td}>{o.targetPrice ? `฿${fmt(o.targetPrice)}` : "-"}</td>
                <td style={{ ...s.td, color: C.muted }}>{o.date}</td>
                <td style={s.td}><Tag text={o.status} color={statusColor(o.status)} /></td>
                <td style={s.td}>
                  <button onClick={() => setViewModal(o)} style={{ ...s.btnGhost, padding: "3px 8px", marginRight: 4, fontSize: 11 }}>👁 ดู</button>
                  <button onClick={() => setActiveOrder(o.id)} style={{ ...s.btn(C.accent2, true), padding: "4px 8px", marginRight: 4, fontSize: 11 }}>BOM</button>
                  <button onClick={() => openAdd(o)} style={{ ...s.btnGhost, padding: "3px 8px", marginRight: 4, fontSize: 11 }}>แก้</button>
                  <button onClick={() => del(o.id)} style={{ ...s.btnGhost, padding: "3px 8px", color: C.err, borderColor: C.err + "50", fontSize: 11 }}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* CREATE / EDIT MODAL */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "#000c", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, width: "100%", maxWidth: 640, marginTop: 20, marginBottom: 20 }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: "#0a1020", borderRadius: "14px 14px 0 0" }}>
              <span style={{ fontWeight: 700, color: C.accent, fontSize: 15 }}>{form.id ? `แก้ไข ${form.id}` : "สร้าง Order ใหม่"}</span>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22 }}>×</button>
            </div>

            {/* ── Pricing Mode Selector ── */}
            <div style={{ padding: "12px 20px", background: "#060b16", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>ประเภทการคิดต้นทุน / Pricing Mode</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "fob",  icon: "📦", label: "FOB",        sub: "Fabric + Labor + Accessories",              color: C.accent2 },
                  { id: "cmt",  icon: "📐", label: "CMT",         sub: "ค่าตัด + ค่าเย็บ + Accessories + ค่าดำเนินการ + ค่าขนส่ง", color: C.ok },
                ].map(m => {
                  const active = (form.pricingMode || "fob") === m.id;
                  return (
                    <button key={m.id} onClick={() => setForm(f => ({ ...f, pricingMode: m.id }))} style={{
                      flex: 1, padding: "10px 14px", background: active ? m.color+"20" : C.card,
                      border: `2px solid ${active ? m.color : C.border}`, borderRadius: 8,
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? m.color : C.muted }}>
                        {m.icon} {m.label}
                        {active && <span style={{ marginLeft: 6, fontSize: 9, background: m.color, color: "#000", borderRadius: 3, padding: "1px 5px", fontWeight: 700 }}>ACTIVE</span>}
                      </div>
                      <div style={{ fontSize: 10, color: active ? m.color+"cc" : C.muted, marginTop: 3 }}>{m.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
              {[["info", t("tabInfo")], ["slots", `${t("tabSlots")} (${actualSlots.length})`], ["notice", t("tabNotice")]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{
                  flex: 1, padding: "12px 8px", background: "none", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 11, fontWeight: 600,
                  color: activeTab === id ? C.accent : C.muted,
                  borderBottom: activeTab === id ? `2px solid ${C.accent}` : "2px solid transparent",
                }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: 20 }}>
              {/* TAB: INFO */}
              {activeTab === "info" && (
                <div>

                  {/* ══ Pattern Selector — Scrollable Card List ══ */}
                  {(() => {
                    const selPat = data.patterns.find(p => p.id === form.patternId);
                    const TYPE_PILLS = [
                      { label: "👕 T-Shirt",   key: "T-Shirt" },
                      { label: "👔 Polo",       key: "Polo" },
                      { label: "🎽 Activewear", key: "Activewear" },
                      { label: "👖 Pants",      key: "Pants" },
                      { label: "🧥 Jacket",     key: "Jacket" },
                      { label: "🌐 ทั้งหมด",    key: "" },
                    ];
                    // Filter by type pill then by search text
                    const byType = patTypeFilter
                      ? data.patterns.filter(p => (p.patternType || "").toLowerCase().includes(patTypeFilter.toLowerCase()))
                      : data.patterns;
                    const listPats = patSearch.trim()
                      ? byType.filter(p => p.name.toLowerCase().includes(patSearch.toLowerCase()) || (p.patternType||"").toLowerCase().includes(patSearch.toLowerCase()))
                      : byType;

                    return (
                      <div style={{ marginBottom: 16, padding: "14px 16px", background: C.accent+"09", border: `1px solid ${C.accent}35`, borderRadius: 10 }}>
                        {/* Header row */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>📦 Pattern / SKU</span>
                          {selPat && (
                            <button style={{ fontSize: 10, color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: 5, cursor: "pointer", padding: "2px 8px", fontFamily: "inherit" }}
                              onClick={() => { setForm(f => ({ ...f, patternId: "" })); }}>✕ ล้าง</button>
                          )}
                        </div>

                        {/* Type filter pills */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                          {TYPE_PILLS.map(pill => {
                            const active = patTypeFilter === pill.key;
                            const cnt = pill.key
                              ? data.patterns.filter(p => (p.patternType||"").toLowerCase().includes(pill.key.toLowerCase())).length
                              : data.patterns.length;
                            return (
                              <button key={pill.key || "all"}
                                onClick={() => { setPatTypeFilter(pill.key); setPatSearch(""); }}
                                style={{
                                  padding: "5px 13px", fontSize: 11, borderRadius: 20, fontFamily: "inherit", cursor: "pointer",
                                  border: `1px solid ${active ? C.accent : C.border}`,
                                  background: active ? C.accent+"28" : C.card,
                                  color: active ? C.accent : C.sub, fontWeight: active ? 700 : 400,
                                  transition: "all 0.12s",
                                }}>
                                {pill.label}
                                <span style={{ marginLeft: 5, fontSize: 9, color: active ? C.accent+"bb" : C.muted }}>({cnt})</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Search box */}
                        <div style={{ position: "relative", marginBottom: 8 }}>
                          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.muted, pointerEvents: "none" }}>🔍</span>
                          <input
                            style={{ ...s.input, paddingLeft: 32, fontSize: 12 }}
                            value={patSearch}
                            onChange={e => setPatSearch(e.target.value)}
                            placeholder={patTypeFilter ? `ค้นหาใน ${patTypeFilter}...` : "ค้นหาชื่อ Pattern..."}
                          />
                          {patSearch && (
                            <button onClick={() => setPatSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                          )}
                        </div>

                        {/* Scrollable pattern card list */}
                        {data.patterns.length === 0 ? (
                          <div style={{ fontSize: 11, color: "#f59e0b", padding: "10px 12px", background: "#f59e0b12", border: "1px solid #f59e0b30", borderRadius: 7 }}>
                            ⚡ ยังไม่มี Pattern — ไปเพิ่มใน Master Data ก่อน
                          </div>
                        ) : listPats.length === 0 ? (
                          <div style={{ fontSize: 11, color: C.muted, padding: "10px 12px", background: C.card, border: `1px dashed ${C.border}`, borderRadius: 7, textAlign: "center" }}>
                            ไม่พบ Pattern ที่ตรงกับเงื่อนไข
                          </div>
                        ) : (
                          <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 2 }}>
                            {listPats.map(p => {
                              const isSelected = form.patternId === p.id;
                              const fab = p.fabricId ? data.fabrics.find(f => f.id === p.fabricId) : null;
                              const accList = (p.accessories || []).map(a => {
                                const acc = data.accessories.find(x => x.id === a.accId);
                                return acc ? `${acc.name} ×${a.qtyPerUnit}` : null;
                              }).filter(Boolean);
                              return (
                                <div key={p.id}
                                  onClick={() => setForm(f => ({ ...f, patternId: p.id }))}
                                  style={{
                                    padding: "10px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.12s",
                                    border: `1px solid ${isSelected ? C.accent : C.border}`,
                                    background: isSelected ? C.accent+"18" : "#080d18",
                                    outline: isSelected ? `1px solid ${C.accent}50` : "none",
                                  }}
                                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = C.accent+"60"; }}
                                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = C.border; }}
                                >
                                  {/* Card row 1: name + type + selected tick */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: (fab || accList.length) ? 6 : 0 }}>
                                    {isSelected && <span style={{ fontSize: 12, color: C.accent }}>✓</span>}
                                    <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? C.accent : C.text, flex: 1 }}>{p.name}</span>
                                    {p.patternType && (
                                      <span style={{ fontSize: 9, padding: "2px 8px", background: isSelected ? C.accent+"30" : C.border+"80", color: isSelected ? C.accent : C.sub, borderRadius: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                                        {p.patternType}
                                      </span>
                                    )}
                                  </div>
                                  {/* Card row 2: master data info */}
                                  {(fab || p.laborCut > 0 || p.laborSew > 0 || p.laborQC > 0) && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: accList.length ? 5 : 0 }}>
                                      {fab && <span style={{ fontSize: 10, color: C.sub }}>🧵 {fab.name}{p.fabricPerUnit ? ` ${p.fabricPerUnit}ม/ตัว` : ""}</span>}
                                      {p.laborCut  > 0 && <span style={{ fontSize: 10, color: C.sub }}>✂️ ฿{fmt(p.laborCut)}</span>}
                                      {p.laborSew  > 0 && <span style={{ fontSize: 10, color: C.sub }}>🪡 ฿{fmt(p.laborSew)}</span>}
                                      {p.laborQC   > 0 && <span style={{ fontSize: 10, color: C.sub }}>🔍 ฿{fmt(p.laborQC)}</span>}
                                    </div>
                                  )}
                                  {/* Card row 3: accessories chips */}
                                  {accList.length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                      {accList.map(a => (
                                        <span key={a} style={{ fontSize: 9, padding: "1px 7px", background: C.border+"90", color: C.muted, borderRadius: 8 }}>{a}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Count hint */}
                        <div style={{ marginTop: 7, fontSize: 9, color: C.muted }}>
                          {listPats.length} / {data.patterns.length} Pattern
                          {patTypeFilter ? ` — ${patTypeFilter}` : ""}
                          {patSearch ? ` — ค้นหา "${patSearch}"` : ""}
                        </div>
                      </div>
                    );
                  })()}

                  <Row2>
                    <Field label={t("customerName")}>
                      <AutocompleteInput
                        value={form.customer || ""}
                        onChange={val => setForm(f => ({ ...f, customer: val }))}
                        options={customerOptions}
                        placeholder="พิมพ์ชื่อลูกค้า หรือเลือกจากรายการ..."
                      />
                    </Field>

                    {/* SKU reference field */}
                    <Field label="ชื่อสินค้า / รหัส / โค้ด">
                      <AutocompleteInput
                        value={form.skuRef || ""}
                        onChange={val => setForm(f => ({ ...f, skuRef: val }))}
                        options={skuOptions}
                        placeholder="ค้นหาด้วย ชื่อสินค้า, รหัส SKU, โค้ด P/T..."
                      />
                      {form.skuRef && (() => {
                        const raw  = form.skuRef.replace(/\s+\[.*\].*$/, "").trim();
                        const item = PRIMER_ITEMS_V3.find(i => i.name === raw);
                        if (!item) return null;
                        return (
                          <div style={{ marginTop: 5, padding: "6px 10px", background: C.accent2+"10", border: `1px solid ${C.accent2}35`, borderRadius: 7 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: C.accent2 }}>{item.name}</span>
                              {item.newSku && <span style={{ fontSize: 9, padding: "1px 7px", background: C.accent2+"22", color: C.accent2, borderRadius: 8, fontWeight: 700 }}>{item.newSku}</span>}
                              {item.code   && <span style={{ fontSize: 9, color: C.muted }}>PT: {item.code}</span>}
                              {item.fabricType && <span style={{ fontSize: 9, color: C.sub }}>🧵 {item.fabricType}</span>}
                              {item.gender && <span style={{ fontSize: 9, color: C.sub }}>{item.gender === "M" ? "👔 ชาย" : item.gender === "F" ? "👗 หญิง" : item.gender}</span>}
                              {item.customer && <span style={{ fontSize: 9, color: C.muted }}>👤 {item.customer}</span>}
                            </div>
                            {(item.cost || item.factoryPrice || item.sellPrice) && (
                              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                                {item.cost         && <span style={{ fontSize: 9, color: C.sub }}>ต้นทุน: ฿{fmt(item.cost)}</span>}
                                {item.factoryPrice && <span style={{ fontSize: 9, color: C.sub }}>Factory: ฿{fmt(item.factoryPrice)}</span>}
                                {item.sellPrice    && <span style={{ fontSize: 9, color: C.ok }}>ขาย: ฿{fmt(item.sellPrice)}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </Field>

                    <Field label={t("targetPrice")} half><input style={s.input} type="number" value={form.targetPrice || ""} onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))} placeholder="฿" /></Field>
                    <Field label={t("orderDate")} half><input style={s.input} type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
                    <Field label={t("dueDate")} half><input style={s.input} type="date" value={form.dueDate || ""} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></Field>
                    <Field label={t("orderStatus")} half>
                      <select style={s.select} value={form.status || "draft"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="draft">{t("draft")}</option>
                        <option value="confirmed">{t("confirmed")}</option>
                        <option value="production">{t("production")}</option>
                        <option value="done">{t("done")}</option>
                        <option value="cancelled">{t("cancelled")}</option>
                      </select>
                    </Field>
                    <Field label={t("orderChannel")} half>
                      <select style={s.select} value={form.channel || ""} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
                        <option value="">— {t("selectOrder")} —</option>
                        <option value="direct">{t("channelDirect")}</option>
                        <option value="line">LINE</option>
                        <option value="email">Email</option>
                        <option value="phone">โทรศัพท์</option>
                        <option value="website">Website</option>
                        <option value="agent">Agent</option>
                      </select>
                    </Field>
                    <Field label="เบอร์ติดต่อ / Line ID" half><input style={s.input} value={form.contact || ""} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="081-xxx-xxxx" /></Field>
                  </Row2>

                  {/* CMT extra fields */}
                  {(form.pricingMode || "fob") === "cmt" && (
                    <div style={{ marginTop: 16, padding: "14px 16px", background: C.ok+"0e", border: `1px solid ${C.ok}35`, borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.ok }}>📐 CMT — รายละเอียดต้นทุน</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.ok+"99", marginBottom: 14 }}>
                        Cut, Make &amp; Trim — ลูกค้าจัดหาผ้า / Factory คิดค่าตัด ค่าเย็บ อุปกรณ์ และค่าดำเนินการ
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                        {[
                          ["cuttingFee",     "✂️ ค่าตัดงาน",              "฿ ต่อตัว"],
                          ["sewingFee",      "🪡 ค่าเย็บงาน",              "฿ ต่อตัว"],
                          ["accessoriesFee", "🧵 ค่าอุปกรณ์เสริม / Accessories", "฿ ต่อตัว"],
                          ["adminFee",       "📋 ค่าดำเนินการ",            "฿ รวมทั้ง Order"],
                          ["freightCost",    "🚚 ค่าขนส่ง / Freight",      "฿ รวมทั้ง Order"],
                        ].map(([key, label, hint]) => (
                          <Field key={key} label={label}>
                            <div style={{ position: "relative" }}>
                              <input
                                style={{ ...s.input, paddingLeft: 28 }}
                                type="number"
                                min="0"
                                step="0.01"
                                value={form[key] || ""}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                placeholder="0.00"
                              />
                              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted }}>฿</span>
                            </div>
                            <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{hint}</div>
                          </Field>
                        ))}
                      </div>

                      {/* CMT live cost preview */}
                      {(() => {
                        const qty   = totalSlotsQty || 0;
                        const cut   = parseFloat(form.cuttingFee)     || 0;
                        const sew   = parseFloat(form.sewingFee)       || 0;
                        const acc   = parseFloat(form.accessoriesFee)  || 0;
                        const adm   = parseFloat(form.adminFee)        || 0;
                        const frt   = parseFloat(form.freightCost)     || 0;
                        const perUnitFixed  = cut + sew + acc;
                        const perUnitShared = qty > 0 ? (adm + frt) / qty : 0;
                        const cmtPerUnit    = perUnitFixed + perUnitShared;
                        const cmtTotal      = perUnitFixed * qty + adm + frt;

                        const rows = [
                          ["✂️ ค่าตัดงาน",         cut * qty,  cut],
                          ["🪡 ค่าเย็บงาน",         sew * qty,  sew],
                          ["🧵 ค่าอุปกรณ์เสริม",    acc * qty,  acc],
                          ["📋 ค่าดำเนินการ",        adm,        adm / Math.max(qty,1)],
                          ["🚚 ค่าขนส่ง",            frt,        frt / Math.max(qty,1)],
                        ].filter(([, total]) => total > 0);

                        return cmtTotal > 0 ? (
                          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.ok}30` }}>
                            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>สรุปต้นทุน CMT</div>
                            {rows.map(([label, total, perU]) => (
                              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: C.sub }}>{label}</span>
                                <span style={{ color: C.text }}>฿{fmt(perU)}/ตัว <span style={{ color: C.muted }}>= ฿{fmt(total)}</span></span>
                              </div>
                            ))}
                            <div style={{ borderTop: `1px solid ${C.ok}30`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontWeight: 700, color: C.ok }}>CMT รวม/ตัว</span>
                              <span style={{ fontWeight: 700, color: C.ok }}>฿{fmt(cmtPerUnit)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: C.ok }}>CMT รวมทั้ง Order ({qty.toLocaleString()} ตัว)</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: C.ok }}>฿{fmt(cmtTotal)}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: 12, fontSize: 10, color: C.muted }}>กรอกค่าใช้จ่ายเพื่อดูสรุปต้นทุน CMT</div>
                        );
                      })()}
                    </div>
                  )}

                  {/* FOB extra fields */}
                  {(form.pricingMode || "fob") === "fob" && (
                    <div style={{ marginTop: 16, padding: "14px 16px", background: C.accent2+"0e", border: `1px solid ${C.accent2}35`, borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.accent2 }}>📦 FOB — ค่าแรงตัดเย็บ &amp; ค่าส่ง</span>
                        {(() => {
                          const pp = data.patterns.find(p => p.id === form.patternId);
                          if (!pp) return null;
                          const useP = form.fobUsePattern !== false;
                          const btnStyle = (active) => ({ padding: "3px 10px", fontSize: 10, borderRadius: 6, border: `1px solid ${active ? C.accent2 : C.border}`, background: active ? C.accent2+"22" : "transparent", color: active ? C.accent2 : C.muted, cursor: "pointer", fontFamily: "inherit" });
                          return (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button style={btnStyle(useP)} onClick={() => setForm(f => ({ ...f, fobUsePattern: true }))}>🔗 จาก Pattern</button>
                              <button style={btnStyle(!useP)} onClick={() => setForm(f => ({ ...f, fobUsePattern: false }))}>✏️ กรอกเอง</button>
                            </div>
                          );
                        })()}
                      </div>
                      <div style={{ fontSize: 10, color: C.accent2+"99", marginBottom: 10 }}>
                        ค่าแรงตัดเย็บ + ค่าขนส่ง + ค่าอื่นๆ (ไม่รวมผ้า/อุปกรณ์ที่คำนวณจาก Pattern)
                      </div>

                      {(() => {
                        const pp = data.patterns.find(p => p.id === form.patternId);
                        const useP = form.fobUsePattern !== false && !!pp;
                        if (pp && useP) return (
                          <div style={{ marginBottom: 10, padding: "8px 12px", background: C.accent2+"15", borderRadius: 7, fontSize: 11, color: C.accent2 }}>
                            🔗 ดึงค่าจาก Pattern: <strong>{pp.name}</strong> — ค่าตัด ฿{fmt(pp.laborCut)}/ตัว, ค่าเย็บ ฿{fmt(pp.laborSew)}/ตัว
                          </div>
                        );
                        return null;
                      })()}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                        {(() => {
                          const pp = data.patterns.find(p => p.id === form.patternId);
                          const useP = form.fobUsePattern !== false && !!pp;
                          return [
                            { key: "fobCuttingFee", label: "✂️ ค่าตัด (Cutting Fee)", hint: "฿ ต่อตัว",        locked: useP, val: useP ? (pp?.laborCut ?? "") : (form.fobCuttingFee || "") },
                            { key: "fobSewingFee",  label: "🪡 ค่าเย็บ (Sewing Fee)",  hint: "฿ ต่อตัว",        locked: useP, val: useP ? (pp?.laborSew ?? "") : (form.fobSewingFee  || "") },
                            { key: "fobFreightCost",label: "📦 ค่าส่ง / Freight",       hint: "฿ รวมทั้ง Order", locked: false, val: form.fobFreightCost || "" },
                            { key: "fobOtherCost",  label: "📋 ค่าอื่นๆ / Other",        hint: "฿ รวมทั้ง Order", locked: false, val: form.fobOtherCost   || "" },
                          ].map(({ key, label, hint, locked, val }) => (
                            <Field key={key} label={label}>
                              <div style={{ position: "relative" }}>
                                <input
                                  style={{ ...s.input, paddingLeft: 28, opacity: locked ? 0.65 : 1 }}
                                  type="number" min="0" step="0.01"
                                  value={val}
                                  readOnly={locked}
                                  onChange={locked ? undefined : e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                  placeholder="0.00"
                                />
                                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted }}>฿</span>
                              </div>
                              <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{hint}{locked && " (จาก Pattern)"}</div>
                            </Field>
                          ));
                        })()}
                      </div>

                      {/* FOB live cost preview */}
                      {(() => {
                        const pp  = data.patterns.find(p => p.id === form.patternId);
                        const useP = form.fobUsePattern !== false && !!pp;
                        const qty  = totalSlotsQty || 0;
                        const cut  = useP ? (parseFloat(pp?.laborCut) || 0) : (parseFloat(form.fobCuttingFee)  || 0);
                        const sew  = useP ? (parseFloat(pp?.laborSew) || 0) : (parseFloat(form.fobSewingFee)   || 0);
                        const frt  = parseFloat(form.fobFreightCost) || 0;
                        const oth  = parseFloat(form.fobOtherCost)   || 0;
                        const perUnitFixed  = cut + sew;
                        const perUnitShared = qty > 0 ? (frt + oth) / qty : 0;
                        const fobPerUnit    = perUnitFixed + perUnitShared;
                        const fobTotal      = perUnitFixed * qty + frt + oth;
                        const rows = [
                          ["✂️ ค่าตัด",   cut * qty, cut],
                          ["🪡 ค่าเย็บ",   sew * qty, sew],
                          ["📦 ค่าส่ง",   frt,       frt / Math.max(qty,1)],
                          ["📋 ค่าอื่นๆ", oth,       oth / Math.max(qty,1)],
                        ].filter(([, total]) => total > 0);
                        return fobTotal > 0 ? (
                          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.accent2}30` }}>
                            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>สรุปค่าแรง + ค่าส่ง (FOB)</div>
                            {rows.map(([label, total, perU]) => (
                              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: C.sub }}>{label}</span>
                                <span style={{ color: C.text }}>฿{fmt(perU)}/ตัว <span style={{ color: C.muted }}>= ฿{fmt(total)}</span></span>
                              </div>
                            ))}
                            <div style={{ borderTop: `1px solid ${C.accent2}30`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontWeight: 700, color: C.accent2 }}>FOB Labor รวม/ตัว</span>
                              <span style={{ fontWeight: 700, color: C.accent2 }}>฿{fmt(fobPerUnit)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: C.accent2 }}>FOB Labor รวมทั้ง Order ({qty.toLocaleString()} ตัว)</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: C.accent2 }}>฿{fmt(fobTotal)}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: 12, fontSize: 10, color: C.muted }}>กรอกค่าใช้จ่ายเพื่อดูสรุปต้นทุน FOB Labor</div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: SLOTS */}
              {activeTab === "slots" && (
                <div>
                  {/* Top bar: total qty + add button */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "10px 14px", background: "#060b16", borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <div>
                      <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Qty รวมทุกรายการ</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.accent, lineHeight: 1.2 }}>{totalSlotsQty.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 400 }}>ตัว</span></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{actualSlots.length} รายการสินค้า</span>
                      <button onClick={addSlot} style={{ ...s.btn(C.accent2, true), padding: "8px 18px", fontSize: 12 }}>+ เพิ่ม SKU</button>
                    </div>
                  </div>

                  {/* Product slots */}
                  {actualSlots.map((slot, i) => (
                    <ProductSlot key={slot.id || i} slot={slot} idx={i} data={data} onChange={updateSlot} onRemove={removeSlot} orderPatternId={form.patternId} />
                  ))}

                  {/* Bottom add button */}
                  <button onClick={addSlot} style={{ width: "100%", padding: "12px", background: "transparent", border: `2px dashed ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}
                    onMouseEnter={e => { e.target.style.borderColor = C.accent2; e.target.style.color = C.accent2; }}
                    onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}>
                    <span style={{ fontSize: 18 }}>+</span> เพิ่มรายการสินค้า (SKU)
                  </button>
                </div>
              )}

              {/* TAB: NOTICE */}
              {activeTab === "notice" && (
                <div>
                  <div style={{ marginBottom: 16, padding: "12px 14px", background: "#7f1d1d18", border: `1px solid ${C.err}30`, borderRadius: 8, fontSize: 12, color: C.sub }}>
                    ⚠️ ใช้สำหรับบันทึกคำแนะนำพิเศษ เช่น ข้อกำหนดการผลิต, การแพ็คพิเศษ, วันที่ต้องส่งด่วน ฯลฯ
                  </div>
                  <Field label="หมายเหตุพิเศษของ Order นี้">
                    <textarea
                      style={{ ...s.input, height: 120, resize: "vertical", lineHeight: 1.6 }}
                      value={form.specialNotice || ""}
                      onChange={e => setForm(f => ({ ...f, specialNotice: e.target.value }))}
                      placeholder={"เช่น:\n- ต้องส่งก่อนวันที่ 30 เม.ย.\n- แพ็คใส่ถุงแยกไซส์\n- ห้ามใช้ด้ายสีดำ\n- ลูกค้าต้องการ QC ก่อนส่ง 100%"}
                    />
                  </Field>
                  <Field label="ลำดับความสำคัญ">
                    <select style={s.select} value={form.priority || "normal"} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="low">🟢 ปกติ (Low)</option>
                      <option value="normal">🟡 กลาง (Normal)</option>
                      <option value="high">🔴 ด่วน (High)</option>
                      <option value="urgent">🚨 ด่วนมาก (Urgent)</option>
                    </select>
                  </Field>
                  <Field label="ไฟล์แนบ / Link อ้างอิง">
                    <input style={s.input} value={form.referenceLink || ""} onChange={e => setForm(f => ({ ...f, referenceLink: e.target.value }))} placeholder="https://drive.google.com/... หรือ link ตัวอย่าง" />
                  </Field>
                </div>
              )}

              {/* Footer buttons */}
              <div style={{ display: "flex", gap: 8, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <button style={s.btn()} onClick={save}>💾 บันทึก Order</button>
                <button style={s.btnGhost} onClick={() => setModal(false)}>ยกเลิก</button>
                {activeTab !== "slots" && (
                  <button style={{ ...s.btnGhost, marginLeft: "auto" }} onClick={() => setActiveTab("slots")}>
                    ถัดไป: รายการสินค้า →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAIL MODAL */}
      {viewModal && <OrderDetailModal order={viewModal} data={data} onClose={() => setViewModal(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODULE: BOM (ENHANCED — with Purchase Bills & Price Comparison)
// ═══════════════════════════════════════════════════════════════

const EMPTY_BILL = () => ({
  id: "BILL-" + Date.now().toString().slice(-5),
  invoiceNo: "",
  supplier: "",
  date: new Date().toISOString().slice(0, 10),
  items: [{ materialName: "", qty: "", unit: "", pricePerUnit: "", totalAmount: "", note: "" }],
  receiptImage: null,
  status: "pending",
  paidDate: "",
});

function BillModal({ bill, onSave, onClose, suppliers }) {
  const [form, setForm] = useState({ ...bill });

  const updateItem = (idx, field, val) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      if (field === "qty" || field === "pricePerUnit") {
        updated.totalAmount = ((parseFloat(updated.qty) || 0) * (parseFloat(updated.pricePerUnit) || 0)).toFixed(2);
      }
      return updated;
    });
    setForm(f => ({ ...f, items }));
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { materialName: "", qty: "", unit: "", pricePerUnit: "", totalAmount: "", note: "" }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const grandTotal = form.items.reduce((s, it) => s + (parseFloat(it.totalAmount) || 0), 0);

  const handleReceipt = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, receiptImage: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000d", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1200, padding: 16, overflowY: "auto" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, width: "100%", maxWidth: 700, marginTop: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: "#0a1020", borderRadius: "14px 14px 0 0" }}>
          <span style={{ fontWeight: 700, color: C.accent, fontSize: 15 }}>🧾 {form.id ? `บิล ${form.id}` : "บันทึกบิลใหม่"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22 }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Bill Header Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            <div style={{ gridColumn: "1/3" }}>
              <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>เลขที่ใบเสร็จ / Invoice No.</div>
              <input style={s.input} placeholder="เช่น INV-2024-001" value={form.invoiceNo || ""} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>วันที่ซื้อ</div>
              <input style={s.input} type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div style={{ gridColumn: "1/3" }}>
              <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>ชื่อ Supplier</div>
              <input style={s.input} placeholder="ชื่อร้านหรือ Supplier" value={form.supplier || ""} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} list="supplier-list" />
              <datalist id="supplier-list">
                {(suppliers || []).map(sup => <option key={sup.id} value={sup.name} />)}
              </datalist>
            </div>
            <div>
              <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>สถานะการชำระ</div>
              <select style={s.select} value={form.status || "pending"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="pending">⏳ รอชำระ</option>
                <option value="paid">✅ จ่ายแล้ว</option>
                <option value="partial">💛 จ่ายบางส่วน</option>
              </select>
            </div>
          </div>

          {/* Receipt Image Upload */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>📷 ถ่ายรูปใบเสร็จ / สแกนบิล</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <label style={{ cursor: "pointer", flexShrink: 0 }}>
                <div style={{
                  width: 90, height: 90, borderRadius: 8,
                  border: `2px dashed ${form.receiptImage ? C.ok : C.border}`,
                  background: form.receiptImage ? "transparent" : "#060b16",
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
                }}>
                  {form.receiptImage
                    ? <img src={form.receiptImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ textAlign: "center" }}><div style={{ fontSize: 26, opacity: 0.3 }}>🧾</div><div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>อัปโหลด</div></div>
                  }
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleReceipt} />
              </label>
              <div style={{ flex: 1, fontSize: 12, color: C.sub, lineHeight: 1.7 }}>
                อัปโหลดภาพใบเสร็จ หรือรูปถ่ายบิลจากร้านค้า<br />
                เพื่อใช้ตรวจสอบกับรายการที่กรอกด้านล่าง
                {form.receiptImage && <div><button onClick={() => setForm(f => ({ ...f, receiptImage: null }))} style={{ ...s.btnGhost, padding: "3px 10px", fontSize: 11, color: C.err, borderColor: C.err + "50", marginTop: 6 }}>× ลบรูป</button></div>}
              </div>
            </div>
          </div>

          {/* Material Line Items */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>รายการวัตถุดิบในบิลนี้</div>
            <button onClick={addItem} style={{ ...s.btn(C.accent2, true), padding: "5px 12px", fontSize: 11 }}>+ เพิ่มรายการ</button>
          </div>

          <div style={{ background: "#060b16", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            {/* Header Row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 32px", gap: 6, padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
              {["รายการ", "จำนวน", "หน่วย", "ราคา/หน่วย", "รวม", ""].map(h => (
                <div key={h} style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</div>
              ))}
            </div>
            {form.items.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 32px", gap: 6, padding: "8px 10px", borderBottom: i < form.items.length - 1 ? `1px solid ${C.border}20` : "none", alignItems: "center" }}>
                <input style={{ ...s.input, fontSize: 12, padding: "6px 8px" }} placeholder="ชื่อวัตถุดิบ" value={item.materialName} onChange={e => updateItem(i, "materialName", e.target.value)} />
                <input style={{ ...s.input, fontSize: 12, padding: "6px 8px" }} type="number" placeholder="0" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} />
                <input style={{ ...s.input, fontSize: 12, padding: "6px 8px" }} placeholder="m / pcs" value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)} />
                <input style={{ ...s.input, fontSize: 12, padding: "6px 8px" }} type="number" placeholder="฿" value={item.pricePerUnit} onChange={e => updateItem(i, "pricePerUnit", e.target.value)} />
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textAlign: "right" }}>
                  {item.totalAmount ? `฿${parseFloat(item.totalAmount).toLocaleString()}` : "—"}
                </div>
                {form.items.length > 1
                  ? <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: C.err, cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
                  : <div />
                }
              </div>
            ))}
            {/* Grand Total */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 10px", background: "#0a1020", borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>ยอดรวมบิลนี้</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>฿{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button style={s.btn()} onClick={() => onSave(form)}>💾 บันทึกบิล</button>
            <button style={s.btnGhost} onClick={onClose}>ยกเลิก</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BOMModule({ data, setData, activeOrderId, setActiveModule }) {
  const order = data.orders.find(o => o.id === activeOrderId) || data.orders[0];
  const [selOrder, setSelOrder] = useState(order?.id || "");
  const [activeTab, setActiveTab] = useState("bom");
  const [billModal, setBillModal] = useState(null);
  const [editBill, setEditBill] = useState(null);
  const [compareItem, setCompareItem] = useState(null);

  const bills = (data.bills || []);

  const ord = data.orders.find(o => o.id === selOrder);
  const pat = ord && data.patterns.find(p => p.id === ord.patternId);
  const fab = pat && data.fabrics.find(f => f.id === pat.fabricId);
  const pt = ord && data.printTypes.find(p => p.id === ord.printTypeId);

  const stockItems = ord && pat ? (() => {
    const items = [];
    const fabNeeded = pat.fabricPerUnit * ord.qty;
    const fabHave = data.stock[pat.fabricId] || 0;
    items.push({ id: pat.fabricId, name: fab?.name || pat.fabricId, type: "Fabric", needed: fabNeeded.toFixed(2), have: fabHave, ok: fabHave >= fabNeeded, unit: fab?.unit || "m", costEach: fab?.costPerUnit || 0, totalCost: (fab?.costPerUnit || 0) * fabNeeded });
    pat.accessories.forEach(a => {
      const acc = data.accessories.find(x => x.id === a.accId);
      const needed = Math.ceil(a.qtyPerUnit * ord.qty);
      const have = data.stock[a.accId] || 0;
      items.push({ id: a.accId, name: acc?.name || a.accId, type: "Trim", needed, have, ok: have >= needed, unit: acc?.unit || "pcs", costEach: acc?.costPerUnit || 0, totalCost: (acc?.costPerUnit || 0) * needed });
    });
    return items;
  })() : [];

  const saveBill = (form) => {
    setData(d => ({ ...d, bills: [...(d.bills || []).filter(b => b.id !== form.id), form] }));
    upsertBill(form);
    setBillModal(false);
    setEditBill(null);
  };

  const deleteBill = (id) => { setData(d => ({ ...d, bills: (d.bills || []).filter(b => b.id !== id) })); dbDeleteBill(id); };

  // Build price comparison: for each BOM material, find all bills that contain it
  const buildComparison = (materialName) => {
    const results = [];
    (data.bills || []).forEach(bill => {
      (bill.items || []).forEach(item => {
        if (item.materialName.toLowerCase().includes(materialName.toLowerCase())) {
          results.push({
            billId: bill.id,
            invoiceNo: bill.invoiceNo,
            supplier: bill.supplier,
            date: bill.date,
            qty: item.qty,
            unit: item.unit,
            pricePerUnit: parseFloat(item.pricePerUnit) || 0,
            totalAmount: parseFloat(item.totalAmount) || 0,
          });
        }
      });
    });
    return results.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  };

  const statusColor = (st) => ({ paid: C.ok, pending: "#eab308", partial: C.accent2 }[st] || C.muted);
  const statusLabel = (st) => ({ paid: "✅ จ่ายแล้ว", pending: "⏳ รอชำระ", partial: "💛 บางส่วน" }[st] || st);

  const totalBillsPaid = bills.filter(b => b.status === "paid").reduce((s, b) => s + b.items.reduce((ss, it) => ss + (parseFloat(it.totalAmount) || 0), 0), 0);
  const totalBillsPending = bills.filter(b => b.status !== "paid").reduce((s, b) => s + b.items.reduce((ss, it) => ss + (parseFloat(it.totalAmount) || 0), 0), 0);

  return (
    <div>
      <SectionHead title={t("bomTitle")} sub={t("bomSub")} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#060b16", borderRadius: 10, padding: 4, border: `1px solid ${C.border}` }}>
        {[["bom", t("tabBom")], ["bills", `${t("tabBills")} (${bills.length})`], ["compare", t("tabCompare")]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            flex: 1, padding: "8px 6px", background: activeTab === id ? C.accent : "none",
            color: activeTab === id ? C.bg : C.muted, border: "none", borderRadius: 7,
            cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, transition: "all 0.2s"
          }}>{label}</button>
        ))}
      </div>

      {/* ══ TAB: BOM ══ */}
      {activeTab === "bom" && (
        <>
          <Card style={{ marginBottom: 14 }}>
            <Field label="เลือก Order">
              <select style={s.select} value={selOrder} onChange={e => setSelOrder(e.target.value)}>
                {data.orders.map(o => <option key={o.id} value={o.id}>{o.id} — {o.customer} ({o.qty} ตัว)</option>)}
              </select>
            </Field>
          </Card>

          {ord && pat && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                {[["Order", ord.id], ["ลูกค้า", ord.customer], ["Pattern", pat.name], ["Qty", ord.qty?.toLocaleString() + " ตัว"]].map(([k, v]) => (
                  <div key={k} style={{ background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginTop: 3 }}>{v}</div>
                  </div>
                ))}
              </div>

              <Card>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>รายการวัตถุดิบ</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["รายการ", "ประเภท", "ใช้/ตัว", "รวมต้องการ", "มีในสต๊อก", "ราคา Master", "ต้นทุนรวม", "สถานะ", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {stockItems.map((item, i) => {
                      const comparisons = buildComparison(item.name);
                      const lowestBill = comparisons[0];
                      const priceDiff = lowestBill ? lowestBill.pricePerUnit - item.costEach : null;
                      return (
                        <tr key={i}>
                          <td style={s.td}>{item.name}</td>
                          <td style={s.td}><Tag text={item.type} color={item.type === "Fabric" ? C.accent : C.accent2} /></td>
                          <td style={{ ...s.td, color: C.sub }}>{i === 0 ? pat.fabricPerUnit + " " + (fab?.unit || "m") : pat.accessories[i - 1]?.qtyPerUnit + " " + item.unit}</td>
                          <td style={{ ...s.td, color: C.accent }}>{item.needed} {item.unit}</td>
                          <td style={{ ...s.td, color: item.ok ? C.ok : C.err }}>{item.have} {item.unit}</td>
                          <td style={s.td}>
                            ฿{fmt(item.costEach)}
                            {priceDiff !== null && (
                              <div style={{ fontSize: 10, color: priceDiff > 0 ? C.err : C.ok }}>
                                {priceDiff > 0 ? `▲ บิลแพงกว่า +฿${fmt(priceDiff)}` : `▼ บิลถูกกว่า ฿${fmt(Math.abs(priceDiff))}`}
                              </div>
                            )}
                          </td>
                          <td style={{ ...s.td, color: C.accent }}>฿{fmt(item.totalCost)}</td>
                          <td style={s.td}>
                            {item.ok
                              ? <Tag text="✓ จองสต๊อก" color={C.ok} />
                              : <Tag text={`✗ ขาด ${(parseFloat(item.needed) - item.have).toLocaleString()} ${item.unit}`} color={C.err} />}
                          </td>
                          <td style={s.td}>
                            {comparisons.length > 0 && (
                              <button onClick={() => { setCompareItem(item.name); setActiveTab("compare"); }}
                                style={{ ...s.btnGhost, padding: "3px 8px", fontSize: 10 }}>⚖️ {comparisons.length} บิล</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {pt && pt.name !== "None" && (
                      <tr>
                        <td style={s.td}>{pt.name}</td>
                        <td style={s.td}><Tag text="Print/EMB" color="#8b5cf6" /></td>
                        <td style={{ ...s.td, color: C.sub }}>1 ตัว</td>
                        <td style={{ ...s.td, color: C.accent }}>{ord.qty} ตัว</td>
                        <td style={{ ...s.td, color: C.muted }}>—</td>
                        <td style={s.td}>฿{fmt(pt.costPerUnit)}</td>
                        <td style={{ ...s.td, color: C.accent }}>฿{fmt(pt.costPerUnit * ord.qty)}</td>
                        <td style={s.td}><Tag text="จ้างภายนอก" color="#f59e0b" /></td>
                        <td style={s.td} />
                      </tr>
                    )}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#060b16", borderRadius: 6, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: C.sub }}>ต้นทุนวัตถุดิบรวม (excl. labor/overhead)</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>฿{fmt(stockItems.reduce((s, i) => s + i.totalCost, 0) + (pt && pt.name !== "None" ? pt.costPerUnit * ord.qty : 0))}</span>
                </div>
              </Card>

              {stockItems.some(i => !i.ok) && (
                <div style={{ marginTop: 12, padding: 14, background: C.err + "10", border: `1px solid ${C.err}40`, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: C.err, marginBottom: 6 }}>⚠️ ต้องออกใบสั่งซื้อ (PO) สำหรับ:</div>
                  {stockItems.filter(i => !i.ok).map((item, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.sub, marginLeft: 16 }}>• {item.name}: ขาด {(parseFloat(item.needed) - item.have).toLocaleString()} {item.unit}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ══ TAB: BILLS ══ */}
      {activeTab === "bills" && (
        <>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              ["🧾 บิลทั้งหมด", bills.length + " บิล", C.accent],
              ["✅ จ่ายแล้ว", "฿" + totalBillsPaid.toLocaleString(), C.ok],
              ["⏳ ค้างชำระ", "฿" + totalBillsPending.toLocaleString(), "#eab308"],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 4 }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button style={s.btn()} onClick={() => { setEditBill(EMPTY_BILL()); setBillModal(true); }}>+ บันทึกบิลใหม่</button>
          </div>

          {bills.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>ยังไม่มีบิล — กด "บันทึกบิลใหม่" เพื่อเริ่ม</div>
          )}

          {bills.map(bill => {
            const billTotal = bill.items.reduce((s, it) => s + (parseFloat(it.totalAmount) || 0), 0);
            return (
              <div key={bill.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {/* Receipt thumbnail */}
                    {bill.receiptImage
                      ? <img src={bill.receiptImage} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, flexShrink: 0 }} />
                      : <div style={{ width: 48, height: 48, background: "#060b16", border: `1px dashed ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🧾</div>
                    }
                    <div>
                      <div style={{ fontWeight: 700, color: C.accent, fontSize: 14 }}>{bill.invoiceNo || bill.id}</div>
                      <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>🏭 {bill.supplier} · 📅 {bill.date}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{bill.items.length} รายการ</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>฿{billTotal.toLocaleString()}</div>
                    <Tag text={statusLabel(bill.status)} color={statusColor(bill.status)} />
                  </div>
                </div>

                {/* Items preview */}
                <div style={{ background: "#060b16", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "6px 10px", borderBottom: `1px solid ${C.border}` }}>
                    {["รายการ", "จำนวน", "ราคา/หน่วย", "รวม"].map(h => <div key={h} style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>{h}</div>)}
                  </div>
                  {bill.items.map((item, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "7px 10px", borderBottom: i < bill.items.length - 1 ? `1px solid ${C.border}15` : "none" }}>
                      <div style={{ fontSize: 12, color: C.text }}>{item.materialName || "—"}</div>
                      <div style={{ fontSize: 12, color: C.sub }}>{item.qty} {item.unit}</div>
                      <div style={{ fontSize: 12, color: C.sub }}>฿{item.pricePerUnit}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>฿{parseFloat(item.totalAmount || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setEditBill(bill); setBillModal(true); }} style={{ ...s.btnGhost, padding: "4px 12px", fontSize: 11 }}>✏️ แก้ไข</button>
                  <button onClick={() => deleteBill(bill.id)} style={{ ...s.btnGhost, padding: "4px 12px", fontSize: 11, color: C.err, borderColor: C.err + "50" }}>🗑 ลบ</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ══ TAB: PRICE COMPARE ══ */}
      {activeTab === "compare" && (
        <>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>ค้นหาวัตถุดิบเพื่อเปรียบราคา</div>
            <input style={s.input} placeholder="พิมพ์ชื่อผ้า หรือวัตถุดิบ เช่น Cotton, Zipper..." value={compareItem || ""} onChange={e => setCompareItem(e.target.value)} />
          </Card>

          {compareItem && (() => {
            const results = buildComparison(compareItem);
            if (results.length === 0) return (
              <div style={{ textAlign: "center", padding: 32, color: C.muted, fontSize: 13 }}>ไม่พบรายการ "{compareItem}" ในบิลที่บันทึกไว้</div>
            );
            const lowest = results[0];
            const highest = results[results.length - 1];
            return (
              <>
                {/* Summary Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <div style={{ background: "#060b16", border: `1px solid ${C.ok}40`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: C.muted }}>💚 ราคาถูกสุด</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.ok, marginTop: 4 }}>฿{fmt(lowest.pricePerUnit)}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{lowest.supplier}</div>
                  </div>
                  <div style={{ background: "#060b16", border: `1px solid ${C.err}40`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: C.muted }}>🔴 ราคาแพงสุด</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.err, marginTop: 4 }}>฿{fmt(highest.pricePerUnit)}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{highest.supplier}</div>
                  </div>
                  <div style={{ background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: C.muted }}>📊 ส่วนต่าง</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.accent, marginTop: 4 }}>฿{fmt(highest.pricePerUnit - lowest.pricePerUnit)}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{results.length} บิลที่พบ</div>
                  </div>
                </div>

                {/* Comparison Table */}
                <Card>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 12 }}>
                    ผลเปรียบราคา "{compareItem}" — เรียงจากถูกที่สุด
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["อันดับ", "Supplier", "Invoice No.", "วันที่", "จำนวน", "ราคา/หน่วย", "รวม", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} style={{ background: i === 0 ? C.ok + "08" : "none" }}>
                          <td style={{ ...s.td, textAlign: "center" }}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                          </td>
                          <td style={{ ...s.td, fontWeight: 600, color: C.text }}>{r.supplier}</td>
                          <td style={{ ...s.td, color: C.muted }}>{r.invoiceNo || r.billId}</td>
                          <td style={{ ...s.td, color: C.muted }}>{r.date}</td>
                          <td style={s.td}>{r.qty} {r.unit}</td>
                          <td style={{ ...s.td, fontWeight: 700, color: i === 0 ? C.ok : i === results.length - 1 ? C.err : C.text }}>
                            ฿{fmt(r.pricePerUnit)}
                          </td>
                          <td style={{ ...s.td, color: C.accent }}>฿{r.totalAmount.toLocaleString()}</td>
                          <td style={s.td}>
                            {i === 0 && <Tag text="ถูกสุด" color={C.ok} />}
                            {i === results.length - 1 && results.length > 1 && <Tag text="แพงสุด" color={C.err} />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Price bar chart visual */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>กราฟเปรียบราคา</div>
                    {results.map((r, i) => {
                      const pct = highest.pricePerUnit > 0 ? (r.pricePerUnit / highest.pricePerUnit) * 100 : 100;
                      const barColor = i === 0 ? C.ok : i === results.length - 1 ? C.err : C.accent2;
                      return (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <div style={{ fontSize: 11, color: C.sub }}>{r.supplier}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: barColor }}>฿{fmt(r.pricePerUnit)}</div>
                          </div>
                          <div style={{ background: C.border, borderRadius: 4, height: 8 }}>
                            <div style={{ width: pct + "%", height: "100%", background: barColor, borderRadius: 4, transition: "width 0.6s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            );
          })()}

          {!compareItem && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
              <div style={{ color: C.sub, fontSize: 14, marginBottom: 6 }}>พิมพ์ชื่อวัตถุดิบด้านบน</div>
              <div style={{ color: C.muted, fontSize: 12 }}>เพื่อดูราคาเปรียบเทียบจากทุก Supplier ที่เคยซื้อ</div>
            </div>
          )}
        </>
      )}

      {/* Bill Modal */}
      {billModal && editBill && (
        <BillModal bill={editBill} onSave={saveBill} onClose={() => { setBillModal(false); setEditBill(null); }} suppliers={data.suppliers} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODULE: INVENTORY
// ═══════════════════════════════════════════════════════════════

function InventoryModule({ data, setData }) {
  const [adjustModal, setAdjustModal] = useState(null);
  const [adj, setAdj] = useState({ qty: "", reason: "" });

  const allItems = [
    ...data.fabrics.map(f => ({ ...f, itemType: "Fabric", stockKey: f.id })),
    ...data.accessories.map(a => ({ ...a, itemType: "Trim", stockKey: a.id })),
  ];

  const saveAdj = () => {
    const delta = parseFloat(adj.qty) || 0;
    const newQty = Math.max(0, (data.stock[adjustModal] || 0) + delta);
    setData(d => ({ ...d, stock: { ...d.stock, [adjustModal]: newQty } }));
    upsertStock(adjustModal, newQty);
    setAdjustModal(null);
    setAdj({ qty: "", reason: "" });
  };

  const lowItems = allItems.filter(i => (data.stock[i.stockKey] || 0) < 100);

  const importStock = async (file) => {
    const rows = await readExcel(file);
    const items = rows.map(mapStockRow).filter(x => x.itemId && x.qty >= 0);
    const newStock = { ...data.stock };
    items.forEach(i => { newStock[i.itemId] = i.qty; });
    setData(d => ({ ...d, stock: newStock }));
    items.forEach(i => upsertStock(i.itemId, i.qty));
    return items.length;
  };

  return (
    <div>
      <SectionHead title={t("invTitle")} sub={t("invSub")}
        action={<ImportBtn onImport={importStock} />} />

      {lowItems.length > 0 && (
        <div style={{ padding: 12, background: "#7f1d1d20", border: `1px solid ${C.err}40`, borderRadius: 8, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.err, fontWeight: 700 }}>⚠️ สต๊อกต่ำ:</span>
          {lowItems.map(i => <Tag key={i.id} text={`${i.name} (${data.stock[i.stockKey] || 0})`} color={C.err} />)}
        </div>
      )}

      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["ID", "รายการ", "ประเภท", "Qty ในสต๊อก", "หน่วย", "ราคา/unit", "มูลค่า", "Status", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {allItems.map(item => {
              const qty = data.stock[item.stockKey] || 0;
              const status = qty === 0 ? "หมด" : qty < 50 ? "วิกฤต" : qty < 150 ? "ต่ำ" : "ปกติ";
              const sc = { หมด: C.err, วิกฤต: "#f97316", ต่ำ: "#eab308", ปกติ: C.ok }[status];
              return (
                <tr key={item.id}>
                  <td style={{ ...s.td, color: C.muted }}>{item.id}</td>
                  <td style={s.td}>{item.name}</td>
                  <td style={s.td}><Tag text={item.itemType} color={item.itemType === "Fabric" ? C.accent : C.accent2} /></td>
                  <td style={{ ...s.td, fontWeight: 700, color: qty < 100 ? C.err : C.ok, fontSize: 14 }}>{qty.toLocaleString()}</td>
                  <td style={s.td}>{item.unit}</td>
                  <td style={s.td}>฿{fmt(item.costPerUnit)}</td>
                  <td style={{ ...s.td, color: C.accent }}>฿{fmt(qty * item.costPerUnit)}</td>
                  <td style={s.td}><Tag text={status} color={sc} /></td>
                  <td style={s.td}>
                    <button onClick={() => setAdjustModal(item.stockKey)} style={{ ...s.btn(C.accent2, true), padding: "4px 10px" }}>ปรับ</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 10, padding: "8px 12px", background: "#060b16", borderRadius: 6, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>มูลค่าสต๊อกรวม</span>
          <span style={{ fontWeight: 700, color: C.accent }}>
            ฿{fmt(allItems.reduce((sum, i) => sum + (data.stock[i.stockKey] || 0) * i.costPerUnit, 0))}
          </span>
        </div>
      </Card>

      {adjustModal && (
        <Modal title="ปรับ Stock" onClose={() => setAdjustModal(null)}>
          <div style={{ marginBottom: 12, color: C.sub, fontSize: 12 }}>รายการ: {allItems.find(i => i.stockKey === adjustModal)?.name}</div>
          <div style={{ marginBottom: 12, color: C.text, fontSize: 14 }}>ปัจจุบัน: <strong>{(data.stock[adjustModal] || 0).toLocaleString()}</strong></div>
          <Field label="เพิ่ม/ลด จำนวน (ใส่ - เพื่อตัดสต๊อก)"><input style={s.input} type="number" value={adj.qty} onChange={e => setAdj(a => ({ ...a, qty: e.target.value }))} placeholder="เช่น +200 หรือ -50" /></Field>
          <Field label="เหตุผล"><input style={s.input} value={adj.reason} onChange={e => setAdj(a => ({ ...a, reason: e.target.value }))} placeholder="รับของ / ตัดสต๊อก / สต๊อกเสีย" /></Field>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={s.btn()} onClick={saveAdj}>บันทึก</button>
            <button style={s.btnGhost} onClick={() => setAdjustModal(null)}>ยกเลิก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODULE: COSTING + PRICING
// ═══════════════════════════════════════════════════════════════

function CostingModule({ data }) {
  const [selOrder, setSelOrder] = useState(data.orders[0]?.id || "");
  const [mode, setMode] = useState("margin");
  const [margin, setMargin] = useState(30);
  const [sellPrice, setSellPrice] = useState("");

  const ord = data.orders.find(o => o.id === selOrder);
  const cost = ord ? calcCost(ord, data.patterns, data.fabrics, data.accessories, data.printTypes, data.costRates) : null;
  const pat = ord && data.patterns.find(p => p.id === ord.patternId);

  const finalSell = mode === "margin"
    ? (cost ? cost.totalPerUnit * (1 + margin / 100) : 0)
    : (parseFloat(sellPrice) || (cost?.totalPerUnit || 0));

  const profitPerUnit = cost ? finalSell - cost.totalPerUnit : 0;
  const profitTotal = profitPerUnit * (ord?.qty || 0);
  const marginActual = finalSell > 0 ? (profitPerUnit / finalSell) * 100 : 0;

  return (
    <div>
      <SectionHead title={t("costTitle")} sub={t("costSub")} />
      <Card style={{ marginBottom: 14 }}>
        <Field label="เลือก Order">
          <select style={s.select} value={selOrder} onChange={e => setSelOrder(e.target.value)}>
            {data.orders.map(o => <option key={o.id} value={o.id}>{o.id} — {o.customer} ({o.qty} ตัว)</option>)}
          </select>
        </Field>
      </Card>

      {cost && ord && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {/* Cost Breakdown */}
            <Card>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>ต้นทุน / ตัว</div>
              {[
                [`Fabric (${pat?.fabricPerUnit}${data.fabrics.find(f => f.id === pat?.fabricId)?.unit || "m"} × ฿${data.fabrics.find(f => f.id === pat?.fabricId)?.costPerUnit})`, cost.fabricCost],
                ["Trim & Accessories", cost.trimCost],
                [`Labor (ตัด+เย็บ+QC)`, cost.laborCost],
                ...(cost.printCost > 0 ? [[data.printTypes.find(p => p.id === ord.printTypeId)?.name || "Print", cost.printCost]] : []),
                [`Overhead (${data.costRates.overheadRate}%)`, cost.overhead],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, borderBottom: `1px solid #0a1020` }}>
                  <span style={{ color: C.sub }}>{k}</span>
                  <span style={{ color: C.text }}>฿{fmt(v)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: 4 }}>
                <span style={{ fontWeight: 700, color: C.text }}>รวมต้นทุน / ตัว</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: C.accent }}>฿{fmt(cost.totalPerUnit)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ fontSize: 12, color: C.muted }}>รวมทั้งหมด ({ord.qty?.toLocaleString()} ตัว)</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>฿{fmt(cost.totalCost)}</span>
              </div>
              {ord.targetPrice > 0 && (
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: ord.targetPrice >= cost.totalPerUnit ? C.ok + "15" : C.err + "15", border: `1px solid ${ord.targetPrice >= cost.totalPerUnit ? C.ok : C.err}40` }}>
                  <div style={{ fontSize: 11, color: C.muted }}>ราคาเป้าหมายลูกค้า vs ต้นทุน</div>
                  <div style={{ fontWeight: 700, color: ord.targetPrice >= cost.totalPerUnit ? C.ok : C.err }}>
                    ฿{fmt(ord.targetPrice)} / ตัว {ord.targetPrice >= cost.totalPerUnit ? "✓ กำไร" : "✗ ขาดทุน"}
                  </div>
                </div>
              )}
            </Card>

            {/* Pricing */}
            <Card>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>ตั้งราคาขาย</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[["margin", "🎯 Margin %"], ["manual", "✏️ ราคาเอง"]].map(([m, l]) => (
                  <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, background: mode === m ? C.accent : "#060b16", color: mode === m ? "#000" : C.muted }}>
                    {l}
                  </button>
                ))}
              </div>
              {mode === "margin" ? (
                <div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Margin: <strong style={{ color: C.accent }}>{margin}%</strong></div>
                  <input type="range" min={0} max={100} value={margin} onChange={e => setMargin(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
                </div>
              ) : (
                <Field label="ราคาขาย / ตัว (฿)"><input style={s.input} type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder={`แนะนำ ฿${fmt(cost.totalPerUnit * 1.3)}`} /></Field>
              )}
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["ราคาขาย/ตัว", `฿${fmt(finalSell)}`, C.accent], ["กำไร/ตัว", `฿${fmt(profitPerUnit)}`, profitPerUnit >= 0 ? C.ok : C.err], ["Margin จริง", `${marginActual.toFixed(1)}%`, profitPerUnit >= 0 ? C.ok : C.err], ["กำไรรวม", `฿${fmt(profitTotal)}`, profitTotal >= 0 ? C.ok : C.err]].map(([k, v, c]) => (
                  <div key={k} style={{ background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>{k}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: c, marginTop: 3 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODULE: REPORTS
// ═══════════════════════════════════════════════════════════════

function ReportModule({ data }) {
  const [selOrder, setSelOrder] = useState(data.orders[0]?.id || "");
  const [report, setReport] = useState("quotation");

  const ord = data.orders.find(o => o.id === selOrder);
  const pat = ord && data.patterns.find(p => p.id === ord.patternId);
  const fab = pat && data.fabrics.find(f => f.id === pat.fabricId);
  const pt = ord && data.printTypes.find(p => p.id === ord.printTypeId);
  const cost = ord ? calcCost(ord, data.patterns, data.fabrics, data.accessories, data.printTypes, data.costRates) : null;
  const finalSell = cost ? cost.totalPerUnit * 1.3 : 0;
  const profit = cost ? (finalSell - cost.totalPerUnit) * ord.qty : 0;

  const stockItems = ord && pat ? (() => {
    const items = [];
    const fabNeeded = pat.fabricPerUnit * ord.qty;
    const fabHave = data.stock[pat.fabricId] || 0;
    items.push({ name: fab?.name, needed: fabNeeded.toFixed(1), have: fabHave, ok: fabHave >= fabNeeded, unit: fab?.unit || "m" });
    pat.accessories.forEach(a => {
      const acc = data.accessories.find(x => x.id === a.accId);
      const needed = Math.ceil(a.qtyPerUnit * ord.qty);
      const have = data.stock[a.accId] || 0;
      items.push({ name: acc?.name || a.accId, needed, have, ok: have >= needed, unit: acc?.unit || "pcs" });
    });
    return items;
  })() : [];

  const reports = [
    { id: "production", label: "🏭 ใบผลิตสินค้า" },
    { id: "bom", label: "📦 ใบสั่งวัตถุดิบ" },
    { id: "stock", label: "🏬 รายงานสต๊อก" },
    { id: "cost", label: "💰 รายงานต้นทุน" },
    { id: "quotation", label: "📄 ใบเสนอราคา" },
  ];

  return (
    <div>
      <SectionHead title={t("reportTitle")} sub={t("reportSub")} />
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 200px" }}>
          <Field label="Order">
            <select style={s.select} value={selOrder} onChange={e => setSelOrder(e.target.value)}>
              {data.orders.map(o => <option key={o.id} value={o.id}>{o.id} – {o.customer}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
          {reports.map(r => (
            <button key={r.id} onClick={() => setReport(r.id)} style={{ ...s.btnGhost, ...(report === r.id ? { background: C.accent + "20", color: C.accent, borderColor: C.accent + "60" } : {}) }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {ord && (
        <Card>
          {/* Production Order */}
          {report === "production" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>ใบสั่งผลิต (Production Order)</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>เลขที่: {ord.id} | วันที่: {ord.date}</div>
              </div>
              {[["ลูกค้า", ord.customer], ["รูปแบบ (Pattern)", pat?.name], ["จำนวนผลิต", `${ord.qty?.toLocaleString()} ตัว`], ["วัตถุดิบหลัก", `${fab?.name} — ${pat?.fabricPerUnit} ${fab?.unit || "m"}/ตัว`], ["Embellishment", pt?.name || "-"], ["ค่าแรงรวม/ตัว", `฿${fmt((pat?.laborCut || 0) + (pat?.laborSew || 0) + (pat?.laborQC || 0))}`], ["Status", ord.status]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, borderBottom: `1px solid #060b16` }}>
                  <span style={{ color: C.muted }}>{k}</span><span style={{ color: C.text, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* BOM Report */}
          {report === "bom" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>ใบสั่งวัตถุดิบ (BOM)</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{ord.id} | {ord.customer} | {ord.qty?.toLocaleString()} ตัว</div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["รายการ", "ต้องการ", "มีในสต๊อก", "Status / PO"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {stockItems.map((item, i) => (
                    <tr key={i}><td style={s.td}>{item.name}</td><td style={{ ...s.td, color: C.accent }}>{item.needed} {item.unit}</td><td style={{ ...s.td, color: item.ok ? C.ok : C.err }}>{item.have} {item.unit}</td><td style={s.td}>{item.ok ? <Tag text="จองสต๊อก" color={C.ok} /> : <Tag text="ต้องสั่งซื้อ" color={C.err} />}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stock Report */}
          {report === "stock" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>รายงานสต๊อก</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>ณ วันที่ {new Date().toLocaleDateString("th-TH")}</div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["รายการ", "ประเภท", "Qty", "หน่วย", "ราคา/unit", "มูลค่า"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {[...data.fabrics.map(f => ({ ...f, t: "Fabric" })), ...data.accessories.map(a => ({ ...a, t: "Trim" }))].map(item => {
                    const qty = data.stock[item.id] || 0;
                    return <tr key={item.id}><td style={s.td}>{item.name}</td><td style={s.td}><Tag text={item.t} color={item.t === "Fabric" ? C.accent : C.accent2} /></td><td style={{ ...s.td, color: qty < 100 ? C.err : C.ok, fontWeight: 700 }}>{qty.toLocaleString()}</td><td style={s.td}>{item.unit}</td><td style={s.td}>฿{fmt(item.costPerUnit)}</td><td style={{ ...s.td, color: C.accent }}>฿{fmt(qty * item.costPerUnit)}</td></tr>;
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#060b16", borderRadius: 6, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.muted }}>มูลค่าสต๊อกรวม</span>
                <span style={{ fontWeight: 700, color: C.accent }}>฿{fmt([...data.fabrics, ...data.accessories].reduce((sum, i) => sum + (data.stock[i.id] || 0) * i.costPerUnit, 0))}</span>
              </div>
            </div>
          )}

          {/* Cost Report */}
          {report === "cost" && cost && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>รายงานต้นทุน</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{ord.id} | {ord.customer} | {ord.qty?.toLocaleString()} ตัว</div>
              </div>
              {[["Fabric Cost", cost.fabricCost, cost.fabricCost * ord.qty], ["Trim Cost", cost.trimCost, cost.trimCost * ord.qty], ["Labor Cost", cost.laborCost, cost.laborCost * ord.qty], ...(cost.printCost > 0 ? [[pt?.name || "Print", cost.printCost, cost.printCost * ord.qty]] : []), [`Overhead (${data.costRates.overheadRate}%)`, cost.overhead, cost.overhead * ord.qty]].map(([k, perUnit, total]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: 13, borderBottom: `1px solid #060b16` }}>
                  <span style={{ color: C.sub, flex: 2 }}>{k}</span>
                  <span style={{ color: C.text, flex: 1, textAlign: "right" }}>฿{fmt(perUnit)}/ตัว</span>
                  <span style={{ color: C.accent, flex: 1, textAlign: "right", fontWeight: 600 }}>฿{fmt(total)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 4px", fontWeight: 700, fontSize: 16, marginTop: 4 }}>
                <span style={{ color: C.text }}>รวมต้นทุนทั้งหมด</span>
                <span style={{ color: C.accent }}>฿{fmt(cost.totalCost)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>ต้นทุน/ตัว: ฿{fmt(cost.totalPerUnit)}</div>
            </div>
          )}

          {/* Quotation */}
          {report === "quotation" && cost && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>ใบเสนอราคา (Quotation)</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>QT-{ord.id} | วันที่: {new Date().toLocaleDateString("th-TH")}</div>
              </div>
              {[["ลูกค้า", ord.customer], ["รายการ", `${pat?.name}${pt && pt.name !== "None" ? " + " + pt.name : ""}`], ["จำนวน", `${ord.qty?.toLocaleString()} ตัว`], ["ต้นทุน/ตัว", `฿${fmt(cost.totalPerUnit)}`], ["ราคาขาย/ตัว (Margin 30%)", `฿${fmt(finalSell)}`], ["มูลค่ารวม", `฿${fmt(finalSell * ord.qty)}`]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, borderBottom: `1px solid #060b16` }}>
                  <span style={{ color: C.muted }}>{k}</span><span style={{ color: C.text, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "14px 16px", background: profit >= 0 ? C.ok + "12" : C.err + "12", border: `1px solid ${profit >= 0 ? C.ok : C.err}40`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, color: C.text }}>กำไรสุทธิ</span>
                  <span style={{ fontWeight: 700, fontSize: 20, color: profit >= 0 ? C.ok : C.err }}>฿{fmt(profit)}</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Margin 30% | ฿{fmt(finalSell - cost.totalPerUnit)}/ตัว</div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// PRIMER_ITEMS_V3 is imported from ./items_v3.json (1,498 SKUs from Primer_Master_Data_v3)

// ═══════════════════════════════════════════════════════════════
// MODULE: ITEM MASTER (PRIMER)
// ═══════════════════════════════════════════════════════════════

function ItemMasterModule({ itemMaster, setItemMaster }) {
  const [searchProduct,  setSearchProduct]  = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterType,     setFilterType]     = useState("");
  const [filterFabric,   setFilterFabric]   = useState("");
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});

  // Product Type mapping (SKU category code → display label)
  const PRODUCT_TYPES = [
    { label: "👕 T-Shirt",       codes: ["TSH"] },
    { label: "👔 Polo",           codes: ["POL"] },
    { label: "🎽 Activewear",     codes: ["ACT","TNK","BRA","ACB"] },
    { label: "👖 Pant / Short",   codes: ["SHO","TRS","TRK","SKT"] },
    { label: "🧥 Jacket",         codes: ["JKT"] },
    { label: "🦺 Coverall / Uni", codes: ["UNI","COV"] },
    { label: "👙 Innerwear",      codes: ["INW","APR"] },
    { label: "📦 Other",          codes: [] },
  ];
  const getTypeLabel = (cat) => {
    const found = PRODUCT_TYPES.find(t => t.codes.includes(cat));
    return found ? found.label : (cat ? "📦 Other" : "");
  };

  const allFabrics   = useMemo(() => [...new Set(itemMaster.map(i => i.fabricType).filter(Boolean))].sort(), [itemMaster]);
  const allCustomers = useMemo(() => [...new Set(itemMaster.map(i => i.customer).filter(Boolean))].sort(), [itemMaster]);

  const filtered = useMemo(() => itemMaster.filter(item => {
    const q = searchProduct.toLowerCase();
    const matchProduct  = !q ||
      (item.code     || '').toLowerCase().includes(q) ||
      (item.name     || '').toLowerCase().includes(q) ||
      (item.newSku   || '').toLowerCase().includes(q) ||
      (item.color    || '').toLowerCase().includes(q) ||
      (item.ptNumber || '').toLowerCase().includes(q);
    const matchSupplier = !filterSupplier || (item.fabricType || '').toLowerCase().includes(filterSupplier.toLowerCase());
    const matchCustomer = !filterCustomer || item.customer === filterCustomer;
    const matchFabric   = !filterFabric   || item.fabricType === filterFabric;
    const matchType     = !filterType || (() => {
      const tp = PRODUCT_TYPES.find(t => t.label === filterType);
      if (!tp) return true;
      if (tp.codes.length === 0) {
        // "Other" = none of the known codes
        return !PRODUCT_TYPES.filter(t=>t.codes.length>0).some(t=>t.codes.includes(item.category));
      }
      return tp.codes.includes(item.category);
    })();
    return matchProduct && matchSupplier && matchCustomer && matchFabric && matchType;
  }), [itemMaster, searchProduct, filterSupplier, filterCustomer, filterFabric, filterType]);

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus(null);
    try {
      const { wb, XLSX } = await readWorkbook(file);
      const parsed = parseItemMasterWb(wb, XLSX);
      if (parsed.length > 0) {
        setItemMaster(parsed);
        setUploadStatus({ ok: true, msg: `✅ นำเข้าสำเร็จ ${parsed.length.toLocaleString()} รายการ (${[...new Set(parsed.map(i=>i.fabricType))].length} ชนิดผ้า)` });
      } else {
        setUploadStatus({ ok: false, msg: "⚠️ ไม่พบข้อมูลที่อ่านได้ — รองรับ: Primer_Master_Data_v3, Item_master_Primer.xlsm" });
      }
    } catch (err) {
      setUploadStatus({ ok: false, msg: `❌ Error: ${err.message}` });
    }
    setUploading(false);
  };

  const saveItem = () => {
    const id = form.code;
    if (!id) return;
    setItemMaster(prev => [...prev.filter(x => x.code !== id), { ...form, cost: parseFloat(form.cost) || 0, sellPrice: parseFloat(form.sellPrice) || 0, factoryPrice: parseFloat(form.factoryPrice) || 0 }]);
    setModal(false);
  };

  const delItem = (code) => setItemMaster(prev => prev.filter(x => x.code !== code));

  const groupLabel = { "41111": "เสื้อชาย-ใหญ่", "41211": "เสื้อชาย-เล็ก", "41112": "เสื้อหญิง-ใหญ่", "41212": "เสื้อหญิง-เล็ก", "41121": "เสื้อแขนยาวชาย-ใหญ่", "41221": "เสื้อแขนยาวชาย-เล็ก", "41161": "รัดกล้าม-ใหญ่", "41261": "รัดกล้าม-เล็ก", "41411": "Export" };

  return (
    <div>
      <SectionHead title="📁 ITEM MASTER — PRIMER" sub={`ฐานข้อมูลสินค้า ${itemMaster.length.toLocaleString()} รายการ`}
        action={<button style={s.btn()} onClick={() => { setForm({}); setModal(true); }}>+ เพิ่ม SKU</button>} />

      {/* Excel Upload Panel */}
      <Card style={{ marginBottom: 16, border: `1px solid ${C.accent}40`, background: "#0f1a2e" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 28 }}>📊</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: C.accent, fontSize: 13 }}>อัปโหลด Excel — Item Master / Stock Update</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>รองรับ .xlsx .xlsm — ชื่อคอลัมน์: โค้ด, P/T Number, ชนิดผ้า, กลุ่ม, ชื่อสินค้า, Cost (THB), ราคาโรงงาน, ราคาขาย (-VAT)</div>
          </div>
          <label style={{ ...s.btn(C.accent2, true), cursor: "pointer", padding: "10px 20px" }}>
            {uploading ? "⏳ กำลังอ่าน..." : "📂 เลือกไฟล์ Excel"}
            <input type="file" accept=".xlsx,.xlsm,.xls,.csv" style={{ display: "none" }} onChange={handleExcelUpload} disabled={uploading} />
          </label>
        </div>
        {uploadStatus && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 6, background: uploadStatus.ok ? C.ok + "18" : C.err + "18", border: `1px solid ${uploadStatus.ok ? C.ok : C.err}50`, fontSize: 12, color: uploadStatus.ok ? C.ok : C.err, fontWeight: 600 }}>
            {uploadStatus.msg}
          </div>
        )}
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 10, color: C.muted, padding: "3px 8px", border: `1px solid ${C.border}`, borderRadius: 4 }}>📋 Item_master_Primer.xlsm — โหลดแล้ว</div>
          <div style={{ fontSize: 10, color: C.muted, padding: "3px 8px", border: `1px solid ${C.border}`, borderRadius: 4 }}>รวม {itemMaster.length.toLocaleString()} SKU | {allFabrics.length} ชนิดผ้า</div>
        </div>
      </Card>

      {/* ── 5 Search Slots ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 6 }}>

        {/* 1 — Product name / code */}
        <div>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            🔍 ชื่อสินค้า / รหัส / โค้ด
          </div>
          <input style={{ ...s.input, width: "100%", boxSizing: "border-box" }}
            value={searchProduct} onChange={e => setSearchProduct(e.target.value)}
            placeholder="ชื่อ / รหัส / SKU / สี / P/T..." />
        </div>

        {/* 2 — Supplier */}
        <div>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            🏭 Supplier / ผู้จำหน่าย
          </div>
          <input style={{ ...s.input, width: "100%", boxSizing: "border-box" }}
            value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
            placeholder="ชื่อผู้จำหน่าย / ประเภทผ้า..." />
        </div>

        {/* 3 — Customer */}
        <div>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            👥 Customer / ลูกค้า
          </div>
          <select style={{ ...s.select, width: "100%" }} value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
            <option value="">— ทั้งหมด ({allCustomers.length}) —</option>
            {allCustomers.map(c => <option key={c} value={c} title={c}>{c.length > 22 ? c.slice(0,22)+"…" : c}</option>)}
          </select>
        </div>

        {/* 4 — Type of Products */}
        <div>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            👕 Type of Products
          </div>
          <select style={{ ...s.select, width: "100%" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">— ประเภทสินค้าทั้งหมด —</option>
            {PRODUCT_TYPES.map(t => (
              <option key={t.label} value={t.label}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* 5 — Fabric / เนื้อผ้า */}
        <div>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            🧵 Fabric / เนื้อผ้า
          </div>
          <select style={{ ...s.select, width: "100%" }} value={filterFabric} onChange={e => setFilterFabric(e.target.value)}>
            <option value="">— ทั้งหมด ({allFabrics.length}) —</option>
            {allFabrics.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Result bar + active tags + clear */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: C.muted, marginRight: 4 }}>
          แสดง <strong style={{ color: filtered.length < itemMaster.length ? C.accent2 : C.sub }}>{filtered.length.toLocaleString()}</strong>
          <span style={{ color: C.border }}> / {itemMaster.length.toLocaleString()} รายการ</span>
        </span>
        {searchProduct  && <span style={{ fontSize: 10, padding: "2px 9px", background: C.accent+"22",  color: C.accent,  borderRadius: 10 }}>🔍 "{searchProduct}"</span>}
        {filterSupplier && <span style={{ fontSize: 10, padding: "2px 9px", background: "#f59e0b22",    color: "#f59e0b", borderRadius: 10 }}>🏭 {filterSupplier}</span>}
        {filterCustomer && <span style={{ fontSize: 10, padding: "2px 9px", background: C.accent2+"22", color: C.accent2, borderRadius: 10 }}>👥 {filterCustomer.slice(0,24)}{filterCustomer.length>24?"…":""}</span>}
        {filterType     && <span style={{ fontSize: 10, padding: "2px 9px", background: C.ok+"22",      color: C.ok,      borderRadius: 10 }}>{filterType}</span>}
        {filterFabric   && <span style={{ fontSize: 10, padding: "2px 9px", background: "#8b5cf622",    color: "#8b5cf6", borderRadius: 10 }}>🧵 {filterFabric}</span>}
        {(searchProduct||filterSupplier||filterCustomer||filterType||filterFabric) && (
          <button style={{ ...s.btnGhost, padding: "2px 10px", fontSize: 11 }}
            onClick={() => { setSearchProduct(""); setFilterSupplier(""); setFilterCustomer(""); setFilterType(""); setFilterFabric(""); }}>
            ✕ ล้างทั้งหมด
          </button>
        )}
      </div>

      <Card>
        <div style={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
              <tr>
                {["🔍 รหัส / Code", "ชื่อสินค้า", "👕 ประเภท", "NEW SKU (v3)", "🧵 เนื้อผ้า", "สี", "👥 ลูกค้า", "Cost", "ราคาโรงงาน", "ราคาขาย", ""].map(h => (
                  <th key={h} style={{ ...s.th, fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((item, i) => {
                const typeLabel = getTypeLabel(item.category);
                const typeColor =
                  item.category === "TSH" ? C.accent :
                  item.category === "POL" ? "#8b5cf6" :
                  item.category === "SHO" || item.category === "TRS" ? C.accent2 :
                  item.category === "JKT" ? "#f59e0b" :
                  item.category === "ACT" || item.category === "TNK" ? C.ok :
                  C.muted;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "#060b1688" }}>
                    <td style={{ ...s.td, color: C.accent, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{item.code}</td>
                    <td style={{ ...s.td, fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>{item.name}</td>
                    <td style={s.td}>
                      <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: typeColor+"22", color: typeColor, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {typeLabel || item.category || "—"}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontSize: 9, fontFamily: "monospace", color: C.sub, whiteSpace: "nowrap" }}>{item.newSku || "—"}</td>
                    <td style={s.td}>
                      <Tag text={item.fabricType} color={
                        (item.fabricType||'').includes("สแปน")    ? "#f59e0b" :
                        (item.fabricType||'').includes("ไมโคร")   ? "#3b82f6" :
                        (item.fabricType||'').includes("โปโล")    ? "#8b5cf6" :
                        (item.fabricType||'').includes("ท็อปดาย") ? "#10b981" : C.sub
                      } />
                    </td>
                    <td style={{ ...s.td, fontSize: 11, color: C.sub }}>{item.color || "—"}</td>
                    <td style={{ ...s.td, fontSize: 10, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: item.customer ? C.accent : C.border }} title={item.customer}>
                      {item.customer || "—"}
                    </td>
                    <td style={{ ...s.td, fontSize: 11, textAlign: "right" }}>฿{fmt(item.cost)}</td>
                    <td style={{ ...s.td, fontSize: 11, color: C.muted, textAlign: "right" }}>฿{fmt(item.factoryPrice)}</td>
                    <td style={{ ...s.td, fontSize: 12, color: C.ok, fontWeight: 700, textAlign: "right" }}>฿{fmt(item.sellPrice)}</td>
                    <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                      <button onClick={() => { setForm({ ...item }); setModal(true); }} style={{ ...s.btnGhost, padding: "3px 8px", marginRight: 4, fontSize: 10 }}>แก้</button>
                      <button onClick={() => delItem(item.code)} style={{ ...s.btnGhost, padding: "3px 8px", color: C.err, borderColor: C.err+"50", fontSize: 10 }}>ลบ</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length > 300 && (
                <tr><td colSpan={11} style={{ ...s.td, textAlign: "center", color: C.muted, padding: 16, fontSize: 11 }}>
                  แสดง 300 / {filtered.length.toLocaleString()} รายการ — ใช้ Filter ด้านบนเพื่อค้นหาเพิ่มเติม
                </td></tr>
              )}
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ ...s.td, textAlign: "center", color: C.muted, padding: 32 }}>ไม่พบรายการที่ตรงกับการค้นหา</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div style={{ marginTop: 10, display: "flex", gap: 16, padding: "8px 12px", background: "#060b16", borderRadius: 6, flexWrap: "wrap" }}>
          {[
            ["SKU ทั้งหมด", itemMaster.length.toLocaleString()],
            ["👥 ลูกค้า", allCustomers.length],
            ["🏭 เนื้อผ้า", allFabrics.length + " ชนิด"],
            ["👕 ประเภทสินค้า", PRODUCT_TYPES.length + " กลุ่ม"],
            ["ต้นทุนเฉลี่ย/ตัว", "฿" + fmt(itemMaster.reduce((s, i) => s + i.cost, 0) / Math.max(itemMaster.length, 1))],
            ["ราคาขายเฉลี่ย", "฿" + fmt(itemMaster.reduce((s, i) => s + i.sellPrice, 0) / Math.max(itemMaster.length, 1))],
          ].map(([k, v]) => (
            <div key={k}>
              <span style={{ fontSize: 10, color: C.muted }}>{k}: </span>
              <span style={{ fontWeight: 700, color: C.accent }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      {modal && (
        <Modal title={form.code ? `แก้ไข ${form.code}` : "เพิ่ม SKU ใหม่"} onClose={() => setModal(false)}>
          <Row2>
            <Field label="รหัสสินค้า (Code)" half><input style={s.input} value={form.code || ""} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="เช่น A001M" /></Field>
            <Field label="P/T Number" half><input style={s.input} value={form.ptNumber || ""} onChange={e => setForm(f => ({ ...f, ptNumber: e.target.value }))} placeholder="เช่น 001" /></Field>
            <Field label="ชนิดผ้า"><select style={s.select} value={form.fabricType || ""} onChange={e => setForm(f => ({ ...f, fabricType: e.target.value }))}>
              <option value="">— เลือกชนิดผ้า —</option>
              {allFabrics.map(f => <option key={f} value={f}>{f}</option>)}
            </select></Field>
            <Field label="กลุ่ม (Group)" half><input style={s.input} value={form.group || ""} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} placeholder="เช่น 41111" /></Field>
            <Field label="ชื่อสินค้า"><input style={s.input} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Cost (THB)" half><input style={s.input} type="number" value={form.cost || ""} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></Field>
            <Field label="ราคาโรงงาน" half><input style={s.input} type="number" value={form.factoryPrice || ""} onChange={e => setForm(f => ({ ...f, factoryPrice: e.target.value }))} /></Field>
            <Field label="ราคาขาย (-VAT)" half><input style={s.input} type="number" value={form.sellPrice || ""} onChange={e => setForm(f => ({ ...f, sellPrice: e.target.value }))} /></Field>
          </Row2>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={s.btn()} onClick={saveItem}>บันทึก</button>
            <button style={s.btnGhost} onClick={() => setModal(false)}>ยกเลิก</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODULE: DASHBOARD
// ═══════════════════════════════════════════════════════════════

const PERIOD_OPTIONS = [
  { id: "thisMonth", labelEN: "This Month", labelTH: "เดือนนี้" },
  { id: "lastMonth", labelEN: "Last Month", labelTH: "เดือนก่อน" },
  { id: "3m",        labelEN: "3 Months",   labelTH: "3 เดือน" },
  { id: "6m",        labelEN: "6 Months",   labelTH: "6 เดือน" },
  { id: "1y",        labelEN: "1 Year",     labelTH: "1 ปี" },
  { id: "thisYear",  labelEN: "This Year",  labelTH: "ปีนี้" },
];

const DASH_COLORS = ["#3b82f6","#e8a020","#10b981","#8b5cf6","#ef4444","#f59e0b","#06b6d4","#ec4899","#84cc16","#f97316"];

function getPeriodRange(period) {
  const now = new Date();
  const start = new Date();
  switch (period) {
    case "thisMonth":
      start.setDate(1); start.setHours(0,0,0,0);
      return { start, end: now };
    case "lastMonth": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: s, end: e };
    }
    case "3m":
      start.setMonth(start.getMonth() - 3);
      return { start, end: now };
    case "6m":
      start.setMonth(start.getMonth() - 6);
      return { start, end: now };
    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      return { start, end: now };
    case "thisYear":
      start.setMonth(0); start.setDate(1); start.setHours(0,0,0,0);
      return { start, end: now };
    default:
      start.setMonth(start.getMonth() - 3);
      return { start, end: now };
  }
}

function SvgDonut({ segments, size = 160, stroke = 32 }) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
    </svg>
  );
  let cumPct = 0;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = Math.max(0, circ * pct - 1.5);
        const gap = circ - dash;
        const rot = cumPct * 360 - 90;
        cumPct += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rot} ${cx} ${cy})`}
          />
        );
      })}
    </svg>
  );
}

function SvgBar({ months, width = 440, height = 180 }) {
  if (!months.length) return <div style={{ color: C.muted, fontSize: 12, padding: "20px 0" }}>ไม่มีข้อมูล</div>;
  const pad = { top: 16, right: 12, bottom: 36, left: 54 };
  const iW = width - pad.left - pad.right;
  const iH = height - pad.top - pad.bottom;
  const maxVal = Math.max(...months.map(m => Math.max(m.revenue, m.cost)), 1) * 1.15;
  const slotW = iW / months.length;
  const bW = Math.max(6, slotW * 0.35);
  const toY = v => pad.top + iH - (v / maxVal) * iH;
  const fmtK = v => v >= 1e6 ? (v/1e6).toFixed(1)+"M" : v >= 1e3 ? (v/1e3).toFixed(0)+"K" : Math.round(v);
  const thMonths = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = pad.top + iH * (1 - pct);
        return <g key={pct}>
          <line x1={pad.left} y1={y} x2={pad.left + iW} y2={y} stroke={C.border} strokeWidth={1} strokeDasharray="3,3" />
          <text x={pad.left - 4} y={y + 4} textAnchor="end" fill={C.muted} fontSize="9" fontFamily="inherit">{fmtK(maxVal * pct)}</text>
        </g>;
      })}
      <line x1={pad.left} y1={pad.top + iH} x2={pad.left + iW} y2={pad.top + iH} stroke={C.border} strokeWidth={1} />
      {months.map((m, i) => {
        const cx = pad.left + (i + 0.5) * slotW;
        const revH = (m.revenue / maxVal) * iH;
        const costH = (m.cost / maxVal) * iH;
        const mo = parseInt(m.key.split("-")[1]) - 1;
        const yr = m.key.split("-")[0];
        return <g key={m.key}>
          <rect x={cx - bW - 1} y={toY(m.revenue)} width={bW} height={Math.max(1, revH)} fill="#3b82f6" rx={2} opacity="0.85" />
          <rect x={cx + 1} y={toY(m.cost)} width={bW} height={Math.max(1, costH)} fill="#e8a020" rx={2} opacity="0.75" />
          <text x={cx} y={pad.top + iH + 13} textAnchor="middle" fill={C.muted} fontSize="9" fontFamily="inherit">{thMonths[mo]}</text>
          {months.length > 8 && <text x={cx} y={pad.top + iH + 23} textAnchor="middle" fill={C.muted} fontSize="8" fontFamily="inherit">{"'"+yr.slice(2)}</text>}
        </g>;
      })}
    </svg>
  );
}

function DashboardModule({ data }) {
  const SIZES_LIST = ["XS","S","M","L","XL","XXL","2XL","3XL","4XL","5XL"];

  const [period, setPeriod] = useState("3m");
  const [selOrderId, setSelOrderId] = useState(null);
  const [budgetSearch, setBudgetSearch] = useState("");
  const [slotSearch, setSlotSearch] = useState("");

  const { start, end } = getPeriodRange(period);

  const activeOrders = data.orders.filter(o => {
    if (!o.date) return true;
    const d = new Date(o.date);
    return d >= start && d <= end && o.status !== "cancelled";
  });

  const orderMetrics = activeOrders.map(o => {
    const cost = calcCost(o, data.patterns, data.fabrics, data.accessories, data.printTypes, data.costRates);
    const revenue = (o.targetPrice > 0 ? o.targetPrice : (cost?.totalPerUnit || 0) * 1.3) * (o.qty || 0);
    const totalCost = cost ? cost.totalCost : 0;
    const matCost = cost ? (cost.fabricCost + cost.trimCost) * (o.qty || 0) : 0;
    return { ...o, revenue, totalCost, matCost, profit: revenue - totalCost, cost };
  });

  const totalRevenue = orderMetrics.reduce((s, o) => s + o.revenue, 0);
  const totalCost    = orderMetrics.reduce((s, o) => s + o.totalCost, 0);
  const totalProfit  = totalRevenue - totalCost;
  const totalMat     = orderMetrics.reduce((s, o) => s + o.matCost, 0);
  const vat7         = totalRevenue * 0.07;
  const margin       = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

  const salesByCust = Object.values(
    orderMetrics.reduce((acc, o) => {
      const k = o.customer || "Unknown";
      if (!acc[k]) acc[k] = { label: k, value: 0 };
      acc[k].value += o.revenue;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value)
   .map((d, i) => ({ ...d, color: DASH_COLORS[i % DASH_COLORS.length] }));

  const costSegs = [
    { label: "ผ้าหลัก",      value: orderMetrics.reduce((s,o) => s + (o.cost ? o.cost.fabricCost * (o.qty||0) : 0), 0), color: "#3b82f6" },
    { label: "อุปกรณ์เสริม", value: orderMetrics.reduce((s,o) => s + (o.cost ? o.cost.trimCost  * (o.qty||0) : 0), 0), color: "#e8a020" },
    { label: "ค่าแรง",       value: orderMetrics.reduce((s,o) => s + (o.cost ? o.cost.laborCost * (o.qty||0) : 0), 0), color: "#10b981" },
    { label: "Print/EMB",     value: orderMetrics.reduce((s,o) => s + (o.cost ? o.cost.printCost * (o.qty||0) : 0), 0), color: "#8b5cf6" },
    { label: "Overhead",      value: orderMetrics.reduce((s,o) => s + (o.cost ? o.cost.overhead  * (o.qty||0) : 0), 0), color: "#4a5980" },
  ].filter(d => d.value > 0);

  const monthlyMap = {};
  orderMetrics.forEach(o => {
    const d = new Date(o.date || Date.now());
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if (!monthlyMap[key]) monthlyMap[key] = { key, revenue: 0, cost: 0 };
    monthlyMap[key].revenue += o.revenue;
    monthlyMap[key].cost += o.totalCost;
  });
  const months = Object.values(monthlyMap).sort((a, b) => a.key.localeCompare(b.key));

  const unpaidBills = data.bills.filter(b => b.status === "pending" || b.status === "partial");
  const totalUnpaid = unpaidBills.reduce((s,b) => s + (b.items||[]).reduce((ss,it) => ss + (it.qty||0)*(it.price||0), 0), 0);

  // Budget rows filtered by search
  const bq = budgetSearch.toLowerCase().trim();
  const budgetRows = orderMetrics
    .filter(o => !bq ||
      o.id?.toLowerCase().includes(bq) ||
      o.customer?.toLowerCase().includes(bq) ||
      (o.slots||[]).some(sl => {
        const pat = data.patterns.find(p => p.id === sl.patternId);
        return pat?.name?.toLowerCase().includes(bq) || pat?.id?.toLowerCase().includes(bq);
      })
    )
    .map(o => ({
      id: o.id, customer: o.customer || "-",
      budget: (o.targetPrice || 0) * (o.qty || 0),
      actual: o.totalCost, revenue: o.revenue, profit: o.profit,
      slots: o.slots || [],
    }));

  // SKU / project full-text search across ALL orders (not period-filtered)
  const sq = slotSearch.toLowerCase().trim();
  const slotResults = sq ? data.orders.filter(o =>
    o.id?.toLowerCase().includes(sq) ||
    o.customer?.toLowerCase().includes(sq) ||
    (o.slots||[]).some(sl => {
      const pat = data.patterns.find(p => p.id === sl.patternId);
      return pat?.name?.toLowerCase().includes(sq) || pat?.id?.toLowerCase().includes(sq) || sl.fabricType?.toLowerCase().includes(sq) || sl.patternType?.toLowerCase().includes(sq);
    })
  ) : [];

  const selOrder = selOrderId ? data.orders.find(o => o.id === selOrderId) : null;

  const KPI = [
    { label: "รายได้รวม",      value: `฿${fmt(totalRevenue)}`, color: C.accent2,                         sub: `${activeOrders.length} ออเดอร์` },
    { label: "ต้นทุนรวม",      value: `฿${fmt(totalCost)}`,    color: C.err,                             sub: `เฉลี่ย ฿${fmt(totalCost / Math.max(activeOrders.length,1))}/order` },
    { label: "กำไรขั้นต้น",    value: `฿${fmt(totalProfit)}`,  color: totalProfit >= 0 ? C.ok : C.err,  sub: `Margin ${margin.toFixed(1)}%` },
    { label: "ต้นทุนวัตถุดิบ", value: `฿${fmt(totalMat)}`,     color: "#8b5cf6",                         sub: totalCost > 0 ? `${(totalMat/totalCost*100).toFixed(1)}% ของต้นทุน` : "-" },
    { label: "VAT 7%",          value: `฿${fmt(vat7)}`,         color: C.accent,                          sub: "จากรายได้" },
  ];

  return (
    <div>
      <SectionHead title="📊 DASHBOARD" sub="ภาพรวมธุรกิจ · ยอดขาย · กำไร · ต้นทุน · งบประมาณ" />

      {/* Period filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {PERIOD_OPTIONS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            ...s.btnGhost, padding: "6px 14px",
            ...(period === p.id ? { background: C.accent2+"25", color: C.accent2, borderColor: C.accent2+"80" } : {}),
          }}>{_lang === "TH" ? p.labelTH : p.labelEN}</button>
        ))}
        <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>
          {start.toLocaleDateString("th-TH")} – {end.toLocaleDateString("th-TH")}
        </span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 12, marginBottom: 20 }}>
        {KPI.map(k => (
          <Card key={k.label} style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: C.sub }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Row 1: Sales donut + Monthly bar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 14 }}>ยอดขายตามลูกค้า</div>
          {salesByCust.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12, padding: 20, textAlign: "center" }}>ไม่มีออเดอร์ในช่วงนี้</div>
          ) : (
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <SvgDonut segments={salesByCust.slice(0,9)} size={160} stroke={32} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ fontSize: 9, color: C.muted }}>รายได้รวม</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>฿{(totalRevenue/1000).toFixed(0)}K</div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {salesByCust.slice(0,8).map(d => (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 11, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, flexShrink: 0 }}>฿{fmt(d.value)}</div>
                  </div>
                ))}
                {salesByCust.length > 8 && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>+{salesByCust.length - 8} อื่นๆ</div>}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 8 }}>รายได้ vs ต้นทุน (รายเดือน)</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: "#3b82f6" }}>■ รายได้: ฿{fmt(totalRevenue)}</span>
            <span style={{ fontSize: 10, color: "#e8a020" }}>■ ต้นทุน: ฿{fmt(totalCost)}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <SvgBar months={months} width={440} height={180} />
          </div>
        </Card>
      </div>

      {/* Row 2: Cost breakdown (left) + Budget vs Actual (right, full detail) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 14 }}>โครงสร้างต้นทุน</div>
          {costSegs.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12, padding: 20, textAlign: "center" }}>ไม่มีข้อมูลต้นทุน</div>
          ) : (
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <SvgDonut segments={costSegs} size={160} stroke={32} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ fontSize: 9, color: C.muted }}>ต้นทุนรวม</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.err }}>฿{(totalCost/1000).toFixed(0)}K</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {costSegs.map(d => (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 11, color: C.sub }}>{d.label}</div>
                    <div style={{ fontSize: 10, color: C.muted, width: 36, textAlign: "right" }}>{totalCost > 0 ? (d.value/totalCost*100).toFixed(1) : 0}%</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, width: 72, textAlign: "right" }}>฿{fmt(d.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Budget vs Actual — with search + ดู button */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>งบประมาณ vs ต้นทุนจริง</div>
            <span style={{ fontSize: 10, color: C.muted }}>{budgetRows.length} ออเดอร์</span>
          </div>
          <input
            style={{ ...s.input, fontSize: 11, marginBottom: 10 }}
            value={budgetSearch}
            onChange={e => setBudgetSearch(e.target.value)}
            placeholder="🔍 ค้นหา Order ID / ลูกค้า / Pattern..."
          />
          {budgetRows.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12, padding: 16, textAlign: "center" }}>ไม่พบออเดอร์ที่ตรงกัน</div>
          ) : (
            <>
              <div style={{ overflowY: "auto", maxHeight: 240 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Order","งบ (Target)","ต้นทุนจริง","กำไร","สถานะ",""].map(h =>
                        <th key={h} style={{ ...s.th, fontSize: 9 }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {budgetRows.map((o, i) => {
                      const ok = o.profit >= 0;
                      const overBudget = o.budget > 0 && o.actual > o.budget;
                      return (
                        <tr key={o.id} style={{ background: i%2===0 ? "transparent" : "#060b1688" }}>
                          <td style={{ ...s.td, fontSize: 10 }}>
                            <div style={{ color: C.accent, fontWeight: 700 }}>{o.id}</div>
                            <div style={{ color: C.muted, fontSize: 9 }}>{o.customer}</div>
                            <div style={{ color: C.sub, fontSize: 9 }}>{o.slots.length} รายการ</div>
                          </td>
                          <td style={{ ...s.td, fontSize: 10, textAlign: "right", color: C.text }}>฿{fmt(o.budget)}</td>
                          <td style={{ ...s.td, fontSize: 10, textAlign: "right", color: overBudget ? C.err : C.text, fontWeight: overBudget ? 700 : 400 }}>
                            ฿{fmt(o.actual)}
                            {overBudget && <div style={{ fontSize: 8, color: C.err }}>เกินงบ</div>}
                          </td>
                          <td style={{ ...s.td, fontSize: 11, fontWeight: 700, color: ok ? C.ok : C.err, textAlign: "right" }}>฿{fmt(o.profit)}</td>
                          <td style={s.td}><Tag text={ok ? "กำไร" : "ขาดทุน"} color={ok ? C.ok : C.err} /></td>
                          <td style={{ ...s.td, textAlign: "center" }}>
                            <button
                              onClick={() => setSelOrderId(o.id)}
                              style={{ padding: "3px 10px", background: C.accent2+"20", color: C.accent2, border: `1px solid ${C.accent2}60`, borderRadius: 5, cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 700 }}
                            >ดู ▶</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 20, padding: "8px 10px", background: "#060b16", borderRadius: 6, marginTop: 8, fontSize: 11, flexWrap: "wrap" }}>
                <span style={{ color: C.muted }}>กำไรรวม: <strong style={{ color: totalProfit >= 0 ? C.ok : C.err }}>฿{fmt(totalProfit)}</strong></span>
                <span style={{ color: C.muted }}>Margin: <strong style={{ color: C.accent }}>{margin.toFixed(1)}%</strong></span>
                <span style={{ color: C.muted }}>VAT 7%: <strong style={{ color: C.accent }}>฿{fmt(vat7)}</strong></span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ══════ SKU / Project Search ══════ */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 10 }}>🔍 ค้นหา SKU / โปรเจกต์</div>
        <input
          style={{ ...s.input, maxWidth: 520, marginBottom: slotSearch ? 14 : 0 }}
          value={slotSearch}
          onChange={e => setSlotSearch(e.target.value)}
          placeholder="พิมพ์ Order ID, ชื่อลูกค้า, ชื่อ Pattern/SKU, ชนิดผ้า..."
        />
        {!slotSearch && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>ค้นหาจากทุก Order ทุกช่วงเวลา</div>
        )}
        {slotSearch && slotResults.length === 0 && (
          <div style={{ color: C.muted, fontSize: 12, padding: "10px 0" }}>ไม่พบ Order ที่ตรงกับ "{slotSearch}"</div>
        )}
        {slotResults.map(o => {
          const oMetric = orderMetrics.find(m => m.id === o.id);
          return (
            <div key={o.id} style={{ marginBottom: 10, background: "#060b16", borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: C.accent, fontSize: 13 }}>{o.id}</span>
                  <span style={{ color: C.text, fontSize: 12 }}>{o.customer}</span>
                  <Tag text={o.status} color={o.status==="done" ? C.ok : o.status==="production" ? C.accent2 : C.accent} />
                  <span style={{ fontSize: 11, color: C.muted }}>{o.date}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>· Qty {(o.qty||0).toLocaleString()} ตัว</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {oMetric && <span style={{ fontSize: 11, fontWeight: 700, color: oMetric.profit >= 0 ? C.ok : C.err }}>กำไร ฿{fmt(oMetric.profit)}</span>}
                  <button onClick={() => setSelOrderId(o.id)} style={{ padding: "4px 12px", background: C.accent2, color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 700 }}>
                    ดูรายละเอียด ▶
                  </button>
                </div>
              </div>
              {(o.slots||[]).length > 0 ? (
                <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(o.slots||[]).map((sl, si) => {
                    const pat = data.patterns.find(p => p.id === sl.patternId);
                    const mTotal = SIZES_LIST.reduce((a,sz) => a+(+(sl.sizes?.male?.[sz]||0)), 0);
                    const fTotal = SIZES_LIST.reduce((a,sz) => a+(+(sl.sizes?.female?.[sz]||0)), 0);
                    const slotQty = sl.qty || (mTotal + fTotal) || 0;
                    return (
                      <div key={si} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 11px", minWidth: 150 }}>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 11 }}>{pat?.name || "Unknown SKU"}</div>
                        <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>
                          {sl.patternType && <span style={{ color: C.accent2, marginRight: 6 }}>{sl.patternType}</span>}
                          {slotQty > 0 && <span>{slotQty} ตัว</span>}
                          {sl.fabricType && <span style={{ marginLeft: 6 }}>· {sl.fabricType}</span>}
                        </div>
                        {(sl.colors||[]).length > 0 && (
                          <div style={{ display: "flex", gap: 3, marginTop: 5 }}>
                            {sl.colors.slice(0,8).map((c,ci) => (
                              <div key={ci} style={{ width: 11, height: 11, borderRadius: "50%", background: c, border: "1px solid #ffffff30" }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "8px 14px", fontSize: 11, color: C.muted }}>ไม่มีรายการสินค้า</div>
              )}
            </div>
          );
        })}
      </Card>

      {/* Outstanding Bills */}
      {unpaidBills.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>ยอดค้างชำระ Supplier</div>
            <div style={{ fontSize: 12, color: C.err, fontWeight: 700 }}>ค้างอยู่ ฿{fmt(totalUnpaid)} ({unpaidBills.length} บิล)</div>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 200, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Invoice No.","Supplier","วันที่","ยอด","Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {unpaidBills.map((b, i) => {
                  const total = (b.items||[]).reduce((s,it) => s + (it.qty||0)*(it.price||0), 0);
                  return (
                    <tr key={b.id} style={{ background: i%2===0 ? "transparent" : "#060b1688" }}>
                      <td style={{ ...s.td, color: C.accent }}>{b.invoiceNo}</td>
                      <td style={s.td}>{b.supplier}</td>
                      <td style={{ ...s.td, color: C.muted, fontSize: 11 }}>{b.date}</td>
                      <td style={{ ...s.td, color: C.err, fontWeight: 700, textAlign: "right" }}>฿{fmt(total)}</td>
                      <td style={s.td}>
                        <Tag text={b.status === "partial" ? "จ่ายบางส่วน" : "ค้างชำระ"} color={b.status === "partial" ? "#f59e0b" : C.err} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ══════ ORDER DETAIL MODAL ══════ */}
      {selOrder && (() => {
        const metric = orderMetrics.find(m => m.id === selOrder.id);
        const marginO = metric && metric.revenue > 0 ? (metric.profit / metric.revenue * 100) : 0;
        return (
          <div style={{ position: "fixed", inset: 0, background: "#000d", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: "100%", maxWidth: 900, maxHeight: "92vh", overflow: "auto" }}>

              {/* Sticky header */}
              <div style={{ position: "sticky", top: 0, background: C.card, zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: C.accent, fontSize: 16 }}>{selOrder.id}</span>
                  <span style={{ color: C.text, fontSize: 14 }}>{selOrder.customer}</span>
                  <Tag text={selOrder.status} color={selOrder.status==="done" ? C.ok : selOrder.status==="production" ? C.accent2 : C.accent} />
                </div>
                <button onClick={() => setSelOrderId(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 24, lineHeight: 1 }}>×</button>
              </div>

              <div style={{ padding: 20 }}>
                {/* Order meta row */}
                <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#060b16", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  {[
                    ["วันที่สั่ง", selOrder.date || "-"],
                    ["กำหนดส่ง", selOrder.dueDate || "-"],
                    ["ช่องทาง", selOrder.channel || "-"],
                    ["ติดต่อ", selOrder.contact || "-"],
                    ["Qty รวม", `${(selOrder.qty||0).toLocaleString()} ตัว`],
                    ["ราคาเป้า/ตัว", selOrder.targetPrice > 0 ? `฿${fmt(selOrder.targetPrice)}` : "-"],
                  ].map(([k,v], i, arr) => (
                    <div key={k} style={{ flex: 1, padding: "10px 14px", borderRight: i < arr.length-1 ? `1px solid ${C.border}` : "none" }}>
                      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Cost summary cards */}
                {metric && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
                    {[
                      ["รายได้ (Target)", metric.revenue, C.accent2],
                      ["ต้นทุนรวม", metric.totalCost, C.err],
                      ["กำไรขั้นต้น", metric.profit, metric.profit >= 0 ? C.ok : C.err],
                      ["Margin", `${marginO.toFixed(1)}%`, marginO >= 0 ? C.ok : C.err],
                    ].map(([label, value, color]) => (
                      <div key={label} style={{ background: "#060b16", borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color }}>
                          {typeof value === "string" ? value : `${value < 0 ? "-" : ""}฿${fmt(Math.abs(value))}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cost breakdown bar */}
                {metric?.cost && (
                  <div style={{ marginBottom: 20, padding: "10px 14px", background: "#060b16", borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>รายละเอียดต้นทุน (ต่อตัว)</div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      {[
                        ["ผ้าหลัก",      metric.cost.fabricCost, "#3b82f6"],
                        ["อุปกรณ์เสริม", metric.cost.trimCost,   "#e8a020"],
                        ["ค่าแรง",       metric.cost.laborCost,  "#10b981"],
                        ...(metric.cost.printCost > 0 ? [["Print/EMB", metric.cost.printCost, "#8b5cf6"]] : []),
                        ["Overhead",     metric.cost.overhead,   "#4a5980"],
                        ["รวม/ตัว",      metric.cost.totalPerUnit, C.err],
                      ].map(([label, value, color]) => (
                        <div key={label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 9, color: C.muted }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color }}>฿{fmt(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Slots */}
                <div style={{ fontWeight: 700, color: C.accent, fontSize: 13, marginBottom: 12 }}>
                  รายการสินค้า ({(selOrder.slots||[]).length} รายการ)
                </div>

                {(selOrder.slots||[]).length === 0 ? (
                  <div style={{ color: C.muted, fontSize: 12, padding: 24, textAlign: "center", background: "#060b16", borderRadius: 8 }}>
                    ออเดอร์นี้ยังไม่มีรายการสินค้า
                  </div>
                ) : (
                  (selOrder.slots||[]).map((slot, si) => {
                    const pat = data.patterns.find(p => p.id === slot.patternId);
                    const pt  = data.printTypes.find(p => p.id === slot.printTypeId);
                    const mTotal = SIZES_LIST.reduce((a,sz) => a+(+(slot.sizes?.male?.[sz]||0)), 0);
                    const fTotal = SIZES_LIST.reduce((a,sz) => a+(+(slot.sizes?.female?.[sz]||0)), 0);
                    const slotQty = slot.qty || (mTotal + fTotal) || 0;
                    const hasSizes = mTotal + fTotal > 0;

                    const slotOrder = { ...selOrder, patternId: slot.patternId, printTypeId: slot.printTypeId, qty: slotQty };
                    const slotCost = slotQty > 0 ? calcCost(slotOrder, data.patterns, data.fabrics, data.accessories, data.printTypes, data.costRates) : null;
                    const slotRevenue = (selOrder.targetPrice || 0) * slotQty;
                    const slotProfit = slotRevenue - (slotCost?.totalCost || 0);

                    return (
                      <div key={si} style={{ marginBottom: 14, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                        {/* Slot header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#060b16", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 11, color: C.muted }}>#{si+1}</span>
                            {slot.patternType && <Tag text={slot.patternType} color={C.accent2} />}
                            <span style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{pat?.name || "— ไม่ระบุ —"}</span>
                            {pat?.id && <span style={{ fontSize: 10, color: C.muted }}>({pat.id})</span>}
                            {pt && pt.name !== "None" && <Tag text={pt.name} color="#8b5cf6" />}
                          </div>
                          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: C.text }}>{slotQty.toLocaleString()} ตัว</span>
                            {slotCost && <span style={{ fontSize: 11, color: C.err }}>ต้นทุน ฿{fmt(slotCost.totalCost)}</span>}
                            {selOrder.targetPrice > 0 && slotCost && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: slotProfit >= 0 ? C.ok : C.err }}>
                                กำไร ฿{fmt(slotProfit)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ padding: "14px", display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
                          {/* Left col: Colors, Fabric, Notes */}
                          <div>
                            {(slot.colors||[]).length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>สี ({slot.colors.length} สี)</div>
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                  {(slot.colors||[]).map((c, ci) => (
                                    <div key={ci} style={{ display: "flex", alignItems: "center", gap: 4, background: "#060b16", borderRadius: 4, padding: "3px 7px" }}>
                                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: c, border: "1px solid #ffffff25", flexShrink: 0 }} />
                                      <span style={{ fontSize: 10, color: C.sub }}>{c}</span>
                                    </div>
                                  ))}
                                </div>
                                {slot.colorNote && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>📝 {slot.colorNote}</div>}
                              </div>
                            )}
                            {slot.fabricType && (
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>ชนิดผ้า</div>
                                <div style={{ fontSize: 12, color: C.text }}>{slot.fabricType}</div>
                              </div>
                            )}
                            {slot.specFileName && (
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>ไฟล์แนบ Spec</div>
                                <div style={{ fontSize: 11, color: C.accent2 }}>📎 {slot.specFileName}</div>
                              </div>
                            )}
                            {slot.slotNote && (
                              <div style={{ padding: "7px 10px", background: C.accent+"12", border: `1px solid ${C.accent}30`, borderRadius: 6 }}>
                                <div style={{ fontSize: 9, color: C.accent, textTransform: "uppercase", marginBottom: 2 }}>หมายเหตุ</div>
                                <div style={{ fontSize: 11, color: C.text }}>{slot.slotNote}</div>
                              </div>
                            )}
                            {/* Per-slot cost breakdown */}
                            {slotCost && (
                              <div style={{ marginTop: 10, padding: "8px 10px", background: "#060b16", borderRadius: 6, border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>ต้นทุนรายการนี้</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                                  {[
                                    ["ผ้า", slotCost.fabricCost * slotQty, "#3b82f6"],
                                    ["อุปกรณ์", slotCost.trimCost * slotQty, "#e8a020"],
                                    ["ค่าแรง", slotCost.laborCost * slotQty, "#10b981"],
                                    ...(slotCost.printCost > 0 ? [["Print", slotCost.printCost * slotQty, "#8b5cf6"]] : []),
                                    ["Overhead", slotCost.overhead * slotQty, "#4a5980"],
                                  ].map(([label, value, color]) => (
                                    <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                                      <span style={{ fontSize: 10, color: C.muted }}>{label}</span>
                                      <span style={{ fontSize: 10, fontWeight: 600, color }}>฿{fmt(value)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 10, color: C.muted }}>รวม / ตัว</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: C.err }}>฿{fmt(slotCost.totalPerUnit)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                  <span style={{ fontSize: 10, color: C.muted }}>รวมทั้งหมด</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: C.err }}>฿{fmt(slotCost.totalCost)}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right col: Size table */}
                          <div>
                            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>ตารางไซส์</div>
                            {hasSizes ? (
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                <thead>
                                  <tr>
                                    <th style={{ ...s.th, fontSize: 9, padding: "5px 6px", width: 32 }}>เพศ</th>
                                    {SIZES_LIST.map(sz => <th key={sz} style={{ ...s.th, fontSize: 9, padding: "5px 6px", textAlign: "center" }}>{sz}</th>)}
                                    <th style={{ ...s.th, fontSize: 9, padding: "5px 6px", textAlign: "center", color: C.accent }}>รวม</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[["ช.", "male", C.accent2], ["ญ.", "female", "#ec4899"]].map(([label, gender, color]) => {
                                    const rowTotal = SIZES_LIST.reduce((a,sz) => a+(+(slot.sizes?.[gender]?.[sz]||0)), 0);
                                    return (
                                      <tr key={gender}>
                                        <td style={{ ...s.td, fontSize: 11, padding: "5px 6px", color, fontWeight: 700 }}>{label}</td>
                                        {SIZES_LIST.map(sz => {
                                          const v = +(slot.sizes?.[gender]?.[sz] || 0);
                                          return <td key={sz} style={{ ...s.td, fontSize: 11, padding: "5px 6px", textAlign: "center", color: v > 0 ? C.text : C.muted }}>{v > 0 ? v : "·"}</td>;
                                        })}
                                        <td style={{ ...s.td, fontSize: 11, padding: "5px 6px", textAlign: "center", fontWeight: 700, color: C.accent }}>{rowTotal || "·"}</td>
                                      </tr>
                                    );
                                  })}
                                  <tr style={{ background: "#060b1688" }}>
                                    <td style={{ ...s.td, fontSize: 9, padding: "5px 6px", color: C.muted }}>รวม</td>
                                    {SIZES_LIST.map(sz => {
                                      const v = (+(slot.sizes?.male?.[sz]||0)) + (+(slot.sizes?.female?.[sz]||0));
                                      return <td key={sz} style={{ ...s.td, fontSize: 11, padding: "5px 6px", textAlign: "center", fontWeight: 700, color: v > 0 ? C.ok : C.muted }}>{v > 0 ? v : "·"}</td>;
                                    })}
                                    <td style={{ ...s.td, fontSize: 12, padding: "5px 6px", textAlign: "center", fontWeight: 700, color: C.accent }}>{mTotal + fTotal}</td>
                                  </tr>
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ color: C.muted, fontSize: 11, padding: "20px 0", textAlign: "center" }}>ไม่ระบุตารางไซส์</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Special notice */}
                {selOrder.specialNotice && (
                  <div style={{ marginTop: 4, padding: "10px 14px", background: C.err+"10", border: `1px solid ${C.err}30`, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: C.err, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>⚠️ หมายเหตุพิเศษ</div>
                    <div style={{ fontSize: 12, color: C.text, whiteSpace: "pre-wrap" }}>{selOrder.specialNotice}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// IMPORT MODULE
// ═══════════════════════════════════════════════════════════════

function ImportModule({ data, setData }) {
  const [wb, setWb] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [tab, setTab] = useState("sku");
  const [skuSearch, setSkuSearch] = useState("");
  const [skuPage, setSkuPage] = useState(0);
  const [suppSel, setSuppSel] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const PAGE = 50;

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);
    setWb(null);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const XLSX = (await import("xlsx")).default || (await import("xlsx"));
        const workbook = XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
        setWb({ workbook, XLSX });
      } catch (err) {
        console.error("XLSX parse error:", err);
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const suppliers = useMemo(() => {
    if (!wb) return [];
    const { workbook, XLSX } = wb;
    const ws = workbook.Sheets["🏭 ผู้จำหน่าย"];
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    return rows.slice(3).filter(r => r[2]).map((r, i) => ({
      id: `SUP-${String(i + 1).padStart(4, "0")}`,
      name: String(r[2] || "").trim(),
      contactType: String(r[3] || ""),
      address: String(r[5] || ""),
      taxId: String(r[7] || ""),
      contactName: String(r[9] || ""),
      email: String(r[10] || ""),
      mobile: String(r[11] || ""),
      phone: String(r[12] || ""),
      credit: r[13] || 0,
      note: String(r[14] || ""),
    }));
  }, [wb]);

  const customers = useMemo(() => {
    if (!wb) return [];
    const { workbook, XLSX } = wb;
    const ws = workbook.Sheets["👥 ลูกค้า"];
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    return rows.slice(3).filter(r => r[2]).map((r, i) => ({
      id: `CUST-${String(i + 1).padStart(4, "0")}`,
      name: String(r[2] || "").trim(),
      contactType: String(r[3] || ""),
      address: String(r[5] || ""),
      taxId: String(r[7] || ""),
      contactName: String(r[9] || ""),
      email: String(r[10] || ""),
      mobile: String(r[11] || ""),
      phone: String(r[12] || ""),
      credit: r[13] || 0,
      note: String(r[14] || ""),
    }));
  }, [wb]);

  const skuItems = useMemo(() => {
    if (!wb) return [];
    const { workbook, XLSX } = wb;
    const parseSheet = (sheetName, typeLabel, m) => {
      const ws = workbook.Sheets[sheetName];
      if (!ws) return [];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      return rows.slice(4).filter(r => r[m.newSku]).map(r => ({
        type: typeLabel,
        commonCode: String(r[0] || ""),
        newSku: String(r[m.newSku] || ""),
        gender: String(r[m.gender] || ""),
        oldSku: String(r[m.oldSku] || ""),
        name: String(r[m.name] || ""),
        fabric: String(r[m.fabric] || ""),
        color: String(r[m.color] || ""),
        size: String(r[m.size] || ""),
        cost: r[m.cost] || 0,
        factoryPrice: r[m.fp] || 0,
        retailPrice: r[m.rp] || 0,
        customer: String(r[m.cust] || ""),
      }));
    };
    const shirt = { newSku:4, gender:5, oldSku:7, name:9,  fabric:10, color:11, size:12, cost:14, fp:15, rp:16, cust:17 };
    const pants = { newSku:4, gender:5, oldSku:7, name:8,  fabric:9,  color:10, size:11, cost:13, fp:14, rp:15, cust:-1 };
    return [
      ...parseSheet("📋 Item Master (เสื้อ)", "เสื้อ", shirt),
      ...parseSheet("👖 Item Master (กางเกง)", "กางเกง", pants),
    ];
  }, [wb]);

  const filteredSku = useMemo(() => {
    if (!skuSearch.trim()) return skuItems;
    const q = skuSearch.toLowerCase();
    return skuItems.filter(s =>
      s.newSku.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.fabric.toLowerCase().includes(q) ||
      s.color.toLowerCase().includes(q) ||
      s.customer.toLowerCase().includes(q) ||
      s.commonCode.toLowerCase().includes(q)
    );
  }, [skuItems, skuSearch]);

  const totalPages = Math.ceil(filteredSku.length / PAGE);
  const pagedSku = filteredSku.slice(skuPage * PAGE, (skuPage + 1) * PAGE);

  const importSuppliers = async () => {
    const toImport = suppSel.size > 0
      ? suppliers.filter(s => suppSel.has(s.id))
      : suppliers;
    setImporting(true);
    let ok = 0, fail = 0;
    for (const sup of toImport) {
      try {
        const record = {
          id: sup.id,
          name: sup.name,
          contact: sup.mobile || sup.phone || sup.email || "",
          category: "Fabric",
          imagePreview: null,
        };
        await upsertSupplier(record);
        setData(d => {
          const filtered = d.suppliers.filter(x => x.id !== record.id);
          return { ...d, suppliers: [...filtered, record] };
        });
        ok++;
      } catch { fail++; }
    }
    setImporting(false);
    setImportResult({ ok, fail, total: toImport.length });
  };

  const tabStyle = (id) => ({
    padding: "9px 16px", fontSize: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
    background: tab === id ? C.card : "transparent",
    color: tab === id ? C.accent : C.muted,
    borderBottom: tab === id ? `2px solid ${C.accent}` : "2px solid transparent",
    borderRadius: "8px 8px 0 0", flexShrink: 0,
  });

  return (
    <div>
      <SectionHead title="📥 Import Master Data" sub="นำเข้าข้อมูล SKU / ผู้จำหน่าย / ลูกค้า จากไฟล์ Excel (Format v3)" />

      {/* File upload card */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <label style={{ ...s.btn(C.accent), cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, userSelect: "none" }}>
            📂 เลือกไฟล์ Excel (.xlsx)
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
          </label>
          {parsing && <span style={{ fontSize: 12, color: C.muted }}>⏳ กำลังอ่านไฟล์...</span>}
          {wb && (
            <span style={{ fontSize: 12, color: C.ok }}>
              ✅ โหลดสำเร็จ — {skuItems.length.toLocaleString()} SKU · {suppliers.length.toLocaleString()} ผู้จำหน่าย · {customers.length.toLocaleString()} ลูกค้า
            </span>
          )}
        </div>
        {!wb && !parsing && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "#0d1629", borderRadius: 8, fontSize: 11, color: C.muted }}>
            รองรับ: <strong style={{ color: C.sub }}>Primer_Master_Data_v3</strong> — SKU Format: <code style={{ color: C.accent }}>BRD-G-CAT-STY-COL-SZ-SSN</code>
            <span style={{ marginLeft: 16 }}>ชีต: Item Master (เสื้อ/กางเกง) · ผู้จำหน่าย · ลูกค้า</span>
          </div>
        )}
      </Card>

      {wb && (
        <>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
            <button style={tabStyle("sku")} onClick={() => setTab("sku")}>📋 SKU / Item Master ({skuItems.length.toLocaleString()})</button>
            <button style={tabStyle("suppliers")} onClick={() => setTab("suppliers")}>🏭 ผู้จำหน่าย ({suppliers.length})</button>
            <button style={tabStyle("customers")} onClick={() => setTab("customers")}>👥 ลูกค้า ({customers.length})</button>
          </div>

          {/* ── SKU Tab ── */}
          {tab === "sku" && (
            <Card>
              <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  style={{ ...s.input, flex: 1, minWidth: 260, maxWidth: 460 }}
                  placeholder="ค้นหา SKU / ชื่อสินค้า / ผ้า / สี / ลูกค้า..."
                  value={skuSearch}
                  onChange={e => { setSkuSearch(e.target.value); setSkuPage(0); }}
                />
                <span style={{ fontSize: 11, color: C.muted }}>
                  แสดง {filteredSku.length.toLocaleString()} / {skuItems.length.toLocaleString()} รายการ
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 900 }}>
                  <thead>
                    <tr>
                      {["ประเภท","NEW SKU (v3)","ชื่อสินค้า","ชนิดผ้า","สี","Size","Cost","ราคาโรงงาน","ราคาขาย","ลูกค้า"].map(h => (
                        <th key={h} style={{ ...s.th, fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedSku.map((item, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "#060b1640" }}>
                        <td style={s.td}>
                          <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                            background: item.type === "เสื้อ" ? C.accent+"22" : C.accent2+"22",
                            color: item.type === "เสื้อ" ? C.accent : C.accent2 }}>
                            {item.type === "เสื้อ" ? "👕" : "👖"} {item.type}
                          </span>
                        </td>
                        <td style={{ ...s.td, fontFamily: "monospace", fontSize: 10, color: C.accent, whiteSpace: "nowrap" }}>{item.newSku}</td>
                        <td style={{ ...s.td, fontSize: 10, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>{item.name}</td>
                        <td style={{ ...s.td, fontSize: 10, color: C.sub }}>{item.fabric}</td>
                        <td style={{ ...s.td, fontSize: 10 }}>{item.color}</td>
                        <td style={{ ...s.td, fontSize: 10, textAlign: "center", fontWeight: 600 }}>{item.size}</td>
                        <td style={{ ...s.td, fontSize: 10, textAlign: "right", color: C.ok }}>฿{fmt(item.cost)}</td>
                        <td style={{ ...s.td, fontSize: 10, textAlign: "right" }}>฿{fmt(item.factoryPrice)}</td>
                        <td style={{ ...s.td, fontSize: 10, textAlign: "right", color: C.accent2, fontWeight: 700 }}>฿{fmt(item.retailPrice)}</td>
                        <td style={{ ...s.td, fontSize: 10, color: C.muted, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.customer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", justifyContent: "center" }}>
                  <button onClick={() => setSkuPage(0)} disabled={skuPage === 0} style={{ ...s.btnGhost, padding: "4px 10px", fontSize: 11 }}>«</button>
                  <button onClick={() => setSkuPage(p => Math.max(0, p - 1))} disabled={skuPage === 0} style={{ ...s.btnGhost, padding: "4px 12px", fontSize: 11 }}>← ก่อนหน้า</button>
                  <span style={{ fontSize: 11, color: C.muted }}>หน้า {skuPage + 1} / {totalPages}</span>
                  <button onClick={() => setSkuPage(p => Math.min(totalPages - 1, p + 1))} disabled={skuPage === totalPages - 1} style={{ ...s.btnGhost, padding: "4px 12px", fontSize: 11 }}>ถัดไป →</button>
                  <button onClick={() => setSkuPage(totalPages - 1)} disabled={skuPage === totalPages - 1} style={{ ...s.btnGhost, padding: "4px 10px", fontSize: 11 }}>»</button>
                </div>
              )}
            </Card>
          )}

          {/* ── Suppliers Tab ── */}
          {tab === "suppliers" && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 12, color: C.sub }}>
                  {suppSel.size > 0 ? `✔ เลือก ${suppSel.size} รายการ` : `ทั้งหมด ${suppliers.length} ผู้จำหน่าย`}
                  {suppSel.size === 0 && <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>(จะ import ทั้งหมด)</span>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={{ ...s.btnGhost, padding: "5px 12px", fontSize: 11 }}
                    onClick={() => setSuppSel(new Set(suppliers.map(s => s.id)))}>เลือกทั้งหมด</button>
                  <button style={{ ...s.btnGhost, padding: "5px 12px", fontSize: 11 }}
                    onClick={() => setSuppSel(new Set())}>ล้างการเลือก</button>
                  <button style={{ ...s.btn(C.ok), padding: "6px 16px", fontSize: 12 }} onClick={importSuppliers} disabled={importing}>
                    {importing ? "⏳ กำลัง Import..." : `📥 Import ${suppSel.size || suppliers.length} รายการ → Supabase`}
                  </button>
                </div>
              </div>

              {importResult && (
                <div style={{ marginBottom: 12, padding: "10px 14px", background: C.ok+"18", border: `1px solid ${C.ok}40`, borderRadius: 8, fontSize: 12, color: C.ok }}>
                  ✅ Import เสร็จสิ้น: <strong>{importResult.ok}</strong> รายการสำเร็จ
                  {importResult.fail > 0 && <span style={{ color: C.err, marginLeft: 8 }}>⚠️ {importResult.fail} ผิดพลาด</span>}
                  <span style={{ marginLeft: 8, color: C.muted, fontSize: 10 }}>จากทั้งหมด {importResult.total} รายการ</span>
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 36 }}>
                        <input type="checkbox"
                          checked={suppSel.size === suppliers.length && suppliers.length > 0}
                          onChange={e => setSuppSel(e.target.checked ? new Set(suppliers.map(s => s.id)) : new Set())} />
                      </th>
                      {["#","ชื่อ","ประเภท","เบอร์มือถือ","อีเมล","เครดิต (วัน)","หมายเหตุ"].map(h => (
                        <th key={h} style={{ ...s.th, fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((sup, i) => (
                      <tr key={sup.id} style={{ background: suppSel.has(sup.id) ? C.accent+"0a" : "transparent" }}>
                        <td style={s.td}>
                          <input type="checkbox" checked={suppSel.has(sup.id)}
                            onChange={e => setSuppSel(prev => {
                              const n = new Set(prev);
                              e.target.checked ? n.add(sup.id) : n.delete(sup.id);
                              return n;
                            })} />
                        </td>
                        <td style={{ ...s.td, color: C.muted, fontSize: 10 }}>{i + 1}</td>
                        <td style={{ ...s.td, fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sup.name}>{sup.name}</td>
                        <td style={{ ...s.td, fontSize: 10, color: C.sub }}>{sup.contactType}</td>
                        <td style={{ ...s.td, fontSize: 10, color: C.accent }}>{sup.mobile || sup.phone}</td>
                        <td style={{ ...s.td, fontSize: 10, color: C.muted }}>{sup.email}</td>
                        <td style={{ ...s.td, fontSize: 10, textAlign: "center" }}>{sup.credit}</td>
                        <td style={{ ...s.td, fontSize: 10, color: C.muted, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sup.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Customers Tab ── */}
          {tab === "customers" && (
            <Card>
              <div style={{ marginBottom: 10, padding: "8px 12px", background: C.accent2+"12", border: `1px solid ${C.accent2}30`, borderRadius: 7, fontSize: 11, color: C.accent2 }}>
                📋 ข้อมูลลูกค้า {customers.length} ราย — ใช้อ้างอิงชื่อเมื่อสร้าง Order
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>
                      {["#","ชื่อ","ประเภท","ที่อยู่","เบอร์","อีเมล","เครดิต (วัน)"].map(h => (
                        <th key={h} style={{ ...s.th, fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr key={c.id} style={{ background: i % 2 === 0 ? "transparent" : "#060b1640" }}>
                        <td style={{ ...s.td, color: C.muted, fontSize: 10 }}>{i + 1}</td>
                        <td style={{ ...s.td, fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.name}>{c.name}</td>
                        <td style={{ ...s.td, fontSize: 10, color: C.sub }}>{c.contactType}</td>
                        <td style={{ ...s.td, fontSize: 10, color: C.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.address}</td>
                        <td style={{ ...s.td, fontSize: 10, color: C.accent }}>{c.mobile || c.phone}</td>
                        <td style={{ ...s.td, fontSize: 10, color: C.muted }}>{c.email}</td>
                        <td style={{ ...s.td, fontSize: 10, textAlign: "center" }}>{c.credit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════

const MODULES = [
  { id: "items", label: "📁 Item Master", icon: "📁" },
  { id: "master", label: "⚙️ Master Data", icon: "⚙️" },
  { id: "order", label: "📋 Orders", icon: "📋" },
  { id: "bom", label: "📦 BOM", icon: "📦" },
  { id: "inventory", label: "🏬 Inventory", icon: "🏬" },
  { id: "costing", label: "💹 Costing", icon: "💹" },
  { id: "reports", label: "📄 Reports", icon: "📄" },
];

export default function GarmentERP() {
  const [activeModule, setActiveModule] = useState("items");
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [itemMaster, setItemMaster] = useState(PRIMER_ITEMS_V3);
  const [lang, setLang] = useState("EN");
  _lang = lang;

  const [data, setData] = useState({
    fabrics: INIT_FABRICS,
    accessories: INIT_ACCESSORIES,
    patterns: INIT_PATTERNS,
    printTypes: INIT_PRINT_TYPES,
    suppliers: INIT_SUPPLIERS,
    costRates: INIT_COST_RATES,
    orders: INIT_ORDERS,
    stock: { ...INIT_STOCK },
    bills: [],
  });

  useEffect(() => {
    testConnection().then(ok => {
      console.log('[APP] Supabase connected:', ok);
    });
    loadAllData().then(loaded => {
      if (!loaded) { console.warn('[APP] loadAllData returned null'); return; }
      console.log('[APP] Loaded from DB:', loaded);
      setData(d => ({
        ...d,
        fabrics:    loaded.fabrics.length     ? loaded.fabrics     : d.fabrics,
        accessories:loaded.accessories.length ? loaded.accessories : d.accessories,
        patterns:   loaded.patterns.length    ? loaded.patterns    : d.patterns,
        printTypes: loaded.printTypes.length  ? loaded.printTypes  : d.printTypes,
        suppliers:  loaded.suppliers.length   ? loaded.suppliers   : d.suppliers,
        orders:     loaded.orders.length      ? loaded.orders      : d.orders,
        bills:      loaded.bills,
        stock:      Object.keys(loaded.stock).length ? loaded.stock : d.stock,
      }));
    });
  }, []);

  const handleSetActiveOrder = useCallback((id) => {
    setActiveOrderId(id);
    setActiveModule("bom");
  }, []);

  const totalOrders = data.orders.length;
  const confirmedOrders = data.orders.filter(o => o.status === "confirmed" || o.status === "production").length;
  const totalStockValue = [...data.fabrics, ...data.accessories].reduce((sum, i) => sum + (data.stock[i.id] || 0) * i.costPerUnit, 0);
  const lowStock = [...data.fabrics, ...data.accessories].filter(i => (data.stock[i.id] || 0) < 100).length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'JetBrains Mono', 'Courier New', monospace", color: C.text }}>
      {/* Top Bar */}
      <div style={{ background: "#0a1020", borderBottom: `1px solid ${C.border}`, padding: "0 16px", display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
        <div style={{ padding: "14px 0", marginRight: 24, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 22 }}>🧵</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap" }}>{t("appName")}</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{t("appSub")}</div>
          </div>
        </div>
        {[
          { id: "dashboard", label: t("navDashboard") },
          { id: "items", label: t("navItems") },
          { id: "master", label: t("navMaster") },
          { id: "order", label: t("navOrder") },
          { id: "bom", label: t("navBom") },
          { id: "inventory", label: t("navInventory") },
          { id: "costing", label: t("navCosting") },
          { id: "reports", label: t("navReports") },
          { id: "import", label: t("navImport") },
        ].map(m => (
          <button key={m.id} onClick={() => setActiveModule(m.id)} style={{
            padding: "16px 12px", background: "none", border: "none", cursor: "pointer",
            fontFamily: "inherit", fontSize: 11, fontWeight: activeModule === m.id ? 700 : 400,
            color: activeModule === m.id ? C.accent : C.muted,
            borderBottom: activeModule === m.id ? `2px solid ${C.accent}` : "2px solid transparent",
            whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {m.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 10, flexShrink: 0, paddingLeft: 16, alignItems: "center" }}>
          <span style={{ color: C.muted }}>{t("statSku")}: <strong style={{ color: C.accent }}>{itemMaster.length}</strong></span>
          <span style={{ color: C.muted }}>{t("statOrders")}: <strong style={{ color: C.accent }}>{totalOrders}</strong></span>
          <span style={{ color: C.muted }}>⚠️ {t("statStock")}: <strong style={{ color: lowStock > 0 ? C.err : C.ok }}>{lowStock}</strong></span>
          <span style={{ color: C.muted }}>{t("statStockVal")}: <strong style={{ color: C.accent }}>฿{(totalStockValue / 1000).toFixed(0)}K</strong></span>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>
        {activeModule === "dashboard" && <DashboardModule data={data} />}
        {activeModule === "items" && <ItemMasterModule itemMaster={itemMaster} setItemMaster={setItemMaster} />}
        {activeModule === "master" && <MasterModule data={data} setData={setData} />}
        {activeModule === "order" && <OrderModule data={data} setData={setData} setActiveOrder={handleSetActiveOrder} />}
        {activeModule === "bom" && <BOMModule data={data} setData={setData} activeOrderId={activeOrderId} setActiveModule={setActiveModule} />}
        {activeModule === "inventory" && <InventoryModule data={data} setData={setData} />}
        {activeModule === "costing" && <CostingModule data={data} />}
        {activeModule === "reports" && <ReportModule data={data} />}
        {activeModule === "import" && <ImportModule data={data} setData={setData} />}
      </div>
    </div>
  );
}

