/**
 * garment-erp-V5.jsx
 * PRIMER GROUP NXT — ERP v5.0
 *
 * CHANGES FROM V4:
 * ─────────────────────────────────────────────────────────────
 * § LINKED DATA (การเชื่อมโยงข้อมูลอัตโนมัติ)
 *   + Master เพิ่ม Fabric/Acc ใหม่ → สร้าง stock entry 0 อัตโนมัติ
 *   + BOM จองสต็อก → ป้องกัน double-deduction (stockReserved flag)
 *   + Order เปลี่ยน status → "done" → ตัดสต็อกอัตโนมัติ
 *   + Sales Invoice "รับเงิน" → Order status → "done" + ตัดสต็อก
 *   + Inventory tab ใหม่ "รับของจากบิล" → บวกสต็อกอัตโนมัติ
 * ─────────────────────────────────────────────────────────────
 * § MASTER DATA
 *   + Fabric: code, color, width_cm, consumption_kg fields
 *   + Accessories: min_qty field
 *   + Supplier: email, address, credit_days fields
 *   + Pattern: bom_version, size_set, style_code fields
 *
 * § ORDER
 *   + Auto-generate order_no (SO-YYMM-XXXX)
 *   + Customer address field
 *   + total_amount calculated + stored
 *   + Priority flag (urgent/high/normal/low)
 *   + Delivery channel selection
 *   + Order timeline / status history
 *
 * § BOM
 *   + bom_version tracking
 *   + size_set (S/M/L/XL breakdown)
 *   + Material cost per size
 *   + PO (Purchase Order) system
 *   + Stock movement log
 *   + Reserve stock on BOM confirm
 *
 * § INVENTORY
 *   + qty_min (reorder point)
 *   + Stock Movement Log (in/out/adjust)
 *   + PO management (create/receive)
 *   + Auto-alert when qty < qty_min
 *   + Batch receive from PO
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { db, loadAllData } from './useSupabase.js';

// ════════════════════════════════════════════════════════════════
// § 1  THEME
// ════════════════════════════════════════════════════════════════
const C = {
  bg:"#080d18", card:"#0d1526", card2:"#060b16", border:"#1a2540",
  accent:"#e8a020", accent2:"#3b82f6", ok:"#10b981", err:"#ef4444",
  warn:"#f97316", purple:"#8b5cf6", cyan:"#06b6d4",
  text:"#dde4f0", muted:"#4a5980", sub:"#8393b0",
};
const s = {
  input:{ width:"100%", padding:"9px 12px", background:"#060b16", border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontFamily:"inherit", fontSize:26, outline:"none", boxSizing:"border-box" },
  select:{ width:"100%", padding:"9px 12px", background:"#060b16", border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontFamily:"inherit", fontSize:26, outline:"none" },
  btn:(col=C.accent)=>({ padding:"8px 18px", background:col, color:col===C.accent?"#000":"#fff", border:"none", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:26, fontWeight:700 }),
  btnSm:(col=C.accent2)=>({ padding:"4px 10px", background:col, color:"#fff", border:"none", borderRadius:5, cursor:"pointer", fontFamily:"inherit", fontSize:17, fontWeight:700 }),
  btnGhost:{ padding:"7px 16px", background:"transparent", color:C.sub, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:26 },
  th:{ padding:"8px 10px", textAlign:"left", color:C.muted, fontSize:17, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, borderBottom:`1px solid ${C.border}`, background:"#060b16" },
  td:{ padding:"8px 10px", fontSize:26, color:C.text, borderBottom:`1px solid #0a1020` },
};

// ════════════════════════════════════════════════════════════════
// § 2  LANG
// ════════════════════════════════════════════════════════════════
let _lang = "EN";
const LANG = {
  EN:{ appName:"PRIMER Group NXT", appSub:"Integrated ERP v5",
       navItems:"📁 Items", navMaster:"⚙️ Master", navOrder:"📋 Orders",
       navBom:"📦 BOM", navInventory:"🏬 Inventory", navCosting:"💹 Costing",
       navSales:"💰 Sales", navReports:"📄 Reports",
       save:"Save", cancel:"Cancel", edit:"Edit", del:"Delete", add:"+ Add" },
  TH:{ appName:"PRIMER Group NXT", appSub:"ระบบ ERP รวม v5",
       navItems:"📁 รายการ", navMaster:"⚙️ ข้อมูลหลัก", navOrder:"📋 ออเดอร์",
       navBom:"📦 BOM", navInventory:"🏬 คลังสินค้า", navCosting:"💹 ต้นทุน",
       navSales:"💰 ขาย", navReports:"📄 รายงาน",
       save:"บันทึก", cancel:"ยกเลิก", edit:"แก้", del:"ลบ", add:"+ เพิ่ม" },
};
const t = (k) => (LANG[_lang]||LANG.EN)[k] || LANG.EN[k] || k;

// ════════════════════════════════════════════════════════════════
// § 3  HELPERS
// ════════════════════════════════════════════════════════════════
const fmt    = (n,d=2) => isNaN(n)?"0.00":Number(n).toLocaleString("th-TH",{minimumFractionDigits:d,maximumFractionDigits:d});
const genId  = (p="X") => `${p}${Date.now().toString().slice(-5)}`;
const today  = ()      => new Date().toISOString().slice(0,10);

// Auto-generate Order Number: SO-2505-0001
function genOrderNo(existingOrders) {
  const now   = new Date();
  const yymm  = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth()+1).padStart(2,"0")}`;
  const prefix = `SO-${yymm}-`;
  const existing = existingOrders.filter(o => (o.orderNo||"").startsWith(prefix));
  const next   = String(existing.length + 1).padStart(4,"0");
  return `${prefix}${next}`;
}

// ════════════════════════════════════════════════════════════════
// § 4  COSTING SERVICE (preserved verbatim from V2)
// ════════════════════════════════════════════════════════════════
function calcCost(order, patterns, fabrics, accessories, printTypes, costRates) {
  const pat = patterns.find(p => p.id === order.patternId);
  const fab = fabrics.find(f => f.id === pat?.fabricId);
  const pt  = printTypes.find(p => p.id === order.printTypeId);
  if (!pat || !fab) return null;
  const fabricCost   = pat.fabricPerUnit * fab.costPerUnit;
  const trimCost     = pat.accessories.reduce((sum,a) => { const acc=accessories.find(x=>x.id===a.accId); return sum+(acc?acc.costPerUnit*a.qtyPerUnit:0); }, 0);
  const laborCost    = (pat.laborCut*costRates.laborCutRate)+(pat.laborSew*costRates.laborSewRate)+(pat.laborQC*costRates.laborQCRate);
  const printCost    = pt?.costPerUnit||0;
  const subtotal     = fabricCost+trimCost+laborCost+printCost;
  const overhead     = subtotal*(costRates.overheadRate/100);
  const totalPerUnit = subtotal+overhead;
  return { fabricCost, trimCost, laborCost, printCost, overhead, subtotal, totalPerUnit, totalCost:totalPerUnit*order.qty };
}
function buildCostRows(cost, pat, ord, fabrics, printTypes, costRates) {
  if (!cost||!pat) return [];
  const fab = fabrics.find(f=>f.id===pat.fabricId);
  const rows = [[`Fabric (${pat.fabricPerUnit}m × ฿${fab?.costPerUnit||0})`,cost.fabricCost],["Trim & Accessories",cost.trimCost],["Labor (ตัด+เย็บ+QC)",cost.laborCost]];
  if (cost.printCost>0) rows.push([printTypes.find(p=>p.id===ord.printTypeId)?.name||"Print",cost.printCost]);
  rows.push([`Overhead (${costRates.overheadRate}%)`,cost.overhead]);
  return rows;
}
function buildStockItems(ord, pat, fab, fabrics, accessories, stock) {
  if (!ord||!pat) return [];
  const items = [];
  const fabNeeded = pat.fabricPerUnit*ord.qty;
  const fabHave   = stock[pat.fabricId]||0;
  items.push({ id:pat.fabricId, name:fab?.name||pat.fabricId, type:"Fabric", needed:fabNeeded.toFixed(2), have:fabHave, ok:fabHave>=fabNeeded, unit:fab?.unit||"m", costEach:fab?.costPerUnit||0, totalCost:(fab?.costPerUnit||0)*fabNeeded });
  pat.accessories.forEach(a => { const acc=accessories.find(x=>x.id===a.accId); const needed=Math.ceil(a.qtyPerUnit*ord.qty); const have=stock[a.accId]||0; items.push({ id:a.accId, name:acc?.name||a.accId, type:"Trim", needed, have, ok:have>=needed, unit:acc?.unit||"pcs", costEach:acc?.costPerUnit||0, totalCost:(acc?.costPerUnit||0)*needed }); });
  return items;
}

// ════════════════════════════════════════════════════════════════
// § 5  INIT DATA (enhanced with new fields)
// ════════════════════════════════════════════════════════════════
const INIT_FABRICS = [
  { id:"F001", code:"CTJ-180", name:"Cotton Jersey 180gsm", type:"Knit",  color:"White", widthCm:150, consumptionKg:0.22, unit:"m", costPerUnit:85,  supplier:"S001", minQty:200 },
  { id:"F002", code:"WPP-100", name:"Woven Poplin 100%C",  type:"Woven", color:"Ecru",  widthCm:145, consumptionKg:0.18, unit:"m", costPerUnit:120, supplier:"S002", minQty:100 },
  { id:"F003", code:"PYI-INT", name:"Polyester Interlock",  type:"Knit",  color:"Black", widthCm:160, consumptionKg:0.20, unit:"m", costPerUnit:65,  supplier:"S001", minQty:300 },
  { id:"F004", code:"CTD-001", name:"Cotton Drill",         type:"Woven", color:"Navy",  widthCm:150, consumptionKg:0.25, unit:"m", costPerUnit:95,  supplier:"S002", minQty:150 },
];
const INIT_ACCESSORIES = [
  { id:"A001", name:"Button 20mm",     unit:"pcs",  costPerUnit:3,  supplier:"S003", minQty:500  },
  { id:"A002", name:"Zipper YKK 30cm", unit:"pcs",  costPerUnit:22, supplier:"S003", minQty:100  },
  { id:"A003", name:"Elastic Band 3cm",unit:"m",    costPerUnit:12, supplier:"S003", minQty:200  },
  { id:"A004", name:"Woven Label",     unit:"pcs",  costPerUnit:4,  supplier:"S004", minQty:1000 },
  { id:"A005", name:"Main Label",      unit:"pcs",  costPerUnit:2,  supplier:"S004", minQty:1000 },
  { id:"A006", name:"Thread Spun 40s", unit:"spool",costPerUnit:28, supplier:"S003", minQty:50   },
  { id:"A007", name:"Hang Tag",        unit:"set",  costPerUnit:5,  supplier:"S004", minQty:500  },
  { id:"A008", name:"Poly Bag",        unit:"pcs",  costPerUnit:3,  supplier:"S004", minQty:500  },
];
const INIT_PATTERNS = [
  { id:"P001", styleCode:"STC-001", name:"Basic T-Shirt", bomVersion:1, sizeSet:"XS,S,M,L,XL", category:"Tops",   fabricId:"F001", fabricPerUnit:1.8, accessories:[{accId:"A004",qtyPerUnit:1},{accId:"A005",qtyPerUnit:1},{accId:"A006",qtyPerUnit:0.2},{accId:"A007",qtyPerUnit:1},{accId:"A008",qtyPerUnit:1}], laborCut:12, laborSew:25, laborQC:8  },
  { id:"P002", styleCode:"PLO-001", name:"Polo Shirt",   bomVersion:2, sizeSet:"S,M,L,XL,XXL", category:"Tops",   fabricId:"F001", fabricPerUnit:2.0, accessories:[{accId:"A001",qtyPerUnit:3},{accId:"A004",qtyPerUnit:1},{accId:"A005",qtyPerUnit:1},{accId:"A006",qtyPerUnit:0.3},{accId:"A007",qtyPerUnit:1},{accId:"A008",qtyPerUnit:1}], laborCut:15, laborSew:40, laborQC:10 },
  { id:"P003", styleCode:"WSH-001", name:"Woven Shirt",  bomVersion:1, sizeSet:"S,M,L,XL",     category:"Tops",   fabricId:"F002", fabricPerUnit:2.4, accessories:[{accId:"A001",qtyPerUnit:7},{accId:"A004",qtyPerUnit:1},{accId:"A005",qtyPerUnit:1},{accId:"A006",qtyPerUnit:0.4},{accId:"A007",qtyPerUnit:1},{accId:"A008",qtyPerUnit:1}], laborCut:18, laborSew:55, laborQC:12 },
  { id:"P004", styleCode:"CSP-001", name:"Casual Pants", bomVersion:1, sizeSet:"S,M,L,XL,XXL", category:"Bottoms",fabricId:"F002", fabricPerUnit:2.8, accessories:[{accId:"A002",qtyPerUnit:1},{accId:"A001",qtyPerUnit:1},{accId:"A003",qtyPerUnit:0.8},{accId:"A004",qtyPerUnit:1},{accId:"A005",qtyPerUnit:1},{accId:"A006",qtyPerUnit:0.5},{accId:"A007",qtyPerUnit:1},{accId:"A008",qtyPerUnit:1}], laborCut:22, laborSew:65, laborQC:13 },
  { id:"P005", styleCode:"SPT-001", name:"Sports Tee",   bomVersion:1, sizeSet:"S,M,L,XL",     category:"Tops",   fabricId:"F003", fabricPerUnit:1.6, accessories:[{accId:"A004",qtyPerUnit:1},{accId:"A005",qtyPerUnit:1},{accId:"A006",qtyPerUnit:0.2},{accId:"A008",qtyPerUnit:1}], laborCut:10, laborSew:22, laborQC:8  },
];
const INIT_SUPPLIERS = [
  { id:"S001", name:"Thai Textile Co.",     contact:"02-123-4567", email:"sale@thaitextile.com", address:"123 ถนนพระราม 4 กรุงเทพ", creditDays:30, category:"Fabric"       },
  { id:"S002", name:"Bangkok Weaving",      contact:"02-234-5678", email:"bkk@weaving.co.th",    address:"456 ถนนสุขุมวิท กรุงเทพ",  creditDays:45, category:"Fabric"       },
  { id:"S003", name:"Trim & Findings Ltd.", contact:"02-345-6789", email:"sales@trimfind.com",   address:"789 ถนนลาดพร้าว กรุงเทพ", creditDays:30, category:"Accessories"  },
  { id:"S004", name:"Label House",          contact:"02-456-7890", email:"info@labelhouse.th",    address:"321 ถนนรามคำแหง กรุงเทพ", creditDays:15, category:"Packaging"    },
];
const INIT_PRINT_TYPES = [
  {id:"PT001",name:"None",costPerUnit:0},{id:"PT002",name:"Silk Screen (1 color)",costPerUnit:18},
  {id:"PT003",name:"Silk Screen (4 color)",costPerUnit:45},{id:"PT004",name:"Embroidery (small)",costPerUnit:35},
  {id:"PT005",name:"Embroidery (large)",costPerUnit:75},{id:"PT006",name:"Digital Print",costPerUnit:55},
  {id:"PT007",name:"Heat Transfer",costPerUnit:28},
];
const INIT_COST_RATES = { overheadRate:18, laborCutRate:1.0, laborSewRate:1.0, laborQCRate:1.0, currency:"THB" };
const INIT_STOCK      = { F001:450, F002:220, F003:380, F004:150, A001:2500, A002:300, A003:800, A004:3000, A005:3000, A006:120, A007:2000, A008:2000 };
const INIT_ORDERS     = [
  { id:"SO-2401", orderNo:"SO-2501-0001", customer:"Brand ABC", customerAddress:"88 ถนนสีลม กรุงเทพ 10500", patternId:"P002", printTypeId:"PT004", qty:500, targetPrice:280, totalAmount:140000, status:"confirmed", priority:"normal", deliveryChannel:"Flash Express", date:"2025-01-15", dueDate:"2025-03-15", slots:[{id:1,patternId:"P002",printTypeId:"PT004",qty:"500",colorNote:"Navy",sizeBreakdown:"S×100,M×200,L×150,XL×50",slotNote:"ปักโลโก้หน้า"}] },
  { id:"SO-2402", orderNo:"SO-2501-0002", customer:"Sport Club", customerAddress:"55 ถนนรัชดา กรุงเทพ 10400", patternId:"P005", printTypeId:"PT002", qty:200, targetPrice:180, totalAmount:36000, status:"production", priority:"high", deliveryChannel:"Lalamove", date:"2025-02-10", dueDate:"2025-04-10", slots:[{id:1,patternId:"P005",printTypeId:"PT002",qty:"200",colorNote:"Blue",sizeBreakdown:"M×100,L×100",slotNote:""}] },
  { id:"SO-2403", orderNo:"SO-2501-0003", customer:"RetailCo",   customerAddress:"12 ถนนพหลโยธิน กรุงเทพ 10900", patternId:"P001", printTypeId:"PT001", qty:300, targetPrice:120, totalAmount:39000, status:"done",       priority:"normal", deliveryChannel:"ส่งเอง",       date:"2025-03-01", dueDate:"2025-04-01", slots:[{id:1,patternId:"P001",printTypeId:"PT001",qty:"300",colorNote:"White",sizeBreakdown:"S×150,M×150",slotNote:""}] },
];
const INIT_BILLS = [
  {id:"BILL-001",invoiceNo:"INV-2024-001",supplier:"Thai Textile Co.",    date:"2025-01-10",status:"paid",   items:[{materialName:"Cotton Jersey 180gsm",qty:1200,unit:"m",pricePerUnit:85,totalAmount:102000}],total:102000},
  {id:"BILL-002",invoiceNo:"INV-2024-002",supplier:"Trim & Findings Ltd.",date:"2025-01-12",status:"pending",items:[{materialName:"Button 20mm",qty:3000,unit:"pcs",pricePerUnit:3,totalAmount:9000},{materialName:"Woven Label",qty:2000,unit:"pcs",pricePerUnit:4,totalAmount:8000}],total:17000},
];
const INIT_SALE_INVOICES = [
  {id:"SI-2401",orderId:"SO-2401",customer:"Brand ABC",  amount:161000,status:"paid",   date:"2025-01-20",dueDate:"2025-02-20",paidDate:"2025-02-01",note:""},
  {id:"SI-2402",orderId:"SO-2402",customer:"Sport Club", amount:38400, status:"pending",date:"2025-02-12",dueDate:"2025-03-12",paidDate:null,note:"รอโอนเงิน"},
  {id:"SI-2403",orderId:"SO-2403",customer:"RetailCo",   amount:39600, status:"paid",   date:"2025-03-05",dueDate:"2025-04-05",paidDate:"2025-03-20",note:""},
];
// Stock Movement Log
const INIT_STOCK_LOG = [
  {id:"LOG-001",itemId:"F001",itemName:"Cotton Jersey 180gsm",type:"in", qty:500, reason:"รับของจาก Thai Textile",   date:"2025-01-05",balAfter:450},
  {id:"LOG-002",itemId:"A006",itemName:"Thread Spun 40s",     type:"out",qty:30,  reason:"ตัด Stock สำหรับ SO-2401", date:"2025-01-16",balAfter:120},
];
// Purchase Orders
const INIT_POS = [];
const PRIMER_ITEMS = [
  {code:"A001M",fabricType:"ค็อตตอน",   name:"เสื้อยืดคอกลม Cotton สีขาว M",cost:85, sellPrice:159},
  {code:"A001L",fabricType:"ค็อตตอน",   name:"เสื้อยืดคอกลม Cotton สีขาว L",cost:85, sellPrice:159},
  {code:"A002M",fabricType:"ไมโครเรียบ",name:"เสื้อโปโล Micro สีดำ M",       cost:120,sellPrice:229},
  {code:"B001M",fabricType:"ผ้าร่มกันน้ำ",name:"กางเกง Windbreaker สีกรม M", cost:180,sellPrice:350},
  {code:"C001", fabricType:"Dry Tech",   name:"เสื้อกีฬา Dry Tech สีฟ้า M",  cost:95, sellPrice:199},
];

// ════════════════════════════════════════════════════════════════
// § 6  DATA CONTEXT
// ════════════════════════════════════════════════════════════════
const DataCtx = createContext(null);
const useData = () => useContext(DataCtx);

function DataProvider({ children }) {
  const [data, setData] = useState({
    fabrics:INIT_FABRICS, accessories:INIT_ACCESSORIES, patterns:INIT_PATTERNS,
    printTypes:INIT_PRINT_TYPES, suppliers:INIT_SUPPLIERS, costRates:INIT_COST_RATES,
    orders:INIT_ORDERS, stock:{...INIT_STOCK}, bills:INIT_BILLS,
    saleInvoices:INIT_SALE_INVOICES, stockLog:INIT_STOCK_LOG, purchaseOrders:INIT_POS,
  });
  const [itemMaster] = useState(PRIMER_ITEMS);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState("กำลังโหลดข้อมูล...");

  useEffect(() => {
    async function boot() {
      setDbStatus("กำลังเชื่อมต่อ Database...");
      try {
        const loaded = await loadAllData();
        if (loaded) {
          setData(d => ({
            ...d,
            fabrics:      loaded.fabrics.length      ? loaded.fabrics      : d.fabrics,
            accessories:  loaded.accessories.length  ? loaded.accessories  : d.accessories,
            patterns:     loaded.patterns.length     ? loaded.patterns     : d.patterns,
            printTypes:   loaded.printTypes.length   ? loaded.printTypes   : d.printTypes,
            suppliers:    loaded.suppliers.length    ? loaded.suppliers    : d.suppliers,
            orders:       loaded.orders,
            bills:        loaded.bills,
            stock:        Object.keys(loaded.stock).length ? loaded.stock  : d.stock,
            saleInvoices: loaded.saleInvoices,
          }));
          setDbStatus("✅ Connected");
        }
      } catch(e) {
        setDbStatus("⚠️ Demo Mode");
      }
      setLoading(false);
    }
    boot();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"monospace" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🧵</div>
        <div style={{ fontSize:26, fontWeight:700, color:C.accent, marginBottom:8 }}>PRIMER Group NXT ERP v4</div>
        <div style={{ fontSize:26, color:C.muted, marginBottom:20 }}>{dbStatus}</div>
        <div style={{ display:"flex", gap:8 }}>
          {[C.accent, C.accent2, C.ok].map((c,i) => (
            <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:c, opacity:0.4+(i*0.3) }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <DataCtx.Provider value={{ data, setData, itemMaster }}>
      {children}
    </DataCtx.Provider>
  );
}

// ════════════════════════════════════════════════════════════════
// § 7  SHARED UI COMPONENTS
// ════════════════════════════════════════════════════════════════
function Card({ children, style={} }) { return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:18, ...style }}>{children}</div>; }
function Tag({ text, color=C.ok })    { return <span style={{ padding:"2px 8px", borderRadius:4, fontSize:26, fontWeight:700, background:color+"25", color }}>{text}</span>; }
function Badge({ text, color=C.accent }) { return <span style={{ padding:"3px 10px", borderRadius:12, fontSize:17, fontWeight:700, background:color+"20", color, border:`1px solid ${color}40` }}>{text}</span>; }
function SectionHead({ title, sub, action }) {
  return <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18 }}>
    <div>
      <div style={{ fontSize:26, fontWeight:700, color:C.accent, letterSpacing:1 }}>{title}</div>
      {sub && <div style={{ fontSize:17, color:C.muted, marginTop:3 }}>{sub}</div>}
    </div>
    {action}
  </div>;
}
function Modal({ title, onClose, children, wide }) {
  return <div style={{ position:"fixed", inset:0, background:"#000d", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20, overflowY:"auto" }}>
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, width:"100%", maxWidth:wide?1000:680, maxHeight:"92vh", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.card }}>
        <span style={{ fontWeight:700, color:C.accent, fontSize:26 }}>{title}</span>
        <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:26, lineHeight:1 }}>×</button>
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  </div>;
}
function Field({ label, children, half, third }) {
  const flex = third ? "0 0 calc(33% - 8px)" : half ? "0 0 calc(50% - 6px)" : "1 1 100%";
  return <div style={{ marginBottom:12, flex }}>
    <label style={{ display:"block", fontSize:26, color:C.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</label>
    {children}
  </div>;
}
function Row2({ children }) { return <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>{children}</div>; }
function StatBox({ label, value, sub, color=C.accent, icon="" }) {
  return <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
    <div style={{ fontSize:26, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>{icon} {label}</div>
    <div style={{ fontSize:26, fontWeight:800, color }}>{value}</div>
    {sub && <div style={{ fontSize:26, color:C.muted, marginTop:4 }}>{sub}</div>}
  </div>;
}
function LangToggle({ lang, setLang }) {
  return <div style={{ display:"flex", background:"#060b16", border:`1px solid ${C.border}`, borderRadius:8, padding:3, gap:2, flexShrink:0 }}>
    {["EN","TH"].map(l => <button key={l} onClick={() => { setLang(l); _lang=l; }} style={{ padding:"4px 12px", borderRadius:6, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:17, fontWeight:700, background:lang===l?C.accent:"transparent", color:lang===l?"#000":C.muted }}>{l==="EN"?"🇬🇧 EN":"🇹🇭 TH"}</button>)}
  </div>;
}
function TabBar({ tabs, active, setActive }) {
  return <div style={{ display:"flex", marginBottom:16, background:"#060b16", borderRadius:10, padding:4, border:`1px solid ${C.border}` }}>
    {tabs.map(([id,label]) => <button key={id} onClick={() => setActive(id)} style={{ flex:1, padding:"8px 6px", background:active===id?C.accent:"none", color:active===id?C.bg:C.muted, border:"none", borderRadius:7, cursor:"pointer", fontFamily:"inherit", fontSize:17, fontWeight:700 }}>{label}</button>)}
  </div>;
}
function ProgressBar({ value, max, color=C.ok }) {
  const pct = max > 0 ? Math.min(100,(value/max)*100) : 0;
  return <div style={{ background:C.border, borderRadius:4, height:6, overflow:"hidden" }}>
    <div style={{ width:pct+"%", height:"100%", background:color, borderRadius:4, transition:"width 0.3s" }} />
  </div>;
}
function ValidationBanner({ errors }) {
  if (!errors||errors.length===0) return null;
  return <div style={{ padding:"10px 14px", background:C.err+"15", border:`1px solid ${C.err}50`, borderRadius:7, marginBottom:12 }}>
    {errors.map((e,i) => <div key={i} style={{ fontSize:26, color:C.err }}>⚠️ {e}</div>)}
  </div>;
}

// ── Reusable Image Upload Block ──────────────────────────────────
function ImageUploadBlock({ value, onChange, label="📷 รูปภาพ", height=90 }) {
  return (
    <div>
      {label && <div style={{ fontSize:13, color:C.muted, marginBottom:6, textTransform:"uppercase" }}>{label}</div>}
      <label style={{ cursor:"pointer", display:"block" }}>
        <div style={{ width:"100%", height, borderRadius:8, border:`2px dashed ${value?C.accent:C.border}`, background:"#060b16", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
          {value
            ? <img src={value} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            : <div style={{ textAlign:"center", color:C.muted }}>
                <div style={{ fontSize:22 }}>📷</div>
                <div style={{ fontSize:12, marginTop:4 }}>คลิกอัปโหลด</div>
              </div>
          }
        </div>
        <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => {
          const file = e.target.files[0]; if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => onChange(ev.target.result);
          reader.readAsDataURL(file);
        }}/>
      </label>
      {value && (
        <button onClick={e=>{e.preventDefault();onChange(null);}} style={{ ...s.btnGhost, marginTop:6, fontSize:12, padding:"3px 10px", color:C.err, borderColor:C.err+"50" }}>× ลบรูป</button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// § 8  MODULE: ITEM MASTER
// ════════════════════════════════════════════════════════════════
function ItemMasterModule() {
  const { itemMaster } = useData();
  const [search, setSearch] = useState("");
  const filtered = itemMaster.filter(i =>
    !search ||
    (i.code||"").toLowerCase().includes(search.toLowerCase()) ||
    (i.name||"").toLowerCase().includes(search.toLowerCase())
  );
  return <div>
    <SectionHead title="📁 ITEM MASTER" sub={`${itemMaster.length} SKUs`} />
    <Card style={{ marginBottom:14 }}><input style={s.input} placeholder="🔍 ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} /></Card>
    <Card>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:520 }}>
          <thead><tr>{["Code","ชนิดผ้า","ชื่อสินค้า","Cost","ราคาขาย","Margin"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map((item,i) => {
            const margin = item.sellPrice>0?((item.sellPrice-item.cost)/item.sellPrice*100):0;
            return <tr key={i} style={{ background:i%2===0?"transparent":"#060b1640" }}>
              <td style={{ ...s.td, color:C.accent, fontWeight:700, fontFamily:"monospace" }}>{item.code}</td>
              <td style={s.td}><Tag text={item.fabricType||"—"} color={C.accent2}/></td>
              <td style={s.td}>{item.name}</td>
              <td style={{ ...s.td, color:C.sub }}>฿{fmt(item.cost)}</td>
              <td style={{ ...s.td, color:C.ok, fontWeight:700 }}>฿{fmt(item.sellPrice)}</td>
              <td style={{ ...s.td, color:margin>=30?C.ok:C.warn }}>{margin.toFixed(1)}%</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </Card>
  </div>;
}

// ════════════════════════════════════════════════════════════════
// § 9  MODULE: MASTER DATA (ENHANCED)
// New fields: Fabric (code, color, widthCm, consumptionKg, minQty)
//             Supplier (email, address, creditDays)
//             Pattern (styleCode, bomVersion, sizeSet)
// ════════════════════════════════════════════════════════════════
const EMB_POSITIONS = ["อกซ้าย","อกขวา","กลางหน้าอก","หลัง","แขนซ้าย","แขนขวา","ชายเสื้อ","คอ","หน้าซ้ายล่าง","หน้าขวาล่าง"];
function PatternMaster({ data, setData }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ accessories:[] });
  const open = (p=null) => {
    setForm(p ? { ...p, accessories:[...p.accessories] } : { accessories:[], laborCut:12, laborSew:30, laborQC:8, bomVersion:1, sizeSet:"S,M,L,XL" });
    setModal(true);
  };
  const save = () => {
    const id = form.id || genId("P");
    const r  = { ...form, id, fabricPerUnit:parseFloat(form.fabricPerUnit)||2, laborCut:parseFloat(form.laborCut)||0, laborSew:parseFloat(form.laborSew)||0, laborQC:parseFloat(form.laborQC)||0, bomVersion:parseInt(form.bomVersion)||1 };
    setData(d => ({ ...d, patterns:[...d.patterns.filter(p=>p.id!==id), r] }));
    db.upsertPattern(r);
    setModal(false);
  };
  return <Card>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
      <span style={{ fontSize:17, fontWeight:700, color:C.text }}>Pattern / BOM Master</span>
      <button style={s.btn()} onClick={() => open()}>{t("add")}</button>
    </div>
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
        <thead><tr>{["รูป","Style Code","Pattern","Category","BOM v","Size Set","Fabric","ผ้า/ตัว","Labor",""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>{data.patterns.map(p => {
          const fab = data.fabrics.find(f=>f.id===p.fabricId);
          return <tr key={p.id}>
            <td style={{ ...s.td, width:48 }}>
              {p.imagePreview
                ? <img src={p.imagePreview} alt="" style={{ width:40, height:40, objectFit:"cover", borderRadius:6, border:`1px solid ${C.border}` }}/>
                : <div style={{ width:40, height:40, borderRadius:6, background:"#060b16", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:16 }}>📐</div>
              }
            </td>
            <td style={{ ...s.td, color:C.cyan, fontFamily:"monospace", fontSize:17 }}>{p.styleCode||"—"}</td>
            <td style={s.td}>{p.name}</td>
            <td style={s.td}><Tag text={p.category} color={C.purple}/></td>
            <td style={{ ...s.td, color:C.muted, fontSize:17 }}>v{p.bomVersion||1}</td>
            <td style={{ ...s.td, color:C.sub, fontSize:17 }}>{p.sizeSet||"—"}</td>
            <td style={{ ...s.td, color:C.sub, fontSize:17 }}>{fab?.name||p.fabricId}</td>
            <td style={{ ...s.td, color:C.accent }}>{p.fabricPerUnit} {fab?.unit||"m"}</td>
            <td style={s.td}>฿{fmt(p.laborCut+p.laborSew+p.laborQC)}</td>
            <td style={s.td}>
              <button onClick={() => open(p)} style={{ ...s.btnGhost, padding:"3px 8px", marginRight:4, fontSize:17 }}>{t("edit")}</button>
              <button onClick={() => { setData(d => ({ ...d, patterns:d.patterns.filter(x=>x.id!==p.id) })); db.deletePattern(p.id); }} style={{ ...s.btnGhost, padding:"3px 8px", color:C.err, borderColor:C.err+"50", fontSize:17 }}>{t("del")}</button>
            </td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {modal && <Modal title={form.id?"แก้ไข Pattern":"เพิ่ม Pattern"} onClose={() => setModal(false)} wide>
      <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:16 }}>
        {/* LEFT: รูปภาพแนวตั้ง */}
        <div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:6, textTransform:"uppercase" }}>📷 รูปภาพ</div>
          <label style={{ cursor:"pointer", display:"block" }}>
            <div style={{ width:160, height:200, borderRadius:8, border:`2px dashed ${form.imagePreview?C.accent:C.border}`, background:"#060b16", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              {form.imagePreview
                ? <img src={form.imagePreview} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                : <div style={{ textAlign:"center", color:C.muted }}><div style={{ fontSize:28 }}>📷</div><div style={{ fontSize:11, marginTop:4 }}>คลิกอัปโหลด</div></div>
              }
            </div>
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(fm=>({...fm,imagePreview:ev.target.result}));r.readAsDataURL(f);}}/>
          </label>
          {form.imagePreview && <button onClick={()=>setForm(f=>({...f,imagePreview:null}))} style={{ ...s.btnGhost, marginTop:6, fontSize:11, padding:"2px 8px", color:C.err, borderColor:C.err+"50" }}>× ลบรูป</button>}
        </div>
        {/* RIGHT: fields */}
        <Row2>
          <Field label="Style Code" third><input style={s.input} value={form.styleCode||""} onChange={e=>setForm(f=>({...f,styleCode:e.target.value}))} placeholder="STC-001"/></Field>
          <Field label="ชื่อ Pattern" third><input style={s.input} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
          <Field label="BOM Version" third><input style={s.input} type="number" value={form.bomVersion||1} onChange={e=>setForm(f=>({...f,bomVersion:e.target.value}))}/></Field>
          <Field label="Category" half>
            <select style={s.select} value={form.category||"Tops"} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              <option>Tops</option><option>Bottoms</option><option>Outerwear</option><option>Accessories</option>
            </select>
          </Field>
          <Field label="Size Set" half><input style={s.input} value={form.sizeSet||""} onChange={e=>setForm(f=>({...f,sizeSet:e.target.value}))} placeholder="S,M,L,XL"/></Field>
          <Field label="Fabric" half>
            <select style={s.select} value={form.fabricId||""} onChange={e=>setForm(f=>({...f,fabricId:e.target.value}))}>
              {data.fabrics.map(f => <option key={f.id} value={f.id}>{f.code||f.id} — {f.name}</option>)}
            </select>
          </Field>
          <Field label="ผ้า/ตัว (m)" half><input style={s.input} type="number" step="0.1" value={form.fabricPerUnit||""} onChange={e=>setForm(f=>({...f,fabricPerUnit:e.target.value}))}/></Field>
          <Field label="Labor ตัด (฿)" third><input style={s.input} type="number" value={form.laborCut||""} onChange={e=>setForm(f=>({...f,laborCut:e.target.value}))}/></Field>
          <Field label="Labor เย็บ (฿)" third><input style={s.input} type="number" value={form.laborSew||""} onChange={e=>setForm(f=>({...f,laborSew:e.target.value}))}/></Field>
          <Field label="Labor QC (฿)" third><input style={s.input} type="number" value={form.laborQC||""} onChange={e=>setForm(f=>({...f,laborQC:e.target.value}))}/></Field>
        </Row2>
      </div>
      <div style={{ marginTop:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:17, color:C.muted, textTransform:"uppercase" }}>Accessories / Trim</span>
          <button style={{ ...s.btnGhost, padding:"3px 10px" }} onClick={() => setForm(f=>({...f,accessories:[...f.accessories,{accId:data.accessories[0]?.id||"",qtyPerUnit:1}]}))}>+ เพิ่ม</button>
        </div>
        {form.accessories.map((a,i) => (
          <div key={i} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center" }}>
            <select style={{ ...s.select, flex:2 }} value={a.accId} onChange={e=>setForm(f=>({...f,accessories:f.accessories.map((x,idx)=>idx===i?{...x,accId:e.target.value}:x)}))}>
              {data.accessories.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
            <input style={{ ...s.input, flex:1 }} type="number" step="0.1" value={a.qtyPerUnit} onChange={e=>setForm(f=>({...f,accessories:f.accessories.map((x,idx)=>idx===i?{...x,qtyPerUnit:parseFloat(e.target.value)||1}:x)}))} placeholder="/ตัว"/>
            <button onClick={() => setForm(f=>({...f,accessories:f.accessories.filter((_,idx)=>idx!==i)}))} style={{ ...s.btnGhost, padding:"5px 10px", color:C.err }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        <button style={s.btn()} onClick={save}>{t("save")}</button>
        <button style={s.btnGhost} onClick={() => setModal(false)}>{t("cancel")}</button>
      </div>
    </Modal>}
  </Card>;
}

function MasterModule() {
  const { data, setData } = useData();
  const [tab,   setTab]   = useState("fabric");
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({});

  const save = () => {
    if (modal==="fabric") {
      const id = form.id||genId("F");
      const r = {...form,id,costPerUnit:parseFloat(form.costPerUnit)||0,widthCm:parseFloat(form.widthCm)||0,consumptionKg:parseFloat(form.consumptionKg)||0,minQty:parseFloat(form.minQty)||0};
      setData(d => {
        const isNew = !d.fabrics.find(x=>x.id===id);
        const newStock = isNew ? {...d.stock, [id]: 0} : d.stock;
        const newLog = isNew ? [...(d.stockLog||[]), {id:genId("LOG"),itemId:id,itemName:r.name,type:"in",qty:0,reason:"เพิ่มรายการใหม่จาก Master",date:today(),balAfter:0}] : d.stockLog;
        return {...d, fabrics:[...d.fabrics.filter(x=>x.id!==id),r], stock:newStock, stockLog:newLog};
      });
      db.upsertFabric(r);
    }
    if (modal==="acc") {
      const id = form.id||genId("A");
      const r = {...form,id,costPerUnit:parseFloat(form.costPerUnit)||0,minQty:parseFloat(form.minQty)||0};
      setData(d => {
        const isNew = !d.accessories.find(x=>x.id===id);
        const newStock = isNew ? {...d.stock, [id]: 0} : d.stock;
        const newLog = isNew ? [...(d.stockLog||[]), {id:genId("LOG"),itemId:id,itemName:r.name,type:"in",qty:0,reason:"เพิ่มรายการใหม่จาก Master",date:today(),balAfter:0}] : d.stockLog;
        return {...d, accessories:[...d.accessories.filter(x=>x.id!==id),r], stock:newStock, stockLog:newLog};
      });
      db.upsertAccessory(r);
    }
    if (modal==="print")    { const id=form.id||genId("PT");const r={...form,id,costPerUnit:parseFloat(form.costPerUnit)||0}; setData(d=>({...d,printTypes:[...d.printTypes.filter(x=>x.id!==id),r]})); db.upsertPrintType(r); }
    if (modal==="supplier") { const id=form.id||genId("S"); const r={...form,id,creditDays:parseInt(form.creditDays)||30}; setData(d=>({...d,suppliers:[...d.suppliers.filter(x=>x.id!==id),r]})); db.upsertSupplier(r); }
    if (modal==="rates")    { setData(d=>({...d,costRates:{...d.costRates,overheadRate:parseFloat(form.overheadRate),laborCutRate:parseFloat(form.laborCutRate),laborSewRate:parseFloat(form.laborSewRate),laborQCRate:parseFloat(form.laborQCRate)}})); }
    setModal(null);
  };
  const del = (type,id) => {
    if (type==="fabric")   { setData(d=>({...d,fabrics:d.fabrics.filter(x=>x.id!==id)})); db.deleteFabric(id); }
    if (type==="acc")      { setData(d=>({...d,accessories:d.accessories.filter(x=>x.id!==id)})); db.deleteAccessory(id); }
    if (type==="print")    { setData(d=>({...d,printTypes:d.printTypes.filter(x=>x.id!==id)})); db.deletePrintType(id); }
    if (type==="supplier") { setData(d=>({...d,suppliers:d.suppliers.filter(x=>x.id!==id)})); db.deleteSupplier(id); }
  };

  const tabs = [{id:"fabric",label:"🧵 Fabric"},{id:"acc",label:"🔩 Accessories"},{id:"pattern",label:"📐 Pattern/BOM"},{id:"print",label:"🖨 Print/EMB"},{id:"supplier",label:"🏭 Supplier"},{id:"rates",label:"⚙️ Cost Rates"}];

  return <div>
    <SectionHead title="⚙️ MASTER DATA" sub="Fabrics · Accessories · Patterns · Print · Suppliers · Cost Rates"/>
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:18 }}>
      {tabs.map(tb => <button key={tb.id} onClick={() => setTab(tb.id)} style={{ ...s.btnGhost, ...(tab===tb.id?{background:C.accent+"20",color:C.accent,borderColor:C.accent+"60"}:{}) }}>{tb.label}</button>)}
    </div>

    {/* ── FABRIC ── */}
    {tab==="fabric" && <Card>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:17, fontWeight:700, color:C.text }}>Fabric Master</span>
        <button style={s.btn()} onClick={() => { setModal("fabric"); setForm({}); }}>{t("add")}</button>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:750 }}>
          <thead><tr>{["รูป","Code","ชื่อผ้า","ประเภท","สี","หน้ากว้าง(cm)","ราคา/m","Min Stock","Supplier",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{data.fabrics.map(f => <tr key={f.id}>
            <td style={{ ...s.td, width:48 }}>
              {f.imagePreview
                ? <img src={f.imagePreview} alt="" style={{ width:40, height:40, objectFit:"cover", borderRadius:6, border:`1px solid ${C.border}` }}/>
                : <div style={{ width:40, height:40, borderRadius:6, background:"#060b16", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:16 }}>📷</div>
              }
            </td>
            <td style={{ ...s.td, color:C.cyan, fontFamily:"monospace", fontSize:17 }}>{f.code||f.id}</td>
            <td style={s.td}>{f.name}</td>
            <td style={s.td}><Tag text={f.type} color={C.accent2}/></td>
            <td style={{ ...s.td, color:C.sub }}>{f.color||"—"}</td>
            <td style={s.td}>{f.widthCm||"—"} cm</td>
            <td style={{ ...s.td, color:C.accent }}>฿{fmt(f.costPerUnit)}</td>
            <td style={{ ...s.td, color:(data.stock[f.id]||0)<(f.minQty||0)?C.err:C.ok }}>{f.minQty||0} {f.unit}</td>
            <td style={{ ...s.td, color:C.muted, fontSize:17 }}>{data.suppliers.find(x=>x.id===f.supplier)?.name||f.supplier}</td>
            <td style={s.td}>
              <button onClick={() => { setModal("fabric"); setForm(f); }} style={{ ...s.btnGhost, padding:"3px 8px", marginRight:4, fontSize:17 }}>{t("edit")}</button>
              <button onClick={() => del("fabric",f.id)} style={{ ...s.btnGhost, padding:"3px 8px", color:C.err, borderColor:C.err+"50", fontSize:17 }}>{t("del")}</button>
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>}

    {/* ── ACCESSORIES ── */}
    {tab==="acc" && <Card>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:17, fontWeight:700, color:C.text }}>Accessories Master</span>
        <button style={s.btn()} onClick={() => { setModal("acc"); setForm({}); }}>{t("add")}</button>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
          <thead><tr>{["รูป","ID","ชื่อ","หน่วย","ราคา/unit","Min Stock","Stock ปัจจุบัน","Status",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{data.accessories.map(a => {
            const qty   = data.stock[a.id]||0;
            const isLow = qty < (a.minQty||0);
            return <tr key={a.id}>
              <td style={{ ...s.td, width:48 }}>
                {a.imagePreview
                  ? <img src={a.imagePreview} alt="" style={{ width:40, height:40, objectFit:"cover", borderRadius:6, border:`1px solid ${C.border}` }}/>
                  : <div style={{ width:40, height:40, borderRadius:6, background:"#060b16", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:16 }}>📷</div>
                }
              </td>
              <td style={{ ...s.td, color:C.muted, fontFamily:"monospace" }}>{a.id}</td>
              <td style={s.td}>{a.name}</td>
              <td style={s.td}>{a.unit}</td>
              <td style={{ ...s.td, color:C.accent }}>฿{fmt(a.costPerUnit)}</td>
              <td style={s.td}>{a.minQty||0}</td>
              <td style={{ ...s.td, fontWeight:700, color:isLow?C.err:C.ok }}>{qty.toLocaleString()}</td>
              <td style={s.td}>{isLow ? <Tag text="⚠️ ต่ำกว่า Min" color={C.err}/> : <Tag text="✓ ปกติ" color={C.ok}/>}</td>
              <td style={s.td}>
                <button onClick={() => { setModal("acc"); setForm(a); }} style={{ ...s.btnGhost, padding:"3px 8px", marginRight:4, fontSize:17 }}>{t("edit")}</button>
                <button onClick={() => del("acc",a.id)} style={{ ...s.btnGhost, padding:"3px 8px", color:C.err, borderColor:C.err+"50", fontSize:17 }}>{t("del")}</button>
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </Card>}

    {tab==="pattern" && <PatternMaster data={data} setData={setData}/>}

    {/* ── PRINT TYPES ── */}
    {tab==="print" && <Card>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:17, fontWeight:700, color:C.text }}>Print / EMB Types</span>
        <button style={s.btn()} onClick={() => { setModal("print"); setForm({}); }}>{t("add")}</button>
      </div>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead><tr>{["รูป","ID","ชื่อ","ราคา/ตัว","ราคาแยกตำแหน่ง",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>{data.printTypes.map(p => <tr key={p.id}>
          <td style={{ ...s.td, width:48 }}>
            {p.imagePreview
              ? <img src={p.imagePreview} alt="" style={{ width:40, height:40, objectFit:"cover", borderRadius:6, border:`1px solid ${C.border}` }}/>
              : <div style={{ width:40, height:40, borderRadius:6, background:"#060b16", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:16 }}>🖨</div>
            }
          </td>
          <td style={{ ...s.td, color:C.muted, fontFamily:"monospace" }}>{p.id}</td>
          <td style={s.td}>{p.name}</td>
          <td style={{ ...s.td, color:C.accent }}>฿{fmt(p.costPerUnit)}</td>
          <td style={{ ...s.td, fontSize:13, color:C.sub }}>
            {(p.positionPrices||[]).length > 0
              ? (p.positionPrices||[]).map(pp => `${pp.position}: ฿${pp.price}`).join(" · ")
              : <span style={{ color:C.muted }}>—</span>
            }
          </td>
          <td style={s.td}>
            <button onClick={() => { setModal("print"); setForm({...p, positionPrices:p.positionPrices||[]}); }} style={{ ...s.btnGhost, padding:"3px 8px", marginRight:4, fontSize:17 }}>{t("edit")}</button>
            <button onClick={() => del("print",p.id)} style={{ ...s.btnGhost, padding:"3px 8px", color:C.err, borderColor:C.err+"50", fontSize:17 }}>{t("del")}</button>
          </td>
        </tr>)}</tbody>
      </table>
    </Card>}

    {/* ── SUPPLIER ── */}
    {tab==="supplier" && <Card>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:17, fontWeight:700, color:C.text }}>Supplier Master</span>
        <button style={s.btn()} onClick={() => { setModal("supplier"); setForm({}); }}>{t("add")}</button>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
          <thead><tr>{["รูป","ID","ชื่อบริษัท","เบอร์โทร","Email","Credit Days","หมวด",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>{data.suppliers.map(sup => <tr key={sup.id}>
            <td style={{ ...s.td, width:48 }}>
              {sup.imagePreview
                ? <img src={sup.imagePreview} alt="" style={{ width:40, height:40, objectFit:"cover", borderRadius:6, border:`1px solid ${C.border}` }}/>
                : <div style={{ width:40, height:40, borderRadius:6, background:"#060b16", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:16 }}>🏭</div>
              }
            </td>
            <td style={{ ...s.td, color:C.muted, fontFamily:"monospace" }}>{sup.id}</td>
            <td style={s.td}>{sup.name}</td>
            <td style={{ ...s.td, color:C.sub }}>{sup.contact}</td>
            <td style={{ ...s.td, color:C.muted, fontSize:17 }}>{sup.email||"—"}</td>
            <td style={s.td}><Badge text={`${sup.creditDays||0} วัน`} color={C.accent2}/></td>
            <td style={s.td}><Tag text={sup.category} color={C.purple}/></td>
            <td style={s.td}>
              <button onClick={() => { setModal("supplier"); setForm(sup); }} style={{ ...s.btnGhost, padding:"3px 8px", marginRight:4, fontSize:17 }}>{t("edit")}</button>
              <button onClick={() => del("supplier",sup.id)} style={{ ...s.btnGhost, padding:"3px 8px", color:C.err, borderColor:C.err+"50", fontSize:17 }}>{t("del")}</button>
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>}

    {/* ── COST RATES ── */}
    {tab==="rates" && <Card>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
        <span style={{ fontSize:17, fontWeight:700, color:C.text }}>Cost Rates</span>
        <button style={s.btn()} onClick={() => { setModal("rates"); setForm({...data.costRates}); }}>แก้ไข</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[["Overhead Rate",data.costRates.overheadRate+"%"],["Labor Cut Rate","×"+data.costRates.laborCutRate],["Labor Sew Rate","×"+data.costRates.laborSewRate],["Labor QC Rate","×"+data.costRates.laborQCRate]].map(([k,v]) => (
          <div key={k} style={{ background:"#060b16", border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 16px" }}>
            <div style={{ fontSize:26, color:C.muted, textTransform:"uppercase" }}>{k}</div>
            <div style={{ fontSize:26, fontWeight:700, color:C.accent, marginTop:4 }}>{v}</div>
          </div>
        ))}
      </div>
    </Card>}

    {/* ── MODALS ── */}
    {modal==="fabric" && <Modal title={form.id?"แก้ไข Fabric":"เพิ่ม Fabric"} onClose={() => setModal(null)} wide>
      <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:16 }}>
        {/* LEFT: รูปภาพแนวตั้ง ซ้ายบน */}
        <div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:6, textTransform:"uppercase" }}>📷 รูปภาพผ้า</div>
          <label style={{ cursor:"pointer", display:"block" }}>
            <div style={{ width:160, height:200, borderRadius:8, border:`2px dashed ${form.imagePreview?C.accent:C.border}`, background:"#060b16", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              {form.imagePreview
                ? <img src={form.imagePreview} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                : <div style={{ textAlign:"center", color:C.muted }}><div style={{ fontSize:28 }}>📷</div><div style={{ fontSize:11, marginTop:4 }}>คลิกอัปโหลด</div></div>
              }
            </div>
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(fm=>({...fm,imagePreview:ev.target.result}));r.readAsDataURL(f);}}/>
          </label>
          {form.imagePreview && <button onClick={()=>setForm(f=>({...f,imagePreview:null}))} style={{ ...s.btnGhost, marginTop:6, fontSize:11, padding:"2px 8px", color:C.err, borderColor:C.err+"50" }}>× ลบรูป</button>}
        </div>
        {/* RIGHT: fields */}
        <Row2>
          <Field label="Code" half><input style={s.input} value={form.code||""} onChange={e=>setForm(f=>({...f,code:e.target.value}))} placeholder="CTJ-180"/></Field>
          <Field label="ชื่อผ้า" half><input style={s.input} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
          <Field label="ประเภท" third><select style={s.select} value={form.type||"Knit"} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option>Knit</option><option>Woven</option><option>Cotton</option></select></Field>
          <Field label="สี" third><input style={s.input} value={form.color||""} onChange={e=>setForm(f=>({...f,color:e.target.value}))} placeholder="White"/></Field>
          <Field label="หน่วย" third><select style={s.select} value={form.unit||"m"} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}><option value="m">เมตร</option><option value="yard">หลา</option><option value="kg">กิโลกรัม</option></select></Field>
          <Field label="หน้ากว้าง (cm)" third><input style={s.input} type="number" value={form.widthCm||""} onChange={e=>setForm(f=>({...f,widthCm:e.target.value}))}/></Field>
          <Field label="ราคา/หน่วย (฿)" third><input style={s.input} type="number" value={form.costPerUnit||""} onChange={e=>setForm(f=>({...f,costPerUnit:e.target.value}))}/></Field>
          <Field label="Min Stock" third><input style={s.input} type="number" value={form.minQty||""} onChange={e=>setForm(f=>({...f,minQty:e.target.value}))} placeholder="จุดสั่งซื้อ"/></Field>
          <Field label="Supplier"><select style={s.select} value={form.supplier||""} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))}>{data.suppliers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        </Row2>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}><button style={s.btn()} onClick={save}>{t("save")}</button><button style={s.btnGhost} onClick={() => setModal(null)}>{t("cancel")}</button></div>
    </Modal>}

    {modal==="acc" && <Modal title={form.id?"แก้ไข Accessories":"เพิ่ม Accessories"} onClose={() => setModal(null)} wide>
      <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:16 }}>
        <div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:6, textTransform:"uppercase" }}>📷 รูปภาพ</div>
          <label style={{ cursor:"pointer", display:"block" }}>
            <div style={{ width:160, height:200, borderRadius:8, border:`2px dashed ${form.imagePreview?C.accent:C.border}`, background:"#060b16", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              {form.imagePreview
                ? <img src={form.imagePreview} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                : <div style={{ textAlign:"center", color:C.muted }}><div style={{ fontSize:28 }}>📷</div><div style={{ fontSize:11, marginTop:4 }}>คลิกอัปโหลด</div></div>
              }
            </div>
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(fm=>({...fm,imagePreview:ev.target.result}));r.readAsDataURL(f);}}/>
          </label>
          {form.imagePreview && <button onClick={()=>setForm(f=>({...f,imagePreview:null}))} style={{ ...s.btnGhost, marginTop:6, fontSize:11, padding:"2px 8px", color:C.err, borderColor:C.err+"50" }}>× ลบรูป</button>}
        </div>
        <Row2>
          <Field label="ชื่อ"><input style={s.input} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
          <Field label="หน่วย" half><input style={s.input} value={form.unit||""} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}/></Field>
          <Field label="ราคา/หน่วย (฿)" half><input style={s.input} type="number" value={form.costPerUnit||""} onChange={e=>setForm(f=>({...f,costPerUnit:e.target.value}))}/></Field>
          <Field label="Min Stock (จุดสั่งซื้อ)" half><input style={s.input} type="number" value={form.minQty||""} onChange={e=>setForm(f=>({...f,minQty:e.target.value}))}/></Field>
          <Field label="Supplier" half><select style={s.select} value={form.supplier||""} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))}>{data.suppliers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        </Row2>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}><button style={s.btn()} onClick={save}>{t("save")}</button><button style={s.btnGhost} onClick={() => setModal(null)}>{t("cancel")}</button></div>
    </Modal>}

    {modal==="print" && <Modal title={form.id?"แก้ไข Print/EMB":"เพิ่ม Print/EMB"} onClose={() => setModal(null)} wide>
      <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:16, marginBottom:16 }}>
        <div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:6, textTransform:"uppercase" }}>📷 รูปภาพตัวอย่าง</div>
          <label style={{ cursor:"pointer", display:"block" }}>
            <div style={{ width:160, height:200, borderRadius:8, border:`2px dashed ${form.imagePreview?C.accent:C.border}`, background:"#060b16", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              {form.imagePreview
                ? <img src={form.imagePreview} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                : <div style={{ textAlign:"center", color:C.muted }}><div style={{ fontSize:28 }}>📷</div><div style={{ fontSize:11, marginTop:4 }}>คลิกอัปโหลด</div></div>
              }
            </div>
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(fm=>({...fm,imagePreview:ev.target.result}));r.readAsDataURL(f);}}/>
          </label>
          {form.imagePreview && <button onClick={()=>setForm(f=>({...f,imagePreview:null}))} style={{ ...s.btnGhost, marginTop:6, fontSize:11, padding:"2px 8px", color:C.err, borderColor:C.err+"50" }}>× ลบรูป</button>}
        </div>
        <Row2>
          <Field label="ชื่อ" half><input style={s.input} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
          <Field label="ราคาเริ่มต้น/ตัว (฿)" half><input style={s.input} type="number" value={form.costPerUnit||""} onChange={e=>setForm(f=>({...f,costPerUnit:e.target.value}))} placeholder="ราคา default"/></Field>
        </Row2>
      </div>
      {/* ราคาแยกตามตำแหน่ง */}
      <div style={{ marginTop:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontSize:13, color:C.muted, textTransform:"uppercase" }}>💰 ราคาแยกตามตำแหน่ง (Screen/EMB)</span>
          <button style={{ ...s.btnGhost, padding:"3px 10px", fontSize:12 }}
            onClick={() => setForm(f => ({...f, positionPrices:[...(f.positionPrices||[]), {position:"", price:""}]}))}>
            + เพิ่มตำแหน่ง
          </button>
        </div>
        <div style={{ background:"#060b16", borderRadius:8, padding:10, border:`1px solid ${C.border}` }}>
          {(!form.positionPrices || form.positionPrices.length===0) && (
            <div style={{ fontSize:13, color:C.muted, textAlign:"center", padding:"10px 0" }}>ยังไม่มีราคาแยกตำแหน่ง — ใช้ราคาเริ่มต้นด้านบน</div>
          )}
          {(form.positionPrices||[]).map((pp,i) => (
            <div key={i} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center" }}>
              <select style={{ ...s.select, flex:2, fontSize:13, padding:"6px 8px" }}
                value={pp.position} onChange={e=>setForm(f=>({...f,positionPrices:f.positionPrices.map((x,idx)=>idx===i?{...x,position:e.target.value}:x)}))}>
                <option value="">— เลือกตำแหน่ง —</option>
                {EMB_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
              <input style={{ ...s.input, flex:1, fontSize:13, padding:"6px 8px" }} type="number" placeholder="฿ ราคา"
                value={pp.price} onChange={e=>setForm(f=>({...f,positionPrices:f.positionPrices.map((x,idx)=>idx===i?{...x,price:e.target.value}:x)}))}/>
              <button onClick={()=>setForm(f=>({...f,positionPrices:f.positionPrices.filter((_,idx)=>idx!==i)}))}
                style={{ background:"none", border:`1px solid ${C.err}40`, color:C.err, borderRadius:4, padding:"4px 8px", cursor:"pointer", fontSize:13 }}>×</button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}><button style={s.btn()} onClick={save}>{t("save")}</button><button style={s.btnGhost} onClick={() => setModal(null)}>{t("cancel")}</button></div>
    </Modal>}

    {modal==="supplier" && <Modal title={form.id?"แก้ไข Supplier":"เพิ่ม Supplier"} onClose={() => setModal(null)} wide>
      <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:16 }}>
        <div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:6, textTransform:"uppercase" }}>📷 โลโก้/รูปบริษัท</div>
          <label style={{ cursor:"pointer", display:"block" }}>
            <div style={{ width:160, height:200, borderRadius:8, border:`2px dashed ${form.imagePreview?C.accent:C.border}`, background:"#060b16", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              {form.imagePreview
                ? <img src={form.imagePreview} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                : <div style={{ textAlign:"center", color:C.muted }}><div style={{ fontSize:28 }}>📷</div><div style={{ fontSize:11, marginTop:4 }}>คลิกอัปโหลด</div></div>
              }
            </div>
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(fm=>({...fm,imagePreview:ev.target.result}));r.readAsDataURL(f);}}/>
          </label>
          {form.imagePreview && <button onClick={()=>setForm(f=>({...f,imagePreview:null}))} style={{ ...s.btnGhost, marginTop:6, fontSize:11, padding:"2px 8px", color:C.err, borderColor:C.err+"50" }}>× ลบรูป</button>}
        </div>
        <Row2>
          <Field label="ชื่อบริษัท"><input style={s.input} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
          <Field label="เบอร์โทร" half><input style={s.input} value={form.contact||""} onChange={e=>setForm(f=>({...f,contact:e.target.value}))}/></Field>
          <Field label="Email" half><input style={s.input} value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="sale@supplier.com"/></Field>
          <Field label="ที่อยู่"><input style={s.input} value={form.address||""} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></Field>
          <Field label="Credit Days (วัน)" half><input style={s.input} type="number" value={form.creditDays||30} onChange={e=>setForm(f=>({...f,creditDays:e.target.value}))}/></Field>
          <Field label="หมวด" half><select style={s.select} value={form.category||"Fabric"} onChange={e=>setForm(f=>({...f,category:e.target.value}))}><option>Fabric</option><option>Accessories</option><option>Packaging</option><option>Other</option></select></Field>
        </Row2>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}><button style={s.btn()} onClick={save}>{t("save")}</button><button style={s.btnGhost} onClick={() => setModal(null)}>{t("cancel")}</button></div>
    </Modal>}

    {modal==="rates" && <Modal title="แก้ไข Cost Rates" onClose={() => setModal(null)}>
      <Row2>
        <Field label="Overhead Rate (%)" half><input style={s.input} type="number" value={form.overheadRate} onChange={e=>setForm(f=>({...f,overheadRate:e.target.value}))}/></Field>
        <Field label="Labor Cut (×)"     half><input style={s.input} type="number" step="0.1" value={form.laborCutRate} onChange={e=>setForm(f=>({...f,laborCutRate:e.target.value}))}/></Field>
        <Field label="Labor Sew (×)"     half><input style={s.input} type="number" step="0.1" value={form.laborSewRate} onChange={e=>setForm(f=>({...f,laborSewRate:e.target.value}))}/></Field>
        <Field label="Labor QC (×)"      half><input style={s.input} type="number" step="0.1" value={form.laborQCRate}  onChange={e=>setForm(f=>({...f,laborQCRate:e.target.value}))}/></Field>
      </Row2>
      <div style={{ display:"flex", gap:8, marginTop:16 }}><button style={s.btn()} onClick={save}>{t("save")}</button><button style={s.btnGhost} onClick={() => setModal(null)}>{t("cancel")}</button></div>
    </Modal>}
  </div>;
}

