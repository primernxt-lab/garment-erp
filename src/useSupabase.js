import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(url, key)

// ── DB → App (snake_case → camelCase) ──
const fromFabric    = r => ({ id:r.id, name:r.name, code:r.code||"", type:r.type, color:r.color||"", widthCm:r.width_cm||0, consumptionKg:r.consumption_kg||0, unit:r.unit||"m", costPerUnit:r.cost_per_unit||0, minQty:r.min_qty||0, supplier:r.supplier||"", imagePreview:r.image_preview||null })
const fromAccessory = r => ({ id:r.id, name:r.name, unit:r.unit||"pcs", costPerUnit:r.cost_per_unit||0, minQty:r.min_qty||0, supplier:r.supplier||"", imagePreview:r.image_preview||null })
const fromSupplier  = r => ({ id:r.id, name:r.name, contact:r.contact||"", email:r.email||"", address:r.address||"", creditDays:r.credit_days||30, category:r.category||"Fabric", imagePreview:r.image_preview||null })
const fromPrintType = r => ({ id:r.id, name:r.name, costPerUnit:r.cost_per_unit||0, imagePreview:r.image_preview||null, positionPrices:r.position_prices||[] })
const fromPattern   = r => ({ id:r.id, name:r.name, styleCode:r.style_code||"", bomVersion:r.bom_version||1, sizeSet:r.size_set||"", category:r.category||"Tops", fabricId:r.fabric_id||"", fabricPerUnit:r.fabric_per_unit||0, accessories:r.accessories||[], laborCut:r.labor_cut||0, laborSew:r.labor_sew||0, laborQC:r.labor_qc||0, imagePreview:r.image_preview||null })
const fromOrder     = r => ({ id:r.id, orderNo:r.order_no||r.id, customer:r.customer||"", customerAddress:r.customer_address||"", patternId:r.pattern_id||"", printTypeId:r.print_type_id||"PT001", qty:r.qty||0, targetPrice:r.target_price||0, totalAmount:r.total_amount||0, status:r.status||"draft", priority:r.priority||"normal", deliveryChannel:r.delivery_channel||"", date:r.date||"", dueDate:r.due_date||"", slots:r.slots||[], specialNotice:r.special_notice||"", stockReserved:r.stock_reserved||false, bomActual:r.bom_actual||{} })
const fromBill      = r => ({ id:r.id, invoiceNo:r.invoice_no||"", supplier:r.supplier||"", date:r.date||"", status:r.status||"pending", items:r.items||[], total:r.total||0, stockReceived:r.stock_received||false })
const fromInvoice   = r => ({ id:r.id, orderId:r.order_id||"", customer:r.customer||"", amount:r.amount||0, status:r.status||"pending", date:r.date||"", dueDate:r.due_date||"", paidDate:r.paid_date||null, note:r.note||"" })

// ── App → DB (camelCase → snake_case) ──
const toFabric    = f  => ({ id:f.id, name:f.name, code:f.code||"", type:f.type||"Knit", color:f.color||"", width_cm:f.widthCm||0, consumption_kg:f.consumptionKg||0, unit:f.unit||"m", cost_per_unit:parseFloat(f.costPerUnit)||0, min_qty:parseFloat(f.minQty)||0, supplier:f.supplier||"", image_preview:f.imagePreview||null })
const toAccessory = a  => ({ id:a.id, name:a.name, unit:a.unit||"pcs", cost_per_unit:parseFloat(a.costPerUnit)||0, min_qty:parseFloat(a.minQty)||0, supplier:a.supplier||"", image_preview:a.imagePreview||null })
const toSupplier  = s  => ({ id:s.id, name:s.name, contact:s.contact||"", email:s.email||"", address:s.address||"", credit_days:parseInt(s.creditDays)||30, category:s.category||"Fabric", image_preview:s.imagePreview||null })
const toPrintType = pt => ({ id:pt.id, name:pt.name, cost_per_unit:parseFloat(pt.costPerUnit)||0, image_preview:pt.imagePreview||null, position_prices:pt.positionPrices||[] })
const toPattern   = p  => ({ id:p.id, name:p.name, style_code:p.styleCode||"", bom_version:parseInt(p.bomVersion)||1, size_set:p.sizeSet||"", category:p.category||"Tops", fabric_id:p.fabricId||"", fabric_per_unit:parseFloat(p.fabricPerUnit)||0, accessories:p.accessories||[], labor_cut:parseFloat(p.laborCut)||0, labor_sew:parseFloat(p.laborSew)||0, labor_qc:parseFloat(p.laborQC)||0, image_preview:p.imagePreview||null })
const toOrder     = o  => ({ id:o.id, order_no:o.orderNo||o.id, customer:o.customer||"", customer_address:o.customerAddress||"", pattern_id:o.patternId||"", print_type_id:o.printTypeId||"PT001", qty:o.qty||0, target_price:parseFloat(o.targetPrice)||0, total_amount:parseFloat(o.totalAmount)||0, status:o.status||"draft", priority:o.priority||"normal", delivery_channel:o.deliveryChannel||"", date:o.date||"", due_date:o.dueDate||null, slots:o.slots||[], special_notice:o.specialNotice||"", stock_reserved:o.stockReserved||false, bom_actual:o.bomActual||{} })
const toBill      = b  => ({ id:b.id, invoice_no:b.invoiceNo||"", supplier:b.supplier||"", date:b.date||"", status:b.status||"pending", items:b.items||[], total:b.total||0, stock_received:b.stockReceived||false })
const toInvoice   = si => ({ id:si.id, order_id:si.orderId||"", customer:si.customer||"", amount:parseFloat(si.amount)||0, status:si.status||"pending", date:si.date||"", due_date:si.dueDate||null, paid_date:si.paidDate||null, note:si.note||"" })

