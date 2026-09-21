/* Builds the site visit report as a Word file, entirely in the browser.
   Depends on docx.umd.js being loaded first. */

const D = () => window.docx;

const TW_PAGE  = 10080;  /* usable width in twips: letter 12240 less the 0.75in margins */

const RED = "A12B2A";
const GREY = "6B6560";

const NONE = { style: "none", size: 0, color: "FFFFFF" };
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE,
                    insideHorizontal: NONE, insideVertical: NONE };

function p(text, opts = {}) {
  const { Paragraph, TextRun } = D();
  return new Paragraph({
    spacing: { after: opts.after == null ? 60 : opts.after, before: opts.before || 0 },
    alignment: opts.align,
    children: [ new TextRun({
      text: text == null ? "" : String(text),
      bold: !!opts.bold,
      size: opts.size || 20,          /* half points, so 20 = 10pt */
      color: opts.color || "101010",
      font: "Calibri",
      allCaps: !!opts.caps
    }) ]
  });
}

/* Word and LibreOffice merge consecutive paragraphs that carry an identical border
   into one box, which collapsed four writing lines into a single rule. Nudging the
   colour by one step per line keeps them separate and is invisible on paper. */
function ruledLines(n) {
  const { Paragraph, TextRun } = D();
  const shades = ["C9C4BD", "C9C4BE", "C9C4BF", "C9C4C0", "C9C4C1", "C9C4C2"];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(new Paragraph({
      spacing: { after: 230 },
      border: { bottom: { style: "single", size: 4, color: shades[i % shades.length] } },
      children: [ new TextRun({ text: " ", size: 20, font: "Calibri" }) ]
    }));
  }
  return out;
}