// ════════════════════════════════════════════════════════════════
// § 10  MODULE: ORDERS (ENHANCED)
// New: orderNo auto-gen, customerAddress, totalAmount,
//      priority, deliveryChannel, status timeline
// ════════════════════════════════════════════════════════════════
const BASIC_COLORS = [
  { name:"ขาว",   hex:"#FFFFFF" },
  { name:"ดำ",    hex:"#1a1a1a" },
  { name:"แดง",   hex:"#ef4444" },
  { name:"น้ำเงิน", hex:"#3b82f6" },
  { name:"เหลือง", hex:"#eab308" },
  { name:"เขียว", hex:"#10b981" },
  { name:"ส้ม",   hex:"#f97316" },
  { name:"ชมพู",  hex:"#ec4899" },
  { name:"เทา",   hex:"#6b7280" },
  { name:"กรม",   hex:"#1e3a5f" },
];

const ALL_SIZES = ["3XS","2XS","XS","S","M","L","XL","2XL","3XL","4XL","5XL","6XL","7XL","8XL","9XL"];

const EMPTY_SLOT = () => ({ id:Date.now()+Math.random(), patternId:"", printTypeId:"PT001", qty:"", colorNote:"", colorHex:"", sizeBreakdown:{}, slotNote:"", embPositions:[], imagePreview:null });

