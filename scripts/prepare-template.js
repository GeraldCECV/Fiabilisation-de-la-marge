// Prépare le gabarit final à partir du fichier fourni par l'utilisateur : ne modifie QUE
// la formule du barème (D28) et la liste déroulante Collection (C13), en préservant tout
// le reste du fichier strictement à l'identique (aucune réécriture globale du classeur).
//
// Usage : node scripts/prepare-template.js <fichier_source.xlsx>

const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error("Usage: node scripts/prepare-template.js <fichier_source.xlsx>");
  process.exit(1);
}

function setFormula(xml, ref, newFormula) {
  const re = new RegExp(`<c r="${ref}"([^>]*?)>[\\s\\S]*?</c>`);
  const m = xml.match(re);
  if (!m) throw new Error(`Cellule ${ref} introuvable.`);
  const attrs = m[1];
  const escaped = newFormula.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const newCell = `<c r="${ref}"${attrs}><f>${escaped}</f></c>`;
  return xml.slice(0, m.index) + newCell + xml.slice(m.index + m[0].length);
}

function setDataValidationList(xml, sqref, newListLiteral) {
  const re = new RegExp(`(<dataValidation\\b[^>]*sqref="${sqref}"[^>]*>\\s*<formula1>)([^<]*)(</formula1>)`);
  const m = xml.match(re);
  if (!m) throw new Error(`Liste déroulante pour ${sqref} introuvable.`);
  const escaped = newListLiteral.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return xml.slice(0, m.index) + m[1] + escaped + m[3] + xml.slice(m.index + m[0].length);
}

async function main() {
  const buffer = fs.readFileSync(SOURCE);
  const zip = await JSZip.loadAsync(buffer);

  const workbookXml = await zip.file("xl/workbook.xml").async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels").async("string");

  const sheetRe = /<sheet\b[^>]*\/>/g;
  let sm, rId = null;
  while ((sm = sheetRe.exec(workbookXml))) {
    if (sm[0].includes('name="RENTA VN"')) {
      const idMatch = sm[0].match(/r:id="(rId\d+)"/);
      if (idMatch) { rId = idMatch[1]; break; }
    }
  }
  if (!rId) throw new Error('Onglet "RENTA VN" introuvable.');

  const relRe = /<Relationship\b[^>]*\/>/g;
  let relEl, target = null;
  while ((relEl = relRe.exec(relsXml))) {
    if (relEl[0].includes(`Id="${rId}"`)) {
      const t = relEl[0].match(/Target="([^"]*)"/);
      if (t) { target = t[1]; break; }
    }
  }
  const sheetFile = `xl/${target}`;

  let sheetXml = await zip.file(sheetFile).async("string");

  const oldFormulaMatch = sheetXml.match(/<c r="D28"[^>]*>[\s\S]*?<f>([\s\S]*?)<\/f>/);
  if (!oldFormulaMatch) throw new Error("Formule D28 introuvable.");
  let formula = oldFormulaMatch[1]
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

  const newFormula = formula
    .replace('G4="CAMPING CAR",C13=2026', 'G4="CAMPING CAR",C13=2027')
    .replace('G4="CAMPING CAR",C13=2025', 'G4="CAMPING CAR",C13=2026')
    .replace('G4="CAMPING CAR",C13=2024', 'G4="CAMPING CAR",C13=2025')
    .replace('G4="CAMPING CAR",C13="2023 & <"', 'G4="CAMPING CAR",C13="2024 & <"')
    .replace('G4="CARAVANE",C13=2025', 'G4="CARAVANE",C13=2026')
    .replace('G4="CARAVANE",C13=2024', 'G4="CARAVANE",C13=2025')
    .replace('G4="CARAVANE",C13=2023', 'G4="CARAVANE",C13=2024')
    .replace('G4="CARAVANE",C13="2022 & <"', 'G4="CARAVANE",C13="2023 & <"');

  sheetXml = setFormula(sheetXml, "D28", newFormula);
  sheetXml = setDataValidationList(sheetXml, "C13:E13", '"2027,2026,2025,2024 & < = DESTOCKAGE"');

  zip.file(sheetFile, sheetXml);

  const outPath = path.join(__dirname, "..", "public", "templates", "trame_renta_template.xlsx");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const outBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  fs.writeFileSync(outPath, outBuffer);
  console.log("Gabarit préparé :", outPath);
}

main().catch((e) => { console.error("ERREUR:", e); process.exit(1); });