function measure(blob) {
  return new Promise(res => {
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload  = () => { res({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(url); };
    im.onerror = () => { res(null); URL.revokeObjectURL(url); };
    im.src = url;
  });
}

/* Decodes a photo once and returns a report sized JPEG copy plus its true size.
   Stored photos are never changed. Tests can supply window.SVReportDecode. */
async function decodePhoto(blob) {
  if (typeof window !== "undefined" && window.SVReportDecode) return window.SVReportDecode(blob);
  const url = URL.createObjectURL(blob);
  try {
    const im = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Photo cannot be decoded"));
      image.src = url;
    });
    const scale = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(im.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(im.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Photo conversion unavailable");
    ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
    const copy = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!copy || !copy.size) throw new Error("Photo conversion failed");
    return { buf: await copy.arrayBuffer(), nw: im.naturalWidth, nh: im.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}

/* Scale into a box in inches without cropping. Returns pixels at 96 dpi. */
function fitBox(img, boxW, boxH) {
  const f = Math.min((boxW * 96) / img.nw, (boxH * 96) / img.nh);
  return { width: Math.round(img.nw * f), height: Math.round(img.nh * f) };
}
function shapeOf(img) { return img.nh > img.nw * 1.05 ? "portrait" : "landscape"; }

/* Uses logo.png from the app folder if it is there, otherwise falls back to type. */
async function logoBits() {
  try {
    const r = await fetch("logo.png", { cache: "no-cache" });
    if (!r.ok) return null;
    const blob = await r.blob();
    if (!blob || blob.size < 100) return null;
    const buf = await blob.arrayBuffer();
    /* the mark is a tall stacked lockup, so drive it off height, not width.
       96px at 96dpi is 1in, which matches how it prints on the letterhead. */
    const H = 96;
    let ratio = 1.36;
    const d = await measure(blob);
    if (d && d.h && d.w) ratio = d.h / d.w;
    return { buf, w: Math.round(H / ratio), h: H };
  } catch (e) { return null; }
}

const ADDRESS = "925 Tuckaseegee Road, Suite 110, Charlotte, NC 28208     704.377.2990     redlinedg.com";

/* title on the left, the Redline mark on the right, the way the letterhead sits */
function mastheadTable(logo) {
  const { Table, TableRow, TableCell, WidthType, Paragraph, ImageRun,
          AlignmentType, VerticalAlign } = D();
  const RIGHT = 1500;

  const left = [
    p("SITE VISIT REPORT", { bold: true, size: 32, after: 60 }),
    p(ADDRESS, { size: 15, color: GREY, after: 0 })
  ];
  const right = logo
    ? [ new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [
          new ImageRun({ data: logo.buf, transformation: { width: logo.w, height: logo.h } }) ] }) ]
    : [ p("REDLINE", { bold: true, size: 24, color: RED, align: AlignmentType.RIGHT, after: 0 }),
        p("DESIGN GROUP", { bold: true, size: 15, color: RED, align: AlignmentType.RIGHT, after: 0 }) ];

  return new Table({
    width: { size: TW_PAGE, type: WidthType.DXA },
    columnWidths: [TW_PAGE - RIGHT, RIGHT],
    borders: noBorders,
    rows: [ new TableRow({ children: [
      new TableCell({ width: { size: TW_PAGE - RIGHT, type: WidthType.DXA }, borders: noBorders,
        margins: { top: 0, bottom: 0 }, verticalAlign: VerticalAlign.BOTTOM, children: left }),
      new TableCell({ width: { size: RIGHT, type: WidthType.DXA }, borders: noBorders,
        margins: { top: 0, bottom: 0 }, verticalAlign: VerticalAlign.TOP, children: right })
    ]}) ]
  });
}

function redRule(after) {
  const { Paragraph } = D();
  return new Paragraph({
    spacing: { before: 90, after: after == null ? 220 : after },
    border: { bottom: { style: "single", size: 10, color: RED } },
    children: []
  });
}

function headerTable(visit, times) {
  const { Table, TableRow, TableCell, WidthType } = D();
  const rows = [
    ["Project",      visit.project || ""],
    ["Project No.",  visit.projNum || ""],
    ...(visit.projectAddress ? [["Address", visit.projectAddress]] : []),
    ...(visit.client ? [["Client / Owner", visit.client]] : []),
    ["Report No.",   "SVR-" + String(visit.num).padStart(3, "0") + (visit.revision ? "-R" + visit.revision : "")],
    ["Date",         new Date(visit.date).toLocaleDateString([], { weekday:"long", year:"numeric", month:"long", day:"numeric" })],
    ["Photo Time Range", times],
    ["Weather",      [visit.weather, visit.temp].filter(Boolean).join(", ")],
    ["Present",      visit.attendees || ""],
    ["Prepared By",  visit.preparedBy || ""],
    ["Company", visit.preparedCompany || "Redline Design Group"],
    ["Office Phone", visit.preparedOfficePhone || "704-377-2990"],
    ["Direct / Mobile", visit.preparedPhone || ""],
    ["Email", visit.preparedEmail || ""],
    ["Report Status", !visit.closed || visit.editing ? "DRAFT" : "Issued"],
    ...(visit.issuedAt ? [["Issued", new Date(visit.issuedAt).toLocaleString()]] : []),
    ...(visit.revision ? [["Revision", "R" + visit.revision + (visit.revisionReason ? " | " + visit.revisionReason : "")]] : [])
  ];
  const KEY = 1900;
  return new Table({
    width: { size: TW_PAGE, type: WidthType.DXA },
    columnWidths: [KEY, TW_PAGE - KEY],
    borders: noBorders,
    rows: rows.map(([k, v]) => new TableRow({ children: [
      new TableCell({ width: { size: KEY, type: WidthType.DXA }, borders: noBorders,
        margins: { top: 30, bottom: 30 }, children: [ p(k, { bold: true, size: 18, color: GREY, caps: true }) ] }),
      new TableCell({ width: { size: TW_PAGE - KEY, type: WidthType.DXA }, borders: noBorders,
        margins: { top: 30, bottom: 30 }, children: [ p(v, { size: 20 }) ] })
    ]}))
  });
}

/* ---------- photo observations ---------- */

const T = inches => Math.round(inches * 1440);
const COMMENT_LINE = { style: "single", size: 4, color: "D4D8DC" };
const commentBorders = { top: COMMENT_LINE, bottom: COMMENT_LINE, left: COMMENT_LINE, right: COMMENT_LINE };

function stampText(r) { return new Date(r.ts).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }); }

/* Observation heading, location, note (or ruled writing lines), owner and due. */
function observationText(r, blankLines) {
  const safety = r.tag === "Safety";
  const n = String(r.observationNumber).padStart(3, "0");
  const out = [ p("OBSERVATION " + n + (r.tag ? "   |   " + r.tag.toUpperCase() : ""), { bold: true, size: 20, color: RED }) ];
  const loc = [r.area, r.sheet].filter(Boolean).join("   |   ");
  if (loc) out.push(p(loc, { size: 17, color: safety ? RED : GREY, bold: safety, caps: true }));
  if (r.itemRef) out.push(p("Tracked item: " + r.itemRef, { size: 18, bold: true }));
  if (r.note) out.push(p(r.note, { size: 20, after: 120, bold: safety, color: safety ? RED : "101010" }));
  else { out.push(p("", { after: 40 })); ruledLines(blankLines).forEach(l => out.push(l)); }
  if (r.owner || r.due) out.push(p([r.owner ? "Owner: " + r.owner : "", r.due ? "Due: " + r.due : ""]
    .filter(Boolean).join("     "), { size: 18, bold: true, color: safety ? RED : GREY }));
  return out;
}