const ORDER_STATUSES = ["draft","confirmed","production","qc","ready","shipped","done","cancelled"];
const ORDER_STATUS_COLOR = { draft:C.muted, confirmed:C.accent2, production:C.ok, qc:C.cyan, ready:C.purple, shipped:"#f59e0b", done:"#22c55e", cancelled:C.err };
const PRIORITY_COLOR = { urgent:C.err, high:C.warn, normal:C.accent2, low:C.muted };
const DELIVERY_CHANNELS = ["Flash Express","Lalamove","Grab Express","Kerry Express","ไปเอง","ส่งเอง"];

function OrderModule({ setActiveOrderId, setActiveModule }) {
  const { data, setData } = useData();
  const [modal,     setModal]     = useState(false);
  const [tab,       setTab]       = useState("info");
  const [form,      setForm]      = useState({});
  const [slots,     setSlots]     = useState([EMPTY_SLOT()]);
  const [viewModal, setViewModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const open = (o=null) => {
    setForm(o ? { ...o } : {
      orderNo:    genOrderNo(data.orders),
      status:     "draft",
      priority:   "normal",
      date:       today(),
      deliveryChannel: "Flash Express",
    });
    setSlots(o?.slots?.length ? o.slots.map(sl=>({...sl})) : [EMPTY_SLOT()]);
    setTab("info");
    setModal(true);
  };

  const save = () => {
    const id       = form.id || genId("SO");
    const totalQty = slots.reduce((s,sl) => s+(parseInt(sl.qty)||0), 0);
    const p0       = slots[0] || {};
    const cost     = calcCost({...form,patternId:p0.patternId,printTypeId:p0.printTypeId,qty:totalQty}, data.patterns, data.fabrics, data.accessories, data.printTypes, data.costRates);
    const r = {
      ...form, id,
      qty:          totalQty,
      patternId:    p0.patternId || data.patterns[0]?.id,
      printTypeId:  p0.printTypeId || "PT001",
      targetPrice:  parseFloat(form.targetPrice)||0,
      totalAmount:  cost ? Math.round(cost.totalCost * 1.3) : 0,
      slots,
      specialNotice: form.specialNotice || "",
    };
    setData(d => {
      const prevOrder = d.orders.find(o => o.id === id);
      const wasNotDone = !prevOrder || prevOrder.status !== "done";
      const isNowDone  = r.status === "done";
      // Auto-deduct stock when order marked as done (if not already deducted via BOM reserve)
      if (wasNotDone && isNowDone) {
        const pat = d.patterns.find(p => p.id === r.patternId);
        const fab = pat && d.fabrics.find(f => f.id === pat.fabricId);
        const stockItems = buildStockItems(r, pat, fab, d.fabrics, d.accessories, d.stock);
        if (stockItems.length > 0) {
          const newStock = {...d.stock};
          const newLog   = [...(d.stockLog||[])];
          stockItems.forEach(item => {
            const qty   = parseFloat(item.needed);
            const after = Math.max(0, (newStock[item.id]||0) - qty);
            newLog.push({id:genId("LOG"),itemId:item.id,itemName:item.name,type:"out",qty,reason:`ผลิตเสร็จ ${r.orderNo||r.id}`,date:today(),balAfter:after});
            newStock[item.id] = after;
            db.upsertStock(item.id, after);
          });
          return {...d, orders:[...d.orders.filter(o=>o.id!==id), r], stock:newStock, stockLog:newLog};
        }
      }
      return {...d, orders:[...d.orders.filter(o=>o.id!==id), r]};
    });
    db.upsertOrder(r);
    setModal(false);
  };

  const totalQty   = slots.reduce((s,sl) => s+(parseInt(sl.qty)||0), 0);
  const updateSlot = (i,key,val) => setSlots(sl => sl.map((x,idx) => idx===i ? { ...x, [key]:val } : x));

  const filtered = data.orders.filter(o => filterStatus==="all" || o.status===filterStatus);

  // Summary KPIs
  const totalOrders  = data.orders.length;
  const inProduction = data.orders.filter(o => o.status==="production").length;
  const urgent       = data.orders.filter(o => o.priority==="urgent"||o.priority==="high").length;
  const totalRevEst  = data.orders.reduce((s,o) => s+(o.totalAmount||0), 0);

  return <div>
    <SectionHead title="📋 ORDER MODULE" sub="จัดการคำสั่งผลิต · Auto Order No. · ติดตามสถานะ" action={<button style={s.btn()} onClick={() => open()}>+ สร้าง Order</button>}/>

    {/* KPIs */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
      <StatBox label="Order ทั้งหมด"     value={totalOrders}               color={C.accent}  icon="📋" />
      <StatBox label="กำลังผลิต"         value={inProduction}              color={C.ok}      icon="🏭" />
      <StatBox label="ด่วน / สำคัญ"      value={urgent}                    color={C.warn}    icon="🔴" />
      <StatBox label="มูลค่าออเดอร์รวม"  value={`฿${(totalRevEst/1000).toFixed(0)}K`} color={C.cyan} icon="💰" />
    </div>

    {/* Filter */}
    <Card style={{ marginBottom:14 }}>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:17, color:C.muted, marginRight:4 }}>Status:</span>
        {["all",...ORDER_STATUSES].map(st => (
          <button key={st} onClick={() => setFilterStatus(st)} style={{ ...s.btnGhost, padding:"4px 12px", fontSize:26, ...(filterStatus===st ? { background:C.accent+"20", color:C.accent, borderColor:C.accent+"60" } : {}) }}>
            {st==="all" ? "ทั้งหมด" : st}
          </button>
        ))}
      </div>
    </Card>

    {/* Table */}
    <Card>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
          <thead><tr>{["Order No.","ลูกค้า","Qty","มูลค่า","ช่องทางส่ง","Priority","Due Date","Status",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={9} style={{ ...s.td, textAlign:"center", color:C.muted, padding:32 }}>ไม่มี Order</td></tr>}
            {filtered.map(o => (
              <tr key={o.id}>
                <td style={{ ...s.td, color:C.accent, fontWeight:700, fontFamily:"monospace" }}>{o.orderNo||o.id}</td>
                <td style={s.td}>
                  <div>{o.customer}</div>
                  {o.customerAddress && <div style={{ fontSize:26, color:C.muted, marginTop:2 }}>📍 {o.customerAddress.slice(0,30)}...</div>}
                </td>
                <td style={{ ...s.td, color:C.accent, fontWeight:700 }}>{o.qty?.toLocaleString()} ตัว</td>
                <td style={{ ...s.td, color:C.ok }}>฿{fmt(o.totalAmount||0)}</td>
                <td style={{ ...s.td, fontSize:17, color:C.sub }}>{o.deliveryChannel||"—"}</td>
                <td style={s.td}><Tag text={o.priority||"normal"} color={PRIORITY_COLOR[o.priority||"normal"]}/></td>
                <td style={{ ...s.td, color:C.muted, fontSize:17 }}>{o.dueDate||"—"}</td>
                <td style={s.td}><Tag text={o.status} color={ORDER_STATUS_COLOR[o.status]||C.muted}/></td>
                <td style={s.td}>
                  <button onClick={() => setViewModal(o)} style={{ ...s.btnGhost, padding:"3px 7px", marginRight:3, fontSize:17 }}>👁</button>
                  <button onClick={() => { setActiveOrderId(o.id); setActiveModule("bom"); }} style={{ ...s.btnSm(), marginRight:3 }}>BOM</button>
                  <button onClick={() => open(o)} style={{ ...s.btnGhost, padding:"3px 7px", marginRight:3, fontSize:17 }}>{t("edit")}</button>
                  <button onClick={() => { setData(d=>({...d,orders:d.orders.filter(x=>x.id!==o.id)})); db.deleteOrder(o.id); }} style={{ ...s.btnGhost, padding:"3px 7px", color:C.err, borderColor:C.err+"50", fontSize:17 }}>{t("del")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    {/* CREATE / EDIT MODAL */}
    {modal && <Modal title={form.id ? `แก้ไข ${form.orderNo||form.id}` : "สร้าง Order ใหม่"} onClose={() => setModal(false)} wide>
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:16, marginTop:-8 }}>
        {[["info","📋 ข้อมูล"],["slots",`🧩 รายการ (${slots.length})`],["notice","⚠️ หมายเหตุ"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex:1, padding:"10px 8px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:17, fontWeight:600, color:tab===id?C.accent:C.muted, borderBottom:tab===id?`2px solid ${C.accent}`:"2px solid transparent" }}>{label}</button>
        ))}
      </div>

      {tab==="info" && <Row2>
        <Field label="Order No." half><input style={{ ...s.input, color:C.accent, fontFamily:"monospace" }} value={form.orderNo||""} readOnly/></Field>
        <Field label="Status" half>
          <select style={s.select} value={form.status||"draft"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
            {ORDER_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </Field>
        <Field label="ชื่อลูกค้า"><input style={s.input} value={form.customer||""} onChange={e=>setForm(f=>({...f,customer:e.target.value}))} placeholder="Brand ABC"/></Field>
        <Field label="ที่อยู่ลูกค้า"><input style={s.input} value={form.customerAddress||""} onChange={e=>setForm(f=>({...f,customerAddress:e.target.value}))} placeholder="เลขที่ ถนน เขต/แขวง กรุงเทพ"/></Field>
        <Field label="ราคาเป้า/ตัว (฿)" third><input style={s.input} type="number" value={form.targetPrice||""} onChange={e=>setForm(f=>({...f,targetPrice:e.target.value}))}/></Field>
        <Field label="วันที่สั่ง" third><input style={s.input} type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></Field>
        <Field label="กำหนดส่ง" third><input style={s.input} type="date" value={form.dueDate||""} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/></Field>
        <Field label="Priority" half>
          <select style={s.select} value={form.priority||"normal"} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
            <option value="urgent">🚨 ด่วนมาก</option><option value="high">🔴 ด่วน</option><option value="normal">🟡 ปกติ</option><option value="low">🟢 ต่ำ</option>
          </select>
        </Field>
        <Field label="ช่องทางส่ง" half>
          <select style={s.select} value={form.deliveryChannel||""} onChange={e=>setForm(f=>({...f,deliveryChannel:e.target.value}))}>
            {DELIVERY_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </Field>
      </Row2>}

      {tab==="slots" && <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:15, color:C.sub }}>Qty รวม: <strong style={{ color:C.accent, fontSize:18 }}>{totalQty.toLocaleString()} ตัว</strong></div>
          <button onClick={() => setSlots(sl => [...sl, EMPTY_SLOT()])} style={{ ...s.btnSm(), padding:"6px 14px" }}>+ เพิ่มรายการ</button>
        </div>
        {slots.map((slot,i) => {
          const selPat  = data.patterns.find(p=>p.id===slot.patternId);
          const sizeSet = selPat?.sizeSet
            ? selPat.sizeSet.split(",").map(x=>x.trim()).filter(Boolean)
            : ["S","M","L","XL","XXL"];
          const sbObj   = typeof slot.sizeBreakdown==="object" ? slot.sizeBreakdown : {};
          const sbTotal = sizeSet.reduce((s,sz)=>s+(parseInt(sbObj[sz])||0), 0);
          const embArr  = Array.isArray(slot.embPositions) ? slot.embPositions : (slot.embPosition?[slot.embPosition]:[]);
          const toggleEmb = (pos) => {
            const cur = Array.isArray(slot.embPositions) ? slot.embPositions : [];
            const next = cur.includes(pos) ? cur.filter(x=>x!==pos) : [...cur, pos];
            updateSlot(i,"embPositions",next);
          };
          return (
          <div key={slot.id||i} style={{ background:"#060b16", border:`1px solid ${C.border}`, borderRadius:12, padding:18, marginBottom:14 }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:15, fontWeight:700, color:C.accent }}>🧩 รายการที่ {i+1}</span>
              {i>0 && <button onClick={() => setSlots(sl=>sl.filter((_,x)=>x!==i))} style={{ background:"none", border:`1px solid ${C.err}40`, color:C.err, borderRadius:4, padding:"3px 10px", fontSize:13, cursor:"pointer" }}>× ลบ</button>}
            </div>

            {/* NEW LAYOUT: รูปซ้าย (แนวตั้ง) + ข้อมูลขวา */}
            <div style={{ display:"grid", gridTemplateColumns:"140px 1fr", gap:16 }}>

              {/* LEFT COL: รูปภาพแนวตั้ง */}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ fontSize:13, color:C.muted, textTransform:"uppercase" }}>📷 รูปสินค้า</div>
                <label style={{ cursor:"pointer", flex:1 }}>
                  <div style={{ width:130, height:170, borderRadius:8, border:`2px dashed ${(slot.imagePreview||selPat?.imagePreview)?C.accent:C.border}`, background:"#0a0f1e", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", position:"relative" }}>
                    {slot.imagePreview
                      ? <img src={slot.imagePreview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : selPat?.imagePreview
                        ? <>
                            <img src={selPat.imagePreview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.85 }}/>
                            <div style={{ position:"absolute", bottom:4, left:0, right:0, textAlign:"center", fontSize:10, color:C.accent, background:"#000a" }}>จาก Pattern</div>
                          </>
                        : <div style={{ textAlign:"center", color:C.muted }}>
                            <div style={{ fontSize:28 }}>📷</div>
                            <div style={{ fontSize:11, marginTop:4 }}>คลิกอัปโหลด</div>
                          </div>
                    }
                  </div>
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => {
                    const file = e.target.files[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => updateSlot(i,"imagePreview",ev.target.result);
                    reader.readAsDataURL(file);
                  }}/>
                </label>
                {slot.imagePreview && <button onClick={()=>updateSlot(i,"imagePreview",null)} style={{ ...s.btnGhost, fontSize:11, padding:"2px 8px", color:C.err, borderColor:C.err+"50" }}>× ลบรูป</button>}
              </div>

              {/* RIGHT COL: ข้อมูลทั้งหมด */}
              <div>
                {/* Pattern + Print row */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:14, color:C.muted, marginBottom:4, textTransform:"uppercase" }}>Pattern / Style</div>
                    <select style={{ ...s.select, fontSize:15 }} value={slot.patternId} onChange={e => {
                      const newPat = data.patterns.find(p=>p.id===e.target.value);
                      updateSlot(i,"patternId",e.target.value);
                      // ถ้า slot ยังไม่มีรูปเอง ให้ clear ออกเพื่อแสดงรูป pattern แทน
                      if (!slot.imagePreview) updateSlot(i,"_patternChanged", Date.now());
                    }}>
                      <option value="">— เลือก Pattern —</option>
                      {data.patterns.map(p => <option key={p.id} value={p.id}>{p.styleCode||p.id} — {p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:14, color:C.muted, marginBottom:4, textTransform:"uppercase" }}>Print / EMB</div>
                    <select style={{ ...s.select, fontSize:15 }} value={slot.printTypeId} onChange={e=>updateSlot(i,"printTypeId",e.target.value)}>
                      {data.printTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* EMB Position + Price per position */}
                {slot.printTypeId && slot.printTypeId !== "PT001" && <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:14, color:C.muted, marginBottom:6, textTransform:"uppercase" }}>📍 ตำแหน่ง + ราคา Screen/EMB</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:200, overflowY:"auto", border:`1px solid ${C.border}`, borderRadius:8, padding:8 }}>
                    {EMB_POSITIONS.map(pos => {
                      const selPrintType = data.printTypes.find(p=>p.id===slot.printTypeId);
                      const posPrice = selPrintType?.positionPrices?.find(pp=>pp.position===pos);
                      const defaultPrice = selPrintType?.costPerUnit || 0;
                      const slotPosPrice = (slot.positionPrices||{})[pos] ?? (posPrice?.price || "");
                      return (
                        <label key={pos} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"6px 10px", borderRadius:6, background:embArr.includes(pos)?C.accent+"20":"transparent", border:`1px solid ${embArr.includes(pos)?C.accent:C.border}` }}>
                          <input type="checkbox" checked={embArr.includes(pos)} onChange={()=>toggleEmb(pos)} style={{ accentColor:C.accent, width:15, height:15 }}/>
                          <span style={{ fontSize:15, color:embArr.includes(pos)?C.accent:C.text, flex:1 }}>{pos}</span>
                          {embArr.includes(pos) && (
                            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                              <span style={{ fontSize:13, color:C.muted }}>฿</span>
                              <input
                                style={{ ...s.input, width:75, padding:"4px 6px", fontSize:14, textAlign:"right" }}
                                type="number"
                                placeholder={defaultPrice||"0"}
                                value={slotPosPrice}
                                onClick={e=>e.stopPropagation()}
                                onChange={e => {
                                  const newPP = {...(slot.positionPrices||{}), [pos]: e.target.value};
                                  updateSlot(i,"positionPrices",newPP);
                                }}
                              />
                            </div>
                          )}
                          {!embArr.includes(pos) && posPrice && (
                            <span style={{ fontSize:12, color:C.muted }}>฿{posPrice.price}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {embArr.length > 0 && (
                    <div style={{ marginTop:6, fontSize:12, color:C.accent }}>
                      📍 {embArr.join(", ")} · 
                      รวมค่า EMB: <strong>฿{embArr.reduce((sum,pos)=>{
                        const pp = parseFloat((slot.positionPrices||{})[pos]);
                        const def = parseFloat(data.printTypes.find(p=>p.id===slot.printTypeId)?.positionPrices?.find(x=>x.position===pos)?.price || data.printTypes.find(p=>p.id===slot.printTypeId)?.costPerUnit || 0);
                        return sum + (isNaN(pp)?def:pp);
                      },0).toFixed(0)}</strong>
                    </div>
                  )}
                </div>}

                {/* Color */}
                <div style={{ fontSize:14, color:C.muted, marginBottom:6, textTransform:"uppercase" }}>🎨 สีสินค้า</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:6 }}>
                  {BASIC_COLORS.map(c => (
                    <button key={c.name} title={c.name} onClick={() => { updateSlot(i,"colorNote",c.name); updateSlot(i,"colorHex",c.hex); }}
                      style={{ width:30, height:30, borderRadius:"50%", border:`3px solid ${slot.colorHex===c.hex?C.accent:"transparent"}`, background:c.hex, cursor:"pointer", boxShadow:slot.colorHex===c.hex?`0 0 0 2px ${C.accent}`:"none" }}>
                    </button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
                  {slot.colorHex && <div style={{ width:22, height:22, borderRadius:4, background:slot.colorHex, border:`1px solid ${C.border}`, flexShrink:0 }}/>}
                  <input style={{ ...s.input, flex:1, fontSize:15 }} placeholder="หรือพิมพ์ชื่อสี..." value={slot.colorNote||""} onChange={e=>updateSlot(i,"colorNote",e.target.value)}/>
                </div>

                {/* Size Breakdown */}
                <div style={{ fontSize:14, color:C.muted, marginBottom:6, textTransform:"uppercase" }}>
                  📐 Size Breakdown
                  {sbTotal > 0 && <span style={{ color:C.accent, marginLeft:8 }}>รวม {sbTotal} ตัว</span>}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:6 }}>
                  {ALL_SIZES.map(sz => (
                    <button key={sz}
                      onClick={() => {
                        const cur = typeof slot.sizeBreakdown==="object" ? {...slot.sizeBreakdown} : {};
                        if (cur[sz] !== undefined) { delete cur[sz]; } else { cur[sz] = ""; }
                        updateSlot(i,"sizeBreakdown",cur);
                      }}
                      style={{ padding:"3px 9px", borderRadius:5, border:`1px solid ${sbObj[sz]!==undefined?C.accent:C.border}`, background:sbObj[sz]!==undefined?C.accent+"20":"transparent", color:sbObj[sz]!==undefined?C.accent:C.muted, cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>
                      {sz}
                    </button>
                  ))}
                </div>
                {Object.keys(sbObj).length > 0 && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:5, marginBottom:8 }}>
                    {Object.keys(sbObj).map(sz => (
                      <div key={sz}>
                        <div style={{ fontSize:13, color:C.accent, textAlign:"center", marginBottom:2, fontWeight:700 }}>{sz}</div>
                        <input style={{ ...s.input, textAlign:"center", padding:"6px 2px", fontSize:14 }}
                          type="number" placeholder="0" min="0"
                          value={sbObj[sz]||""}
                          onChange={e => {
                            const newSb = { ...sbObj, [sz]: e.target.value };
                            const total = Object.values(newSb).reduce((s,v)=>s+(parseInt(v)||0),0);
                            updateSlot(i,"sizeBreakdown",newSb);
                            updateSlot(i,"qty",String(total));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Note */}
                <div style={{ fontSize:14, color:C.muted, marginBottom:4, textTransform:"uppercase" }}>📝 หมายเหตุ</div>
                <textarea style={{ ...s.input, height:60, resize:"vertical", fontSize:15 }} value={slot.slotNote||""} onChange={e=>updateSlot(i,"slotNote",e.target.value)} placeholder="รายละเอียดพิเศษ..."/>
              </div>
            </div>
          </div>
          );
        })}
      </div>}

      {tab==="notice" && <div>
        <Field label="หมายเหตุพิเศษ">
          <textarea style={{ ...s.input, height:120, resize:"vertical" }} value={form.specialNotice||""} onChange={e=>setForm(f=>({...f,specialNotice:e.target.value}))}/>
        </Field>
      </div>}

      <div style={{ display:"flex", gap:8, marginTop:18, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
        <button style={s.btn()} onClick={save}>💾 บันทึก Order</button>
        <button style={s.btnGhost} onClick={() => setModal(false)}>{t("cancel")}</button>
      </div>
    </Modal>}

    {/* VIEW MODAL */}
    {viewModal && <Modal title={`${viewModal.orderNo||viewModal.id} — ${viewModal.customer}`} onClose={() => setViewModal(null)} wide>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
        {[["Order No.", viewModal.orderNo||viewModal.id],["ลูกค้า",viewModal.customer],["Qty รวม",(viewModal.qty||0).toLocaleString()+" ตัว"],["มูลค่า","฿"+fmt(viewModal.totalAmount||0)],["Priority",viewModal.priority||"normal"],["Status",viewModal.status]].map(([k,v]) => (
          <div key={k} style={{ background:"#060b16", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px" }}>
            <div style={{ fontSize:13, color:C.muted, textTransform:"uppercase" }}>{k}</div>
            <div style={{ fontSize:15, fontWeight:700, color:C.accent, marginTop:3 }}>{v}</div>
          </div>
        ))}
      </div>
      {viewModal.customerAddress && (
        <div style={{ padding:"8px 12px", background:"#060b16", borderRadius:8, marginBottom:12, fontSize:14, color:C.sub }}>
          📍 {viewModal.customerAddress} · 🚚 {viewModal.deliveryChannel||"—"}
        </div>
      )}
      {viewModal.specialNotice && (
        <div style={{ padding:"10px 14px", background:C.err+"12", border:`1px solid ${C.err}30`, borderRadius:8, marginBottom:12, fontSize:14, color:C.text }}>
          ⚠️ {viewModal.specialNotice}
        </div>
      )}
      <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:10 }}>รายการสินค้า ({(viewModal.slots||[]).length} รายการ)</div>
      {(viewModal.slots||[]).map((slot,i) => {
        const pat = data.patterns.find(p=>p.id===slot.patternId);
        const pt  = data.printTypes.find(p=>p.id===slot.printTypeId);
        const sbObj = typeof slot.sizeBreakdown==="object" ? slot.sizeBreakdown : {};
        const sbKeys = Object.keys(sbObj).filter(k=>parseInt(sbObj[k])>0);
        return <div key={i} style={{ background:"#060b16", border:`1px solid ${C.border}`, borderRadius:12, padding:14, marginBottom:10 }}>
          <div style={{ display:"flex", gap:12 }}>
            {/* Image */}
            {slot.imagePreview && (
              <img src={slot.imagePreview} alt="" style={{ width:80, height:80, objectFit:"cover", borderRadius:8, border:`1px solid ${C.border}`, flexShrink:0 }}/>
            )}
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontWeight:700, color:C.text, fontSize:15 }}>{pat?.styleCode?`[${pat.styleCode}] `:""}{pat?.name||"—"}</span>
                <span style={{ fontWeight:700, color:C.accent, fontSize:15 }}>{parseInt(slot.qty)||0} ตัว</span>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                {/* Color */}
                {slot.colorNote && (
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    {slot.colorHex && <div style={{ width:16, height:16, borderRadius:4, background:slot.colorHex, border:`1px solid ${C.border}` }}/>}
                    <span style={{ fontSize:13, color:C.sub }}>สี: <strong style={{color:C.text}}>{slot.colorNote}</strong></span>
                  </div>
                )}
                {/* Print/EMB */}
                {pt && pt.name!=="None" && (
                  <span style={{ fontSize:13, color:C.sub }}>🖨 {pt.name}{slot.embPosition?` @ ${slot.embPosition}`:""}</span>
                )}
              </div>
              {/* Size Breakdown */}
              {sbKeys.length > 0 && (
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:13, color:C.muted, marginBottom:4 }}>Size Breakdown:</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {sbKeys.map(sz => (
                      <div key={sz} style={{ background:C.accent+"20", border:`1px solid ${C.accent}40`, borderRadius:6, padding:"3px 10px", fontSize:13 }}>
                        <span style={{ color:C.accent, fontWeight:700 }}>{sz}</span>
                        <span style={{ color:C.text }}> × {sbObj[sz]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {slot.slotNote && <div style={{ fontSize:13, color:C.accent, marginTop:6 }}>📝 {slot.slotNote}</div>}
            </div>
          </div>
        </div>;
      })}
    </Modal>}
  </div>;
}

// ════════════════════════════════════════════════════════════════
// § 11  MODULE: BOM (ENHANCED)
// New: BOM version, size_set cost breakdown, PO system,
//      stock reservation on confirm, price comparison
// ════════════════════════════════════════════════════════════════
function BillFormModal({ bill, onSave, onClose, suppliers }) {
  const [form, setForm] = useState({ ...bill });
  const updateItem = (i,key,val) => setForm(f => {
    const items = f.items.map((it,idx) => {
      if (idx!==i) return it;
      const u = { ...it, [key]:val };
      if (key==="qty"||key==="pricePerUnit") u.totalAmount = (parseFloat(key==="qty"?val:it.qty)||0)*(parseFloat(key==="pricePerUnit"?val:it.pricePerUnit)||0);
      return u;
    });
    return { ...f, items };
  });
  const grandTotal = (form.items||[]).reduce((s,it) => s+(parseFloat(it.totalAmount)||0), 0);
  return <Modal title={form.id?"แก้ไขบิล":"บันทึกบิลใหม่"} onClose={onClose} wide>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
      <div style={{ gridColumn:"1/3" }}><div style={{ fontSize:17, color:C.muted, textTransform:"uppercase", marginBottom:5 }}>Invoice No.</div><input style={s.input} value={form.invoiceNo||""} onChange={e=>setForm(f=>({...f,invoiceNo:e.target.value}))}/></div>
      <div><div style={{ fontSize:17, color:C.muted, textTransform:"uppercase", marginBottom:5 }}>วันที่ซื้อ</div><input style={s.input} type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={{ gridColumn:"1/3" }}><div style={{ fontSize:17, color:C.muted, textTransform:"uppercase", marginBottom:5 }}>Supplier</div><input style={s.input} value={form.supplier||""} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))} list="sup-list"/><datalist id="sup-list">{suppliers.map(x=><option key={x.id} value={x.name}/>)}</datalist></div>
      <div><div style={{ fontSize:17, color:C.muted, textTransform:"uppercase", marginBottom:5 }}>สถานะ</div><select style={s.select} value={form.status||"pending"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="pending">⏳ รอชำระ</option><option value="paid">✅ จ่ายแล้ว</option><option value="partial">💛 บางส่วน</option></select></div>
    </div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
      <div style={{ fontSize:26, fontWeight:700, color:C.text }}>รายการวัตถุดิบ</div>
      <button onClick={() => setForm(f=>({...f,items:[...f.items,{materialName:"",qty:"",unit:"",pricePerUnit:"",totalAmount:""}]}))} style={{ ...s.btnSm(), padding:"5px 12px" }}>+ เพิ่ม</button>
    </div>
    <div style={{ background:"#060b16", borderRadius:8, overflow:"hidden", marginBottom:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 32px", gap:6, padding:"8px 10px", borderBottom:`1px solid ${C.border}` }}>
        {["รายการ","จำนวน","หน่วย","ราคา/unit","รวม",""].map(h=><div key={h} style={{ fontSize:17, color:C.muted, textTransform:"uppercase" }}>{h}</div>)}
      </div>
      {(form.items||[]).map((item,i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 32px", gap:6, padding:"8px 10px", borderBottom:`1px solid ${C.border}20`, alignItems:"center" }}>
          <input style={{ ...s.input, fontSize:17, padding:"5px 8px" }} placeholder="ชื่อวัตถุดิบ" value={item.materialName} onChange={e=>updateItem(i,"materialName",e.target.value)}/>
          <input style={{ ...s.input, fontSize:17, padding:"5px 8px" }} type="number" value={item.qty} onChange={e=>updateItem(i,"qty",e.target.value)}/>
          <input style={{ ...s.input, fontSize:17, padding:"5px 8px" }} placeholder="m/pcs" value={item.unit} onChange={e=>updateItem(i,"unit",e.target.value)}/>
          <input style={{ ...s.input, fontSize:17, padding:"5px 8px" }} type="number" value={item.pricePerUnit} onChange={e=>updateItem(i,"pricePerUnit",e.target.value)}/>
          <div style={{ fontSize:26, fontWeight:700, color:C.accent, textAlign:"right" }}>{item.totalAmount?`฿${parseFloat(item.totalAmount).toLocaleString()}`:"—"}</div>
          {(form.items||[]).length>1 ? <button onClick={()=>setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}))} style={{ background:"none", border:"none", color:C.err, cursor:"pointer", fontSize:26, padding:0 }}>×</button> : <div/>}
        </div>
      ))}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 10px", background:"#0a1020", borderTop:`1px solid ${C.border}` }}>
        <span style={{ fontSize:26, color:C.sub, fontWeight:600 }}>ยอดรวม</span>
        <span style={{ fontSize:26, fontWeight:800, color:C.accent }}>฿{grandTotal.toLocaleString()}</span>
      </div>
    </div>
    <div style={{ display:"flex", gap:8 }}>
      <button style={s.btn()} onClick={() => onSave({ ...form, total:grandTotal })}>💾 บันทึกบิล</button>
      <button style={s.btnGhost} onClick={onClose}>{t("cancel")}</button>
    </div>
  </Modal>;
}

function BOMModule({ activeOrderId }) {
  const { data, setData } = useData();
  const [selOrder,     setSelOrder]     = useState(activeOrderId || data.orders[0]?.id || "");
  const [activeTab,    setActiveTab]    = useState("bom");
  const [poModal,      setPoModal]      = useState(false);
  const [poForm,       setPoForm]       = useState({});
  const [actualData,   setActualData]   = useState({}); // { orderId: { itemId: {poNo,supplier,qty,pricePerUnit} } }
  const [savedActual,  setSavedActual]  = useState({}); // saved snapshots
  const [saveMsg,      setSaveMsg]      = useState("");

  useEffect(() => { if (activeOrderId) setSelOrder(activeOrderId); }, [activeOrderId]);

  // Load saved data from orders.bom_actual
  useEffect(() => {
    if (!selOrder) return;
    const ord = data.orders.find(o => o.id === selOrder);
    if (ord?.bomActual && Object.keys(ord.bomActual).length > 0) {
      setActualData(prev => ({ ...prev, [selOrder]: ord.bomActual }));
      setSavedActual(prev => ({ ...prev, [selOrder]: ord.bomActual }));
    }
  }, [selOrder]);

  const ord        = data.orders.find(o => o.id === selOrder);
  const pat        = ord && data.patterns.find(p => p.id === ord.patternId);
  const fab        = pat && data.fabrics.find(f => f.id === pat.fabricId);
  const stockItems = buildStockItems(ord, pat, fab, data.fabrics, data.accessories, data.stock);
  const current    = actualData[selOrder] || {};

  const setItemField = (itemId, field, val) => {
    setActualData(prev => ({
      ...prev,
      [selOrder]: { ...(prev[selOrder]||{}), [itemId]: { ...((prev[selOrder]||{})[itemId]||{}), [field]: val } }
    }));
  };

  // จองสต็อก → ตัด Inventory
  const reserveStock = () => {
    if (!stockItems.length) return;
    if (ord?.stockReserved) {
      alert("⚠️ Order นี้จองสต็อกไปแล้ว ไม่ต้องจองซ้ำครับ");
      return;
    }
    const newStock = { ...data.stock };
    const newLog   = [...(data.stockLog||[])];
    stockItems.forEach(item => {
      const qty   = parseFloat(item.needed);
      const after = Math.max(0, (newStock[item.id]||0) - qty);
      newLog.push({ id:genId("LOG"), itemId:item.id, itemName:item.name, type:"out", qty, reason:`จองสต็อก ${ord?.orderNo||ord?.id}`, date:today(), balAfter:after });
      newStock[item.id] = after;
      db.upsertStock(item.id, after);
    });
    // Mark order as stock-reserved to prevent double-deduction
    const updatedOrder = {...ord, stockReserved: true};
    setData(d => ({
      ...d,
      stock: newStock,
      stockLog: newLog,
      orders: d.orders.map(o => o.id===selOrder ? updatedOrder : o),
    }));
    db.upsertOrder(updatedOrder);
    alert(`✅ จองสต็อก ${stockItems.length} รายการ — Inventory อัพเดทแล้ว`);
  };

  // Save actual purchase → Supabase (ไม่ตัดสต็อก)
  const saveActual = () => {
    const snapshot = current;
    setSavedActual(prev => ({ ...prev, [selOrder]: snapshot }));
    const updatedOrder = { ...ord, bomActual: snapshot };
    setData(d => ({ ...d, orders: d.orders.map(o => o.id===selOrder ? updatedOrder : o) }));
    db.upsertOrder(updatedOrder);
    setSaveMsg("✅ บันทึกสำเร็จ");
    setTimeout(() => setSaveMsg(""), 2500);
  };

  const savePO = () => {
    const po = { ...poForm, id:genId("PO"), status:"pending", createdAt:today() };
    setData(d => ({ ...d, purchaseOrders:[...(d.purchaseOrders||[]), po] }));
    setPoModal(false); setPoForm({});
  };

  // Summary: all saved orders
  const allSaved = Object.entries(savedActual).map(([ordId, items]) => {
    const o = data.orders.find(x => x.id === ordId);
    const p = o && data.patterns.find(x => x.id === o.patternId);
    const si = buildStockItems(o, p, p && data.fabrics.find(f=>f.id===p.fabricId), data.fabrics, data.accessories, data.stock);
    const bomTotal = si.reduce((s,i)=>s+i.totalCost, 0);
    const actTotal = Object.values(items).reduce((s,a)=>s+(parseFloat(a.qty)||0)*(parseFloat(a.pricePerUnit)||0), 0);
    return { ordId, customer:o?.customer||ordId, orderNo:o?.orderNo||ordId, bomTotal, actTotal, diff:actTotal-bomTotal, items, stockItems:si };
  });

  return <div>
    <SectionHead title="📦 BOM" sub={`Bill of Materials · เปรียบ BOM vs สั่งซื้อจริง${pat?` · BOM v${pat.bomVersion||1}`:""}`}/>
    <TabBar tabs={[["bom","📋 BOM"],["actual","🛒 สั่งซื้อจริง vs BOM"],["summary",`📊 สรุป (${allSaved.length})`]]} active={activeTab} setActive={setActiveTab}/>

    {/* ── BOM TAB ── */}
    {activeTab==="bom" && <div>
      <Card style={{ marginBottom:14 }}>
        <Field label="เลือก Order">
          <select style={s.select} value={selOrder} onChange={e=>setSelOrder(e.target.value)}>
            {data.orders.map(o => <option key={o.id} value={o.id}>{o.orderNo||o.id} — {o.customer} ({o.qty} ตัว)</option>)}
          </select>
        </Field>
      </Card>
      {ord && pat ? <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
          {[["Order",ord.orderNo||ord.id],["ลูกค้า",ord.customer],["Pattern",`${pat.styleCode||""} ${pat.name}`],["BOM v",`v${pat.bomVersion||1}`]].map(([k,v]) => (
            <div key={k} style={{ background:"#060b16", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px" }}>
              <div style={{ fontSize:13, color:C.muted, textTransform:"uppercase" }}>{k}</div>
              <div style={{ fontSize:15, fontWeight:700, color:C.accent, marginTop:3 }}>{v}</div>
            </div>
          ))}
        </div>
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ fontWeight:700, color:C.text, fontSize:15 }}>รายการวัตถุดิบ BOM</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {ord?.stockReserved && <Tag text="🔒 จองสต็อกแล้ว" color={C.ok}/>}
              <button style={s.btnSm(ord?.stockReserved ? C.muted : C.ok)} onClick={reserveStock} disabled={!!ord?.stockReserved}>
                {ord?.stockReserved ? "✓ จองแล้ว" : "🔒 จองสต็อก → ตัด Inventory"}
              </button>
            </div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
              <thead><tr>{["รายการ","ประเภท","ต้องการ","ราคา/unit","ต้นทุนรวม","สถานะสต็อก"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>{stockItems.map((item,i) => (
                <tr key={i} style={{ background:i%2===0?"transparent":"#060b1640" }}>
                  <td style={s.td}>{item.name}</td>
                  <td style={s.td}><Tag text={item.type} color={item.type==="Fabric"?C.accent:C.accent2}/></td>
                  <td style={{ ...s.td, color:C.accent }}>{item.needed} {item.unit}</td>
                  <td style={s.td}>฿{fmt(item.costEach)}</td>
                  <td style={{ ...s.td, color:C.accent }}>฿{fmt(item.totalCost)}</td>
                  <td style={s.td}>
                    {item.ok
                      ? <Tag text="✓ มีพอ" color={C.ok}/>
                      : <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                          <Tag text={`✗ ขาด ${(parseFloat(item.needed)-item.have).toFixed(0)}`} color={C.err}/>
                          <button onClick={() => { setPoForm({ itemName:item.name, qty:parseFloat(item.needed)-item.have, unit:item.unit }); setPoModal(true); }} style={{ ...s.btnSm(C.warn), padding:"2px 6px", fontSize:12 }}>PO</button>
                        </div>
                    }
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ marginTop:12, padding:"10px 14px", background:"#060b16", borderRadius:6, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:14, color:C.sub }}>ต้นทุน BOM รวม</span>
            <span style={{ fontSize:16, fontWeight:700, color:C.accent }}>฿{fmt(stockItems.reduce((s,i)=>s+i.totalCost,0))}</span>
          </div>
        </Card>
        {stockItems.some(i=>!i.ok) && (
          <div style={{ marginTop:12, padding:14, background:C.err+"10", border:`1px solid ${C.err}40`, borderRadius:8 }}>
            <div style={{ fontWeight:700, color:C.err, marginBottom:6 }}>⚠️ ต้องสั่งซื้อ:</div>
            {stockItems.filter(i=>!i.ok).map((item,i) => (
              <div key={i} style={{ fontSize:14, color:C.sub, marginLeft:16 }}>• {item.name}: ขาด {(parseFloat(item.needed)-item.have).toFixed(0)} {item.unit}</div>
            ))}
          </div>
        )}
      </div> : <div style={{ textAlign:"center", padding:32, color:C.muted }}>เลือก Order</div>}
    </div>}

    {/* ── ACTUAL vs BOM TAB ── */}
    {activeTab==="actual" && <div>
      <Card style={{ marginBottom:14 }}>
        <Field label="เลือก Order">
          <select style={s.select} value={selOrder} onChange={e=>setSelOrder(e.target.value)}>
            {data.orders.map(o => <option key={o.id} value={o.id}>{o.orderNo||o.id} — {o.customer} ({o.qty} ตัว)</option>)}
          </select>
        </Field>
      </Card>
      {ord && pat && stockItems.length > 0 ? <div>
        {/* KPI */}
        {(() => {
          const bomTotal  = stockItems.reduce((s,i)=>s+i.totalCost, 0);
          const actTotal  = stockItems.reduce((s,i)=>{ const a=current[i.id]; return s+(a?(parseFloat(a.qty)||0)*(parseFloat(a.pricePerUnit)||0):0); }, 0);
          const diff      = actTotal - bomTotal;
          return (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
              {[["📋 ต้นทุน BOM รวม", fmt(bomTotal), C.accent],
                ["🛒 สั่งซื้อจริงรวม", fmt(actTotal), C.ok],
                [diff>0?"⚠️ แพงกว่า BOM":diff<0?"✅ ถูกกว่า BOM":"= เท่ากัน", `${diff>0?"+":""}${fmt(diff)}`, diff>0?C.err:diff<0?C.ok:C.muted]
              ].map(([label,val,color])=>(
                <div key={label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px" }}>
                  <div style={{ fontSize:13, color:C.muted, marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:24, fontWeight:800, color }}>฿{val}</div>
                </div>
              ))}
            </div>
          );
        })()}
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>เปรียบ BOM vs สั่งซื้อจริง</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {saveMsg && <span style={{ fontSize:13, color:C.ok }}>{saveMsg}</span>}
              <button style={s.btn()} onClick={saveActual}>💾 บันทึก</button>
            </div>
          </div>
          <div style={{ padding:"8px 12px", background:C.warn+"15", border:`1px solid ${C.warn}40`, borderRadius:8, marginBottom:14, fontSize:13, color:C.warn }}>
            💡 การบันทึกที่นี่ <strong>ไม่ตัดสต็อก</strong> — ใช้ปุ่ม 🔒 จองสต็อก ในแท็บ BOM เพื่อตัด Inventory
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:880 }}>
              <thead>
                <tr>
                  <th style={{ ...s.th, background:"#0d1a0d" }} colSpan={3}>📋 BOM มาตรฐาน</th>
                  <th style={{ ...s.th, background:"#0d1020" }} colSpan={4}>🛒 สั่งซื้อจริง</th>
                  <th style={{ ...s.th, background:"#1a0d10" }}>⚖️ ต่าง</th>
                </tr>
                <tr>{["รายการ","จำนวน BOM","ต้นทุน BOM","PO No.","Supplier","จำนวนจริง","ราคา/unit","ต่าง (฿)"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {stockItems.map((item,i) => {
                  const a        = current[item.id] || {};
                  const actTotal = (parseFloat(a.qty)||0)*(parseFloat(a.pricePerUnit)||0);
                  const diff     = actTotal > 0 ? actTotal - item.totalCost : null;
                  return (
                    <tr key={i} style={{ background:i%2===0?"transparent":"#060b1640" }}>
                      <td style={{ ...s.td, fontWeight:600 }}>{item.name}<br/><Tag text={item.type} color={item.type==="Fabric"?C.accent:C.accent2}/></td>
                      <td style={{ ...s.td, color:C.accent }}>{item.needed} {item.unit}</td>
                      <td style={s.td}>฿{fmt(item.costEach)}<br/><span style={{ color:C.muted, fontSize:12 }}>รวม ฿{fmt(item.totalCost)}</span></td>
                      <td style={s.td}><input style={{ ...s.input, fontSize:13, padding:"5px 8px" }} placeholder="PO-001" value={a.poNo||""} onChange={e=>setItemField(item.id,"poNo",e.target.value)}/></td>
                      <td style={s.td}><input style={{ ...s.input, fontSize:13, padding:"5px 8px" }} placeholder="Supplier" value={a.supplier||""} onChange={e=>setItemField(item.id,"supplier",e.target.value)}/></td>
                      <td style={s.td}><input style={{ ...s.input, fontSize:13, padding:"5px 8px" }} type="number" placeholder="0" value={a.qty||""} onChange={e=>setItemField(item.id,"qty",e.target.value)}/></td>
                      <td style={s.td}><input style={{ ...s.input, fontSize:13, padding:"5px 8px" }} type="number" placeholder="฿" value={a.pricePerUnit||""} onChange={e=>setItemField(item.id,"pricePerUnit",e.target.value)}/></td>
                      <td style={{ ...s.td, fontWeight:700, color:diff===null?C.muted:diff>0?C.err:C.ok }}>
                        {diff===null?"—":`${diff>0?"+":""}฿${fmt(diff)}`}
                        {diff!==null&&<div style={{ fontSize:12, color:C.muted }}>{diff>0?"แพงกว่า":diff<0?"ถูกกว่า":"เท่ากัน"}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div> : <div style={{ textAlign:"center", padding:48, color:C.muted }}><div style={{ fontSize:32, marginBottom:12 }}>⚖️</div><div>เลือก Order ที่มี Pattern และ BOM</div></div>}
    </div>}

    {/* ── SUMMARY TAB ── */}
    {activeTab==="summary" && <div>
      <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>📊 สรุปรายการที่บันทึก BOM vs สั่งซื้อจริง</div>
      {allSaved.length === 0 ? (
        <div style={{ textAlign:"center", padding:48, color:C.muted }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
          <div>ยังไม่มีรายการที่บันทึก — ไปที่แท็บ 🛒 แล้วกด 💾 บันทึก</div>
        </div>
      ) : <div>
        {/* KPI รวมทุก Order */}
        {(() => {
          const totalBom = allSaved.reduce((s,o)=>s+o.bomTotal, 0);
          const totalAct = allSaved.reduce((s,o)=>s+o.actTotal, 0);
          const totalDiff = totalAct - totalBom;
          return (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
              {[
                ["📋 BOM รวมทุก Order", `฿${fmt(totalBom)}`, C.accent],
                ["🛒 สั่งซื้อจริงรวม", `฿${fmt(totalAct)}`, C.ok],
                ["⚖️ ผลต่างรวม", `${totalDiff>0?"+":""}฿${fmt(totalDiff)}`, totalDiff>0?C.err:C.ok],
                ["📦 Order ที่บันทึก", `${allSaved.length} รายการ`, C.accent2],
              ].map(([label,val,color])=>(
                <div key={label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 18px" }}>
                  <div style={{ fontSize:13, color:C.muted, marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:20, fontWeight:800, color }}>{val}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* แสดงรายละเอียดแต่ละ Order */}
        {allSaved.map((o, idx) => {
          const diff = o.actTotal - o.bomTotal;
          return (
            <Card key={o.ordId} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:C.accent }}>{o.orderNo} — {o.customer}</div>
                  <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>
                    BOM: <strong style={{color:C.accent}}>฿{fmt(o.bomTotal)}</strong> · 
                    จริง: <strong style={{color:C.ok}}>฿{fmt(o.actTotal)}</strong> · 
                    ต่าง: <strong style={{color:diff>0?C.err:C.ok}}>{diff>0?"+":""}฿{fmt(diff)}</strong>
                  </div>
                </div>
                <Tag text={diff>0?"⚠️ แพงกว่า BOM":diff<0?"✅ ถูกกว่า BOM":"= เท่ากัน"} color={diff>0?C.err:C.ok}/>
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["รายการ","จำนวน BOM","ต้นทุน BOM","PO No.","Supplier","จำนวนจริง","ราคา/unit","ยอดจริง","ต่าง"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {o.stockItems.map((item,i) => {
                    const a       = o.items[item.id] || {};
                    const actTot  = (parseFloat(a.qty)||0)*(parseFloat(a.pricePerUnit)||0);
                    const itemDiff = actTot > 0 ? actTot - item.totalCost : null;
                    return (
                      <tr key={i} style={{ background:i%2===0?"transparent":"#060b1640" }}>
                        <td style={s.td}>{item.name}</td>
                        <td style={{ ...s.td, color:C.accent }}>{item.needed} {item.unit}</td>
                        <td style={s.td}>฿{fmt(item.totalCost)}</td>
                        <td style={{ ...s.td, color:C.muted, fontSize:13 }}>{a.poNo||"—"}</td>
                        <td style={{ ...s.td, color:C.muted, fontSize:13 }}>{a.supplier||"—"}</td>
                        <td style={s.td}>{a.qty||"—"} {a.qty?item.unit:""}</td>
                        <td style={s.td}>{a.pricePerUnit?`฿${fmt(a.pricePerUnit)}`:"—"}</td>
                        <td style={{ ...s.td, color:C.ok, fontWeight:700 }}>{actTot>0?`฿${fmt(actTot)}`:"—"}</td>
                        <td style={{ ...s.td, fontWeight:700, color:itemDiff===null?C.muted:itemDiff>0?C.err:C.ok }}>
                          {itemDiff===null?"—":`${itemDiff>0?"+":""}฿${fmt(itemDiff)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          );
        })}
      </div>}
    </div>}

    {/* PO Modal */}
    {poModal && <Modal title="สร้าง Purchase Order" onClose={() => setPoModal(false)}>
      <Row2>
        <Field label="วัตถุดิบ"><input style={s.input} value={poForm.itemName||""} onChange={e=>setPoForm(f=>({...f,itemName:e.target.value}))} placeholder="ชื่อวัตถุดิบ"/></Field>
        <Field label="จำนวน" half><input style={s.input} type="number" value={poForm.qty||""} onChange={e=>setPoForm(f=>({...f,qty:e.target.value}))}/></Field>
        <Field label="หน่วย" half><input style={s.input} value={poForm.unit||""} onChange={e=>setPoForm(f=>({...f,unit:e.target.value}))} placeholder="m/pcs"/></Field>
        <Field label="Supplier">
          <select style={s.select} value={poForm.supplier||""} onChange={e=>setPoForm(f=>({...f,supplier:e.target.value}))}>
            <option value="">— เลือก Supplier —</option>
            {data.suppliers.map(x=><option key={x.id} value={x.name}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="วันที่สั่ง" half><input style={s.input} type="date" value={poForm.date||today()} onChange={e=>setPoForm(f=>({...f,date:e.target.value}))}/></Field>
        <Field label="กำหนดส่ง" half><input style={s.input} type="date" value={poForm.dueDate||""} onChange={e=>setPoForm(f=>({...f,dueDate:e.target.value}))}/></Field>
        <Field label="หมายเหตุ"><input style={s.input} value={poForm.note||""} onChange={e=>setPoForm(f=>({...f,note:e.target.value}))}/></Field>
      </Row2>
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        <button style={s.btn()} onClick={savePO}>💾 สร้าง PO</button>
        <button style={s.btnGhost} onClick={() => setPoModal(false)}>{t("cancel")}</button>
      </div>
    </Modal>}
  </div>;
}

// ════════════════════════════════════════════════════════════════
// § 12  MODULE: INVENTORY (ENHANCED)
// New: qty_min display, Stock Movement Log, PO receive,
//      low stock alert by min threshold, movement history
// ════════════════════════════════════════════════════════════════
function InventoryModule() {
  const { data, setData } = useData();
  const [activeTab,   setActiveTab]   = useState("stock");
  const [adjustModal, setAdjustModal] = useState(null);
  const [adj,         setAdj]         = useState({ qty:"", reason:"", type:"adjust" });

  const allItems = [
    ...data.fabrics.map(f => ({ ...f, itemType:"Fabric" })),
    ...data.accessories.map(a => ({ ...a, itemType:"Trim" })),
  ];

  // saveAdj — preserved verbatim + log
  const saveAdj = () => {
    const delta  = parseFloat(adj.qty) || 0;
    const newQty = Math.max(0, (data.stock[adjustModal] || 0) + delta);
    const item   = allItems.find(i => i.id===adjustModal);
    const logEntry = {
      id: genId("LOG"),
      itemId:   adjustModal,
      itemName: item?.name || adjustModal,
      type:     delta > 0 ? "in" : "out",
      qty:      Math.abs(delta),
      reason:   adj.reason || (delta>0?"รับสินค้า":"ตัดสต็อก"),
      date:     today(),
      balAfter: newQty,
    };
    setData(d => ({ ...d, stock:{ ...d.stock, [adjustModal]:newQty }, stockLog:[...(d.stockLog||[]), logEntry] }));
    db.upsertStock(adjustModal, newQty);
    setAdjustModal(null);
    setAdj({ qty:"", reason:"", type:"adjust" });
  };

  // รับของจาก Bill → บวกสต็อกอัตโนมัติ
  const receiveBill = (bill) => {
    if (!bill?.items?.length) return;
    const newStock = {...data.stock};
    const newLog   = [...(data.stockLog||[])];
    // Try to match bill items to fabric/accessory by name
    bill.items.forEach(item => {
      const matched = allItems.find(i =>
        i.name.toLowerCase().includes((item.materialName||"").toLowerCase()) ||
        (item.materialName||"").toLowerCase().includes(i.name.toLowerCase())
      );
      if (matched) {
        const qty   = parseFloat(item.qty) || 0;
        const after = (newStock[matched.id]||0) + qty;
        newLog.push({id:genId("LOG"),itemId:matched.id,itemName:matched.name,type:"in",qty,reason:`รับของจากบิล ${bill.invoiceNo||bill.id}`,date:today(),balAfter:after});
        newStock[matched.id] = after;
        db.upsertStock(matched.id, after);
      }
    });
    const updatedBill = {...bill, stockReceived: true};
    setData(d => ({
      ...d,
      stock: newStock,
      stockLog: newLog,
      bills: d.bills.map(b => b.id===bill.id ? updatedBill : b),
    }));
    db.upsertBill && db.upsertBill(updatedBill);
    alert(`✅ รับของจากบิล ${bill.invoiceNo} — อัพเดทสต็อกแล้ว`);
  };

  const allItems_withMin = allItems.map(i => ({
    ...i,
    qty:   data.stock[i.id] || 0,
    minQty: i.minQty || 0,
  }));

  const lowItems    = allItems_withMin.filter(i => i.qty < i.minQty && i.minQty > 0);
  const outItems    = allItems_withMin.filter(i => i.qty === 0);
  const totalValue  = allItems_withMin.reduce((sum,i) => sum+i.qty*i.costPerUnit, 0);
  const statusOf    = (qty, min) => qty===0 ? "หมด" : qty<(min*0.5) ? "วิกฤต" : qty<min ? "ต่ำกว่า Min" : "ปกติ";
  const statusColor = { หมด:C.err, วิกฤต:C.err, "ต่ำกว่า Min":C.warn, ปกติ:C.ok };

  return <div>
    <SectionHead title="🏬 INVENTORY" sub="สต็อกวัตถุดิบ · Min Stock Alert · Movement Log"/>

    {/* Alerts */}
    {outItems.length > 0 && (
      <div style={{ padding:12, background:C.err+"15", border:`1px solid ${C.err}50`, borderRadius:8, marginBottom:10, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:26, color:C.err, fontWeight:700 }}>🚨 หมดสต็อก:</span>
        {outItems.map(i => <Tag key={i.id} text={i.name} color={C.err}/>)}
      </div>
    )}
    {lowItems.length > 0 && (
      <div style={{ padding:12, background:C.warn+"15", border:`1px solid ${C.warn}50`, borderRadius:8, marginBottom:16, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:26, color:C.warn, fontWeight:700 }}>⚠️ ต่ำกว่า Min Stock:</span>
        {lowItems.map(i => <Tag key={i.id} text={`${i.name} (${i.qty}/${i.minQty})`} color={C.warn}/>)}
      </div>
    )}

    {/* KPIs */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
      <StatBox label="รายการทั้งหมด"   value={allItems.length}           color={C.accent}  icon="📦"/>
      <StatBox label="หมดสต็อก"        value={outItems.length}           color={C.err}     icon="🚨"/>
      <StatBox label="ต่ำกว่า Min"     value={lowItems.length}           color={C.warn}    icon="⚠️"/>
      <StatBox label="มูลค่าสต็อกรวม"  value={`฿${(totalValue/1000).toFixed(0)}K`} color={C.ok} icon="💰"/>
    </div>

    <TabBar tabs={[["stock","🏬 Stock"],["bills","📥 รับของจากบิล"],["log","📋 Movement Log"]]} active={activeTab} setActive={setActiveTab}/>

    {/* ── BILLS RECEIVING ── */}
    {activeTab==="bills" && <div>
      <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>📥 รับของจากบิล — อัพเดทสต็อกอัตโนมัติ</div>
      {(!data.bills||data.bills.length===0) && <div style={{ textAlign:"center", padding:40, color:C.muted }}>ไม่มีบิล</div>}
      {(data.bills||[]).map(bill => (
        <Card key={bill.id} style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div>
              <div style={{ fontWeight:700, color:C.accent, fontSize:15 }}>{bill.invoiceNo||bill.id}</div>
              <div style={{ fontSize:13, color:C.sub, marginTop:3 }}>🏭 {bill.supplier} · 📅 {bill.date}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:800, color:C.accent }}>฿{(bill.total||0).toLocaleString()}</div>
              {bill.stockReceived
                ? <Tag text="✅ รับของแล้ว" color={C.ok}/>
                : <Tag text="⏳ ยังไม่รับ" color={C.warn}/>
              }
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            {(bill.items||[]).map((item,i) => {
              const matched = allItems.find(a =>
                a.name.toLowerCase().includes((item.materialName||"").toLowerCase()) ||
                (item.materialName||"").toLowerCase().includes(a.name.toLowerCase())
              );
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 8px", borderRadius:6, background:"#060b16", marginBottom:4, fontSize:13 }}>
                  <span style={{ color:C.text }}>{item.materialName}</span>
                  <span style={{ color:C.accent }}>{item.qty} {item.unit}</span>
                  {matched
                    ? <Tag text={`→ ${matched.name}`} color={C.ok}/>
                    : <Tag text="ไม่พบในระบบ" color={C.muted}/>
                  }
                </div>
              );
            })}
          </div>
          {!bill.stockReceived && (
            <button style={s.btn(C.ok)} onClick={() => receiveBill(bill)}>
              📥 รับของเข้าสต็อก
            </button>
          )}
        </Card>
      ))}
    </div>}

    {/* ── STOCK TABLE ── */}
    {activeTab==="stock" && <Card>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:750 }}>
          <thead>
            <tr>{["ID","รายการ","ประเภท","Qty","Min Stock","หน่วย","ราคา/unit","มูลค่า","Status",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {allItems_withMin.map(item => {
              const status = statusOf(item.qty, item.minQty);
              const sc     = statusColor[status];
              const pct    = item.minQty>0 ? Math.min(100,(item.qty/item.minQty)*100) : 100;
              return <tr key={item.id}>
                <td style={{ ...s.td, color:C.muted, fontFamily:"monospace", fontSize:17 }}>{item.id}</td>
                <td style={s.td}>
                  <div>{item.name}</div>
                  {item.itemType==="Fabric" && item.code && <div style={{ fontSize:26, color:C.cyan, fontFamily:"monospace" }}>{item.code}</div>}
                </td>
                <td style={s.td}><Tag text={item.itemType} color={item.itemType==="Fabric"?C.accent:C.accent2}/></td>
                <td style={{ ...s.td, fontWeight:700, color:item.qty<(item.minQty||0)?C.err:C.ok, fontSize:26 }}>
                  {item.qty.toLocaleString()}
                  <div style={{ marginTop:3 }}><ProgressBar value={pct} max={100} color={sc}/></div>
                </td>
                <td style={{ ...s.td, color:C.muted }}>{item.minQty||"—"}</td>
                <td style={s.td}>{item.unit}</td>
                <td style={s.td}>฿{fmt(item.costPerUnit)}</td>
                <td style={{ ...s.td, color:C.accent }}>฿{fmt(item.qty*item.costPerUnit)}</td>
                <td style={s.td}><Tag text={status} color={sc}/></td>
                <td style={s.td}><button onClick={() => setAdjustModal(item.id)} style={s.btnSm()}>ปรับ</button></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:10, padding:"8px 12px", background:"#060b16", borderRadius:6, display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:26, color:C.muted }}>มูลค่าสต็อกรวม</span>
        <span style={{ fontWeight:700, color:C.accent, fontSize:26 }}>฿{fmt(totalValue)}</span>
      </div>
    </Card>}

    {/* ── MOVEMENT LOG ── */}
    {activeTab==="log" && <Card>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
        <span style={{ fontSize:17, fontWeight:700, color:C.text }}>Stock Movement Log</span>
        <span style={{ fontSize:17, color:C.muted }}>{(data.stockLog||[]).length} รายการ</span>
      </div>
      {(data.stockLog||[]).length===0 && <div style={{ textAlign:"center", padding:40, color:C.muted }}>ยังไม่มีการเคลื่อนไหว</div>}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
          <thead><tr>{["วันที่","รายการ","ประเภท","จำนวน","เหตุผล","ยอดหลัง"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {[...(data.stockLog||[])].reverse().map(log => (
              <tr key={log.id}>
                <td style={{ ...s.td, color:C.muted, fontSize:17 }}>{log.date}</td>
                <td style={s.td}>{log.itemName}</td>
                <td style={s.td}><Tag text={log.type==="in"?"📥 รับเข้า":log.type==="out"?"📤 จ่ายออก":"🔧 ปรับ"} color={log.type==="in"?C.ok:log.type==="out"?C.warn:C.accent2}/></td>
                <td style={{ ...s.td, fontWeight:700, color:log.type==="in"?C.ok:C.warn }}>
                  {log.type==="in"?"+":"-"}{log.qty?.toLocaleString()}
                </td>
                <td style={{ ...s.td, color:C.sub, fontSize:17 }}>{log.reason}</td>
                <td style={{ ...s.td, fontWeight:700, color:C.accent }}>{log.balAfter?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>}

    {/* ADJUST MODAL */}
    {adjustModal && <Modal title="ปรับ Stock" onClose={() => setAdjustModal(null)}>
      <div style={{ padding:"10px 14px", background:"#060b16", borderRadius:8, marginBottom:14 }}>
        <div style={{ fontSize:17, color:C.muted }}>รายการ</div>
        <div style={{ fontSize:26, fontWeight:700, color:C.text, marginTop:2 }}>{allItems.find(i=>i.id===adjustModal)?.name}</div>
        <div style={{ display:"flex", gap:20, marginTop:8 }}>
          <div>
            <div style={{ fontSize:26, color:C.muted }}>สต็อกปัจจุบัน</div>
            <div style={{ fontSize:26, fontWeight:800, color:C.ok }}>{(data.stock[adjustModal]||0).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize:26, color:C.muted }}>Min Stock</div>
            <div style={{ fontSize:26, fontWeight:800, color:C.warn }}>{allItems.find(i=>i.id===adjustModal)?.minQty||0}</div>
          </div>
          {adj.qty && <div>
            <div style={{ fontSize:26, color:C.muted }}>หลังปรับ</div>
            <div style={{ fontSize:26, fontWeight:800, color:C.accent }}>{Math.max(0,(data.stock[adjustModal]||0)+(parseFloat(adj.qty)||0)).toLocaleString()}</div>
          </div>}
        </div>
      </div>
      <Field label="ประเภทการปรับ">
        <select style={s.select} value={adj.type} onChange={e=>setAdj(a=>({...a,type:e.target.value}))}>
          <option value="in">📥 รับสินค้าเข้า (+)</option>
          <option value="out">📤 จ่ายสินค้าออก (-)</option>
          <option value="adjust">🔧 ปรับยอด (เพิ่ม/ลด)</option>
        </select>
      </Field>
      <Field label={adj.type==="adjust"?"เพิ่ม (+) หรือ ลด (-) จำนวน":"จำนวน"}>
        <input style={s.input} type="number" value={adj.qty} onChange={e=>setAdj(a=>({...a,qty:e.target.value}))} placeholder={adj.type==="adjust"?"+200 หรือ -50":"200"}/>
      </Field>
      <Field label="เหตุผล">
        <input style={s.input} value={adj.reason} onChange={e=>setAdj(a=>({...a,reason:e.target.value}))} placeholder="รับของ / ตัดสต็อก / สต็อกเสีย / โอน"/>
      </Field>
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        <button style={s.btn()} onClick={saveAdj}>✅ บันทึก</button>
        <button style={s.btnGhost} onClick={() => setAdjustModal(null)}>{t("cancel")}</button>
      </div>
    </Modal>}
  </div>;
}

// ════════════════════════════════════════════════════════════════
// § 13  MODULE: COSTING (updated)
// ════════════════════════════════════════════════════════════════

function BarChart({ rows }) {
  return (
    <div>
      {rows.map((row, i) => {
        const pct = row.max > 0 ? (row.value / row.max) * 100 : 0;
        return (
          <div key={i} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontSize:26, color:C.sub }}>{row.label}</span>
              <span style={{ fontSize:17, fontWeight:700, color:row.color }}>
                ฿{fmt(row.value)} <span style={{ fontSize:26, color:C.muted }}>({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div style={{ background:C.border, borderRadius:6, height:12, overflow:"hidden" }}>
              <div style={{ width:pct+"%", height:"100%", background:row.color, borderRadius:6, transition:"width 0.4s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CostingModule() {
  const { data } = useData();
  const [activeTab, setActiveTab] = useState("single");
  const [selOrder,  setSelOrder]  = useState(data.orders[0]?.id || "");
  const [mode,      setMode]      = useState("margin");
  const [margin,    setMargin]    = useState(30);
  const [sellPrice, setSellPrice] = useState("");

  const ord          = data.orders.find(o => o.id === selOrder);
  const ordResolved  = ord ? { ...ord, patternId: ord.patternId || ord.slots?.[0]?.patternId || "", printTypeId: ord.printTypeId || ord.slots?.[0]?.printTypeId || "PT001" } : null;
  const cost         = ordResolved ? calcCost(ordResolved, data.patterns, data.fabrics, data.accessories, data.printTypes, data.costRates) : null;
  const pat          = ordResolved && data.patterns.find(p => p.id === ordResolved.patternId);
  const costRows     = buildCostRows(cost, pat, ordResolved, data.fabrics, data.printTypes, data.costRates);
  const finalSell    = mode === "margin" ? (cost ? cost.totalPerUnit * (1 + margin/100) : 0) : (parseFloat(sellPrice)||(cost?.totalPerUnit||0));
  const profitPerUnit = cost ? finalSell - cost.totalPerUnit : 0;
  const profitTotal  = profitPerUnit * (ordResolved?.qty || 0);
  const marginActual = finalSell > 0 ? (profitPerUnit / finalSell) * 100 : 0;

  const allCosts = useMemo(() => data.orders.map(o => {
    const oRes = { ...o, patternId: o.patternId || o.slots?.[0]?.patternId || "", printTypeId: o.printTypeId || o.slots?.[0]?.printTypeId || "PT001" };
    const c = calcCost(oRes, data.patterns, data.fabrics, data.accessories, data.printTypes, data.costRates);
    if (!c) return null;
    return { ...o, cost:c, sell30:c.totalPerUnit*1.3, profit30:c.totalPerUnit*0.3*o.qty };
  }).filter(Boolean), [data]);

  return (
    <div>
      <SectionHead title="💹 COSTING & PRICING" sub="คำนวณต้นทุน · ตั้งราคาขาย · เปรียบทุก Order · วิเคราะห์สัดส่วน" />
      <TabBar tabs={[["single","💹 คำนวณ Order"],["compare","📊 เปรียบทุก Order"],["breakdown","🔬 วิเคราะห์"]]} active={activeTab} setActive={setActiveTab} />

      {activeTab === "single" && (
        <div>
          <Card style={{ marginBottom:14 }}>
            <Field label="เลือก Order เพื่อคำนวณต้นทุน">
              <select style={{ ...s.select, fontSize:26, padding:"12px 14px" }} value={selOrder} onChange={e => setSelOrder(e.target.value)}>
                {data.orders.map(o => <option key={o.id} value={o.id}>{o.id} — {o.customer} ({o.qty} ตัว)</option>)}
              </select>
            </Field>
          </Card>

          {!cost && ordResolved && (
            <div style={{ padding:"20px 24px", background:C.warn+"15", border:`1px solid ${C.warn}50`, borderRadius:10, marginBottom:14 }}>
              <div style={{ fontSize:17, fontWeight:700, color:C.warn, marginBottom:8 }}>⚠️ ไม่สามารถคำนวณต้นทุนได้</div>
              <div style={{ fontSize:17, color:C.sub }}>Order นี้ยังไม่ได้ผูก Pattern ครับ — ไปที่ Orders แล้วกด Edit เพื่อเพิ่ม Pattern ในรายการสินค้า</div>
              <div style={{ marginTop:10, fontSize:26, color:C.muted }}>
                Pattern ID: <strong style={{ color:C.err }}>{ordResolved.patternId || "ไม่มี"}</strong>
              </div>
            </div>
          )}

          {cost && ordResolved && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <Card>
                <div style={{ fontWeight:700, fontSize:26, color:C.text, marginBottom:16, paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>💰 ต้นทุน / ตัว</div>
                {costRows.map(([k, v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", fontSize:26, borderBottom:`1px solid #0a1020` }}>
                    <span style={{ color:C.sub }}>{k}</span>
                    <span style={{ color:C.text, fontWeight:600 }}>฿{fmt(v)}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", marginTop:6, borderTop:`2px solid ${C.border}` }}>
                  <span style={{ fontWeight:700, fontSize:17, color:C.text }}>รวมต้นทุน / ตัว</span>
                  <span style={{ fontWeight:800, fontSize:26, color:C.accent }}>฿{fmt(cost.totalPerUnit)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0" }}>
                  <span style={{ fontSize:26, color:C.muted }}>รวม {ordResolved.qty?.toLocaleString()} ตัว</span>
                  <span style={{ fontSize:26, fontWeight:700, color:C.accent }}>฿{fmt(cost.totalCost)}</span>
                </div>
                {ordResolved.targetPrice > 0 && (
                  <div style={{ marginTop:12, padding:"12px 14px", borderRadius:8, background:ordResolved.targetPrice>=cost.totalPerUnit?C.ok+"15":C.err+"15", border:`1px solid ${ordResolved.targetPrice>=cost.totalPerUnit?C.ok:C.err}40` }}>
                    <div style={{ fontSize:26, color:C.muted, marginBottom:4 }}>ราคาเป้าหมาย vs ต้นทุน</div>
                    <div style={{ fontWeight:700, fontSize:17, color:ordResolved.targetPrice>=cost.totalPerUnit?C.ok:C.err }}>
                      ฿{fmt(ordResolved.targetPrice)} / ตัว — {ordResolved.targetPrice>=cost.totalPerUnit?"✓ กำไร":"✗ ขาดทุน"}
                    </div>
                  </div>
                )}
              </Card>
              <Card>
                <div style={{ fontWeight:700, fontSize:26, color:C.text, marginBottom:16, paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>🎯 ตั้งราคาขาย</div>
                <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                  {[["margin","🎯 Margin %"],["manual","✏️ ราคาเอง"]].map(([m,l]) => (
                    <button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:"10px", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:17, fontWeight:700, background:mode===m?C.accent:"#060b16", color:mode===m?"#000":C.muted }}>{l}</button>
                  ))}
                </div>
                {mode === "margin" ? (
                  <div>
                    <div style={{ fontSize:26, color:C.muted, marginBottom:8 }}>Margin: <strong style={{ color:C.accent, fontSize:26 }}>{margin}%</strong></div>
                    <input type="range" min={0} max={100} value={margin} onChange={e => setMargin(Number(e.target.value))} style={{ width:"100%", accentColor:C.accent, height:6 }} />
                  </div>
                ) : (
                  <Field label="ราคาขาย / ตัว (฿)">
                    <input style={{ ...s.input, fontSize:26, padding:"12px 14px" }} type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder={`แนะนำ ฿${fmt(cost.totalPerUnit*1.3)}`} />
                  </Field>
                )}
                <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[
                    ["ราคาขาย/ตัว",  `฿${fmt(finalSell)}`,               C.accent],
                    ["กำไร/ตัว",     `฿${fmt(profitPerUnit)}`,            profitPerUnit>=0?C.ok:C.err],
                    ["Margin จริง",  `${marginActual.toFixed(1)}%`,       profitPerUnit>=0?C.ok:C.err],
                    ["กำไรรวม",      `฿${fmt(profitTotal)}`,              profitTotal>=0?C.ok:C.err],
                  ].map(([k,v,c]) => (
                    <div key={k} style={{ background:"#060b16", border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
                      <div style={{ fontSize:17, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>{k}</div>
                      <div style={{ fontSize:26, fontWeight:800, color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
          {!ordResolved && <div style={{ textAlign:"center", padding:48, color:C.muted, fontSize:26 }}>เลือก Order ด้านบนเพื่อดูต้นทุน</div>}
        </div>
      )}

      {activeTab === "compare" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            <StatBox label="Revenue รวม (30%)" value={`฿${(allCosts.reduce((s,o)=>s+o.sell30*o.qty,0)/1000).toFixed(0)}K`} color={C.ok}     icon="💰" />
            <StatBox label="ต้นทุนรวม"         value={`฿${(allCosts.reduce((s,o)=>s+o.cost.totalCost,0)/1000).toFixed(0)}K`} color={C.err}    icon="📉" />
            <StatBox label="กำไรรวม (30%)"     value={`฿${(allCosts.reduce((s,o)=>s+o.profit30,0)/1000).toFixed(0)}K`}       color={C.accent} icon="✨" />
          </div>
          <Card>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:650 }}>
                <thead><tr>{["Order","ลูกค้า","Qty","ต้นทุน/ตัว","ราคา (30%)","กำไรรวม","Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {allCosts.map((o, i) => (
                    <tr key={o.id} style={{ background:i%2===0?"transparent":"#060b1640" }}>
                      <td style={{ ...s.td, color:C.accent, fontWeight:700 }}>{o.id}</td>
                      <td style={s.td}>{o.customer}</td>
                      <td style={{ ...s.td, color:C.sub }}>{o.qty?.toLocaleString()}</td>
                      <td style={s.td}>฿{fmt(o.cost.totalPerUnit)}</td>
                      <td style={{ ...s.td, color:C.ok }}>฿{fmt(o.sell30)}</td>
                      <td style={{ ...s.td, color:o.profit30>=0?C.ok:C.err, fontWeight:700 }}>฿{fmt(o.profit30)}</td>
                      <td style={s.td}><Tag text={o.status} color={{ confirmed:C.accent2, production:C.ok, done:"#22c55e", draft:C.muted }[o.status]||C.muted} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "breakdown" && (
        <div>
          <Card style={{ marginBottom:14 }}>
            <Field label="เลือก Order เพื่อดูสัดส่วนต้นทุน">
              <select style={s.select} value={selOrder} onChange={e => setSelOrder(e.target.value)}>
                {data.orders.map(o => <option key={o.id} value={o.id}>{o.id} — {o.customer}</option>)}
              </select>
            </Field>
          </Card>
          {cost && (
            <Card>
              <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:16 }}>🔬 สัดส่วนต้นทุน — {ord?.id} ({ord?.customer})</div>
              <BarChart rows={[
                { label:"Fabric",    value:cost.fabricCost, max:cost.totalPerUnit, color:C.accent  },
                { label:"Trim",      value:cost.trimCost,   max:cost.totalPerUnit, color:C.accent2 },
                { label:"Labor",     value:cost.laborCost,  max:cost.totalPerUnit, color:C.ok      },
                { label:"Print/EMB", value:cost.printCost,  max:cost.totalPerUnit, color:C.purple  },
                { label:"Overhead",  value:cost.overhead,   max:cost.totalPerUnit, color:C.warn    },
              ].filter(r => r.value > 0)} />
              <div style={{ marginTop:16, padding:"12px 14px", background:C.accent+"10", border:`1px solid ${C.accent}30`, borderRadius:8, display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontWeight:700, color:C.text }}>รวมต้นทุน / ตัว</span>
                <span style={{ fontWeight:800, fontSize:26, color:C.accent }}>฿{fmt(cost.totalPerUnit)}</span>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// § 14  MODULE: SALES (unchanged from V3)
// ════════════════════════════════════════════════════════════════
function SalesModule() {
  const { data, setData } = useData();
  const [activeTab, setActiveTab] = useState("pipeline");
  const [invModal,  setInvModal]  = useState(false);
  const [form,      setForm]      = useState({});
  const invoices     = data.saleInvoices||[];
  const totalRevenue = invoices.reduce((s,i)=>s+(i.amount||0),0);
  const totalPaid    = invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+(i.amount||0),0);
  const totalPending = invoices.filter(i=>i.status==="pending").reduce((s,i)=>s+(i.amount||0),0);
  const iscol = (st) => ({paid:C.ok,pending:"#eab308",overdue:C.err,cancelled:C.muted}[st]||C.muted);
  const islbl = (st) => ({paid:"✅ จ่ายแล้ว",pending:"⏳ รอชำระ",overdue:"🔴 เกินกำหนด",cancelled:"❌ ยกเลิก"}[st]||st);
  const openInv = (inv=null) => { setForm(inv?{...inv}:{id:`SI-${Date.now().toString().slice(-4)}`,orderId:data.orders[0]?.id||"",customer:data.orders[0]?.customer||"",amount:0,status:"pending",date:today(),dueDate:"",paidDate:null,note:""}); setInvModal(true); };
  const saveInv  = () => { const r={...form,amount:parseFloat(form.amount)||0}; setData(d=>({...d,saleInvoices:[...(d.saleInvoices||[]).filter(i=>i.id!==r.id),r]})); db.upsertSaleInvoice(r); setInvModal(false); };
  const delInv   = (id) => { setData(d=>({...d,saleInvoices:(d.saleInvoices||[]).filter(i=>i.id!==id)})); db.deleteSaleInvoice(id); };
  const markPaid = (inv) => {
    const r = {...inv, status:"paid", paidDate:today()};
    setData(d => {
      // Auto-update linked Order status to "done"
      const linkedOrder = d.orders.find(o => o.id === inv.orderId);
      let updatedOrders = d.orders.map(o => o.id === inv.orderId ? {...o, status:"done"} : o);
      // Auto-deduct stock if order wasn't already done
      let newStock = {...d.stock};
      let newLog   = [...(d.stockLog||[])];
      if (linkedOrder && linkedOrder.status !== "done") {
        const pat = d.patterns.find(p => p.id === linkedOrder.patternId);
        const fab = pat && d.fabrics.find(f => f.id === pat.fabricId);
        const stockItems = buildStockItems(linkedOrder, pat, fab, d.fabrics, d.accessories, d.stock);
        stockItems.forEach(item => {
          const qty   = parseFloat(item.needed);
          const after = Math.max(0, (newStock[item.id]||0) - qty);
          newLog.push({id:genId("LOG"),itemId:item.id,itemName:item.name,type:"out",qty,reason:`รับชำระ Invoice ${inv.id}`,date:today(),balAfter:after});
          newStock[item.id] = after;
          db.upsertStock(item.id, after);
        });
        if (linkedOrder) db.upsertOrder({...linkedOrder, status:"done"});
      }
      return {...d,
        saleInvoices: (d.saleInvoices||[]).map(i => i.id===inv.id ? r : i),
        orders: updatedOrders,
        stock: newStock,
        stockLog: newLog,
      };
    });
    db.upsertSaleInvoice(r);
  };
  const pipeline = data.orders.map(o => { const inv=invoices.find(i=>i.orderId===o.id); const cost=calcCost(o,data.patterns,data.fabrics,data.accessories,data.printTypes,data.costRates); return{...o,invoice:inv,cost}; });
  return <div>
    <SectionHead title="💰 SALES MODULE" sub="Sales Pipeline · Invoice · Payment" action={<button style={s.btn()} onClick={()=>openInv()}>+ Invoice</button>}/>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
      <StatBox label="Revenue รวม"    value={`฿${(totalRevenue/1000).toFixed(0)}K`} color={C.accent}  icon="💰"/>
      <StatBox label="รับแล้ว"        value={`฿${(totalPaid/1000).toFixed(0)}K`}    color={C.ok}      icon="✅"/>
      <StatBox label="รอรับ"          value={`฿${(totalPending/1000).toFixed(0)}K`} color="#eab308"   icon="⏳"/>
      <StatBox label="Collection Rate" value={`${totalRevenue>0?((totalPaid/totalRevenue)*100).toFixed(0):0}%`} color={C.accent2} icon="📊"/>
    </div>
    <TabBar tabs={[["pipeline","📊 Pipeline"],["invoices",`🧾 Invoices (${invoices.length})`],["summary","📈 Summary"]]} active={activeTab} setActive={setActiveTab}/>
    {activeTab==="pipeline" && <Card><div style={{ overflowX:"auto" }}><table style={{ width:"100%", borderCollapse:"collapse", minWidth:760 }}>
      <thead><tr>{["Order","ลูกค้า","Qty","ต้นทุน","Invoice","จำนวนเงิน","สถานะ","Action"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
      <tbody>{pipeline.map((o,i)=><tr key={o.id} style={{ background:i%2===0?"transparent":"#060b1640" }}>
        <td style={{ ...s.td, color:C.accent, fontWeight:700 }}>{o.orderNo||o.id}</td>
        <td style={s.td}>{o.customer}</td>
        <td style={{ ...s.td, color:C.sub }}>{o.qty?.toLocaleString()}</td>
        <td style={s.td}>{o.cost?`฿${fmt(o.cost.totalCost)}`:"—"}</td>
        <td style={{ ...s.td, color:o.invoice?C.accent2:C.muted, fontSize:17 }}>{o.invoice?.id||"—"}</td>
        <td style={{ ...s.td, fontWeight:700 }}>{o.invoice?`฿${fmt(o.invoice.amount)}`:"—"}</td>
        <td style={s.td}>{o.invoice?<Tag text={islbl(o.invoice.status)} color={iscol(o.invoice.status)}/>:<Tag text="ยังไม่มี" color={C.muted}/>}</td>
        <td style={s.td}>
          {!o.invoice&&<button onClick={()=>openInv({id:`SI-${Date.now().toString().slice(-4)}`,orderId:o.id,customer:o.customer,amount:o.cost?Math.round(o.cost.totalCost*1.3):0,status:"pending",date:today(),dueDate:"",paidDate:null,note:""})} style={{ ...s.btnSm(), marginRight:3 }}>สร้าง Invoice</button>}
          {o.invoice?.status==="pending"&&<button onClick={()=>markPaid(o.invoice)} style={s.btnSm(C.ok)}>รับเงิน ✓</button>}
        </td>
      </tr>)}</tbody>
    </table></div></Card>}
    {activeTab==="invoices" && <div>
      {invoices.length===0&&<div style={{ textAlign:"center", padding:48, color:C.muted }}>ยังไม่มี Invoice</div>}
      {invoices.map(inv=><div key={inv.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div><div style={{ fontWeight:700, color:C.accent, fontSize:17 }}>{inv.id}</div><div style={{ fontSize:26, color:C.sub, marginTop:2 }}>🏢 {inv.customer} · 📋 {inv.orderId} · 📅 {inv.date}</div>{inv.paidDate&&<div style={{ fontSize:17, color:C.ok }}>รับเงิน: {inv.paidDate}</div>}</div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:26, fontWeight:800, color:C.accent }}>฿{inv.amount?.toLocaleString()}</div><Tag text={islbl(inv.status)} color={iscol(inv.status)}/></div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {inv.status==="pending"&&<button onClick={()=>markPaid(inv)} style={{ ...s.btnSm(C.ok), padding:"5px 14px" }}>✅ รับเงินแล้ว</button>}
          <button onClick={()=>openInv(inv)} style={{ ...s.btnGhost, padding:"5px 12px", fontSize:17 }}>✏️ แก้ไข</button>
          <button onClick={()=>delInv(inv.id)} style={{ ...s.btnGhost, padding:"5px 12px", fontSize:17, color:C.err, borderColor:C.err+"50" }}>🗑 ลบ</button>
        </div>
      </div>)}
    </div>}
    {activeTab==="summary" && <div>
      <Card style={{ marginBottom:14 }}>
        <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:14 }}>📈 Revenue by Status</div>
        {[["จ่ายแล้ว",C.ok,totalPaid],["รอชำระ","#eab308",totalPending]].map(([label,color,amt])=>{
          const pct=totalRevenue>0?(amt/totalRevenue)*100:0;
          return <div key={label} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}><span style={{ fontSize:26, color:C.sub }}>{label}</span><span style={{ fontWeight:700, color }}>฿{fmt(amt)} ({pct.toFixed(1)}%)</span></div>
            <ProgressBar value={pct} max={100} color={color}/>
          </div>;
        })}
        <div style={{ marginTop:16, display:"flex", justifyContent:"space-between", padding:"12px 0", borderTop:`1px solid ${C.border}` }}><span style={{ fontWeight:700, color:C.text }}>Total Revenue</span><span style={{ fontWeight:800, fontSize:26, color:C.accent }}>฿{fmt(totalRevenue)}</span></div>
      </Card>
    </div>}
    {invModal && <Modal title="Invoice" onClose={()=>setInvModal(false)}>
      <Row2>
        <Field label="Invoice No." half><input style={s.input} value={form.id||""} onChange={e=>setForm(f=>({...f,id:e.target.value}))}/></Field>
        <Field label="Order" half><select style={s.select} value={form.orderId||""} onChange={e=>{const o=data.orders.find(x=>x.id===e.target.value);setForm(f=>({...f,orderId:e.target.value,customer:o?.customer||f.customer}));}}>{data.orders.map(o=><option key={o.id} value={o.id}>{o.orderNo||o.id} — {o.customer}</option>)}</select></Field>
        <Field label="ลูกค้า"><input style={s.input} value={form.customer||""} onChange={e=>setForm(f=>({...f,customer:e.target.value}))}/></Field>
        <Field label="จำนวนเงิน (฿)" half><input style={s.input} type="number" value={form.amount||""} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></Field>
        <Field label="วันที่ออก" half><input style={s.input} type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></Field>
        <Field label="กำหนดชำระ" half><input style={s.input} type="date" value={form.dueDate||""} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/></Field>
        <Field label="สถานะ" half><select style={s.select} value={form.status||"pending"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="pending">⏳ รอชำระ</option><option value="paid">✅ จ่ายแล้ว</option><option value="overdue">🔴 เกินกำหนด</option></select></Field>
        <Field label="หมายเหตุ"><input style={s.input} value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/></Field>
      </Row2>
      <div style={{ display:"flex", gap:8, marginTop:16 }}><button style={s.btn()} onClick={saveInv}>💾 บันทึก</button><button style={s.btnGhost} onClick={()=>setInvModal(false)}>{t("cancel")}</button></div>
    </Modal>}
  </div>;
}

// ════════════════════════════════════════════════════════════════
// § 15  MODULE: REPORTS (unchanged from V3)
// ════════════════════════════════════════════════════════════════
function ReportModule() {
  const { data } = useData();
  const [selOrder, setSelOrder] = useState(data.orders[0]?.id||"");
  const [report,   setReport]   = useState("quotation");
  const ord  = data.orders.find(o=>o.id===selOrder);
  const pat  = ord&&data.patterns.find(p=>p.id===ord.patternId);
  const fab  = pat&&data.fabrics.find(f=>f.id===pat.fabricId);
  const pt   = ord&&data.printTypes.find(p=>p.id===ord.printTypeId);
  const cost = ord?calcCost(ord,data.patterns,data.fabrics,data.accessories,data.printTypes,data.costRates):null;
  const finalSell  = cost?cost.totalPerUnit*1.3:0;
  const profit     = cost?(finalSell-cost.totalPerUnit)*ord.qty:0;
  const stockItems = buildStockItems(ord,pat,fab,data.fabrics,data.accessories,data.stock);
  const reports    = [{id:"production",label:"🏭 ใบผลิต"},{id:"bom",label:"📦 BOM"},{id:"stock",label:"🏬 สต็อก"},{id:"cost",label:"💰 ต้นทุน"},{id:"quotation",label:"📄 ใบเสนอราคา"}];
  return <div>
    <SectionHead title="📄 REPORTS" sub="Production · BOM · Stock · Cost · Quotation"/>
    <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
      <div style={{ flex:"0 0 220px" }}><Field label="Order"><select style={s.select} value={selOrder} onChange={e=>setSelOrder(e.target.value)}>{data.orders.map(o=><option key={o.id} value={o.id}>{o.orderNo||o.id} – {o.customer}</option>)}</select></Field></div>
      <div style={{ display:"flex", gap:6, alignItems:"flex-end", flexWrap:"wrap" }}>{reports.map(r=><button key={r.id} onClick={()=>setReport(r.id)} style={{ ...s.btnGhost, ...(report===r.id?{background:C.accent+"20",color:C.accent,borderColor:C.accent+"60"}:{}) }}>{r.label}</button>)}</div>
    </div>
    {!ord&&<div style={{ textAlign:"center", padding:48, color:C.muted }}>เลือก Order</div>}
    {ord&&<Card>
      {report==="production"&&<div><div style={{ textAlign:"center", marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}><div style={{ fontSize:26, fontWeight:700, color:C.accent }}>ใบสั่งผลิต</div><div style={{ fontSize:26, color:C.muted }}>{ord.orderNo||ord.id} | {ord.date}</div></div>{[["Order No.",ord.orderNo||ord.id],["ลูกค้า",ord.customer],["ที่อยู่",ord.customerAddress||"—"],["Pattern",`${pat?.styleCode||""} ${pat?.name||""}`],["BOM Version",`v${pat?.bomVersion||1}`],["Size Set",pat?.sizeSet||"—"],["จำนวน",`${ord.qty?.toLocaleString()} ตัว`],["วัตถุดิบหลัก",`${fab?.name} — ${pat?.fabricPerUnit} ${fab?.unit||"m"}/ตัว`],["Print/EMB",pt?.name||"—"],["ช่องทางส่ง",ord.deliveryChannel||"—"],["Priority",ord.priority||"normal"],["Status",ord.status]].map(([k,v])=><div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", fontSize:17, borderBottom:`1px solid #060b16` }}><span style={{ color:C.muted }}>{k}</span><span style={{ color:C.text, fontWeight:600 }}>{v}</span></div>)}</div>}
      {report==="bom"&&<div><div style={{ textAlign:"center", marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}><div style={{ fontSize:26, fontWeight:700, color:C.accent }}>ใบสั่งวัตถุดิบ (BOM)</div><div style={{ fontSize:26, color:C.muted }}>{ord.orderNo||ord.id} | {ord.customer} | BOM v{pat?.bomVersion||1}</div></div><table style={{ width:"100%", borderCollapse:"collapse" }}><thead><tr>{["รายการ","ต้องการ","มีในสต็อก","Status"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{stockItems.map((item,i)=><tr key={i}><td style={s.td}>{item.name}</td><td style={{ ...s.td, color:C.accent }}>{item.needed} {item.unit}</td><td style={{ ...s.td, color:item.ok?C.ok:C.err }}>{item.have} {item.unit}</td><td style={s.td}>{item.ok?<Tag text="✓ จองสต็อก" color={C.ok}/>:<Tag text="✗ ต้องสั่งซื้อ" color={C.err}/>}</td></tr>)}</tbody></table></div>}
      {report==="stock"&&<div><div style={{ textAlign:"center", marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}><div style={{ fontSize:26, fontWeight:700, color:C.accent }}>รายงานสต็อก</div><div style={{ fontSize:26, color:C.muted }}>ณ วันที่ {new Date().toLocaleDateString("th-TH")}</div></div><table style={{ width:"100%", borderCollapse:"collapse" }}><thead><tr>{["รายการ","Code","ประเภท","Qty","Min","หน่วย","มูลค่า"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{[...data.fabrics.map(f=>({...f,tp:"Fabric"})),...data.accessories.map(a=>({...a,tp:"Trim"}))].map(item=>{const qty=data.stock[item.id]||0;return<tr key={item.id}><td style={s.td}>{item.name}</td><td style={{ ...s.td, color:C.cyan, fontFamily:"monospace", fontSize:17 }}>{item.code||item.id}</td><td style={s.td}><Tag text={item.tp} color={item.tp==="Fabric"?C.accent:C.accent2}/></td><td style={{ ...s.td, color:qty<(item.minQty||0)?C.err:C.ok, fontWeight:700 }}>{qty.toLocaleString()}</td><td style={{ ...s.td, color:C.muted }}>{item.minQty||"—"}</td><td style={s.td}>{item.unit}</td><td style={{ ...s.td, color:C.accent }}>฿{fmt(qty*item.costPerUnit)}</td></tr>;})}
      </tbody></table></div>}
      {report==="cost"&&cost&&<div><div style={{ textAlign:"center", marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}><div style={{ fontSize:26, fontWeight:700, color:C.accent }}>รายงานต้นทุน</div><div style={{ fontSize:26, color:C.muted }}>{ord.orderNo||ord.id} | {ord.customer}</div></div>{[["Fabric Cost",cost.fabricCost,cost.fabricCost*ord.qty],["Trim Cost",cost.trimCost,cost.trimCost*ord.qty],["Labor Cost",cost.laborCost,cost.laborCost*ord.qty],[`Overhead (${data.costRates.overheadRate}%)`,cost.overhead,cost.overhead*ord.qty]].map(([k,perUnit,total])=><div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", fontSize:17, borderBottom:`1px solid #060b16` }}><span style={{ color:C.sub, flex:2 }}>{k}</span><span style={{ color:C.text, flex:1, textAlign:"right" }}>฿{fmt(perUnit)}/ตัว</span><span style={{ color:C.accent, flex:1, textAlign:"right", fontWeight:600 }}>฿{fmt(total)}</span></div>)}<div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 4px", fontWeight:700, fontSize:26 }}><span style={{ color:C.text }}>รวมต้นทุน</span><span style={{ color:C.accent }}>฿{fmt(cost.totalCost)}</span></div></div>}
      {report==="quotation"&&cost&&<div><div style={{ textAlign:"center", marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}><div style={{ fontSize:26, fontWeight:700, color:C.accent }}>ใบเสนอราคา</div><div style={{ fontSize:26, color:C.muted }}>QT-{ord.orderNo||ord.id} | {new Date().toLocaleDateString("th-TH")}</div></div>{[["ลูกค้า",ord.customer],["ที่อยู่",ord.customerAddress||"—"],["รายการ",`${pat?.styleCode||""} ${pat?.name||""}${pt&&pt.name!=="None"?" + "+pt.name:""}`],["จำนวน",`${ord.qty?.toLocaleString()} ตัว`],["ต้นทุน/ตัว",`฿${fmt(cost.totalPerUnit)}`],["ราคาขาย/ตัว (Margin 30%)",`฿${fmt(finalSell)}`],["มูลค่ารวม",`฿${fmt(finalSell*ord.qty)}`]].map(([k,v])=><div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", fontSize:17, borderBottom:`1px solid #060b16` }}><span style={{ color:C.muted }}>{k}</span><span style={{ color:C.text, fontWeight:600 }}>{v}</span></div>)}<div style={{ marginTop:16, padding:"14px 16px", background:profit>=0?C.ok+"12":C.err+"12", border:`1px solid ${profit>=0?C.ok:C.err}40`, borderRadius:8 }}><div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontWeight:700, color:C.text }}>กำไรสุทธิ</span><span style={{ fontWeight:700, fontSize:26, color:profit>=0?C.ok:C.err }}>฿{fmt(profit)}</span></div><div style={{ fontSize:26, color:C.muted, marginTop:4 }}>Margin 30% | ฿{fmt(finalSell-cost.totalPerUnit)}/ตัว</div></div></div>}
    </Card>}
  </div>;
}

// ════════════════════════════════════════════════════════════════
// § 16  MODULE: DASHBOARD
// ════════════════════════════════════════════════════════════════
function DashboardModule({ setActiveModule }) {
  const { data } = useData();
  const totalOrders    = data.orders.length;
  const inProduction   = data.orders.filter(o=>o.status==="production").length;
  const doneOrders     = data.orders.filter(o=>o.status==="done").length;
  const urgentOrders   = data.orders.filter(o=>o.priority==="urgent"||o.priority==="high").length;
  const totalRevenue   = (data.saleInvoices||[]).reduce((s,i)=>s+(i.amount||0),0);
  const paidRevenue    = (data.saleInvoices||[]).filter(i=>i.status==="paid").reduce((s,i)=>s+(i.amount||0),0);
  const pendingRevenue = (data.saleInvoices||[]).filter(i=>i.status==="pending").reduce((s,i)=>s+(i.amount||0),0);
  const allItems       = [...data.fabrics.map(f=>({...f,minQty:f.minQty||0,costPerUnit:parseFloat(f.costPerUnit)||0})),...data.accessories.map(a=>({...a,minQty:a.minQty||0,costPerUnit:parseFloat(a.costPerUnit)||0}))];
  const lowStockCount  = allItems.filter(i=>(data.stock[i.id]||0)<i.minQty&&i.minQty>0).length;
  const totalStockVal  = allItems.reduce((s,i)=>s+(data.stock[i.id]||0)*(parseFloat(i.costPerUnit)||0),0);
  const collectionRate = totalRevenue>0?((paidRevenue/totalRevenue)*100).toFixed(0):0;
  const statusData     = ["draft","confirmed","production","qc","ready","shipped","done","cancelled"].map(st=>({ label:st, value:data.orders.filter(o=>o.status===st).length, color:ORDER_STATUS_COLOR[st]||C.muted })).filter(x=>x.value>0);
  const maxStatusVal   = Math.max(...statusData.map(x=>x.value),1);
  const recentOrders   = [...data.orders].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,6);
  const lowStockItems  = allItems.filter(i=>(data.stock[i.id]||0)<(i.minQty||0)&&(i.minQty||0)>0).slice(0,5);
  const recentOrd      = [...data.orders].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5);

  return <div>
    <SectionHead title="📊 DASHBOARD" sub={`ภาพรวมระบบ ERP — ${new Date().toLocaleDateString("th-TH",{year:"numeric",month:"long",day:"numeric"})}`}/>

    {/* KPI Row */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:14 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", cursor:"pointer" }} onClick={()=>setActiveModule("order")}>
        <div style={{ fontSize:26, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>📋 Orders ทั้งหมด</div>
        <div style={{ fontSize:32, fontWeight:800, color:C.accent }}>{totalOrders}</div>
        <div style={{ fontSize:17, color:C.muted, marginTop:6 }}>🏭 ผลิต <strong style={{color:C.ok}}>{inProduction}</strong> · ✅ เสร็จ <strong style={{color:C.ok}}>{doneOrders}</strong></div>
        {urgentOrders>0&&<div style={{ fontSize:17, color:C.err, marginTop:4 }}>🔴 ด่วน {urgentOrders} รายการ</div>}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", cursor:"pointer" }} onClick={()=>setActiveModule("sales")}>
        <div style={{ fontSize:26, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>💰 Revenue รวม</div>
        <div style={{ fontSize:28, fontWeight:800, color:C.ok }}>฿{(totalRevenue/1000).toFixed(1)}K</div>
        <div style={{ fontSize:17, color:C.muted, marginTop:6 }}>รับแล้ว <strong style={{color:C.ok}}>฿{(paidRevenue/1000).toFixed(1)}K</strong></div>
        <div style={{ fontSize:17, color:C.muted }}>รอรับ <strong style={{color:"#eab308"}}>฿{(pendingRevenue/1000).toFixed(1)}K</strong></div>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", cursor:"pointer" }} onClick={()=>setActiveModule("inventory")}>
        <div style={{ fontSize:26, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>🏬 มูลค่าสต็อก</div>
        <div style={{ fontSize:28, fontWeight:800, color:C.cyan }}>฿{(totalStockVal/1000).toFixed(1)}K</div>
        <div style={{ fontSize:17, color:C.muted, marginTop:6 }}>{allItems.length} รายการ</div>
        {lowStockCount>0&&<div style={{ fontSize:17, color:C.warn, marginTop:4 }}>⚠️ ต่ำกว่า Min {lowStockCount} รายการ</div>}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px" }}>
        <div style={{ fontSize:26, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>📊 Collection Rate</div>
        <div style={{ fontSize:32, fontWeight:800, color:C.accent2 }}>{collectionRate}%</div>
        <div style={{ marginTop:10, background:C.border, borderRadius:4, height:6 }}>
          <div style={{ width:collectionRate+"%", height:"100%", background:C.accent2, borderRadius:4 }}/>
        </div>
      </div>
    </div>

    {/* Charts Row */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:16 }}>📋 Order Status</div>
        {statusData.length===0&&<div style={{ textAlign:"center", padding:32, color:C.muted }}>ไม่มี Order</div>}
        {statusData.map(item=>(
          <div key={item.label} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:17, color:C.sub, textTransform:"capitalize" }}>{item.label}</span>
              <span style={{ fontSize:26, fontWeight:700, color:item.color }}>{item.value}</span>
            </div>
            <div style={{ background:C.border, borderRadius:4, height:8 }}>
              <div style={{ width:`${(item.value/maxStatusVal)*100}%`, height:"100%", background:item.color, borderRadius:4 }}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:16 }}>💰 มูลค่า Order ล่าสุด</div>
        {recentOrders.length===0&&<div style={{ textAlign:"center", padding:32, color:C.muted }}>ไม่มี Order</div>}
        {(()=>{ const maxVal=Math.max(...recentOrders.map(o=>o.totalAmount||0),1); return recentOrders.map(o=>(
          <div key={o.id} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:17, color:C.sub }}>{o.customer}</span>
              <span style={{ fontSize:17, fontWeight:700, color:C.ok }}>฿{((o.totalAmount||0)/1000).toFixed(1)}K</span>
            </div>
            <div style={{ background:C.border, borderRadius:4, height:8 }}>
              <div style={{ width:`${((o.totalAmount||0)/maxVal)*100}%`, height:"100%", background:C.ok, borderRadius:4 }}/>
            </div>
          </div>
        )); })()}
      </div>
    </div>

    {/* Bottom Row */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:14 }}>
      <div style={{ background:C.card, border:`1px solid ${lowStockCount>0?C.warn:C.border}`, borderRadius:12, padding:20 }}>
        <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:14 }}>⚠️ Low Stock Alert</div>
        {lowStockItems.length===0&&<div style={{ textAlign:"center", padding:24 }}><div style={{ fontSize:28, marginBottom:8 }}>✅</div><div style={{ fontSize:26, color:C.ok }}>สต็อกทุกรายการปกติ</div></div>}
        {lowStockItems.map(item=>{ const qty=data.stock[item.id]||0; const pct=item.minQty>0?Math.min(100,(qty/item.minQty)*100):100; const color=qty===0?C.err:pct<50?C.err:C.warn;
          return <div key={item.id} style={{ marginBottom:12, padding:"10px 12px", background:"#060b16", borderRadius:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:17, color:C.text }}>{item.name}</span>
              <span style={{ fontSize:17, fontWeight:700, color }}>{qty} / {item.minQty} {item.unit}</span>
            </div>
            <div style={{ background:C.border, borderRadius:4, height:5 }}>
              <div style={{ width:pct+"%", height:"100%", background:color, borderRadius:4 }}/>
            </div>
          </div>;
        })}
        <button onClick={()=>setActiveModule("inventory")} style={{ ...s.btnGhost, width:"100%", marginTop:8, fontSize:17 }}>ดู Inventory ทั้งหมด →</button>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
          <span style={{ fontSize:17, fontWeight:700, color:C.text }}>📋 Order ล่าสุด</span>
          <button onClick={()=>setActiveModule("order")} style={{ ...s.btnGhost, padding:"3px 10px", fontSize:17 }}>ดูทั้งหมด →</button>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Order No.","ลูกค้า","Qty","มูลค่า","Priority","Status"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {recentOrd.length===0&&<tr><td colSpan={6} style={{ ...s.td, textAlign:"center", color:C.muted, padding:24 }}>ไม่มี Order</td></tr>}
              {recentOrd.map((o,i)=>(
                <tr key={o.id} style={{ background:i%2===0?"transparent":"#060b1640" }}>
                  <td style={{ ...s.td, color:C.accent, fontWeight:700, fontFamily:"monospace", fontSize:17 }}>{o.orderNo||o.id}</td>
                  <td style={s.td}>{o.customer}</td>
                  <td style={{ ...s.td, color:C.sub }}>{(o.qty||0).toLocaleString()}</td>
                  <td style={{ ...s.td, color:C.ok }}>฿{((o.totalAmount||0)/1000).toFixed(1)}K</td>
                  <td style={s.td}><Tag text={o.priority||"normal"} color={PRIORITY_COLOR[o.priority||"normal"]}/></td>
                  <td style={s.td}><Tag text={o.status} color={ORDER_STATUS_COLOR[o.status]||C.muted}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>;
}

// ════════════════════════════════════════════════════════════════
// § 17  APP SHELL
// ════════════════════════════════════════════════════════════════
function AppShell() {
  const { data, itemMaster } = useData();
  const [activeModule,  setActiveModule]  = useState("dashboard");
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [lang,          setLang]          = useState("EN");
  _lang = lang;

  const totalOrders     = data.orders.length;
  const totalStockValue = [...data.fabrics,...data.accessories].reduce((sum,i)=>sum+(data.stock[i.id]||0)*i.costPerUnit,0);
  const allItems        = [...data.fabrics.map(f=>({...f,minQty:f.minQty||0})),...data.accessories.map(a=>({...a,minQty:a.minQty||0}))];
  const lowStockCount   = allItems.filter(i=>(data.stock[i.id]||0)<i.minQty&&i.minQty>0).length;
  const urgentOrders    = data.orders.filter(o=>o.priority==="urgent"||o.priority==="high").length;

  const navItems = [
    {id:"dashboard", label:"🏠 Dashboard"   },
    {id:"items",     label:t("navItems")    },
    {id:"master",    label:t("navMaster")   },
    {id:"order",     label:t("navOrder")    },
    {id:"bom",       label:t("navBom")      },
    {id:"inventory", label:t("navInventory")},
    {id:"costing",   label:t("navCosting")  },
    {id:"sales",     label:t("navSales")    },
    {id:"reports",   label:t("navReports")  },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'JetBrains Mono','Courier New',monospace", color:C.text }}>
      {/* TOP NAV */}
      <div style={{ background:"#0a1020", borderBottom:`1px solid ${C.border}`, padding:"0 16px", display:"flex", alignItems:"center", overflowX:"auto" }}>
        <div style={{ padding:"14px 0", marginRight:20, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <span style={{ fontSize:26 }}>🧵</span>
          <div>
            <div style={{ fontSize:26, fontWeight:700, color:C.accent, letterSpacing:2, textTransform:"uppercase", whiteSpace:"nowrap" }}>{t("appName")}</div>
            <div style={{ fontSize:17, color:C.muted, letterSpacing:1 }}>{t("appSub")}</div>
          </div>
        </div>
        {navItems.map(m => (
          <button key={m.id} onClick={() => setActiveModule(m.id)}
            style={{ padding:"16px 10px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:17, fontWeight:activeModule===m.id?700:400, color:activeModule===m.id?C.accent:C.muted, borderBottom:activeModule===m.id?`2px solid ${C.accent}`:"2px solid transparent", whiteSpace:"nowrap", flexShrink:0 }}>
            {m.label}
          </button>
        ))}
        {/* Status Bar */}
        <div style={{ marginLeft:"auto", display:"flex", gap:14, fontSize:26, flexShrink:0, paddingLeft:16, alignItems:"center" }}>
          <span style={{ color:C.muted }}>Orders: <strong style={{ color:C.accent }}>{totalOrders}</strong></span>
          {urgentOrders > 0 && <span style={{ color:C.warn }}>🔴 <strong>{urgentOrders}</strong></span>}
          <span style={{ color:C.muted }}>⚠️ <strong style={{ color:lowStockCount>0?C.err:C.ok }}>{lowStockCount}</strong></span>
          <span style={{ color:C.muted }}>Stock: <strong style={{ color:C.ok }}>฿{(totalStockValue/1000).toFixed(0)}K</strong></span>
          <LangToggle lang={lang} setLang={setLang}/>
        </div>
      </div>

      {/* MODULE ROUTER */}
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"28px 20px" }}>
        {activeModule==="dashboard" && <DashboardModule setActiveModule={setActiveModule}/>}
        {activeModule==="items"     && <ItemMasterModule/>}
        {activeModule==="master"    && <MasterModule/>}
        {activeModule==="order"     && <OrderModule setActiveOrderId={setActiveOrderId} setActiveModule={setActiveModule}/>}
        {activeModule==="bom"       && <BOMModule activeOrderId={activeOrderId}/>}
        {activeModule==="inventory" && <InventoryModule/>}
        {activeModule==="costing"   && <CostingModule/>}
        {activeModule==="sales"     && <SalesModule/>}
        {activeModule==="reports"   && <ReportModule/>}
      </div>
    </div>
  );
}

export default function GarmentERPV5() {
  return <DataProvider><AppShell/></DataProvider>;
}
