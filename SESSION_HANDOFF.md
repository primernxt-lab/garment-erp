# 🧵 PRIMER Group NXT — ERP Session Handoff
> **Copy ข้อความนี้ทั้งหมดเป็น context แรกของ session ใหม่**
> Last updated: 2026-05-06 | Build: ✅ passing

---

## 1. PROJECT OVERVIEW

**App name:** PRIMER Group NXT — Production Management System  
**Type:** Single-page React ERP สำหรับโรงงานตัดเย็บเสื้อผ้า (Garment Factory)  
**Path:** `C:\Users\ACER\Desktop\garment-erp\`  
**Dev server:** `npm run dev` (Vite 4, port 5173)  
**Build:** `npm run build` → `dist/`  

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite 4 |
| Language | JavaScript (JSX) — ไม่มี TypeScript |
| Styling | **Inline styles เท่านั้น** — ห้ามใช้ CSS classes / Tailwind |
| Database | Supabase (PostgreSQL) |
| Excel | `xlsx` package (lazy loaded) |
| Font | JetBrains Mono / Courier New |

---

## 3. FILE STRUCTURE

```
garment-erp/
├── src/
│   ├── App.jsx          ← ไฟล์หลักทั้งหมด (~4,738 บรรทัด)
│   ├── db.js            ← Supabase CRUD functions ทั้งหมด
│   ├── supabase.js      ← Supabase client init
│   ├── items_v3.json    ← 1,498 SKUs จาก Primer_Master_Data_v3 (392KB)
│   └── primerItems.js   ← (legacy, ไม่ใช้แล้ว)
├── SESSION_HANDOFF.md   ← ไฟล์นี้
├── package.json
└── vite.config.js
```

---

## 4. SUPABASE CONNECTION

```js
// src/supabase.js
URL:    'https://rlxgvrvmqvezsxjmegtv.supabase.co'
KEY:    'sb_publishable_6BPsjJUkkAzoXAKjL8HlEQ_Iv3Q0wBd'
```

### Supabase Tables (snake_case columns → camelCase in JS)
| Table | Key columns |
|-------|-------------|
| `fabrics` | id, name, type, unit, cost_per_unit, supplier, width, image_preview, note |
| `accessories` | id, name, unit, cost_per_unit, supplier, image_preview, note |
| `patterns` | id, name, category, pattern_type, fabric_id, fabric_per_unit, accessories(JSONB), labor_cut, labor_sew, labor_qc, image_preview |
| `print_types` | id, name, cost_per_unit, image_preview |
| `suppliers` | id, name, contact, category, image_preview |
| `orders` | id, customer, pattern_id, print_type_id, qty, target_price, status, date, due_date, channel, contact, slots(JSONB), special_notice |
| `bills` | id, invoice_no, supplier, date, items(JSONB), receipt_image, status, paid_date |
| `stock` | item_id, qty |

**`orders.slots` JSONB format:**  
- Index 0: `{ _meta: true, pricingMode, fobCuttingFee, fobSewingFee, fobFreightCost, fobOtherCost, fobUsePattern, cuttingFee, sewingFee, accessoriesFee, adminFee, freightCost }`  
- Index 1+: `{ id, patternType, patternId, printTypeId, qty, colors[], colorNote, sizes:{male:{},female:{}}, fabricType, specFile, specFileName, image, imagePreview, slotNote }`

---

## 5. APP.JSX TOP-LEVEL STRUCTURE

### Imports
```js
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import PRIMER_ITEMS_V3 from './items_v3.json';    // 1,498 SKUs
import { loadAllData, testConnection, upsertFabric, deleteFabric,
  upsertAccessory, deleteAccessory, upsertPrintType, deletePrintType,
  upsertPattern, deletePattern, upsertSupplier, deleteSupplier,
  upsertOrder, deleteOrder, upsertStock, upsertBill, deleteBill as dbDeleteBill
} from './db.js';
```

### Color System (ใช้ทั่วทั้ง app)
```js
const C = {
  bg: "#080d18",        // พื้นหลังหลัก
  card: "#0d1526",      // พื้น card
  border: "#1a2540",    // ขอบ
  accent: "#e8a020",    // สีหลัก (ทอง/ส้ม)
  accent2: "#3b82f6",   // สีรอง (น้ำเงิน)
  ok: "#10b981",        // สีเขียว
  err: "#ef4444",       // สีแดง
  text: "#dde4f0",      // ข้อความหลัก
  muted: "#4a5980",     // ข้อความ muted
  sub: "#8393b0",       // ข้อความ secondary
};
```

### Style Atoms (`s` object)
```js
const s = {
  input,    // input style
  select,   // select style
  btn(col, light),   // filled button
  btnGhost, // outline button
  th,       // table header cell
  td,       // table data cell
}
```

### Global Helpers
```js
const fmt = (n, d=2)  // format number Thai locale
const genId = (prefix) // generate ID from timestamp
const t = (key)        // bilingual translation (EN/TH)
let _lang = "EN"       // current language (mutable global)
```

---

## 6. MODULES (Navigation tabs)

| Module ID | Component | คำอธิบาย |
|-----------|-----------|----------|
| `dashboard` | `DashboardModule` | Overview: กราฟ donut + bar, stats, top customers, recent orders |
| `items` | `ItemMasterModule` | SKU master data, 5-slot filter, Excel import |
| `master` | `MasterModule` | Fabric, Accessories, Patterns, Print Types, Suppliers, Cost Rates |
| `order` | `OrderModule` | สร้าง/แก้ไข Production Orders |
| `bom` | `BOMModule` | Bill of Materials, Purchase Bills, Price Compare |
| `inventory` | `InventoryModule` | Stock levels, adjust stock |
| `costing` | `CostingModule` | Cost breakdown per order |
| `reports` | `ReportModule` | Business reports |
| `import` | `ImportModule` | Import Excel: Fabrics, Accessories, Suppliers, Patterns |

---

## 7. SHARED COMPONENTS

### `AutocompleteInput({ value, onChange, options, placeholder, style })`
- Search + scroll dropdown
- Click outside = close
- ESC = close, Enter (1 match) = select
- Max 200 results shown
- Used for: Customer name, Pattern picker, Item Master filters

### `Field({ label, children, half })`
- Form field wrapper, `half` = 50% width in Row2

### `Row2({ children })`
- `display:flex, flexWrap:wrap, gap:12` — 2-column form layout

### `Card`, `SectionHead`, `Tag`, `Modal`
- Standard UI atoms

### `ImportBtn({ onImport })`
- File picker button สำหรับ Excel import (ใช้ใน MasterModule)

---

## 8. ORDER MODULE — DETAIL

### States (in `function OrderModule`)
```js
const [modal, setModal] = useState(false);
const [viewModal, setViewModal] = useState(null);
const [form, setForm] = useState({});
const [slots, setSlots] = useState([EMPTY_SLOT()]);
const [activeTab, setActiveTab] = useState("info");
const [patTypeFilter, setPatTypeFilter] = useState("");   // ← Pattern type pill filter
```

### `EMPTY_SLOT()` schema
```js
{ id, patternType:"T-Shirt", patternId:"", printTypeId:"PT001",
  qty:"", colors:[], colorNote:"", sizes:{male:{},female:{}},
  fabricType:"", specFile:null, specFileName:"", image:null,
  imagePreview:null, slotNote:"" }
