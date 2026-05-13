/**
 * PRIMER Group NXT — Excel Template Generator
 * Run: node create-templates.js
 * Output: templates/ folder with all .xlsx files
 */

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'templates');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

// ── Helper ────────────────────────────────────────────────────
function makeSheet(headers, examples) {
  return XLSX.utils.aoa_to_sheet([headers, ...examples]);
}

function styleHeader(ws, colCount) {
  // Set column widths
  ws['!cols'] = Array(colCount).fill({ wch: 20 });
  return ws;
}

function saveWorkbook(wb, filename) {
  const filepath = path.join(OUT, filename);
  XLSX.writeFile(wb, filepath);
  console.log(`✅  ${filename}`);
}

// ═══════════════════════════════════════════════════════════════
// 1. SUPPLIERS
// ═══════════════════════════════════════════════════════════════
{
  const wb = XLSX.utils.book_new();
  const headers = ['id','name','contact','category'];
  const examples = [
    ['S001','Thai Textile Co.','02-123-4567','Fabric'],
    ['S002','Bangkok Weaving','02-234-5678','Fabric'],
    ['S003','Trim & Findings Ltd.','02-345-6789','Accessories'],
    ['S004','Label House','02-456-7890','Packaging'],
    ['','','',''],
    ['','── category options ──','',''],
    ['','Fabric','',''],
    ['','Accessories','',''],
    ['','Packaging','',''],
    ['','Other','',''],
  ];
  const ws = styleHeader(makeSheet(headers, examples), headers.length);
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
  saveWorkbook(wb, '1_Suppliers_Template.xlsx');
}

// ═══════════════════════════════════════════════════════════════
// 2. FABRICS
// ═══════════════════════════════════════════════════════════════
{
  const wb = XLSX.utils.book_new();
  const headers = ['id','name','type','unit','cost_per_unit','supplier_id','width_cm','note'];
  const examples = [
    ['F001','Cotton Jersey 180gsm','Knit','m',85,'S001',150,'ยืด 4 ทาง'],
    ['F002','Woven Poplin 100%C','Woven','m',120,'S002',60,''],
    ['F003','Polyester Interlock','Knit','m',65,'S001',150,'Dry-fit'],
    ['F004','Cotton Drill','Woven','m',95,'S002',60,''],
    ['','','','','','','',''],
    ['','── type options ──','','','','','',''],
    ['','Knit','','','','','',''],
    ['','Woven','','','','','',''],
    ['','Cotton','','','','','',''],
    ['','── unit options ──','','','','','',''],
    ['','m  (เมตร)','','','','','',''],
    ['','yard  (หลา)','','','','','',''],
    ['','kg  (กิโลกรัม)','','','','','',''],
  ];
  const ws = styleHeader(makeSheet(headers, examples), headers.length);
  XLSX.utils.book_append_sheet(wb, ws, 'Fabrics');
  saveWorkbook(wb, '2_Fabrics_Template.xlsx');
}

// ═══════════════════════════════════════════════════════════════
// 3. ACCESSORIES
// ═══════════════════════════════════════════════════════════════
{
  const wb = XLSX.utils.book_new();
  const headers = ['id','name','unit','cost_per_unit','supplier_id','note'];
  const examples = [
    ['A001','Button 20mm','pcs',3,'S003',''],
    ['A002','Zipper YKK 30cm','pcs',22,'S003',''],
    ['A003','Elastic Band 3cm','m',12,'S003',''],
    ['A004','Woven Label','pcs',4,'S004',''],
    ['A005','Main Label','pcs',2,'S004',''],
    ['A006','Thread Spun 40s','spool',28,'S003',''],
    ['A007','Hang Tag','set',5,'S004',''],
    ['A008','Poly Bag','pcs',3,'S004',''],
  ];
  const ws = styleHeader(makeSheet(headers, examples), headers.length);
  XLSX.utils.book_append_sheet(wb, ws, 'Accessories');
  saveWorkbook(wb, '3_Accessories_Template.xlsx');
}

// ═══════════════════════════════════════════════════════════════
// 4. PRINT TYPES
// ═══════════════════════════════════════════════════════════════
{
  const wb = XLSX.utils.book_new();
  const headers = ['id','name','cost_per_unit'];
  const examples = [
    ['PT001','None',0],
    ['PT002','Silk Screen (1 color)',18],
    ['PT003','Silk Screen (4 color)',45],
    ['PT004','Embroidery (small)',35],
    ['PT005','Embroidery (large)',75],
    ['PT006','Digital Print',55],
    ['PT007','Heat Transfer',28],
  ];
  const ws = styleHeader(makeSheet(headers, examples), headers.length);
  XLSX.utils.book_append_sheet(wb, ws, 'PrintTypes');
  saveWorkbook(wb, '4_PrintTypes_Template.xlsx');
}

