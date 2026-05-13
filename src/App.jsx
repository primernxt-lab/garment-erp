import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import PRIMER_ITEMS_V3 from './items_v3.json';
// xlsx loaded lazily on first import click — keeps initial bundle small
import {
  loadAllData, testConnection,
  upsertFabric, deleteFabric,
  upsertAccessory, deleteAccessory,
  upsertPrintType, deletePrintType,
  upsertScreen, deleteScreen,
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
  id:            str(col(row,'id','ID')) || genId('F'),
  name:          str(col(row,'name','Name','ชื่อ')),
  type:          str(col(row,'type','Type','ประเภท')) || 'Knit',
  unit:          str(col(row,'unit','Unit','หน่วย')) || 'm',
  costPerUnit:   num(col(row,'cost_per_unit','costPerUnit','Cost/Unit','ราคา/หน่วย')),
  supplier:      str(col(row,'supplier_id','supplier','Supplier','Supplier ID')),
  color:         str(col(row,'color','Color','สี')),
  width:         parseFloat(col(row,'width_cm','width','Width')) || null,
  consumptionKg: parseFloat(col(row,'consumption_kg','consumptionKg','Consumption (kg)')) || null,
  note:          str(col(row,'note','Note','หมายเหตุ')),
  imagePreview:  null,
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

const mapPatternRow = row => {
  const fabricId    = str(col(row,'fabric_id','fabricId','Fabric ID'));
  const consumption = num(col(row,'fabric_per_unit','fabricPerUnit','Fabric/Unit','ผ้า/ตัว'));
  const mat1 = { fabricId, consumption, widthCm: parseFloat(col(row,'mat1_width_cm','width_cm')) || null };
  const mat2 = { fabricId: str(col(row,'mat2_fabric_id')), consumption: num(col(row,'mat2_consumption')), widthCm: parseFloat(col(row,'mat2_width_cm')) || null };
  const mat3 = { fabricId: str(col(row,'mat3_fabric_id')), consumption: num(col(row,'mat3_consumption')), widthCm: parseFloat(col(row,'mat3_width_cm')) || null };
  return {
    id:           str(col(row,'id','ID')) || genId('P'),
    name:         str(col(row,'name','Name','ชื่อ')),
    patternType:  str(col(row,'pattern_type','patternType','Pattern Type','ประเภท')) || null,
    category:     str(col(row,'category','Category')) || 'Tops',
    fabricId,
    fabricPerUnit: consumption,
    materials:    [mat1, mat2, mat3],
    laborCut:     num(col(row,'labor_cut','laborCut','Labor Cut')),
    laborSew:     num(col(row,'labor_sew','laborSew','Labor Sew')),
    laborQC:      num(col(row,'labor_qc','laborQC','Labor QC')),
    accessories:  [],
    imagePreview: null,
  };
};

const mapStockRow = row => ({
  itemId: str(col(row,'item_id','itemId','Item ID','ID','id')),
  qty:    num(col(row,'qty','Qty','quantity','จำนวน')),
});

// ── Import Button component (Step 01: upload → preview → confirm) ─
function ImportBtn({ onImport }) {
  const ref = useRef(null);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState(null); // { file, rows }
  const ok = status.startsWith('✅');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    try {
      const rows = await readExcel(file);
      setPreview({ file, rows: rows.slice(0, 10) });
    } catch (err) {
      console.error('[Import]', err);
      setStatus('❌ ไฟล์ผิดรูปแบบ');
      setTimeout(() => setStatus(''), 4000);
    }
  };

  const confirmImport = async () => {
    const { file } = preview;
    setPreview(null);
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
  };

  const columns = preview?.rows?.[0] ? Object.keys(preview.rows[0]).slice(0, 8) : [];

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
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: '#000b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: '100%', maxWidth: 780, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <span style={{ fontWeight: 700, color: C.accent, fontSize: 14 }}>📋 ตรวจสอบข้อมูลก่อนนำเข้า</span>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
              <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>
                แสดง <strong style={{ color: C.text }}>{preview.rows.length}</strong> แถวแรก — กด <strong style={{ color: C.ok }}>ยืนยันนำเข้า</strong> เพื่อบันทึกข้อมูลทั้งหมด
              </div>
              <div style={{ overflowX: 'auto', marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>{columns.map(c => <th key={c} style={{ ...s.th, whiteSpace: 'nowrap' }}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#060b1630' }}>
                        {columns.map(c => (
                          <td key={c} style={{ ...s.td, whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {String(row[c] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...s.btn(C.ok, true) }} onClick={confirmImport}>✅ ยืนยันนำเข้า</button>
                <button style={s.btnGhost} onClick={() => setPreview(null)}>ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 20;

function MasterModule({ data, setData }) {
  const [tab, setTab] = useState("fabric");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState({});
  const [page, setPage] = useState({});

  const tabs = [
    { id: "fabric", label: t("tabFabric") },
    { id: "accessories", label: t("tabAccessories") },
    { id: "pattern", label: t("tabPattern") },
    { id: "print", label: t("tabPrint") },
    { id: "screen", label: "Screen" },
    { id: "supplier", label: t("tabSupplier") },
    { id: "rates", label: t("tabRates") },
  ];

  const filterList = (items, tabKey) => {
    const q = (search[tabKey] || '').toLowerCase().trim();
    return q ? items.filter(x => (x.name||'').toLowerCase().includes(q) || (x.id||'').toLowerCase().includes(q)) : items;
  };
  const pagedList = (items, tabKey) => {
    const pg = page[tabKey] || 0;
    return items.slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE);
  };
  const onSearch = (tabKey, val) => { setSearch(s => ({ ...s, [tabKey]: val })); setPage(p => ({ ...p, [tabKey]: 0 })); };

  const SearchBar = ({ tabKey }) => (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: C.muted, pointerEvents: 'none' }}>🔍</span>
      <input style={{ ...s.input, paddingLeft: 28, fontSize: 12, padding: '7px 10px 7px 28px' }}
        value={search[tabKey] || ''}
        onChange={e => onSearch(tabKey, e.target.value)}
        placeholder="ค้นหาชื่อ / ID..." />
      {search[tabKey] && (
        <button onClick={() => onSearch(tabKey, '')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14 }}>×</button>
      )}
    </div>
  );

  const Pager = ({ items, tabKey }) => {
    const total = items.length;
    const pg = page[tabKey] || 0;
    const maxPg = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
    if (total <= PAGE_SIZE) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 10, fontSize: 11, color: C.sub }}>
        <span>{pg * PAGE_SIZE + 1}–{Math.min((pg + 1) * PAGE_SIZE, total)} / {total}</span>
        <button onClick={() => setPage(p => ({ ...p, [tabKey]: Math.max(0, pg - 1) }))} disabled={pg === 0}
          style={{ ...s.btnGhost, padding: '3px 10px', opacity: pg === 0 ? 0.4 : 1 }}>‹</button>
        <button onClick={() => setPage(p => ({ ...p, [tabKey]: Math.min(maxPg, pg + 1) }))} disabled={pg >= maxPg}
          style={{ ...s.btnGhost, padding: '3px 10px', opacity: pg >= maxPg ? 0.4 : 1 }}>›</button>
      </div>
    );
  };

  const openAdd = (type) => {
    setModal(type);
    setForm(type === "rates" ? { ...data.costRates } : {});
  };

  const save = () => {
    if (modal === "fabric") {
      const id = form.id || genId("F");
      const fabric = { ...form, id, costPerUnit: parseFloat(form.costPerUnit) || 0, width: form.width ? parseFloat(form.width) : null, consumptionKg: form.consumptionKg ? parseFloat(form.consumptionKg) : null, color: form.color || '', imagePreview: form.imagePreview || null, note: form.note || "" };
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
    } else if (modal === "screen") {
      const id = form.id || genId("SC");
      const sc = { ...form, id, rateA1: parseFloat(form.rateA1) || 0, rateA2: parseFloat(form.rateA2) || 0, rateA3: parseFloat(form.rateA3) || 0, rateA4: parseFloat(form.rateA4) || 0 };
      setData(d => ({ ...d, screens: [...(d.screens || []).filter(x => x.id !== id), sc] }));
      upsertScreen(sc);
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
    else if (type === "screen") { setData(d => ({ ...d, screens: (d.screens||[]).filter(x => x.id !== id) })); deleteScreen(id); }
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

  const importScreens = async (file) => {
    const rows = await readExcel(file);
    const items = rows.map(row => ({
      id:     str(col(row,'id','ID')) || genId('SC'),
      name:   str(col(row,'name','Name','ชื่อ')),
      type:   str(col(row,'type','Type','ประเภท')) || 'Silk',
      rateA1: num(col(row,'rate_a1','rateA1','Rate A1')),
      rateA2: num(col(row,'rate_a2','rateA2','Rate A2')),
      rateA3: num(col(row,'rate_a3','rateA3','Rate A3')),
      rateA4: num(col(row,'rate_a4','rateA4','Rate A4')),
      note:   str(col(row,'note','Note','หมายเหตุ')),
      imagePreview: null,
    })).filter(x => x.name);
    setData(d => {
      const keep = (d.screens||[]).filter(sc => !items.find(i => i.id === sc.id));
      return { ...d, screens: [...keep, ...items] };
    });
    items.forEach(i => upsertScreen(i));
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Fabric Master</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ImportBtn onImport={importFabrics} />
              <button style={s.btn()} onClick={() => openAdd("fabric")}>+ เพิ่ม</button>
            </div>
          </div>
          <SearchBar tabKey="fabric" />
          {(() => { const filtered = filterList(data.fabrics, 'fabric'); const paged = pagedList(filtered, 'fabric'); return (<>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{[t("colImage"), t("colId"), t("colName"), t("colType"), "Color", t("colWidth"), "Consump.(kg)", t("colUnit"), t("colPrice"), t("colSupplier"), ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {paged.map(f => (
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
                  <td style={{ ...s.td, color: C.sub }}>{f.color || <span style={{ color: C.muted }}>—</span>}</td>
                  <td style={{ ...s.td, color: C.accent2 }}>{f.width ? `${f.width} cm` : <span style={{ color: C.muted }}>—</span>}</td>
                  <td style={{ ...s.td, color: C.sub }}>{f.consumptionKg ? `${f.consumptionKg} kg` : <span style={{ color: C.muted }}>—</span>}</td>
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
          <Pager items={filtered} tabKey="fabric" />
          </>); })()}
        </Card>
      )}

      {tab === "accessories" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Accessories Master</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ImportBtn onImport={importAccessories} />
              <button style={s.btn()} onClick={() => openAdd("accessories")}>+ เพิ่ม</button>
            </div>
          </div>
          <SearchBar tabKey="accessories" />
          {(() => { const filtered = filterList(data.accessories, 'accessories'); const paged = pagedList(filtered, 'accessories'); return (<>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Image", "ID", "ชื่อ", "หน่วย", "ราคา/หน่วย", "Supplier", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {paged.map(a => (
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
          <Pager items={filtered} tabKey="accessories" />
          </>); })()}
        </Card>
      )}

      {tab === "pattern" && <PatternMaster data={data} setData={setData} />}

      {tab === "print" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Printing / EMB Type</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ImportBtn onImport={importPrintTypes} />
              <button style={s.btn()} onClick={() => openAdd("print")}>+ เพิ่ม</button>
            </div>
          </div>
          <SearchBar tabKey="print" />
          {(() => { const filtered = filterList(data.printTypes, 'print'); const paged = pagedList(filtered, 'print'); return (<>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Image", "ID", "ประเภท", "ราคา/ตัว", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {paged.map(pt => (
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
          <Pager items={filtered} tabKey="print" />
          </>); })()}
        </Card>
      )}

      {tab === "screen" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Screen / Print Setup</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ImportBtn onImport={importScreens} />
              <button style={s.btn()} onClick={() => openAdd("screen")}>+ เพิ่ม</button>
            </div>
          </div>
          <SearchBar tabKey="screen" />
          {(() => { const filtered = filterList(data.screens || [], 'screen'); const paged = pagedList(filtered, 'screen'); return (<>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["ID", "ชื่อ", "ประเภท", "Rate A4", "Rate A3", "Rate A2", "Rate A1", "หมายเหตุ", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {paged.map(sc => (
                <tr key={sc.id}>
                  <td style={{ ...s.td, color: C.muted }}>{sc.id}</td>
                  <td style={s.td}>{sc.name}</td>
                  <td style={s.td}><Tag text={sc.type} color="#8b5cf6" /></td>
                  <td style={{ ...s.td, color: C.accent }}>฿{fmt(sc.rateA4)}</td>
                  <td style={{ ...s.td, color: C.accent }}>฿{fmt(sc.rateA3)}</td>
                  <td style={{ ...s.td, color: C.accent }}>฿{fmt(sc.rateA2)}</td>
                  <td style={{ ...s.td, color: C.accent }}>฿{fmt(sc.rateA1)}</td>
                  <td style={{ ...s.td, color: C.muted, fontSize: 11 }}>{sc.note || '—'}</td>
                  <td style={s.td}>
                    <button onClick={() => { setModal("screen"); setForm(sc); }} style={{ ...s.btnGhost, padding: "3px 10px", marginRight: 4 }}>แก้ไข</button>
                    <button onClick={() => del("screen", sc.id)} style={{ ...s.btnGhost, padding: "3px 10px", color: C.err, borderColor: C.err + "50" }}>ลบ</button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={9} style={{ ...s.td, textAlign: 'center', color: C.muted, padding: '24px' }}>ยังไม่มีข้อมูล Screen — กด + เพิ่ม</td></tr>
              )}
            </tbody>
          </table>
          <Pager items={filtered} tabKey="screen" />
          </>); })()}
        </Card>
      )}

      {tab === "supplier" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Supplier</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ImportBtn onImport={importSuppliers} />
              <button style={s.btn()} onClick={() => openAdd("supplier")}>+ เพิ่ม</button>
            </div>
          </div>
          <SearchBar tabKey="supplier" />
          {(() => { const filtered = filterList(data.suppliers, 'supplier'); const paged = pagedList(filtered, 'supplier'); return (<>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Image", "ID", "ชื่อ", "ติดต่อ", "หมวด", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {paged.map(sup => (
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
          <Pager items={filtered} tabKey="supplier" />
          </>); })()}
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
            <Field label="สีผ้า (Color)" half>
              <input style={s.input} placeholder="เช่น White, Navy, Black..." value={form.color || ""} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
            </Field>
            <Field label="ความกว้างผ้า (width_cm)" half>
              <input style={s.input} type="number" placeholder="เช่น 150, 60" value={form.width || ""} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} />
            </Field>
            <Field label="การใช้ผ้า (consumption_kg)" half>
              <input style={s.input} type="number" step="0.01" placeholder="กก./หน่วย" value={form.consumptionKg || ""} onChange={e => setForm(f => ({ ...f, consumptionKg: e.target.value }))} />
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
      {modal === "screen" && (
        <Modal title={form.id ? "แก้ไข Screen" : "เพิ่ม Screen"} onClose={() => setModal(null)}>
          <Row2>
            <Field label="ชื่อ Screen"><input style={s.input} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น Silk A3 Front" /></Field>
            <Field label="ประเภท (Type)">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {["Silk", "DFT", "Discharge", "DTG", "Sublimation"].map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${form.type === t ? "#8b5cf6" : C.border}`, background: form.type === t ? "#8b5cf625" : "transparent", color: form.type === t ? "#8b5cf6" : C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: form.type === t ? 700 : 400 }}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <div style={{ flex: "1 1 100%", marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>อัตราค่าจ้างตามขนาด (฿/ตัว)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                {[["rateA4","A4 (เล็ก)"],["rateA3","A3"],["rateA2","A2"],["rateA1","A1 (ใหญ่)"]].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input style={s.input} type="number" step="0.5" value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder="฿" />
                  </Field>
                ))}
              </div>
            </div>
            <Field label="หมายเหตุ">
              <input style={s.input} value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="รายละเอียดเพิ่มเติม..." />
            </Field>
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

const EMPTY_MAT = () => ({ fabricId: '', consumption: 0, widthCm: null });

function PatternMaster({ data, setData }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ accessories: [], materials: [EMPTY_MAT(), EMPTY_MAT(), EMPTY_MAT()] });

  const openAdd = (p = null) => {
    if (p) {
      const mats = p.materials || [{ fabricId: p.fabricId, consumption: p.fabricPerUnit || 0, widthCm: null }];
      while (mats.length < 3) mats.push(EMPTY_MAT());
      setForm({ ...p, accessories: [...(p.accessories||[])], materials: mats });
    } else {
      setForm({ accessories: [], materials: [EMPTY_MAT(), EMPTY_MAT(), EMPTY_MAT()], laborCut: 12, laborSew: 30, laborQC: 8 });
    }
    setModal(true);
  };

  const addAcc = () => setForm(f => ({ ...f, accessories: [...f.accessories, { accId: data.accessories[0]?.id || "", qtyPerUnit: 1 }] }));
  const removeAcc = (i) => setForm(f => ({ ...f, accessories: f.accessories.filter((_, idx) => idx !== i) }));
  const updateAcc = (i, key, val) => setForm(f => ({ ...f, accessories: f.accessories.map((a, idx) => idx === i ? { ...a, [key]: val } : a) }));
  const updateMat = (i, key, val) => setForm(f => ({ ...f, materials: f.materials.map((m, idx) => idx === i ? { ...m, [key]: val } : m) }));

  const save = () => {
    const id = form.id || genId("P");
    const mats = (form.materials || [EMPTY_MAT()]).map(m => ({ ...m, consumption: parseFloat(m.consumption) || 0, widthCm: m.widthCm ? parseFloat(m.widthCm) : null }));
    const primaryMat = mats.find(m => m.fabricId) || mats[0];
    const pattern = { ...form, id, materials: mats, fabricId: primaryMat?.fabricId || '', fabricPerUnit: primaryMat?.consumption || 0, laborCut: parseFloat(form.laborCut), laborSew: parseFloat(form.laborSew), laborQC: parseFloat(form.laborQC) };
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
            <Field label="Labor ตัด (฿)" half><input style={s.input} type="number" value={form.laborCut || ""} onChange={e => setForm(f => ({ ...f, laborCut: e.target.value }))} /></Field>
            <Field label="Labor เย็บ (฿)" half><input style={s.input} type="number" value={form.laborSew || ""} onChange={e => setForm(f => ({ ...f, laborSew: e.target.value }))} /></Field>
            <Field label="Labor QC (฿)" half><input style={s.input} type="number" value={form.laborQC || ""} onChange={e => setForm(f => ({ ...f, laborQC: e.target.value }))} /></Field>
            <div style={{ flex: "1 1 100%", marginBottom: 0 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>วัสดุผ้า (Mat 1–3)</div>
              {(form.materials || [EMPTY_MAT(), EMPTY_MAT(), EMPTY_MAT()]).map((mat, mi) => (
                <div key={mi} style={{ marginBottom: 10, padding: "10px 12px", background: "#060b16", border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: C.accent2, fontWeight: 700, marginBottom: 8 }}>Mat {mi + 1}{mi === 0 ? " (หลัก)" : " (เสริม)"}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ flex: 2 }}>
                      <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>FABRIC</div>
                      <select style={s.select} value={mat.fabricId || ""} onChange={e => updateMat(mi, "fabricId", e.target.value)}>
                        <option value="">— ไม่ใช้ —</option>
                        {data.fabrics.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>CONSUMPTION ({data.fabrics.find(f => f.id === mat.fabricId)?.unit || "m"})</div>
                      <input style={s.input} type="number" step="0.01" placeholder="0.00" value={mat.consumption || ""} onChange={e => updateMat(mi, "consumption", e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>WIDTH (cm)</div>
                      <input style={s.input} type="number" step="1" placeholder="—" value={mat.widthCm || ""} onChange={e => updateMat(mi, "widthCm", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

// ═══════════════════════════════════════════════════════
// EMPTY SLOT FACTORY
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
// PRODUCT SLOT COMPONENT
// ═══════════════════════════════════════════════════════
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
    const sizes = { male: { ...(slot.sizes?.male||{}) }, female: { ...(slot.sizes?.female||{}) } };
    sizes[gender][size] = parseInt(val) || 0;
    const qty = Object.values(sizes.male).reduce((a,b)=>a+b,0) + Object.values(sizes.female).reduce((a,b)=>a+b,0);
    onChange(idx, { ...slot, sizes, qty: qty > 0 ? String(qty) : slot.qty });
  };

  const lbl = (txt) => <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>{txt}</div>;

  // Order-level pattern banner data
  const orderPat    = orderPatternId ? data.patterns.find(p => p.id === orderPatternId) : null;
  const orderFabric = orderPat?.fabricId ? data.fabrics.find(f => f.id === orderPat.fabricId) : null;
  const orderAccList = (orderPat?.accessories||[]).map(a => {
    const acc = data.accessories.find(x => x.id === a.accId);
    return acc ? { name: acc.name, qty: a.qtyPerUnit, unit: acc.unit } : null;
  }).filter(Boolean);

  // Per-slot pattern picker
  const SLOT_PILLS = [
    { label:"👕 T-Shirt",  key:"T-Shirt" }, { label:"👔 Polo",     key:"Polo" },
    { label:"🎽 Active",   key:"Activewear" }, { label:"👖 Pants",  key:"Pants" },
    { label:"🧥 Jacket",   key:"Jacket" }, { label:"🌐 ทั้งหมด",  key:"" },
  ];
  const byType = slot.patternType
    ? data.patterns.filter(p => (p.patternType||"").toLowerCase().includes(slot.patternType.toLowerCase()))
    : data.patterns;
  const listPats = slotPatSearch.trim()
    ? byType.filter(p => p.name.toLowerCase().includes(slotPatSearch.toLowerCase()))
    : byType;

  return (
    <div style={{ background:"#060b16", border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:10 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1 }}>🧩 รายการที่ {idx+1}</span>
        {idx > 0 && <button onClick={() => onRemove(idx)} style={{ background:"none", border:`1px solid ${C.err}40`, color:C.err, borderRadius:4, padding:"2px 8px", fontSize:11, cursor:"pointer" }}>× ลบ</button>}
      </div>

      {/* Order-level pattern banner */}
      {orderPat && (
        <div style={{ marginBottom:12, padding:"8px 12px", background:C.accent2+"0e", border:`1px solid ${C.accent2}35`, borderRadius:8 }}>
          <div style={{ fontSize:9, color:C.accent2+"99", textTransform:"uppercase", letterSpacing:0.5, marginBottom:5 }}>🔗 Pattern ที่ใช้กับ Order นี้</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, alignItems:"center", marginBottom:(orderFabric||orderAccList.length>0)?7:0 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.accent2 }}>{orderPat.name}</span>
            {orderPat.patternType && <span style={{ fontSize:10, padding:"1px 8px", background:C.accent2+"22", color:C.accent2, borderRadius:10, fontWeight:700 }}>{orderPat.patternType}</span>}
            {orderPat.laborCut>0 && <span style={{ fontSize:10, color:C.sub }}>✂️ ฿{fmt(orderPat.laborCut)}/ตัว</span>}
            {orderPat.laborSew>0 && <span style={{ fontSize:10, color:C.sub }}>🪡 ฿{fmt(orderPat.laborSew)}/ตัว</span>}
            {orderPat.laborQC >0 && <span style={{ fontSize:10, color:C.sub }}>🔍 QC ฿{fmt(orderPat.laborQC)}/ตัว</span>}
          </div>
          {(orderFabric || orderAccList.length>0) && (
            <div style={{ borderTop:`1px solid ${C.accent2}20`, paddingTop:6, display:"flex", flexDirection:"column", gap:4 }}>
              {orderFabric && (
                <div style={{ fontSize:10, color:C.sub }}>
                  🧵 ผ้า: <strong style={{ color:C.text }}>{orderFabric.name}</strong>
                  {orderPat.fabricPerUnit && <span style={{ color:C.muted }}> — {orderPat.fabricPerUnit} ม./ตัว</span>}
                  {orderFabric.costPerUnit ? <span style={{ color:C.muted }}>, ฿{fmt(orderFabric.costPerUnit)}/{orderFabric.unit}</span> : null}
                </div>
              )}
              {orderAccList.length>0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, alignItems:"center" }}>
                  <span style={{ fontSize:9, color:C.muted }}>อุปกรณ์:</span>
                  {orderAccList.map(a => (
                    <span key={a.name} style={{ fontSize:9, padding:"2px 8px", background:C.border+"90", color:C.sub, borderRadius:8, border:`1px solid ${C.border}` }}>{a.name} ×{a.qty} {a.unit}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Row 1: Image + Pattern picker per slot */}
      <div style={{ display:"flex", gap:12, marginBottom:10 }}>
        {/* Image upload */}
        <div style={{ flexShrink:0 }}>
          {lbl("รูปสินค้า")}
          <label style={{ cursor:"pointer" }}>
            <div style={{ width:80, height:80, borderRadius:8, border:`2px dashed ${slot.imagePreview?C.accent:C.border}`, background:slot.imagePreview?"transparent":"#0a1020", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              {slot.imagePreview ? <img src={slot.imagePreview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ fontSize:22, opacity:0.4 }}>📷</span>}
            </div>
            <input type="file" accept="image/*" onChange={handleImage} style={{ display:"none" }} />
          </label>
          {slot.imagePreview && <button onClick={() => onChange(idx, { ...slot, image:null, imagePreview:null })} style={{ marginTop:4, fontSize:9, color:C.err, background:"none", border:"none", cursor:"pointer", width:"100%", textAlign:"center" }}>ลบรูป</button>}
        </div>

        {/* Per-slot Pattern Picker */}
        <div style={{ flex:1 }}>
          {lbl("เลือก Pattern สำหรับรายการนี้")}

          {/* Selected: compact chip */}
          {slot.patternId && (() => {
            const sp    = data.patterns.find(p => p.id === slot.patternId);
            const spFab = sp?.fabricId ? data.fabrics.find(f => f.id === sp.fabricId) : null;
            if (!sp) return null;
            return (
              <div style={{ padding:"7px 10px", background:C.ok+"12", border:`1px solid ${C.ok}40`, borderRadius:7, marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:6 }}>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, alignItems:"center", flex:1 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:C.ok }}>✓ {sp.name}</span>
                    {sp.patternType && <span style={{ fontSize:9, padding:"1px 7px", background:C.ok+"25", color:C.ok, borderRadius:8, fontWeight:700 }}>{sp.patternType}</span>}
                    {sp.laborCut>0 && <span style={{ fontSize:9, color:C.sub }}>✂️฿{fmt(sp.laborCut)}</span>}
                    {sp.laborSew>0 && <span style={{ fontSize:9, color:C.sub }}>🪡฿{fmt(sp.laborSew)}</span>}
                    {spFab && <span style={{ fontSize:9, color:C.muted }}>🧵 {spFab.name}</span>}
                  </div>
                  <button onClick={() => { onChange(idx, { ...slot, patternId:"" }); setSlotPatSearch(""); }}
                    style={{ fontSize:9, color:C.muted, background:"none", border:`1px solid ${C.border}`, borderRadius:4, padding:"2px 7px", cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>เปลี่ยน</button>
                </div>
              </div>
            );
          })()}

          {/* Picker: not selected */}
          {!slot.patternId && (
            <div style={{ marginBottom:6 }}>
              {/* Type pills */}
              <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginBottom:5 }}>
                {SLOT_PILLS.map(pill => {
                  const active = pill.key==="" ? !slot.patternType : (slot.patternType||"").toLowerCase().includes(pill.key.toLowerCase());
                  const cnt = pill.key ? data.patterns.filter(p => (p.patternType||"").toLowerCase().includes(pill.key.toLowerCase())).length : data.patterns.length;
                  return (
                    <button key={pill.key||"all"}
                      onClick={() => onChange(idx, { ...slot, patternType:pill.key, patternId:"" })}
                      style={{ padding:"3px 9px", fontSize:10, borderRadius:16, fontFamily:"inherit", cursor:"pointer", border:`1px solid ${active?C.accent:C.border}`, background:active?C.accent+"25":"transparent", color:active?C.accent:C.muted, fontWeight:active?700:400 }}>
                      {pill.label} <span style={{ fontSize:8 }}>({cnt})</span>
                    </button>
                  );
                })}
              </div>
              {/* Search */}
              <div style={{ position:"relative", marginBottom:5 }}>
                <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", fontSize:11, color:C.muted, pointerEvents:"none" }}>🔍</span>
                <input style={{ ...s.input, paddingLeft:26, fontSize:11, padding:"5px 8px 5px 26px" }} value={slotPatSearch} onChange={e => setSlotPatSearch(e.target.value)} placeholder="ค้นหา Pattern..." />
                {slotPatSearch && <button onClick={() => setSlotPatSearch("")} style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13 }}>×</button>}
              </div>
              {/* Card list */}
              {listPats.length === 0 ? (
                <div style={{ fontSize:10, color:C.muted, padding:"6px 10px", textAlign:"center", background:C.card, border:`1px dashed ${C.border}`, borderRadius:6 }}>ไม่พบ Pattern</div>
              ) : (
                <div style={{ maxHeight:160, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
                  {listPats.map(p => {
                    const fab = p.fabricId ? data.fabrics.find(f => f.id === p.fabricId) : null;
                    const accList = (p.accessories||[]).map(a => { const acc = data.accessories.find(x => x.id === a.accId); return acc?`${acc.name}×${a.qtyPerUnit}`:null; }).filter(Boolean);
                    return (
                      <div key={p.id}
                        onClick={() => { onChange(idx, { ...slot, patternId:p.id, patternType:p.patternType||slot.patternType }); setSlotPatSearch(""); }}
                        style={{ padding:"7px 10px", borderRadius:7, cursor:"pointer", border:`1px solid ${C.border}`, background:"#080d18" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent+"80"; e.currentTarget.style.background=C.accent+"08"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background="#080d18"; }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:(fab||accList.length)?3:0 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:C.text, flex:1 }}>{p.name}</span>
                          {p.patternType && <span style={{ fontSize:9, padding:"1px 6px", background:C.border+"80", color:C.sub, borderRadius:8 }}>{p.patternType}</span>}
                        </div>
                        {(fab||p.laborCut>0||p.laborSew>0) && (
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            {fab && <span style={{ fontSize:9, color:C.muted }}>🧵 {fab.name}{p.fabricPerUnit?` ${p.fabricPerUnit}ม/ตัว`:""}</span>}
                            {p.laborCut>0 && <span style={{ fontSize:9, color:C.muted }}>✂️฿{fmt(p.laborCut)}</span>}
                            {p.laborSew>0 && <span style={{ fontSize:9, color:C.muted }}>🪡฿{fmt(p.laborSew)}</span>}
                          </div>
                        )}
                        {accList.length>0 && <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginTop:3 }}>{accList.map(a => <span key={a} style={{ fontSize:8, padding:"1px 5px", background:C.border, color:C.muted, borderRadius:6 }}>{a}</span>)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Qty */}
          <div style={{ marginTop:6 }}>
            {lbl("จำนวนรวม (ตัว)")}
            <input style={s.input} type="number" placeholder="0" value={slot.qty} onChange={e => onChange(idx, { ...slot, qty:e.target.value })} />
          </div>
        </div>
      </div>

      {/* Row 2: Color swatches */}
      <div style={{ marginBottom:10 }}>
        {lbl("🎨 สี (เลือกได้หลายสี)")}
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:6 }}>
          {PRESET_COLORS.map(c => {
            const selected = (slot.colors||[]).includes(c.name);
            return (
              <button key={c.name} title={c.name} onClick={() => toggleColor(c.name)} style={{ width:26, height:26, borderRadius:"50%", border:selected?`3px solid ${C.accent}`:`2px solid ${C.border}`, background:c.hex, cursor:"pointer", position:"relative", flexShrink:0, boxShadow:selected?`0 0 6px ${C.accent}`:"none" }}>
                {selected && <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:c.hex==="#f5f5f5"?"#333":"#fff", fontWeight:900 }}>✓</span>}
              </button>
            );
          })}
        </div>
        {(slot.colors||[]).length>0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
            {(slot.colors||[]).map(c => { const col = PRESET_COLORS.find(x => x.name===c); return <span key={c} style={{ padding:"2px 8px", borderRadius:10, background:col?.hex+"30", border:`1px solid ${col?.hex}60`, fontSize:10, color:C.text }}>{c}</span>; })}
          </div>
        )}
        <input style={{ ...s.input, fontSize:11 }} placeholder="หมายเหตุสี เช่น Pantone 286C..." value={slot.colorNote||""} onChange={e => onChange(idx, { ...slot, colorNote:e.target.value })} />
      </div>

      {/* Row 3: Size table Male/Female */}
      <div style={{ marginBottom:10 }}>
        {lbl("📐 ไซส์ (แยกชาย / หญิง)")}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr>
                <th style={{ ...s.th, width:60 }}>Gender</th>
                {SIZES.map(sz => <th key={sz} style={{ ...s.th, textAlign:"center", minWidth:42 }}>{sz}</th>)}
                <th style={{ ...s.th, textAlign:"center", color:C.accent }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {["male","female"].map(gender => {
                const gLabel = gender==="male" ? "👔 ชาย" : "👗 หญิง";
                const gSizes = slot.sizes?.[gender] || {};
                const gTotal = SIZES.reduce((sum,sz) => sum+(gSizes[sz]||0), 0);
                return (
                  <tr key={gender}>
                    <td style={{ ...s.td, color:gender==="male"?C.accent2:"#ec4899", fontWeight:700, fontSize:10 }}>{gLabel}</td>
                    {SIZES.map(sz => (
                      <td key={sz} style={{ ...s.td, padding:"4px" }}>
                        <input type="number" min="0" value={gSizes[sz]||""}
                          onChange={e => updateSize(gender, sz, e.target.value)}
                          style={{ width:"100%", padding:"4px", background:"#080d18", border:`1px solid ${C.border}`, borderRadius:4, color:C.text, textAlign:"center", fontSize:11, outline:"none", boxSizing:"border-box" }} />
                      </td>
                    ))}
                    <td style={{ ...s.td, textAlign:"center", fontWeight:700, color:C.accent }}>{gTotal||"—"}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ ...s.td, color:C.muted, fontSize:10, fontWeight:700 }}>รวม</td>
                {SIZES.map(sz => {
                  const total = (slot.sizes?.male?.[sz]||0)+(slot.sizes?.female?.[sz]||0);
                  return <td key={sz} style={{ ...s.td, textAlign:"center", fontWeight:700, color:total>0?C.ok:C.muted, fontSize:11 }}>{total||"—"}</td>;
                })}
                <td style={{ ...s.td, textAlign:"center", fontWeight:700, color:C.accent }}>
                  {SIZES.reduce((sum,sz)=>(slot.sizes?.male?.[sz]||0)+(slot.sizes?.female?.[sz]||0)+sum,0)||"—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Fabric + Print/EMB */}
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <div style={{ flex:2 }}>
          {lbl("🧵 เนื้อผ้า (Fabric Type)")}
          <select style={s.select} value={slot.fabricType||""} onChange={e => onChange(idx, { ...slot, fabricType:e.target.value })}>
            <option value="">— เลือกเนื้อผ้า —</option>
            {FABRIC_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            {data.fabrics.map(f => <option key={f.id} value={f.name}>{f.name} (Master)</option>)}
          </select>
        </div>
        <div style={{ flex:1 }}>
          {lbl("Print / EMB")}
          <select style={s.select} value={slot.printTypeId} onChange={e => onChange(idx, { ...slot, printTypeId:e.target.value })}>
            {data.printTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Row 5: Spec file */}
      <div style={{ marginBottom:10 }}>
        {lbl("📎 แนบไฟล์ Spec / ใบสั่งผลิต")}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <label style={{ cursor:"pointer" }}>
            <div style={{ padding:"7px 14px", background:"#0a1020", border:`1px dashed ${slot.specFile?C.ok:C.border}`, borderRadius:6, fontSize:11, color:slot.specFile?C.ok:C.muted, display:"flex", alignItems:"center", gap:6 }}>
              📎 {slot.specFileName || "เลือกไฟล์ (PDF, Image, Word)"}
            </div>
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={handleSpec} style={{ display:"none" }} />
          </label>
          {slot.specFile && <button onClick={() => onChange(idx, { ...slot, specFile:null, specFileName:"" })} style={{ ...s.btnGhost, padding:"4px 10px", fontSize:11, color:C.err, borderColor:C.err+"50" }}>× ลบ</button>}
        </div>
        {slot.specFile && slot.specFileName?.match(/\.(jpg|jpeg|png|webp)$/i) && (
          <img src={slot.specFile} alt="spec" style={{ marginTop:6, maxHeight:80, borderRadius:6, border:`1px solid ${C.border}` }} />
        )}
      </div>

      {/* Row 6: Note */}
      <div>
        {lbl("📝 หมายเหตุรายการนี้")}
        <input style={{ ...s.input, borderColor:slot.slotNote?C.accent+"60":C.border }}
          placeholder="เช่น ปักโลโก้ด้านหน้า, สกรีนหลัง, บุซับใน..."
          value={slot.slotNote||""} onChange={e => onChange(idx, { ...slot, slotNote:e.target.value })} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ORDER DETAIL VIEW MODAL
// ═══════════════════════════════════════════════════════
function OrderDetailModal({ order, data, onClose }) {
  const statusColor = (st) => ({ draft:C.muted, confirmed:C.accent2, production:C.ok, done:"#22c55e", cancelled:C.err }[st]||C.muted);
  const realSlots = (order.slots||[]).filter(sl => !sl._meta);
  const totalQty  = realSlots.reduce((s,sl) => s+(parseInt(sl.qty)||0), 0);
  const metaSlot  = (order.slots||[]).find(sl => sl._meta);

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex", alignItems:"flex-start", justifyContent:"center", zIndex:1100, padding:16, overflowY:"auto" }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, width:"100%", maxWidth:700, marginTop:20, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:`1px solid ${C.border}`, background:"#0a1020", borderRadius:"14px 14px 0 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontWeight:800, color:C.accent, fontSize:16 }}>{order.id}</span>
            <Tag text={order.status} color={statusColor(order.status)} />
            {metaSlot?.pricingMode==="cmt" && <Tag text="📐 CMT" color={C.ok} />}
            {metaSlot?.pricingMode==="fob" && <Tag text="📦 FOB" color={C.accent2} />}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:22 }}>×</button>
        </div>
        <div style={{ padding:20 }}>
          {/* Order summary */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
            {[["ลูกค้า", order.customer], ["วันที่", order.date], ["Qty รวม", totalQty.toLocaleString()+" ตัว"]].map(([k,v]) => (
              <div key={k} style={{ background:"#060b16", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:0.5 }}>{k}</div>
                <div style={{ fontSize:14, fontWeight:700, color:C.accent, marginTop:3 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* SKU Ref */}
          {metaSlot?.skuRef && (
            <div style={{ marginBottom:12, padding:"8px 12px", background:C.accent2+"10", border:`1px solid ${C.accent2}35`, borderRadius:8 }}>
              <div style={{ fontSize:9, color:C.accent2, textTransform:"uppercase", marginBottom:3 }}>SKU Reference</div>
              <div style={{ fontSize:12, color:C.text }}>{metaSlot.skuRef}</div>
            </div>
          )}

          {/* Special Notice */}
          {order.specialNotice && (
            <div style={{ background:"#7f1d1d20", border:`1px solid ${C.err}40`, borderRadius:8, padding:"12px 14px", marginBottom:16 }}>
              <div style={{ fontSize:10, color:C.err, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>⚠️ หมายเหตุพิเศษ</div>
              <div style={{ fontSize:13, color:C.text }}>{order.specialNotice}</div>
            </div>
          )}

          {/* Product Slots */}
          <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:10 }}>รายการสินค้า ({realSlots.length} รายการ)</div>
          {realSlots.map((slot, i) => {
            const pat = data.patterns.find(p => p.id === slot.patternId);
            const pt  = data.printTypes.find(p => p.id === slot.printTypeId);
            const hasSizes = SIZES.some(sz => (slot.sizes?.male?.[sz]||0)+(slot.sizes?.female?.[sz]||0)>0);
            return (
              <div key={i} style={{ background:"#060b16", border:`1px solid ${C.border}`, borderRadius:10, padding:12, marginBottom:8 }}>
                <div style={{ display:"flex", gap:12, marginBottom:8 }}>
                  {slot.imagePreview
                    ? <img src={slot.imagePreview} alt="" style={{ width:64, height:64, objectFit:"cover", borderRadius:6, flexShrink:0 }} />
                    : <div style={{ width:64, height:64, background:C.border, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>👕</div>}
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                      <div>
                        <span style={{ fontWeight:700, color:C.text, fontSize:13 }}>{pat?.name||"— ยังไม่เลือก Pattern —"}</span>
                        {slot.patternType && <span style={{ marginLeft:8, padding:"1px 8px", borderRadius:10, background:C.accent+"20", border:`1px solid ${C.accent}50`, fontSize:10, color:C.accent }}>{slot.patternType}</span>}
                      </div>
                      <span style={{ fontWeight:700, color:C.accent, fontSize:15, flexShrink:0 }}>{parseInt(slot.qty)||0} ตัว</span>
                    </div>
                    <div style={{ fontSize:11, color:C.sub }}>
                      {slot.fabricType && <span style={{ marginRight:8 }}>🧵 {slot.fabricType}</span>}
                      {pt?.name && pt.name!=="None" && <span>🖨 {pt.name}</span>}
                    </div>
                  </div>
                </div>
                {/* Colors */}
                {(slot.colors||[]).length>0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, flexWrap:"wrap" }}>
                    <span style={{ fontSize:10, color:C.muted }}>🎨 สี:</span>
                    {(slot.colors||[]).map(c => {
                      const col = PRESET_COLORS.find(x => x.name===c);
                      return <span key={c} title={c} style={{ width:16, height:16, borderRadius:"50%", background:col?.hex||"#888", border:`1px solid ${C.border}`, display:"inline-block" }} />;
                    })}
                    {slot.colorNote && <span style={{ fontSize:10, color:C.sub }}>({slot.colorNote})</span>}
                  </div>
                )}
                {/* Size table */}
                {hasSizes && (
                  <div style={{ overflowX:"auto", marginBottom:6 }}>
                    <table style={{ borderCollapse:"collapse", fontSize:10, minWidth:400 }}>
                      <thead>
                        <tr>
                          <th style={{ ...s.th, padding:"4px 8px", fontSize:9 }}>Gender</th>
                          {SIZES.map(sz => <th key={sz} style={{ ...s.th, padding:"4px 6px", textAlign:"center", fontSize:9 }}>{sz}</th>)}
                          <th style={{ ...s.th, padding:"4px 8px", textAlign:"center", fontSize:9, color:C.accent }}>รวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[["male","👔 ชาย",C.accent2],["female","👗 หญิง","#ec4899"]].map(([g,lbl,clr]) => {
                          const gSizes = slot.sizes?.[g]||{};
                          const tot = SIZES.reduce((s,sz)=>s+(gSizes[sz]||0),0);
                          if (!tot) return null;
                          return (
                            <tr key={g}>
                              <td style={{ ...s.td, padding:"3px 8px", color:clr, fontWeight:700, fontSize:10 }}>{lbl}</td>
                              {SIZES.map(sz => <td key={sz} style={{ ...s.td, padding:"3px 6px", textAlign:"center", color:gSizes[sz]?C.text:C.muted }}>{gSizes[sz]||"—"}</td>)}
                              <td style={{ ...s.td, padding:"3px 8px", textAlign:"center", fontWeight:700, color:C.accent }}>{tot}</td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td style={{ ...s.td, padding:"3px 8px", color:C.muted, fontSize:10 }}>รวม</td>
                          {SIZES.map(sz => { const tot=(slot.sizes?.male?.[sz]||0)+(slot.sizes?.female?.[sz]||0); return <td key={sz} style={{ ...s.td, padding:"3px 6px", textAlign:"center", fontWeight:700, color:tot?C.ok:C.muted }}>{tot||"—"}</td>; })}
                          <td style={{ ...s.td, padding:"3px 8px", textAlign:"center", fontWeight:700, color:C.accent }}>{SIZES.reduce((s,sz)=>(slot.sizes?.male?.[sz]||0)+(slot.sizes?.female?.[sz]||0)+s,0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {slot.specFileName && <span style={{ fontSize:10, color:C.ok, background:C.ok+"15", borderRadius:4, padding:"2px 8px" }}>📎 {slot.specFileName}</span>}
                  {slot.slotNote && <span style={{ fontSize:11, color:C.accent, background:C.accent+"12", borderRadius:4, padding:"3px 7px" }}>📝 {slot.slotNote}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ORDER MODULE — MAIN
// ═══════════════════════════════════════════════════════
function OrderModule({ data, setData }) {
  const [modal, setModal]       = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [form, setForm]         = useState({});
  const [slots, setSlots]       = useState([EMPTY_SLOT()]);
  const [activeTab, setActiveTab] = useState("info");
  const [patTypeFilter, setPatTypeFilter] = useState("");
  const [patSearch, setPatSearch] = useState("");

  const statusColor = (st) => ({ draft:C.muted, confirmed:C.accent2, production:C.ok, done:"#22c55e", cancelled:C.err }[st]||C.muted);

  const customerOptions = useMemo(() => {
    const fromItems  = PRIMER_ITEMS_V3.map(i => i.customer).filter(Boolean);
    const fromOrders = data.orders.map(o => o.customer).filter(Boolean);
    return [...new Set([...fromOrders, ...fromItems])].sort();
  }, [data.orders]);

  const skuOptions = useMemo(() =>
    PRIMER_ITEMS_V3.map(i => { const p=[i.name]; if(i.newSku) p.push(`[${i.newSku}]`); if(i.code) p.push(`(${i.code})`); return p.join("  "); }),
  []);

  const openAdd = (o=null) => {
    if (o) {
      const rawSlots   = o.slots||[];
      const metaSlot   = rawSlots.find(sl => sl._meta);
      const actualSlots = rawSlots.filter(sl => !sl._meta);
      setForm({
        ...o,
        pricingMode:    metaSlot?.pricingMode    || "fob",
        cuttingFee:     metaSlot?.cuttingFee     || "",
        sewingFee:      metaSlot?.sewingFee      || "",
        accessoriesFee: metaSlot?.accessoriesFee || "",
        adminFee:       metaSlot?.adminFee       || "",
        freightCost:    metaSlot?.freightCost    || "",
        fobCuttingFee:  metaSlot?.fobCuttingFee  || "",
        fobSewingFee:   metaSlot?.fobSewingFee   || "",
        fobFreightCost: metaSlot?.fobFreightCost || "",
        fobOtherCost:   metaSlot?.fobOtherCost   || "",
        fobUsePattern:  metaSlot?.fobUsePattern  !== false,
        skuRef:         metaSlot?.skuRef         || "",
      });
      setSlots(actualSlots.length>0 ? actualSlots : [EMPTY_SLOT()]);
    } else {
      setForm({ date:new Date().toISOString().slice(0,10), status:"draft", pricingMode:"fob" });
      setSlots([EMPTY_SLOT()]);
    }
    setActiveTab("info");
    setPatTypeFilter("");
    setPatSearch("");
    setModal(true);
  };

  const save = () => {
    const id = form.id || ("SO-"+Date.now().toString().slice(-4));
    const actualSlots = slots.filter(sl => !sl._meta);
    const totalQty = actualSlots.reduce((s,sl) => s+(parseInt(sl.qty)||0), 0);
    const primarySlot = actualSlots[0]||{};
    const pricingMeta = {
      _meta:true,
      pricingMode:    form.pricingMode    || "fob",
      cuttingFee:     parseFloat(form.cuttingFee)     || 0,
      sewingFee:      parseFloat(form.sewingFee)      || 0,
      accessoriesFee: parseFloat(form.accessoriesFee) || 0,
      adminFee:       parseFloat(form.adminFee)       || 0,
      freightCost:    parseFloat(form.freightCost)    || 0,
      fobCuttingFee:  parseFloat(form.fobCuttingFee)  || 0,
      fobSewingFee:   parseFloat(form.fobSewingFee)   || 0,
      fobFreightCost: parseFloat(form.fobFreightCost) || 0,
      fobOtherCost:   parseFloat(form.fobOtherCost)   || 0,
      fobUsePattern:  form.fobUsePattern !== false,
      skuRef:         form.skuRef || "",
    };
    const order = {
      ...form, id, qty:totalQty,
      patternId:   form.patternId || data.patterns[0]?.id,
      printTypeId: primarySlot.printTypeId || form.printTypeId || "PT001",
      targetPrice: parseFloat(form.targetPrice) || 0,
      slots:       [pricingMeta, ...actualSlots],
      specialNotice: form.specialNotice || "",
    };
    setData(d => ({ ...d, orders:[...d.orders.filter(o => o.id!==id), order] }));
    setModal(false);
  };

  const del = (id) => setData(d => ({ ...d, orders:d.orders.filter(o => o.id!==id) }));
  const updateSlot  = (idx, updated) => setSlots(sl => sl.map((s,i) => i===idx ? updated : s));
  const removeSlot  = (idx) => setSlots(sl => sl.filter((_,i) => i!==idx));
  const addSlot     = () => setSlots(sl => [...sl, EMPTY_SLOT()]);

  const actualSlots = slots.filter(sl => !sl._meta);
  const totalSlotsQty = actualSlots.reduce((s,sl) => s+(parseInt(sl.qty)||0), 0);

  // Pattern filter
  const byType  = patTypeFilter ? data.patterns.filter(p => (p.patternType||"").toLowerCase().includes(patTypeFilter.toLowerCase())) : data.patterns;
  const listPats = patSearch.trim() ? byType.filter(p => p.name.toLowerCase().includes(patSearch.toLowerCase())) : byType;

  const TYPE_PILLS = [
    { label:"👕 T-Shirt", key:"T-Shirt" }, { label:"👔 Polo", key:"Polo" },
    { label:"🎽 Activewear", key:"Activewear" }, { label:"👖 Pants", key:"Pants" },
    { label:"🧥 Jacket", key:"Jacket" }, { label:"🌐 ทั้งหมด", key:"" },
  ];

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'JetBrains Mono','Courier New',monospace", color:C.text, padding:24 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:C.accent, letterSpacing:1 }}>📋 ORDER MODULE</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>จัดการคำสั่งผลิต · FOB / CMT · Pattern Picker · Size Breakdown</div>
        </div>
        <button style={s.btn()} onClick={() => openAdd()}>+ สร้าง Order</button>
      </div>

      {/* Order Table */}
      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
            <thead>
              <tr>{["ID","ลูกค้า","รายการ","Qty","ราคาเป้า","วันที่","Status",""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.orders.length===0 && <tr><td colSpan={8} style={{ ...s.td, textAlign:"center", color:C.muted, padding:32 }}>ยังไม่มี Order — กดสร้าง Order ด้านบน</td></tr>}
              {data.orders.map(o => (
                <tr key={o.id}>
                  <td style={{ ...s.td, color:C.accent, fontWeight:700 }}>{o.id}</td>
                  <td style={s.td}>{o.customer}</td>
                  <td style={{ ...s.td, color:C.sub }}>
                    {(() => {
                      const meta = (o.slots||[]).find(sl => sl._meta);
                      const realSlots = (o.slots||[]).filter(sl => !sl._meta);
                      return realSlots.length>0 ? (
                        <span>
                          {realSlots.length} รายการ
                          {meta?.pricingMode==="cmt" && <span style={{ marginLeft:5, fontSize:9, background:C.ok+"25", color:C.ok, borderRadius:3, padding:"1px 5px" }}>📐 CMT</span>}
                          {meta?.pricingMode==="fob" && <span style={{ marginLeft:5, fontSize:9, background:C.accent2+"25", color:C.accent2, borderRadius:3, padding:"1px 5px" }}>📦 FOB</span>}
                          {o.slots?.some(sl => sl.imagePreview) ? " 📷" : ""}
                          {o.specialNotice ? " ⚠️" : ""}
                        </span>
                      ) : <span style={{ color:C.muted }}>—</span>;
                    })()}
                  </td>
                  <td style={{ ...s.td, color:C.accent, fontWeight:700 }}>{o.qty?.toLocaleString()} ตัว</td>
                  <td style={s.td}>{o.targetPrice ? `฿${fmt(o.targetPrice)}` : "-"}</td>
                  <td style={{ ...s.td, color:C.muted }}>{o.date}</td>
                  <td style={s.td}><Tag text={o.status} color={statusColor(o.status)} /></td>
                  <td style={s.td}>
                    <button onClick={() => setViewModal(o)} style={{ ...s.btnGhost, padding:"3px 8px", marginRight:4, fontSize:11 }}>👁 ดู</button>
                    <button onClick={() => openAdd(o)}      style={{ ...s.btnGhost, padding:"3px 8px", marginRight:4, fontSize:11 }}>แก้</button>
                    <button onClick={() => del(o.id)}       style={{ ...s.btnGhost, padding:"3px 8px", color:C.err, borderColor:C.err+"50", fontSize:11 }}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ══ CREATE / EDIT MODAL ══ */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"#000c", display:"flex", alignItems:"flex-start", justifyContent:"center", zIndex:1000, padding:16, overflowY:"auto" }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, width:"100%", maxWidth:640, marginTop:20, marginBottom:20 }}>
            {/* Modal Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:`1px solid ${C.border}`, background:"#0a1020", borderRadius:"14px 14px 0 0", position:"sticky", top:0, zIndex:1 }}>
              <span style={{ fontWeight:700, color:C.accent, fontSize:15 }}>{form.id?`แก้ไข ${form.id}`:"สร้าง Order ใหม่"}</span>
              <button onClick={() => setModal(false)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:22 }}>×</button>
            </div>

            {/* Pricing Mode Selector */}
            <div style={{ padding:"12px 20px", background:"#060b16", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>ประเภทการคิดต้นทุน / Pricing Mode</div>
              <div style={{ display:"flex", gap:8 }}>
                {[
                  { id:"fob", icon:"📦", label:"FOB",  sub:"Fabric + Labor + Accessories", color:C.accent2 },
                  { id:"cmt", icon:"📐", label:"CMT",  sub:"ค่าตัด + ค่าเย็บ + Accessories + ค่าดำเนินการ + ค่าขนส่ง", color:C.ok },
                ].map(m => {
                  const active = (form.pricingMode||"fob") === m.id;
                  return (
                    <button key={m.id} onClick={() => setForm(f => ({ ...f, pricingMode:m.id }))} style={{ flex:1, padding:"10px 14px", background:active?m.color+"20":C.card, border:`2px solid ${active?m.color:C.border}`, borderRadius:8, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:active?m.color:C.muted }}>
                        {m.icon} {m.label}
                        {active && <span style={{ marginLeft:6, fontSize:9, background:m.color, color:"#000", borderRadius:3, padding:"1px 5px" }}>ACTIVE</span>}
                      </div>
                      <div style={{ fontSize:10, color:active?m.color+"cc":C.muted, marginTop:3 }}>{m.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
              {[["info","📋 Order Info"], ["slots",`🧩 รายการ (${actualSlots.length})`], ["notice","⚠️ หมายเหตุ"]].map(([id,label]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{ flex:1, padding:"12px 8px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:11, fontWeight:600, color:activeTab===id?C.accent:C.muted, borderBottom:activeTab===id?`2px solid ${C.accent}`:"2px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding:20 }}>
              {/* ── TAB: INFO ── */}
              {activeTab==="info" && (
                <div>
                  {/* Pattern Card Selector */}
                  <div style={{ marginBottom:16, padding:"14px 16px", background:C.accent+"09", border:`1px solid ${C.accent}35`, borderRadius:10 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:C.accent }}>📦 Pattern / SKU (Order Level)</span>
                      {form.patternId && <button style={{ fontSize:10, color:C.muted, background:"none", border:`1px solid ${C.border}`, borderRadius:5, cursor:"pointer", padding:"2px 8px", fontFamily:"inherit" }} onClick={() => setForm(f => ({ ...f, patternId:"" }))}>✕ ล้าง</button>}
                    </div>
                    {/* Type pills */}
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                      {TYPE_PILLS.map(pill => {
                        const active = patTypeFilter===pill.key;
                        const cnt = pill.key ? data.patterns.filter(p => (p.patternType||"").toLowerCase().includes(pill.key.toLowerCase())).length : data.patterns.length;
                        return (
                          <button key={pill.key||"all"}
                            onClick={() => { setPatTypeFilter(pill.key); setPatSearch(""); }}
                            style={{ padding:"5px 13px", fontSize:11, borderRadius:20, fontFamily:"inherit", cursor:"pointer", border:`1px solid ${active?C.accent:C.border}`, background:active?C.accent+"28":C.card, color:active?C.accent:C.sub, fontWeight:active?700:400 }}>
                            {pill.label} <span style={{ marginLeft:5, fontSize:9, color:active?C.accent+"bb":C.muted }}>({cnt})</span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Search */}
                    <div style={{ position:"relative", marginBottom:8 }}>
                      <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:C.muted, pointerEvents:"none" }}>🔍</span>
                      <input style={{ ...s.input, paddingLeft:32, fontSize:12 }} value={patSearch} onChange={e => setPatSearch(e.target.value)} placeholder={patTypeFilter?`ค้นหาใน ${patTypeFilter}...`:"ค้นหาชื่อ Pattern..."} />
                      {patSearch && <button onClick={() => setPatSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14 }}>×</button>}
                    </div>
                    {/* Scrollable cards */}
                    {data.patterns.length===0 ? (
                      <div style={{ fontSize:11, color:"#f59e0b", padding:"10px 12px", background:"#f59e0b12", border:"1px solid #f59e0b30", borderRadius:7 }}>⚡ ยังไม่มี Pattern</div>
                    ) : listPats.length===0 ? (
                      <div style={{ fontSize:11, color:C.muted, padding:"10px 12px", background:C.card, border:`1px dashed ${C.border}`, borderRadius:7, textAlign:"center" }}>ไม่พบ Pattern ที่ตรงกับเงื่อนไข</div>
                    ) : (
                      <div style={{ maxHeight:240, overflowY:"auto", display:"flex", flexDirection:"column", gap:6, paddingRight:2 }}>
                        {listPats.map(p => {
                          const isSelected = form.patternId===p.id;
                          const fab = p.fabricId ? data.fabrics.find(f => f.id===p.fabricId) : null;
                          const accList = (p.accessories||[]).map(a => { const acc=data.accessories.find(x=>x.id===a.accId); return acc?`${acc.name} ×${a.qtyPerUnit}`:null; }).filter(Boolean);
                          return (
                            <div key={p.id}
                              onClick={() => setForm(f => ({ ...f, patternId:p.id }))}
                              style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer", border:`1px solid ${isSelected?C.accent:C.border}`, background:isSelected?C.accent+"18":"#080d18", outline:isSelected?`1px solid ${C.accent}50`:"none" }}
                              onMouseEnter={e => { if(!isSelected) e.currentTarget.style.borderColor=C.accent+"60"; }}
                              onMouseLeave={e => { if(!isSelected) e.currentTarget.style.borderColor=C.border; }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:(fab||accList.length)?6:0 }}>
                                {isSelected && <span style={{ fontSize:12, color:C.accent }}>✓</span>}
                                <span style={{ fontSize:12, fontWeight:700, color:isSelected?C.accent:C.text, flex:1 }}>{p.name}</span>
                                {p.patternType && <span style={{ fontSize:9, padding:"2px 8px", background:isSelected?C.accent+"30":C.border+"80", color:isSelected?C.accent:C.sub, borderRadius:10, fontWeight:700 }}>{p.patternType}</span>}
                              </div>
                              {(fab||p.laborCut>0||p.laborSew>0||p.laborQC>0) && (
                                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:accList.length?5:0 }}>
                                  {fab && <span style={{ fontSize:10, color:C.sub }}>🧵 {fab.name}{p.fabricPerUnit?` ${p.fabricPerUnit}ม/ตัว`:""}</span>}
                                  {p.laborCut>0 && <span style={{ fontSize:10, color:C.sub }}>✂️ ฿{fmt(p.laborCut)}</span>}
                                  {p.laborSew>0 && <span style={{ fontSize:10, color:C.sub }}>🪡 ฿{fmt(p.laborSew)}</span>}
                                  {p.laborQC >0 && <span style={{ fontSize:10, color:C.sub }}>🔍 ฿{fmt(p.laborQC)}</span>}
                                </div>
                              )}
                              {accList.length>0 && <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>{accList.map(a => <span key={a} style={{ fontSize:9, padding:"1px 7px", background:C.border+"90", color:C.muted, borderRadius:8 }}>{a}</span>)}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ marginTop:7, fontSize:9, color:C.muted }}>{listPats.length} / {data.patterns.length} Pattern{patTypeFilter?` — ${patTypeFilter}`:""}{patSearch?` — "${patSearch}"`:""}</div>
                  </div>

                  <Row2>
                    <Field label="ชื่อลูกค้า">
                      <AutocompleteInput value={form.customer||""} onChange={val => setForm(f => ({ ...f, customer:val }))} options={customerOptions} placeholder="พิมพ์ชื่อลูกค้า หรือเลือกจากรายการ..." />
                    </Field>
                    {/* SKU Reference */}
                    <Field label="ชื่อสินค้า / รหัส / โค้ด">
                      <AutocompleteInput value={form.skuRef||""} onChange={val => setForm(f => ({ ...f, skuRef:val }))} options={skuOptions} placeholder="ค้นหาด้วย ชื่อสินค้า, รหัส SKU, โค้ด P/T..." />
                      {form.skuRef && (() => {
                        const raw  = form.skuRef.replace(/\s+\[.*\].*$/, "").trim();
                        const item = PRIMER_ITEMS_V3.find(i => i.name===raw);
                        if (!item) return null;
                        return (
                          <div style={{ marginTop:5, padding:"6px 10px", background:C.accent2+"10", border:`1px solid ${C.accent2}35`, borderRadius:7 }}>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
                              <span style={{ fontSize:11, fontWeight:700, color:C.accent2 }}>{item.name}</span>
                              {item.newSku && <span style={{ fontSize:9, padding:"1px 7px", background:C.accent2+"22", color:C.accent2, borderRadius:8, fontWeight:700 }}>{item.newSku}</span>}
                              {item.code && <span style={{ fontSize:9, color:C.muted }}>PT: {item.code}</span>}
                              {item.fabricType && <span style={{ fontSize:9, color:C.sub }}>🧵 {item.fabricType}</span>}
                              {item.gender && <span style={{ fontSize:9, color:C.sub }}>{item.gender==="M"?"👔 ชาย":item.gender==="F"?"👗 หญิง":item.gender}</span>}
                              {item.customer && <span style={{ fontSize:9, color:C.muted }}>👤 {item.customer}</span>}
                            </div>
                            {(item.cost||item.factoryPrice||item.sellPrice) && (
                              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                                {item.cost         && <span style={{ fontSize:9, color:C.sub }}>ต้นทุน: ฿{fmt(item.cost)}</span>}
                                {item.factoryPrice && <span style={{ fontSize:9, color:C.sub }}>Factory: ฿{fmt(item.factoryPrice)}</span>}
                                {item.sellPrice    && <span style={{ fontSize:9, color:C.ok }}>ขาย: ฿{fmt(item.sellPrice)}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </Field>
                    <Field label="ราคาเป้าหมาย/ตัว (optional)" half><input style={s.input} type="number" value={form.targetPrice||""} onChange={e => setForm(f => ({ ...f, targetPrice:e.target.value }))} placeholder="฿" /></Field>
                    <Field label="วันที่สั่ง" half><input style={s.input} type="date" value={form.date||""} onChange={e => setForm(f => ({ ...f, date:e.target.value }))} /></Field>
                    <Field label="กำหนดส่ง" half><input style={s.input} type="date" value={form.dueDate||""} onChange={e => setForm(f => ({ ...f, dueDate:e.target.value }))} /></Field>
                    <Field label="Status" half>
                      <select style={s.select} value={form.status||"draft"} onChange={e => setForm(f => ({ ...f, status:e.target.value }))}>
                        <option value="draft">ร่าง</option><option value="confirmed">ยืนยันแล้ว</option><option value="production">กำลังผลิต</option><option value="done">เสร็จสิ้น</option><option value="cancelled">ยกเลิก</option>
                      </select>
                    </Field>
                    <Field label="ช่องทาง" half>
                      <select style={s.select} value={form.channel||""} onChange={e => setForm(f => ({ ...f, channel:e.target.value }))}>
                        <option value="">— เลือก —</option><option value="direct">Direct</option><option value="line">LINE</option><option value="email">Email</option><option value="phone">โทรศัพท์</option>
                      </select>
                    </Field>
                    <Field label="เบอร์ติดต่อ / Line ID" half><input style={s.input} value={form.contact||""} onChange={e => setForm(f => ({ ...f, contact:e.target.value }))} placeholder="081-xxx-xxxx" /></Field>
                  </Row2>

                  {/* CMT Cost Fields */}
                  {(form.pricingMode||"fob")==="cmt" && (
                    <div style={{ marginTop:16, padding:"14px 16px", background:C.ok+"0e", border:`1px solid ${C.ok}35`, borderRadius:10 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:C.ok }}>📐 CMT — รายละเอียดต้นทุน</span>
                      <div style={{ fontSize:10, color:C.ok+"99", marginBottom:14, marginTop:4 }}>Cut, Make &amp; Trim — ลูกค้าจัดหาผ้า / Factory คิดค่าตัด ค่าเย็บ</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px" }}>
                        {[["cuttingFee","✂️ ค่าตัดงาน","฿ ต่อตัว"],["sewingFee","🪡 ค่าเย็บงาน","฿ ต่อตัว"],["accessoriesFee","🧵 ค่าอุปกรณ์เสริม","฿ ต่อตัว"],["adminFee","📋 ค่าดำเนินการ","฿ รวม Order"],["freightCost","🚚 ค่าขนส่ง","฿ รวม Order"]].map(([key,label,hint]) => (
                          <Field key={key} label={label}>
                            <div style={{ position:"relative" }}>
                              <input style={{ ...s.input, paddingLeft:28 }} type="number" min="0" step="0.01" value={form[key]||""} onChange={e => setForm(f => ({ ...f, [key]:e.target.value }))} placeholder="0.00" />
                              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:11, color:C.muted }}>฿</span>
                            </div>
                            <div style={{ fontSize:9, color:C.muted, marginTop:3 }}>{hint}</div>
                          </Field>
                        ))}
                      </div>
                      {/* CMT preview */}
                      {(() => {
                        const qty=totalSlotsQty||0, cut=parseFloat(form.cuttingFee)||0, sew=parseFloat(form.sewingFee)||0, acc=parseFloat(form.accessoriesFee)||0, adm=parseFloat(form.adminFee)||0, frt=parseFloat(form.freightCost)||0;
                        const cmtTotal = (cut+sew+acc)*qty+adm+frt;
                        const cmtPerUnit = qty>0 ? cmtTotal/qty : 0;
                        return cmtTotal>0 ? (
                          <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${C.ok}30` }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, paddingTop:8, borderTop:`1px solid ${C.ok}30` }}>
                              <span style={{ fontWeight:700, color:C.ok }}>CMT รวม/ตัว</span>
                              <span style={{ fontWeight:700, color:C.ok }}>฿{fmt(cmtPerUnit)}</span>
                            </div>
                            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                              <span style={{ fontSize:12, fontWeight:700, color:C.ok }}>CMT รวม Order ({qty.toLocaleString()} ตัว)</span>
                              <span style={{ fontSize:14, fontWeight:700, color:C.ok }}>฿{fmt(cmtTotal)}</span>
                            </div>
                          </div>
                        ) : <div style={{ marginTop:12, fontSize:10, color:C.muted }}>กรอกค่าใช้จ่ายเพื่อดูสรุปต้นทุน CMT</div>;
                      })()}
                    </div>
                  )}

                  {/* FOB Cost Fields */}
                  {(form.pricingMode||"fob")==="fob" && (
                    <div style={{ marginTop:16, padding:"14px 16px", background:C.accent2+"0e", border:`1px solid ${C.accent2}35`, borderRadius:10 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:C.accent2 }}>📦 FOB — ค่าแรงตัดเย็บ &amp; ค่าส่ง</span>
                        {data.patterns.find(p=>p.id===form.patternId) && (
                          <div style={{ display:"flex", gap:4 }}>
                            {[{v:true,label:"🔗 จาก Pattern"},{v:false,label:"✏️ กรอกเอง"}].map(({v,label}) => (
                              <button key={String(v)} onClick={() => setForm(f => ({ ...f, fobUsePattern:v }))}
                                style={{ padding:"3px 10px", fontSize:10, borderRadius:6, border:`1px solid ${(form.fobUsePattern!==false)===v?C.accent2:C.border}`, background:(form.fobUsePattern!==false)===v?C.accent2+"22":"transparent", color:(form.fobUsePattern!==false)===v?C.accent2:C.muted, cursor:"pointer", fontFamily:"inherit" }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize:10, color:C.accent2+"99", marginBottom:10 }}>ค่าแรงตัดเย็บ + ค่าขนส่ง (ไม่รวมผ้า/อุปกรณ์จาก Pattern)</div>
                      {(() => {
                        const pp = data.patterns.find(p => p.id===form.patternId);
                        const useP = form.fobUsePattern!==false && !!pp;
                        return (
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px" }}>
                            {[
                              { key:"fobCuttingFee",  label:"✂️ ค่าตัด (Cutting Fee)",  hint:"฿ ต่อตัว",       locked:useP, val:useP?(pp?.laborCut??""):(form.fobCuttingFee||"") },
                              { key:"fobSewingFee",   label:"🪡 ค่าเย็บ (Sewing Fee)",   hint:"฿ ต่อตัว",       locked:useP, val:useP?(pp?.laborSew??""):(form.fobSewingFee||"") },
                              { key:"fobFreightCost", label:"📦 ค่าส่ง / Freight",        hint:"฿ รวม Order",   locked:false, val:form.fobFreightCost||"" },
                              { key:"fobOtherCost",   label:"📋 ค่าอื่นๆ / Other",         hint:"฿ รวม Order",   locked:false, val:form.fobOtherCost||"" },
                            ].map(({ key, label, hint, locked, val }) => (
                              <Field key={key} label={label}>
                                <div style={{ position:"relative" }}>
                                  <input style={{ ...s.input, paddingLeft:28, opacity:locked?0.65:1 }} type="number" min="0" step="0.01" value={val} readOnly={locked} onChange={locked?undefined:e => setForm(f => ({ ...f, [key]:e.target.value }))} placeholder="0.00" />
                                  <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:11, color:C.muted }}>฿</span>
                                </div>
                                <div style={{ fontSize:9, color:C.muted, marginTop:3 }}>{hint}{locked?" (จาก Pattern)":""}</div>
                              </Field>
                            ))}
                          </div>
                        );
                      })()}
                      {/* FOB preview */}
                      {(() => {
                        const pp=data.patterns.find(p=>p.id===form.patternId), useP=form.fobUsePattern!==false&&!!pp;
                        const qty=totalSlotsQty||0;
                        const cut=useP?(parseFloat(pp?.laborCut)||0):(parseFloat(form.fobCuttingFee)||0);
                        const sew=useP?(parseFloat(pp?.laborSew)||0):(parseFloat(form.fobSewingFee)||0);
                        const frt=parseFloat(form.fobFreightCost)||0, oth=parseFloat(form.fobOtherCost)||0;
                        const fobTotal=(cut+sew)*qty+frt+oth;
                        const fobPerUnit=qty>0?fobTotal/qty:cut+sew;
                        return fobTotal>0 ? (
                          <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${C.accent2}30` }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, paddingTop:8, borderTop:`1px solid ${C.accent2}30` }}>
                              <span style={{ fontWeight:700, color:C.accent2 }}>FOB Labor รวม/ตัว</span>
                              <span style={{ fontWeight:700, color:C.accent2 }}>฿{fmt(fobPerUnit)}</span>
                            </div>
                            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                              <span style={{ fontSize:12, fontWeight:700, color:C.accent2 }}>FOB Labor รวม Order ({qty.toLocaleString()} ตัว)</span>
                              <span style={{ fontSize:14, fontWeight:700, color:C.accent2 }}>฿{fmt(fobTotal)}</span>
                            </div>
                          </div>
                        ) : <div style={{ marginTop:12, fontSize:10, color:C.muted }}>กรอกค่าใช้จ่ายเพื่อดูสรุปต้นทุน FOB Labor</div>;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: SLOTS ── */}
              {activeTab==="slots" && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, padding:"10px 14px", background:"#060b16", borderRadius:8, border:`1px solid ${C.border}` }}>
                    <div>
                      <span style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:0.5 }}>Qty รวมทุกรายการ</span>
                      <div style={{ fontSize:18, fontWeight:800, color:C.accent, lineHeight:1.2 }}>{totalSlotsQty.toLocaleString()} <span style={{ fontSize:11, fontWeight:400 }}>ตัว</span></div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:C.muted }}>{actualSlots.length} รายการ</span>
                      <button onClick={addSlot} style={{ ...s.btn(C.accent2,true), padding:"8px 18px", fontSize:12 }}>+ เพิ่ม SKU</button>
                    </div>
                  </div>
                  {actualSlots.map((slot, i) => (
                    <ProductSlot key={slot.id||i} slot={slot} idx={i} data={data} onChange={updateSlot} onRemove={removeSlot} orderPatternId={form.patternId} />
                  ))}
                  <button onClick={addSlot} style={{ width:"100%", padding:"12px", background:"transparent", border:`2px dashed ${C.border}`, borderRadius:10, color:C.muted, fontSize:12, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:4 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent2; e.currentTarget.style.color=C.accent2; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.muted; }}>
                    <span style={{ fontSize:18 }}>+</span> เพิ่มรายการสินค้า (SKU)
                  </button>
                </div>
              )}

              {/* ── TAB: NOTICE ── */}
              {activeTab==="notice" && (
                <div>
                  <div style={{ marginBottom:16, padding:"12px 14px", background:"#7f1d1d18", border:`1px solid ${C.err}30`, borderRadius:8, fontSize:12, color:C.sub }}>
                    ⚠️ ใช้สำหรับบันทึกคำแนะนำพิเศษ เช่น ข้อกำหนดการผลิต, การแพ็คพิเศษ, วันที่ต้องส่งด่วน ฯลฯ
                  </div>
                  <Field label="หมายเหตุพิเศษของ Order นี้">
                    <textarea style={{ ...s.input, height:120, resize:"vertical", lineHeight:1.6 }} value={form.specialNotice||""} onChange={e => setForm(f => ({ ...f, specialNotice:e.target.value }))} placeholder={"เช่น:\n- ต้องส่งก่อนวันที่ 30 เม.ย.\n- แพ็คใส่ถุงแยกไซส์\n- ห้ามใช้ด้ายสีดำ"} />
                  </Field>
                  <Field label="ลำดับความสำคัญ">
                    <select style={s.select} value={form.priority||"normal"} onChange={e => setForm(f => ({ ...f, priority:e.target.value }))}>
                      <option value="low">🟢 ปกติ (Low)</option><option value="normal">🟡 กลาง (Normal)</option><option value="high">🔴 ด่วน (High)</option><option value="urgent">🚨 ด่วนมาก (Urgent)</option>
                    </select>
                  </Field>
                  <Field label="ไฟล์แนบ / Link อ้างอิง">
                    <input style={s.input} value={form.referenceLink||""} onChange={e => setForm(f => ({ ...f, referenceLink:e.target.value }))} placeholder="https://drive.google.com/..." />
                  </Field>
                </div>
              )}

              {/* Footer */}
              <div style={{ display:"flex", gap:8, marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
                <button style={s.btn()} onClick={save}>💾 บันทึก Order</button>
                <button style={s.btnGhost} onClick={() => setModal(false)}>ยกเลิก</button>
                {activeTab!=="slots" && (
                  <button style={{ ...s.btnGhost, marginLeft:"auto" }} onClick={() => setActiveTab("slots")}>ถัดไป: รายการสินค้า →</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewModal && <OrderDetailModal order={viewModal} data={data} onClose={() => setViewModal(null)} />}
    </div>
  );
}