```

### Order Form Tabs
1. **📋 Order Info** — Customer autocomplete, **Pattern Selector (TOP)**, Target Price, Dates, Status, Channel, Contact, FOB/CMT pricing block
2. **🧩 Products** — ProductSlot list (qty, color, sizes, print, spec, image, note)
3. **⚠️ Special Notice** — Priority, ref link, free text notice

### Pattern Selector (Order Info — TOP of tab)
- **Type filter pills:** 👕 T-Shirt | 👔 Polo | 🎽 Activewear | 👖 Pants | 🧥 Jacket | 🌐 ทั้งหมด
- กด pill → กรอง pattern list ทันที (แสดงจำนวนในแต่ละ type)
- `patTypeFilter` state ควบคุม filter
- `form.patternId` = order-level pattern (ไม่ใช่ slot-level แล้ว)
- Pattern options format: `"ชื่อ Pattern  [Type]"`

### Pricing Modes
- **FOB** (default): Fabric + Labor + Accessories. มีช่อง ✂️ค่าตัด, 🪡ค่าเย็บ, 📦ค่าส่ง, 📋ค่าอื่นๆ. Toggle "🔗 จาก Pattern" (ดึงค่าอัตโนมัติ) / "✏️ กรอกเอง"
- **CMT**: ค่าตัด + ค่าเย็บ + Accessories + ค่าดำเนินการ + ค่าขนส่ง

### `save()` function — Key fields
```js
patternId: form.patternId || data.patterns[0]?.id   // ← order-level, ไม่ใช้ slot แล้ว
slots: [pricingMeta, ...actualSlots]
```

### `actualSlots` vs `slots`
```js
const actualSlots = slots.filter(s => !s._meta);
const pricingMeta = { _meta: true, pricingMode, fobCuttingFee, ... };
```

### Customer Autocomplete
```js
const customerOptions = useMemo(() => {
  const fromItems  = PRIMER_ITEMS_V3.map(i => i.customer).filter(Boolean);
  const fromOrders = data.orders.map(o => o.customer).filter(Boolean);
  return [...new Set([...fromOrders, ...fromItems])].sort();
}, [data.orders]);
```

---

## 9. ITEM MASTER MODULE

### States
```js
const [itemMaster, setItemMaster] = useState(PRIMER_ITEMS_V3);  // 1,498 items
const [searchProduct, setSearchProduct] = useState("");
const [filterSupplier, setFilterSupplier] = useState("");
const [filterCustomer, setFilterCustomer] = useState("");
const [filterType, setFilterType] = useState("");
const [filterFabric, setFilterFabric] = useState("");
```

### 5 Filter Slots
1. **ชื่อสินค้า/รหัส/โค้ด** — text search
2. **Supplier/ผู้จำหน่าย** — dropdown
3. **Customer/ลูกค้า** — dropdown
4. **Type of Products** — T-shirt/Polo/Activewear/Pant/Jacket/etc.
5. **Fabric/เนื้อผ้า** — dropdown

### PRODUCT_TYPES constant (in ItemMasterModule)
```js
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
```

### `items_v3.json` Item Schema
```js
{ code, newSku, category, gender, ptNumber, fabricType, color, group,
  name, cost, factoryPrice, sellPrice, customer, type }