// ═══════════════════════════════════════════════════════════════
// 5. PATTERNS (multi-sheet)
// ═══════════════════════════════════════════════════════════════
{
  const wb = XLSX.utils.book_new();

  // Sheet 1: Patterns
  const patHeaders = ['id','name','pattern_type','category','fabric_id','fabric_per_unit','labor_cut','labor_sew','labor_qc'];
  const patExamples = [
    ['P001','Basic T-Shirt','T-Shirt','Tops','F001',1.8,12,25,8],
    ['P002','Polo Shirt','Polo Shirt','Tops','F001',2.0,15,40,10],
    ['P003','Woven Shirt','Shirt','Tops','F002',2.4,18,55,12],
    ['P004','Casual Pants','Pants','Bottoms','F002',2.8,22,65,13],
    ['P005','Sports Tee','T-Shirt','Tops','F003',1.6,10,22,8],
    ['','','','','','','','',''],
    ['','── pattern_type options ──','','','','','','',''],
    ['','T-Shirt','','','','','','',''],
    ['','Polo Shirt','','','','','','',''],
    ['','Pants','','','','','','',''],
    ['','Coverall','','','','','','',''],
    ['','Apron','','','','','','',''],
    ['','Bag','','','','','','',''],
    ['','Shirt','','','','','','',''],
    ['','Other','','','','','','',''],
    ['','── category options ──','','','','','','',''],
    ['','Tops','','','','','','',''],
    ['','Bottoms','','','','','','',''],
    ['','Outerwear','','','','','','',''],
    ['','Accessories','','','','','','',''],
  ];
  const ws1 = styleHeader(makeSheet(patHeaders, patExamples), patHeaders.length);
  XLSX.utils.book_append_sheet(wb, ws1, 'Patterns');

  // Sheet 2: Pattern_Accessories (BOM)
  const accHeaders = ['pattern_id','accessory_id','qty_per_unit'];
  const accExamples = [
    ['P001','A004',1],
    ['P001','A005',1],
    ['P001','A006',0.2],
    ['P001','A007',1],
    ['P001','A008',1],
    ['P002','A001',3],
    ['P002','A004',1],
    ['P002','A005',1],
    ['P002','A006',0.3],
    ['P002','A007',1],
    ['P002','A008',1],
    ['P003','A001',7],
    ['P003','A004',1],
    ['P003','A005',1],
    ['P003','A006',0.4],
    ['P004','A002',1],
    ['P004','A001',1],
    ['P004','A003',0.8],
    ['P004','A004',1],
    ['P004','A005',1],
    ['P005','A004',1],
    ['P005','A005',1],
    ['P005','A006',0.2],
    ['P005','A008',1],
  ];
  const ws2 = styleHeader(makeSheet(accHeaders, accExamples), accHeaders.length);
  XLSX.utils.book_append_sheet(wb, ws2, 'Pattern_Accessories');

  saveWorkbook(wb, '5_Patterns_Template.xlsx');
}

// ═══════════════════════════════════════════════════════════════
// 6. STOCK
// ═══════════════════════════════════════════════════════════════
{
  const wb = XLSX.utils.book_new();
  const headers = ['item_id','qty'];
  const examples = [
    ['F001',450],
    ['F002',220],
    ['F003',380],
    ['F004',150],
    ['A001',2500],
    ['A002',300],
    ['A003',800],
    ['A004',3000],
    ['A005',3000],
    ['A006',120],
    ['A007',2000],
    ['A008',2000],
    ['',''],
    ['','── item_id ใช้ ID ของ Fabric หรือ Accessory ──'],
  ];
  const ws = styleHeader(makeSheet(headers, examples), headers.length);
  XLSX.utils.book_append_sheet(wb, ws, 'Stock');
  saveWorkbook(wb, '6_Stock_Template.xlsx');
}

// ═══════════════════════════════════════════════════════════════
// 7. MASTER TEMPLATE (ไฟล์เดียวทุก Sheet)
// ═══════════════════════════════════════════════════════════════
{
  const wb = XLSX.utils.book_new();

  const addSheet = (name, headers, rows) => {
    const ws = styleHeader(makeSheet(headers, rows), headers.length);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addSheet('Suppliers',
    ['id','name','contact','category'],
    [['S001','Thai Textile Co.','02-123-4567','Fabric'],['S003','Trim & Findings','02-345-6789','Accessories']]
  );
  addSheet('Fabrics',
    ['id','name','type','unit','cost_per_unit','supplier_id','width_cm','note'],
    [['F001','Cotton Jersey 180gsm','Knit','m',85,'S001',150,''],['F002','Woven Poplin','Woven','m',120,'S002',60,'']]
  );
  addSheet('Accessories',
    ['id','name','unit','cost_per_unit','supplier_id','note'],
    [['A001','Button 20mm','pcs',3,'S003',''],['A004','Woven Label','pcs',4,'S004','']]
  );
  addSheet('PrintTypes',
    ['id','name','cost_per_unit'],
    [['PT001','None',0],['PT002','Silk Screen (1 color)',18],['PT004','Embroidery (small)',35]]
  );
  addSheet('Patterns',
    ['id','name','pattern_type','category','fabric_id','fabric_per_unit','labor_cut','labor_sew','labor_qc'],
    [['P001','Basic T-Shirt','T-Shirt','Tops','F001',1.8,12,25,8],['P002','Polo Shirt','Polo Shirt','Tops','F001',2.0,15,40,10]]
  );
  addSheet('Pattern_Accessories',
    ['pattern_id','accessory_id','qty_per_unit'],
    [['P001','A004',1],['P001','A005',1],['P002','A001',3],['P002','A004',1]]
  );
  addSheet('Stock',
    ['item_id','qty'],
    [['F001',450],['F002',220],['A001',2500],['A004',3000]]
  );

  saveWorkbook(wb, '0_MASTER_All_Templates.xlsx');
}

console.log('\n🎉 Done! ไฟล์ทั้งหมดอยู่ในโฟลเดอร์ templates/\n');
