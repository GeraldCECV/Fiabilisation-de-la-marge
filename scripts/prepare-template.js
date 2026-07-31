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

  let workbookXml = await zip.file("xl/workbook.xml").async("string");
  let relsXml = await zip.file("xl/_rels/workbook.xml.rels").async("string");

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

  // --- Suppression complète de l'onglet "RENTA VO" (on ne garde que "RENTA VN") ---
  const sheetToRemoveRe = /<sheet\b[^>]*name="RENTA VO"[^>]*\/>/;
  const sheetToRemoveMatch = workbookXml.match(sheetToRemoveRe);
  if (sheetToRemoveMatch) {
    const rIdToRemove = sheetToRemoveMatch[0].match(/r:id="(rId\d+)"/)[1];

    // Fichier de la feuille VO + ses annexes (rels, commentaires, dessin VML)
    let voRelEl;
    let voTarget = null;
    const relRe2 = /<Relationship\b[^>]*\/>/g;
    while ((voRelEl = relRe2.exec(relsXml))) {
      if (voRelEl[0].includes(`Id="${rIdToRemove}"`)) {
        voTarget = voRelEl[0].match(/Target="([^"]*)"/)[1];
        break;
      }
    }
    const voSheetFile = `xl/${voTarget}`; // ex: xl/worksheets/sheet2.xml
    const voSheetName = voTarget.split("/").pop(); // ex: sheet2.xml
    const voSheetRelsFile = `xl/worksheets/_rels/${voSheetName}.rels`;

    let voCommentsFiles = [];
    if (zip.file(voSheetRelsFile)) {
      const voSheetRelsXml = await zip.file(voSheetRelsFile).async("string");
      const commentMatch = voSheetRelsXml.match(/Target="\.\.\/(comments\d+\.xml)"/);
      const vmlMatch = voSheetRelsXml.match(/Target="\.\.\/(drawings\/vmlDrawing\d+\.vml)"/);
      if (commentMatch) voCommentsFiles.push(`xl/${commentMatch[1]}`);
      if (vmlMatch) voCommentsFiles.push(`xl/${vmlMatch[1]}`);
    }

    [voSheetFile, voSheetRelsFile, ...voCommentsFiles].forEach((f) => {
      if (zip.file(f)) zip.remove(f);
    });

    // Retire l'entrée <sheet> du classeur
    workbookXml = workbookXml.replace(sheetToRemoveRe, "");
    // Retire la relation associée
    relsXml = relsXml.replace(new RegExp(`<Relationship\\b[^>]*Id="${rIdToRemove}"[^>]*\\/>`), "");
    // Retire les déclarations de type de contenu associées
    let contentTypesXml = await zip.file("[Content_Types].xml").async("string");
    contentTypesXml = contentTypesXml
      .replace(new RegExp(`<Override\\b[^>]*PartName="/${voSheetFile.replace("xl/", "xl\\/")}"[^>]*\\/>`), "")
      .replace(/<Override\b[^>]*PartName="\/xl\/comments\d+\.xml"[^>]*\/>/g, (m) =>
        voCommentsFiles.some((f) => m.includes(f.replace("xl/", ""))) ? "" : m
      );
    zip.file("[Content_Types].xml", contentTypesXml);

    console.log(`Onglet "RENTA VO" retiré (${voSheetFile}).`);
  }

  // S'assure que "RENTA VN" est bien l'onglet actif à l'ouverture
  workbookXml = workbookXml.includes("<workbookView")
    ? workbookXml.replace(/<workbookView\b[^>]*\/>/, (m) =>
        m.includes("activeTab") ? m.replace(/activeTab="\d+"/, 'activeTab="0"') : m.replace("/>", ' activeTab="0"/>')
      )
    : workbookXml;

  let vnSheetXml = await zip.file(sheetFile).async("string");
  if (vnSheetXml.includes("<sheetView")) {
    vnSheetXml = /tabSelected="1"/.test(vnSheetXml)
      ? vnSheetXml
      : vnSheetXml.replace(/<sheetView\b/, '<sheetView tabSelected="1" ');
  }
  zip.file(sheetFile, vnSheetXml);

  // Le calcChain devient obsolète après suppression d'un onglet ; Excel le régénère seul.
  if (zip.file("xl/calcChain.xml")) {
    zip.remove("xl/calcChain.xml");
    relsXml = relsXml.replace(/<Relationship\b[^>]*Target="calcChain\.xml"[^>]*\/>/, "");
    let ct = await zip.file("[Content_Types].xml").async("string");
    ct = ct.replace(/<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/, "");
    zip.file("[Content_Types].xml", ct);
  }

  zip.file("xl/workbook.xml", workbookXml);
  zip.file("xl/_rels/workbook.xml.rels", relsXml);

  // --- REF ODOO (C8) : nombre simple, sans le symbole € ---
  {
    let stylesXml = await zip.file("xl/styles.xml").async("string");
    const cellXfsMatch = stylesXml.match(/<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/);
    const currentCount = parseInt(cellXfsMatch[1], 10);
    const xfList = cellXfsMatch[2].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g);

    const finalVnSheetXml = await zip.file(sheetFile).async("string");
    const c8Match = finalVnSheetXml.match(/<c r="C8"[^>]*s="(\d+)"/);
    const c8StyleIdx = parseInt(c8Match[1], 10);
    const c8Xf = xfList[c8StyleIdx];

    // Clone le style de C8 en remplaçant son format numérique par un nombre simple (numFmtId 2 = "0.00")
    const newXf = c8Xf.replace(/numFmtId="\d+"/, 'numFmtId="1"');
    const newStylesXml = stylesXml.replace(
      /<cellXfs count="\d+">/,
      `<cellXfs count="${currentCount + 1}">`
    ).replace("</cellXfs>", `${newXf}</cellXfs>`);
    zip.file("xl/styles.xml", newStylesXml);

    const patchedVnSheetXml = finalVnSheetXml.replace(
      /<c r="C8"([^>]*?)s="\d+"/,
      `<c r="C8"$1s="${currentCount}"`
    );
    zip.file(sheetFile, patchedVnSheetXml);
    console.log("Format REF ODOO (C8) changé en nombre simple.");
  }

  const outPath = path.join(__dirname, "..", "public", "templates", "trame_renta_template.xlsx");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const outBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  fs.writeFileSync(outPath, outBuffer);
  console.log("Gabarit préparé :", outPath);
}

main().catch((e) => { console.error("ERREUR:", e); process.exit(1); });