```
- `category` = part[2] of newSku (TSH, POL, ACT, TNK, SHO, TRS, BRA, UNI, ACB, TRK, SKT, INW, JKT)
- 1,498 unique items (deduplicated by P/T code จาก 4,085 rows)

---

## 10. EXCEL IMPORT UTILITIES

### `readWorkbook(file)` → `{ wb, XLSX }`
- Lazy loads xlsx package
- Returns workbook + XLSX instance

### `parseItemMasterWb(wb, XLSX)` 
- รองรับ Primer_Master_Data_v3 double-header format (4 header rows)
- ใช้ `header:1` raw array mode, skip rows 0-3, map by column index
- Sheet เสื้อ: col mapping `{pt:1,newSku:4,gender:5,ptNo:8,name:9,fabric:10,color:11,group:13,cost:14,fp:15,rp:16,cust:17}`
- Sheet กางเกง: col mapping `{pt:1,newSku:4,gender:5,name:8,fabric:9,color:10,group:12,cost:13,fp:14,rp:15}`
- Fallback: classic column-name format สำหรับไฟล์เก่า

### `ImportModule` (📥 Import tab)
- Import Fabrics, Accessories, Suppliers, Patterns จาก Excel
- ใช้ `getSheetRows()` + row mappers (`mapFabric`, `mapAccessory`, `mapSupplier`, `mapPattern`)
- Preview → upsert to Supabase

---

## 11. PATTERN MASTER (in MasterModule → tabPattern)

### Pattern Schema
```js
{ id, name, category, patternType,  // e.g. "T-Shirt", "Polo Shirt", "Pants"
  fabricId, fabricPerUnit,
  accessories: [{ accId, qtyPerUnit }],
  laborCut, laborSew, laborQC,
  imagePreview }
