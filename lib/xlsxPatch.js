// Modifie un nombre limité de cellules dans un fichier .xlsx existant, en ne touchant
// QUE le texte XML de ces cellules précises — tout le reste du fichier (styles, mises en
// forme, dessins, feuilles annexes...) reste strictement identique, octet pour octet.
// Ceci évite les problèmes de compatibilité rencontrés en laissant une bibliothèque
// (exceljs, etc.) relire puis réécrire l'intégralité du classeur.

const JSZip = require("jszip");

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "&#10;");
}

function setCell(xml, ref, type, value) {
  const re = new RegExp(`<c r="${ref}"([^>]*?)(/>|>[\\s\\S]*?</c>)`);
  const m = xml.match(re);
  if (!m) {
    throw new Error(`Cellule ${ref} introuvable dans le gabarit Excel — la structure du fichier a peut-être changé.`);
  }
  const attrs = m[1];
  const sMatch = attrs.match(/\ss="(\d+)"/);
  const sAttr = sMatch ? ` s="${sMatch[1]}"` : "";

  let newCell;
  if (type === "number") {
    if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
      newCell = `<c r="${ref}"${sAttr}/>`;
    } else {
      newCell = `<c r="${ref}"${sAttr}><v>${Number(value)}</v></c>`;
    }
  } else {
    const str = value === null || value === undefined ? "" : String(value);
    if (str === "") {
      newCell = `<c r="${ref}"${sAttr}/>`;
    } else {
      newCell = `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(str)}</t></is></c>`;
    }
  }
  return xml.slice(0, m.index) + newCell + xml.slice(m.index + m[0].length);
}

function findSheetFile(workbookXml, relsXml, sheetName) {
  const sheetRe = /<sheet\b[^>]*\/>/g;
  let sm, rId = null;
  while ((sm = sheetRe.exec(workbookXml))) {
    if (sm[0].includes(`name="${sheetName}"`)) {
      const idMatch = sm[0].match(/r:id="(rId\d+)"/);
      if (idMatch) { rId = idMatch[1]; break; }
    }
  }
  if (!rId) throw new Error(`Onglet "${sheetName}" introuvable dans le gabarit.`);

  const relRe = /<Relationship\b[^>]*\/>/g;
  let relEl, target = null;
  while ((relEl = relRe.exec(relsXml))) {
    if (relEl[0].includes(`Id="${rId}"`)) {
      const t = relEl[0].match(/Target="([^"]*)"/);
      if (t) { target = t[1]; break; }
    }
  }
  if (!target) throw new Error(`Fichier de feuille introuvable pour l'onglet "${sheetName}".`);
  return `xl/${target.replace(/^\.?\/?/, "")}`;
}

/**
 * @param {Buffer} templateBuffer  contenu brut du fichier .xlsx gabarit
 * @param {string} sheetName       nom de l'onglet à modifier (ex: "RENTA VN")
 * @param {Object} values          { "C6": { type: "string", value: "Dupont" }, "E19": { type: "number", value: 123.4 }, ... }
 * @returns {Promise<Buffer>}
 */
async function fillTemplate(templateBuffer, sheetName, values) {
  const zip = await JSZip.loadAsync(templateBuffer);

  const workbookXml = await zip.file("xl/workbook.xml").async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels").async("string");
  const sheetFile = findSheetFile(workbookXml, relsXml, sheetName);

  let sheetXml = await zip.file(sheetFile).async("string");
  for (const [ref, entry] of Object.entries(values)) {
    if (!entry) continue;
    sheetXml = setCell(sheetXml, ref, entry.type, entry.value);
  }

  // Retire les valeurs mises en cache de toutes les formules : certains lecteurs (dont
  // LibreOffice en mode ligne de commande) n'actualisent pas ce cache tout seuls même avec
  // fullCalcOnLoad. L'absence de cache force un recalcul systématique, partout.
  sheetXml = sheetXml.replace(/(<f\b[^>]*(?:\/>|>[\s\S]*?<\/f>))<v>[\s\S]*?<\/v>/g, "$1");

  zip.file(sheetFile, sheetXml);

  // Force Excel à recalculer toutes les formules à l'ouverture du fichier.
  let wbXml = workbookXml;
  if (/<calcPr\b[^/]*\/>/.test(wbXml)) {
    wbXml = wbXml.replace(/<calcPr\b[^/]*\/>/, '<calcPr calcId="0" fullCalcOnLoad="1"/>');
  } else {
    wbXml = wbXml.replace("</workbook>", '<calcPr calcId="0" fullCalcOnLoad="1"/></workbook>');
  }
  zip.file("xl/workbook.xml", wbXml);

  // Le calcChain (cache de formules) devient obsolète après modification ; Excel le
  // régénère automatiquement s'il est absent. On le retire ainsi que ses références,
  // pour éviter toute incohérence entre les parties du fichier.
  if (zip.file("xl/calcChain.xml")) {
    zip.remove("xl/calcChain.xml");

    const relRe = /<Relationship\b[^>]*Target="calcChain\.xml"[^>]*\/>/;
    const cleanedRels = relsXml.replace(relRe, "");
    zip.file("xl/_rels/workbook.xml.rels", cleanedRels);

    const contentTypesXml = await zip.file("[Content_Types].xml").async("string");
    const cleanedContentTypes = contentTypesXml.replace(
      /<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/,
      ""
    );
    zip.file("[Content_Types].xml", cleanedContentTypes);
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

module.exports = { fillTemplate };
