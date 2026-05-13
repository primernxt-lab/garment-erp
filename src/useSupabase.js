import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(url, key)

export async function loadAllData() {
  try {
    const [fabrics,accessories,patterns,printTypes,suppliers,orders,bills,saleInvoices,stockRows] =
      await Promise.all([
        supabase.from('fabrics').select('*'),
        supabase.from('accessories').select('*'),
        supabase.from('patterns').select('*'),
        supabase.from('print_types').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('orders').select('*'),
        supabase.from('bills').select('*'),
        supabase.from('sale_invoices').select('*'),
        supabase.from('stock').select('*'),
      ])
    const stock = {}
    ;(stockRows.data||[]).forEach(r => { stock[r.item_id] = r.qty })
    return {
      fabrics:      fabrics.data      || [],
      accessories:  accessories.data  || [],
      patterns:     patterns.data     || [],
      printTypes:   printTypes.data   || [],
      suppliers:    suppliers.data    || [],
      orders:       orders.data       || [],
      bills:        bills.data        || [],
      saleInvoices: saleInvoices.data || [],
      stock,
    }
  } catch(e) { return null }
}

export const db = {
  upsertFabric:      (r)        => supabase.from('fabrics').upsert(r),
  deleteFabric:      (id)       => supabase.from('fabrics').delete().eq('id',id),
  upsertAccessory:   (r)        => supabase.from('accessories').upsert(r),
  deleteAccessory:   (id)       => supabase.from('accessories').delete().eq('id',id),
  upsertPattern:     (r)        => supabase.from('patterns').upsert(r),
  deletePattern:     (id)       => supabase.from('patterns').delete().eq('id',id),
  upsertPrintType:   (r)        => supabase.from('print_types').upsert(r),
  deletePrintType:   (id)       => supabase.from('print_types').delete().eq('id',id),
  upsertSupplier:    (r)        => supabase.from('suppliers').upsert(r),
  deleteSupplier:    (id)       => supabase.from('suppliers').delete().eq('id',id),
  upsertOrder:       (r)        => supabase.from('orders').upsert(r),
  deleteOrder:       (id)       => supabase.from('orders').delete().eq('id',id),
  upsertBill:        (r)        => supabase.from('bills').upsert(r),
  deleteBill:        (id)       => supabase.from('bills').delete().eq('id',id),
  upsertSaleInvoice: (r)        => supabase.from('sale_invoices').upsert(r),
  deleteSaleInvoice: (id)       => supabase.from('sale_invoices').delete().eq('id',id),
  upsertStock:       (itemId,qty) => supabase.from('stock').upsert({item_id:itemId,qty}),
}