```

### PatternType values (used in pill filter)
`"T-Shirt"`, `"Polo Shirt"`, `"Shirt"`, `"Pants"`, `"Activewear"`, `"Jacket"`, `"Coverall"`, `"Other"`

---

## 12. MASTER DATA (MasterModule tabs)

| Tab | คำอธิบาย |
|-----|----------|
| Fabric | CRUD ผ้า, upload image |
| Accessories | CRUD อุปกรณ์เสริม |
| Pattern | CRUD Pattern, accessories list per pattern |
| Print/EMB | CRUD ประเภทงานพิมพ์ |
| Supplier | CRUD ซัพพลายเออร์ (446 records จาก V3 Excel) |
| Cost Rates | laborCutRate, laborSewRate, laborQCRate, overheadRate |

### Import via ImportBtn (ใน MasterModule)
- Fabric / Accessory / Supplier / Pattern — อ่านจาก Excel → preview → upsert Supabase

---

## 13. BILINGUAL SYSTEM

```js
const LANG = { EN: {...}, TH: {...} }
let _lang = "EN"   // global mutable
const t = (key) => LANG[_lang][key] || LANG["EN"][key] || key
```

- Toggle ปุ่ม 🇬🇧 EN / 🇹🇭 TH ที่มุมขวาบน
- ทุก string ที่แสดงผลต้องใช้ `t("key")` — เพิ่ม key ใน LANG.EN และ LANG.TH พร้อมกันเสมอ

---

## 14. RULES & CONVENTIONS

1. **Inline styles เท่านั้น** — ห้าม className / CSS file / Tailwind
2. **Dark theme** — ใช้ค่าสีจาก `C` object เสมอ
3. **ไฟล์เดียว** — code ทั้งหมดอยู่ใน `src/App.jsx`
4. **Supabase upsert** — ทุก save จะ upsert ทันที (optimistic local state + background DB)
5. **useMemo** — ใช้สำหรับ derived lists ที่คำนวณหนัก (allFabrics, allCustomers, filtered, customerOptions)
6. **หลัง edit ทุกครั้ง** — รัน `npm run build` เพื่อ verify ไม่มี error
7. **items_v3.json** — อย่าแก้ด้วยมือ, regenerate จาก Node.js script ถ้าต้องการอัพเดท

---

## 15. CURRENT STATE (ณ วันที่ handoff)

### ✅ สิ่งที่สร้างเสร็จแล้ว
- ทุก Module ทำงานได้ (Dashboard, Items, Master, Orders, BOM, Inventory, Costing, Reports, Import)
- Supabase sync ครบ: fabrics, accessories, patterns, print_types, suppliers, orders, bills, stock
- 446 Suppliers imported จาก Primer_Master_Data_v3
- 1,498 SKUs จาก items_v3.json (static import)
- Item Master: 5-filter slots (ชื่อ/รหัส, Supplier, Customer, Type, Fabric)
- Order: Customer autocomplete (union ของ items + past orders)
- Order: Pattern Selector ย้ายมาอยู่ **หน้าแรก (Order Info tab) ด้านบนสุด**
  - Type filter pills: T-Shirt / Polo / Activewear / Pants / Jacket / ทั้งหมด
  - กด pill → filter pattern list ทันที
  - `form.patternId` = order-level field
- FOB pricing block: ✂️ค่าตัด, 🪡ค่าเย็บ, 📦ค่าส่ง, 📋ค่าอื่นๆ + toggle จาก Pattern / กรอกเอง
- Build ผ่าน ✅ ไม่มี error

### ⚠️ Known Issues / Pending
- Pattern type filter pills ใน ProductSlot (ตัวเก่า) ยังมีอยู่แต่ไม่ทำงาน — อาจต้องลบออก
- `items_v3.json` ทำให้ bundle ใหญ่ (906KB) — แก้ได้ด้วย dynamic import ถ้าต้องการ
- Supplier ใน Supabase มี 446 records แต่ INIT_SUPPLIERS ใน code มีแค่ตัวอย่างไม่กี่ตัว (ไม่ต้อง sync กัน เพราะ Supabase โหลดทับ)

---

## 16. HOW TO CONTINUE IN NEW SESSION

เมื่อเปิด session ใหม่ ให้ทำตามนี้:

1. บอก Claude ว่า: **"อ่าน SESSION_HANDOFF.md ที่ `C:\Users\ACER\Desktop\garment-erp\SESSION_HANDOFF.md` ก่อน แล้วค่อยเริ่มงาน"**
2. หรือ copy เนื้อหาในไฟล์นี้ทั้งหมดวางเป็น message แรก
3. จากนั้นบอกว่าต้องการทำอะไรต่อ

### คำสั่งที่ใช้บ่อย
```bash
# รัน dev server
cd C:\Users\ACER\Desktop\garment-erp && npm run dev

# Build (verify ไม่มี error)
npm run build

# ดู App.jsx บรรทัดที่ต้องการ
# (บอก Claude ให้ Read file_path + offset + limit)
```

---

## 17. EXAMPLE PROMPT สำหรับ SESSION ใหม่

```
ผมกำลังพัฒนา Garment ERP ชื่อ "PRIMER Group NXT" 
ไฟล์อยู่ที่ C:\Users\ACER\Desktop\garment-erp\src\App.jsx (4,738 บรรทัด)

[วางเนื้อหา SESSION_HANDOFF.md ทั้งหมดที่นี่]

ขอให้ช่วย: [บอกงานที่ต้องการทำต่อ]
```