function imagePara(r, size, align) {
  const { Paragraph, ImageRun } = D();
  return new Paragraph({ alignment: align, keepNext: true, spacing: { after: 40 },
    children: [ new ImageRun({ data: r.img.buf, transformation: size }) ] });
}

function cell(width, children, opts = {}) {
  const { TableCell, WidthType, VerticalAlign } = D();
  return new TableCell({ width: { size: width, type: WidthType.DXA }, borders: opts.borders || noBorders,
    margins: opts.margins || { top: 0, bottom: 0, left: 0, right: 0 },
    verticalAlign: opts.valign || VerticalAlign.TOP, children });
}

function table(widths, rows) {
  const { Table, WidthType } = D();
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths, borders: noBorders, rows });
}

/* Estimated printed height in inches, used only to decide how rows share pages. */
function textHeight(r, widthIn, blankLines) {
  const perLine = Math.max(10, Math.floor(widthIn * 14));
  let h = 0.22 + ((r.area || r.sheet) ? 0.19 : 0) + (r.itemRef ? 0.19 : 0) + ((r.owner || r.due) ? 0.19 : 0);
  if (r.note) h += r.note.split("\n").reduce((s, line) => s + Math.max(1, Math.ceil(line.length / perLine)), 0) * 0.19 + 0.1;
  else h += 0.2 + blankLines * 0.33;
  return h + 0.17;
}

/* Layout "compact": photo left, comment right, three rows per page. */
const COMPACT = { photoCol: 3.5, box: [3.3, 2.5] };
function compactRow(r) {
  const { TableRow, AlignmentType } = D();
  const size = fitBox(r.img, COMPACT.box[0], COMPACT.box[1]);
  const photoW = T(COMPACT.photoCol), textW = TW_PAGE - photoW;
  return new TableRow({ cantSplit: (r.note || "").length < 1800, children: [
    cell(photoW, [ imagePara(r, size, AlignmentType.CENTER), p(stampText(r), { size: 15, color: GREY, after: 0, align: AlignmentType.CENTER }) ],
         { margins: { top: 120, bottom: 200, left: 0, right: 200 } }),
    cell(textW, observationText(r, 4), { borders: commentBorders, margins: { top: 120, bottom: 120, left: 160, right: 160 } })
  ]});
}
function compactPages(photos) {
  const pages = [];
  for (let i = 0; i < photos.length;) {
    const n = photos.slice(i, i + 3).some(r => (r.note || "").length > 450) ? 2 : 3;
    const group = photos.slice(i, i + n); i += n;
    pages.push([ table([T(COMPACT.photoCol), TW_PAGE - T(COMPACT.photoCol)], group.map(compactRow)) ]);
  }
  return pages;
}

/* Layout "large": landscape photos run wide with the comment beside them,
   portrait photos pair side by side with comments below. */
const LARGE = { wideCol: 4.75, wideBox: [4.55, 3.42], pairBox: [2.5, 3.33], budget: 9.1 };
function pairHeight(r, next) { return LARGE.pairBox[1] + 0.45 + Math.max(textHeight(r, 3.1, 3), textHeight(next, 3.1, 3)); }
function rowHeight(r) { return Math.max(LARGE.wideBox[1] + 0.55, textHeight(r, 1.9, 5)); }

function largeBlock(b) {
  const { TableRow } = D();
  const pad = { top: 120, bottom: 120, left: 140, right: 140 };
  const { AlignmentType } = D();
  if (b.kind === "wide" || b.kind === "tall") {
    const r = b.photos[0], photoW = T(LARGE.wideCol);
    return table([photoW, TW_PAGE - photoW], [ new TableRow({ cantSplit: true, children: [
      cell(photoW, [ imagePara(r, fitBox(r.img, LARGE.wideBox[0], LARGE.wideBox[1]), AlignmentType.CENTER),
                     p(stampText(r), { size: 15, color: GREY, after: 0, align: AlignmentType.CENTER }) ], { margins: { top: 0, bottom: 0, left: 0, right: 180 } }),
      cell(TW_PAGE - photoW, observationText(r, 5), { borders: commentBorders, margins: pad })
    ]}) ]);
  }
  const gap = T(0.25), col = Math.floor((TW_PAGE - gap) / 2), widths = [col, gap, TW_PAGE - gap - col];
  const [a, c] = b.photos;
  const pic = r => [ imagePara(r, fitBox(r.img, LARGE.pairBox[0], LARGE.pairBox[1]), AlignmentType.CENTER),
                     p(stampText(r), { size: 15, color: GREY, after: 60, align: AlignmentType.CENTER }) ];
  return table(widths, [
    new TableRow({ cantSplit: true, children: [ cell(widths[0], pic(a)), cell(gap, [p("")]), cell(widths[2], pic(c)) ] }),
    new TableRow({ cantSplit: ((a.note || "").length + (c.note || "").length) < 1500, children: [
      cell(widths[0], observationText(a, 3), { borders: commentBorders, margins: pad }),
      cell(gap, [p("")]),
      cell(widths[2], observationText(c, 3), { borders: commentBorders, margins: pad })
    ]})
  ]);
}
/* Fills pages in photo order. Two portraits in a row share a pair row when it fits;
   otherwise a portrait takes a single row so pages are not left half empty. */