// ── Load All Data ──
export async function loadAllData() {
  try {
    const [fabrics, accessories, patterns, printTypes, suppliers, orders, bills, saleInvoices, stockRows] =
      await Promise.all([
        supabase.from('fabrics').select('*').order('id'),
        supabase.from('accessories').select('*').order('id'),
        supabase.from('patterns').select('*').order('id'),
        supabase.from('print_types').select('*').order('id'),
        supabase.from('suppliers').select('*').order('id'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('bills').select('*').order('created_at', { ascending: false }),
        supabase.from('sale_invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('stock').select('*'),
      ])
    const stock = {}
    ;(stockRows.data || []).forEach(r => { stock[r.item_id] = r.qty })
    return {
      fabrics:      (fabrics.data      || []).map(fromFabric),
      accessories:  (accessories.data  || []).map(fromAccessory),
      patterns:     (patterns.data     || []).map(fromPattern),
      printTypes:   (printTypes.data   || []).map(fromPrintType),
      suppliers:    (suppliers.data    || []).map(fromSupplier),
      orders:       (orders.data       || []).map(fromOrder),
      bills:        (bills.data        || []).map(fromBill),
      saleInvoices: (saleInvoices.data || []).map(fromInvoice),
      stock,
    }
  } catch(e) {
    console.error('[DB] loadAllData error:', e)
    return null
  }
}

// ── DB Helpers ──
export const db = {
  upsertFabric:      async (r)          => { const { error } = await supabase.from('fabrics').upsert(toFabric(r));           if (error) console.error('[DB] upsertFabric:', error) },
  deleteFabric:      async (id)         => { const { error } = await supabase.from('fabrics').delete().eq('id', id);          if (error) console.error('[DB] deleteFabric:', error) },
  upsertAccessory:   async (r)          => { const { error } = await supabase.from('accessories').upsert(toAccessory(r));     if (error) console.error('[DB] upsertAccessory:', error) },
  deleteAccessory:   async (id)         => { const { error } = await supabase.from('accessories').delete().eq('id', id);      if (error) console.error('[DB] deleteAccessory:', error) },
  upsertPattern:     async (r)          => { const { error } = await supabase.from('patterns').upsert(toPattern(r));          if (error) console.error('[DB] upsertPattern:', error) },
  deletePattern:     async (id)         => { const { error } = await supabase.from('patterns').delete().eq('id', id);         if (error) console.error('[DB] deletePattern:', error) },
  upsertPrintType:   async (r)          => { const { error } = await supabase.from('print_types').upsert(toPrintType(r));     if (error) console.error('[DB] upsertPrintType:', error) },
  deletePrintType:   async (id)         => { const { error } = await supabase.from('print_types').delete().eq('id', id);      if (error) console.error('[DB] deletePrintType:', error) },
  upsertSupplier:    async (r)          => { const { error } = await supabase.from('suppliers').upsert(toSupplier(r));        if (error) console.error('[DB] upsertSupplier:', error) },
  deleteSupplier:    async (id)         => { const { error } = await supabase.from('suppliers').delete().eq('id', id);        if (error) console.error('[DB] deleteSupplier:', error) },
  upsertOrder:       async (r)          => { const { error } = await supabase.from('orders').upsert(toOrder(r));              if (error) console.error('[DB] upsertOrder:', error) },
  deleteOrder:       async (id)         => { const { error } = await supabase.from('orders').delete().eq('id', id);           if (error) console.error('[DB] deleteOrder:', error) },
  upsertBill:        async (r)          => { const { error } = await supabase.from('bills').upsert(toBill(r));                if (error) console.error('[DB] upsertBill:', error) },
  deleteBill:        async (id)         => { const { error } = await supabase.from('bills').delete().eq('id', id);            if (error) console.error('[DB] deleteBill:', error) },
  upsertSaleInvoice: async (r)          => { const { error } = await supabase.from('sale_invoices').upsert(toInvoice(r));     if (error) console.error('[DB] upsertSaleInvoice:', error) },
  deleteSaleInvoice: async (id)         => { const { error } = await supabase.from('sale_invoices').delete().eq('id', id);    if (error) console.error('[DB] deleteSaleInvoice:', error) },
  upsertStock:       async (itemId,qty) => { const { error } = await supabase.from('stock').upsert({ item_id:itemId, qty });  if (error) console.error('[DB] upsertStock:', error) },
}
