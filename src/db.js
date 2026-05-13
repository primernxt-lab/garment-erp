import { supabase } from './supabase.js';

// ─── Row converters ───────────────────────────────────────────────

const fromFabric = r => ({
  id: r.id, name: r.name, type: r.type, unit: r.unit,
  costPerUnit: r.cost_per_unit, supplier: r.supplier,
  color: r.color ?? '', consumptionKg: r.consumption_kg ?? null,
  width: r.width, imagePreview: r.image_preview, note: r.note,
});
const toFabric = f => ({
  id: f.id, name: f.name, type: f.type, unit: f.unit,
  cost_per_unit: f.costPerUnit, supplier: f.supplier,
  color: f.color ?? '', consumption_kg: f.consumptionKg ?? null,
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

const fromPattern = r => {
  const mat0 = { fabricId: r.fabric_id, consumption: r.fabric_per_unit ?? 0, widthCm: null };
  const mats = r.materials ?? [mat0];
  return {
    id: r.id, name: r.name, category: r.category,
    patternType: r.pattern_type ?? null,
    fabricId: r.fabric_id, fabricPerUnit: r.fabric_per_unit,
    materials: mats,
    accessories: r.accessories ?? [],
    laborCut: r.labor_cut, laborSew: r.labor_sew, laborQC: r.labor_qc,
    imagePreview: r.image_preview ?? null,
  };
};
const toPattern = p => {
  const mats = p.materials ?? [{ fabricId: p.fabricId, consumption: p.fabricPerUnit ?? 0, widthCm: null }];
  return {
    id: p.id, name: p.name, category: p.category,
    pattern_type: p.patternType ?? null,
    fabric_id: mats[0]?.fabricId ?? p.fabricId ?? null,
    fabric_per_unit: mats[0]?.consumption ?? p.fabricPerUnit ?? 0,
    materials: mats,
    accessories: p.accessories ?? [],
    labor_cut: p.laborCut, labor_sew: p.laborSew, labor_qc: p.laborQC,
    image_preview: p.imagePreview ?? null,
  };
};

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

const fromScreen = r => ({
  id: r.id, name: r.name, type: r.type ?? 'Silk',
  rateA1: r.rate_a1 ?? 0, rateA2: r.rate_a2 ?? 0,
  rateA3: r.rate_a3 ?? 0, rateA4: r.rate_a4 ?? 0,
  note: r.note ?? '', imagePreview: r.image_preview ?? null,
});
const toScreen = sc => ({
  id: sc.id, name: sc.name, type: sc.type ?? 'Silk',
  rate_a1: sc.rateA1 ?? 0, rate_a2: sc.rateA2 ?? 0,
  rate_a3: sc.rateA3 ?? 0, rate_a4: sc.rateA4 ?? 0,
  note: sc.note ?? '', image_preview: sc.imagePreview ?? null,
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
    const [f, a, p, pt, sc, sup, o, b, s] = await Promise.all([
      supabase.from('fabrics').select('*'),
      supabase.from('accessories').select('*'),
      supabase.from('patterns').select('*'),
      supabase.from('print_types').select('*'),
      supabase.from('screens').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('orders').select('*'),
      supabase.from('bills').select('*'),
      supabase.from('stock').select('*'),
    ]);

    // Log any errors
    [['fabrics',f],['accessories',a],['patterns',p],['print_types',pt],['screens',sc],['suppliers',sup],['orders',o],['bills',b],['stock',s]].forEach(([name, res]) => {
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
      screens:    (sc.data  ?? []).map(fromScreen),
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

// ─── Screens ─────────────────────────────────────────────────────

export async function upsertScreen(sc) {
  console.log('[DB] Saving screen:', sc.id);
  const { error } = await supabase.from('screens').upsert(toScreen(sc));
  if (error) console.error('[DB] ❌ upsertScreen:', error.message, error);
  else console.log('[DB] ✅ Screen saved:', sc.id);
}
export async function deleteScreen(id) {
  const { error } = await supabase.from('screens').delete().eq('id', id);
  if (error) console.error('[DB] ❌ deleteScreen:', error.message);
  else console.log('[DB] ✅ Screen deleted:', id);
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