function largePages(photos) {
  const pages = [];
  let page = [], used = 0, i = 0;
  const add = b => { used += b.h + (page.length ? 0.15 : 0); page.push(largeBlock(b)); };
  const room = h => used + h + (page.length ? 0.15 : 0) <= LARGE.budget;
  while (i < photos.length) {
    const r = photos[i], next = photos[i + 1];
    const canPair = r.shape === "portrait" && next && next.shape === "portrait";
    if (canPair && room(pairHeight(r, next))) { add({ kind: "pair", photos: [r, next], h: pairHeight(r, next) }); i += 2; continue; }
    if (page.length && room(rowHeight(r))) { add({ kind: r.shape === "portrait" ? "tall" : "wide", photos: [r], h: rowHeight(r) }); i++; continue; }
    if (page.length) { pages.push(page); page = []; used = 0; continue; }
    if (canPair) { add({ kind: "pair", photos: [r, next], h: pairHeight(r, next) }); i += 2; }
    else { add({ kind: r.shape === "portrait" ? "tall" : "wide", photos: [r], h: rowHeight(r) }); i++; }
  }
  if (page.length) pages.push(page);
  return pages;
}

const LAYOUTS = {
  compact: { label: "Photo left, comment right", pages: compactPages },
  large: { label: "Large photos, fitted to shape", pages: largePages }
};

function openItemsTable(items) {
  const { Table, TableRow, TableCell, WidthType } = D();
  const line = { style: "single", size: 4, color: "C9C4BD" };
  const b = { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line };
  const head = ["Item", "Description", "First Noted", "Owner", "Due", "Status"];
  const widths = [900, 3450, 1450, 1450, 1200, 1630];   /* sums to TW_PAGE */

  const rows = [ new TableRow({ tableHeader: true, children: head.map((h, i) =>
    new TableCell({ width: { size: widths[i], type: WidthType.DXA }, borders: b,
      shading: { fill: "EFEDEA" }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [ p(h, { bold: true, size: 17, caps: true, color: GREY }) ] })) }) ];

  items.forEach((it, i) => {
    const cells = [
      it.ref,
      (it.note || "Photo item with no description") + (it.area ? "\nArea: " + it.area : "") + (it.update ? "\nThis visit: " + it.update : ""),
      "SVR " + String(it.firstVisitNum).padStart(3,"0") + "\n" + new Date(it.firstNoted).toLocaleDateString(),
      it.owner || "",
      it.due || "",
      it.status === "Not reviewed" ? "Open; not reviewed this visit" : it.status
    ];
    rows.push(new TableRow({ children: cells.map((c, j) =>
      new TableCell({ width: { size: widths[j], type: WidthType.DXA }, borders: b,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        shading: it.tag === "Safety" ? { fill: "FFF1F0" } : undefined,
        children: [ p(c, { size: 18, bold: it.tag === "Safety", color: it.tag === "Safety" ? RED : "101010" }) ] })) }));
  });

  return new Table({ width: { size: TW_PAGE, type: WidthType.DXA },
    columnWidths: widths, borders: b, rows });
}

const LIMITATIONS =
  "This report records observations made during a periodic visit to the site and does not constitute " +
  "an exhaustive or continuous inspection of the Work. The Architect is not responsible for construction " +
  "means, methods, techniques, sequences, or procedures, or for safety precautions and programs in " +
  "connection with the Work. Observations recorded here do not relieve the Contractor of the obligation " +
  "to perform the Work in accordance with the Contract Documents. Work not observed or not noted is " +
  "neither approved nor accepted. Photographs represent conditions at the time of the visit only. " +
  "";

async function buildReport(visit, recs) {
  const { Document, Packer, Paragraph, TextRun, ImageRun, Footer, PageNumber, AlignmentType } = D();

  const omitted = recs.filter(r => r.omit).length;
  const sorted = recs.filter(r => !r.omit).map(r => ({...r})).sort((a, b) => a.ts - b.ts);
  const times = sorted.length
    ? new Date(sorted[0].ts).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" }) + " to " +
      new Date(sorted[sorted.length - 1].ts).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })
    : "";

  const items = visit.legacyReportItems || visit.items || [];

  for (const r of sorted) { const item = items.find(it => it.photoId === r.id || (it.followupPhotoIds || []).includes(r.id)); if (item) r.itemRef = item.ref; }
  sorted.forEach((r,i) => r.observationNumber = i + 1);
  const safetyPhotos = sorted.filter(r => r.tag === "Safety");
  const safetyItems = items.filter(it => it.tag === "Safety" || safetyPhotos.some(r => r.id === it.photoId));
  const otherItems = items.filter(it => !safetyItems.includes(it));
  const otherPhotos = sorted.filter(r => r.tag !== "Safety");
  const logo = await logoBits();

  const body = [
    mastheadTable(logo),
    redRule(),
    headerTable(visit, times),
    p("", { after: 200 })
  ];
  if (safetyPhotos.length || safetyItems.length) {
    body.push(p("SAFETY ITEMS: PRIORITY REVIEW", {bold:true, color:RED, size:28, after:160}));
    if (safetyItems.length) body.push(openItemsTable(safetyItems.map(it => ({...it,tag:"Safety"}))));
    if (safetyPhotos.length) body.push(p("Safety photo observations: " + safetyPhotos.map(r=>String(r.observationNumber).padStart(3,"0")).join(", ") + ". Listed first in Photo Observations.",{bold:true,color:RED,after:120}));
    
    body.push(redRule());
  }
  body.push(p("GENERAL NOTES AND OBSERVATIONS", {bold:true,size:20,color:GREY,after:100}));
  body.push(p(visit.generalNotes || "No general notes entered.", {after:200}));
  if (!sorted.length) body.push(p(omitted ? "No photographs selected for this report." : "No photographs recorded during this visit.", {after:200}));
  
  if (otherItems.length) {
    body.push(p("ITEM STATUS", {bold:true,size:20,color:GREY,before:240,after:160}));
    body.push(openItemsTable(otherItems));
  }

  body.push(p("", { after: 200 }));
  body.push(p("LIMITATIONS OF THIS REPORT", { bold: true, size: 17, color: GREY, caps: true, after: 80 }));
  body.push(p(LIMITATIONS, { size: 16, color: GREY, after: 200 }));
  body.push(p("DISTRIBUTION", { bold: true, size: 17, color: GREY, caps: true, after: 80 }));
  body.push(p(visit.distribution || "Owner, Contractor, File", { size: 16, color: GREY }));

  if (sorted.length) {
    const ordered = [...safetyPhotos, ...otherPhotos];
    for (const r of ordered) {
      try { r.img = await decodePhoto(r.blob); }
      catch (e) { throw new Error("could not read photo " + String(r.observationNumber).padStart(3, "0") + " (" + (e && e.message ? e.message : "unknown") + ")"); }
      r.shape = shapeOf(r.img);
    }
    const layout = LAYOUTS[visit.reportLayout] || LAYOUTS.compact;
    for (const page of layout.pages(ordered)) {
      body.push(new Paragraph({ pageBreakBefore: true, keepNext: true, spacing: { after: 120 },
        children: [ new TextRun({ text: "PHOTO OBSERVATIONS", bold: true, size: 22 }) ] }));
      page.forEach((t, i) => { if (i) body.push(p("", { after: 160 })); body.push(t); });
    }
  }
  body.push(p("", { after: 0 }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      footers: { default: new Footer({ children: [ new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                                  size: 15, color: GREY, font: "Calibri" }) ]
      })]}) },
      children: body
    }]
  });

  return Packer.toBlob(doc);
}

function reportFileName(visit) {
  const d = new Date(visit.date),pad=n=>String(n).padStart(2,"0");
  const project=String(visit.projNum||visit.project||"Project").normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/g,'').slice(0,90)||'Project';
  return project + "_SVR-" + String(visit.num).padStart(3,"0") + (visit.revision?"-R"+visit.revision:"") + "_" + d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()) + (!visit.closed||visit.editing?"_DRAFT":"") + ".docx";
}

window.SVReport = { buildReport, reportFileName, layouts: Object.fromEntries(Object.entries(LAYOUTS).map(([k, v]) => [k, v.label])) };
