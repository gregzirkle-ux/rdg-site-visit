/* Builds the site visit report as a Word file, entirely in the browser.
   Depends on docx.umd.js being loaded first.

   v18: the report uses real Word styles (Heading 1, Heading 2, RDG Body, RDG Comment, RDG Meta)
   so it can be restyled or navigated in Word, fixed width tables so editing never shifts photos,
   a running header on every page after the first, and a size budget that keeps the file small
   enough to email. */

const D = () => window.docx;

const TW_PAGE  = 10080;  /* usable width in twips: letter 12240 less the 0.85in margins */
const FONT = "Calibri";
const FONT_LIGHT = "Calibri Light";

const RED = "A12B2A";
const INK = "1A1816";
const GREY = "6B6560";
const HAIR = "D9D4CD";

const NONE = { style: "none", size: 0, color: "FFFFFF" };
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE,
                    insideHorizontal: NONE, insideVertical: NONE };
const HAIRLINE = { style: "single", size: 4, color: HAIR };

/* Email budget. Office email refuses messages over about 20 MB, and an attachment grows by about
   a third on its way through email, so a 15 MB Word file is the safe line (about 20 MB in transit).
   Photos are only compressed further when a visit has enough photos to need it, and every step
   stays sharp enough to zoom into on a PDF (the smallest still prints at over 300 dpi in the
   standard layout). Change EMAIL_LIMIT here if the office limit changes. */
const EMAIL_LIMIT = 15 * 1048576;
const REPORT_BUDGET = 14.2 * 1048576;
const PHOTO_TIERS = [
  { px: 1800, q: 0.82, label: "Full report quality" },
  { px: 1600, q: 0.80, label: "High quality" },
  { px: 1400, q: 0.78, label: "High quality, compact" },
  { px: 1200, q: 0.76, label: "Compact" },
  { px: 1000, q: 0.72, label: "Most compact" }
];

function run(text, o = {}) {
  const { TextRun } = D();
  return new TextRun({ text: text == null ? "" : String(text), bold: !!o.bold, size: o.size, color: o.color,
    font: o.font, allCaps: !!o.caps, characterSpacing: o.tracking, italics: !!o.italics });
}

function p(text, opts = {}) {
  const { Paragraph } = D();
  return new Paragraph({
    style: opts.style,
    spacing: { after: opts.after == null ? 60 : opts.after, before: opts.before || 0 },
    alignment: opts.align, keepNext: !!opts.keepNext, pageBreakBefore: !!opts.pageBreakBefore,
    children: [ run(text, { bold: opts.bold, size: opts.size, color: opts.color, caps: opts.caps, tracking: opts.tracking, font: opts.font }) ]
  });
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

/* Decodes a photo and returns a report sized JPEG copy plus its true size.
   Stored photos are never changed. Tests can supply window.SVReportDecode. */
async function decodePhoto(blob, tier = PHOTO_TIERS[0]) {
  if (typeof window !== "undefined" && window.SVReportDecode) return window.SVReportDecode(blob, tier);
  const url = URL.createObjectURL(blob);
  try {
    const im = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Photo cannot be decoded"));
      image.src = url;
    });
    const scale = Math.min(1, tier.px / Math.max(im.naturalWidth, im.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(im.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(im.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Photo conversion unavailable");
    ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
    const copy = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", tier.q));
    canvas.width = canvas.height = 1;  /* release the bitmap quickly on phones */
    if (!copy || !copy.size) throw new Error("Photo conversion failed");
    return { buf: await copy.arrayBuffer(), nw: im.naturalWidth, nh: im.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}

/* Encodes every report photo at the best tier that keeps the file inside the budget.
   The first pass shows how large the photos run; at most one or two more passes follow. */
async function encodePhotos(photos, onProgress) {
  const encodeAll = async tier => {
    let bytes = 0, i = 0;
    for (const r of photos) {
      try { r.img = await decodePhoto(r.blob, tier); }
      catch (e) { throw new Error("could not read photo " + String(r.observationNumber).padStart(3, "0") + " (" + (e && e.message ? e.message : "unknown") + ")"); }
      r.shape = shapeOf(r.img); bytes += r.img.buf.byteLength;
      if (onProgress) onProgress(++i, photos.length);
    }
    return bytes;
  };
  let t = 0, bytes = await encodeAll(PHOTO_TIERS[0]);
  while (bytes > REPORT_BUDGET && t < PHOTO_TIERS.length - 1) {
    /* Jump straight to the tier the estimate says will fit, rather than stepping one at a time. */
    const ratio = REPORT_BUDGET / bytes;
    let next = t + 1;
    while (next < PHOTO_TIERS.length - 1 && Math.pow(PHOTO_TIERS[next].px / PHOTO_TIERS[t].px, 2) > ratio) next++;
    t = next; bytes = await encodeAll(PHOTO_TIERS[t]);
  }
  return { tier: t, label: PHOTO_TIERS[t].label, px: PHOTO_TIERS[t].px, photoBytes: bytes };
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
const T = inches => Math.round(inches * 1440);

function table(widths, rows, opts = {}) {
  const { Table, WidthType, TableLayoutType } = D();
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths, layout: TableLayoutType.FIXED, borders: opts.borders || noBorders, rows });
}
function cell(width, children, opts = {}) {
  const { TableCell, WidthType, VerticalAlign } = D();
  return new TableCell({ width: { size: width, type: WidthType.DXA }, borders: opts.borders || noBorders,
    margins: opts.margins || { top: 0, bottom: 0, left: 0, right: 0 }, shading: opts.shading,
    columnSpan: opts.span, verticalAlign: opts.valign || VerticalAlign.TOP, children });
}

/* ---------- first page ---------- */

/* title on the left, the Redline mark on the right, the way the letterhead sits */
function mastheadTable(logo) {
  const { TableRow, Paragraph, ImageRun, AlignmentType, VerticalAlign } = D();
  const RIGHT = 1500;
  const left = [
    p("SITE VISIT REPORT", { bold: true, size: 32, after: 60, color: INK }),
    p(ADDRESS, { size: 15, color: GREY, after: 0 })
  ];
  const right = logo
    ? [ new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [
          new ImageRun({ data: logo.buf, transformation: { width: logo.w, height: logo.h } }) ] }) ]
    : [ p("REDLINE", { bold: true, size: 24, color: RED, align: AlignmentType.RIGHT, after: 0 }),
        p("DESIGN GROUP", { bold: true, size: 15, color: RED, align: AlignmentType.RIGHT, after: 0 }) ];
  return table([TW_PAGE - RIGHT, RIGHT], [ new TableRow({ children: [
    cell(TW_PAGE - RIGHT, left, { valign: VerticalAlign.BOTTOM }),
    cell(RIGHT, right)
  ]}) ]);
}

function redRule(after) {
  const { Paragraph } = D();
  return new Paragraph({
    spacing: { before: 90, after: after == null ? 220 : after },
    border: { bottom: { style: "single", size: 10, color: RED } },
    children: []
  });
}

function reportNo(visit) { return "SVR-" + String(visit.num).padStart(3, "0") + (visit.revision ? "-R" + visit.revision : ""); }
function longDate(ts) { return new Date(ts).toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }
function shortDate(ts) { return new Date(ts).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" }); }

/* Visit information as a two column title block, so page one keeps room for the summary. */
function headerTable(visit, times) {
  const { TableRow } = D();
  const left = [
    ["Project",      visit.project || ""],
    ["Project No.",  visit.projNum || ""],
    ...(visit.projectAddress ? [["Address", visit.projectAddress]] : []),
    ...(visit.client ? [["Client / Owner", visit.client]] : []),
    ["Report No.",   reportNo(visit)],
    ["Date",         longDate(visit.date)],
    ["Photo Times",  times],
    ["Weather",      [visit.weather, visit.temp].filter(Boolean).join(", ")],
    ["Present",      visit.attendees || ""]
  ];
  const right = [
    ["Prepared By",  visit.preparedBy || ""],
    ["Company",      visit.preparedCompany || "Redline Design Group"],
    ["Office Phone", visit.preparedOfficePhone || "704-377-2990"],
    ["Direct / Mobile", visit.preparedPhone || ""],
    ["Email",        visit.preparedEmail || ""],
    ["Report Status", !visit.closed || visit.editing ? "DRAFT" : "Issued"],
    ...(visit.issuedAt ? [["Issued", new Date(visit.issuedAt).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })]] : []),
    ...(visit.revision ? [["Revision", "R" + visit.revision + (visit.revisionReason ? " | " + visit.revisionReason : "")]] : [])
  ];
  const K = 1360, V = 3560, G = 240, widths = [K, V, G, K, TW_PAGE - K - V - G - K];
  const pad = { top: 40, bottom: 40, left: 0, right: 80 };
  const key = k => k ? [ p(k, { style: "RDGMeta", bold: true, caps: true, size: 14, tracking: 12, color: GREY, after: 0 }) ] : [ p("", { after: 0 }) ];
  const val = v => [ p(v == null ? "" : v, { style: "RDGBody", after: 0 }) ];
  const rows = [];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const a = left[i] || ["", ""], b = right[i] || ["", ""];
    rows.push(new TableRow({ children: [
      cell(widths[0], key(a[0]), { margins: pad }), cell(widths[1], val(a[1]), { margins: pad }),
      cell(widths[2], [ p("", { after: 0 }) ]),
      cell(widths[3], key(b[0]), { margins: pad }), cell(widths[4], val(b[1]), { margins: pad })
    ]}));
  }
  return table(widths, rows);
}

function sectionHeading(text, opts = {}) {
  const { Paragraph, HeadingLevel } = D();
  return new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, pageBreakBefore: !!opts.pageBreakBefore,
    children: [ run(String(text).toUpperCase(), { color: opts.color }) ] });
}

/* Items: hairline rows, no vertical lines. Safety rows carry a red bar and red type. */
function openItemsTable(items) {
  const { TableRow } = D();
  const head = ["Item", "Description", "First Noted", "Owner", "Due", "Status"];
  const widths = [860, 3560, 1300, 1420, 1440, 1500];   /* sums to TW_PAGE */
  const pad = { top: 70, bottom: 70, left: 90, right: 90 };
  const headBorders = { top: NONE, left: NONE, right: NONE, bottom: { style: "single", size: 8, color: INK } };
  const rows = [ new TableRow({ tableHeader: true, children: head.map((h, i) =>
    cell(widths[i], [ p(h, { style: "RDGMeta", bold: true, caps: true, size: 14, tracking: 12, color: GREY, after: 0 }) ],
      { borders: headBorders, margins: pad })) }) ];
  items.forEach(it => {
    const safety = it.tag === "Safety";
    const color = safety ? RED : INK;
    const desc = [ p(it.note || "Photo item with no description", { style: "RDGBody", bold: safety, color, after: (it.area || it.update) ? 30 : 0 }) ];
    if (it.area) desc.push(p("Location: " + it.area, { style: "RDGMeta", color: safety ? RED : GREY, after: it.update ? 30 : 0 }));
    if (it.update) desc.push(p("This visit: " + it.update, { style: "RDGMeta", color: safety ? RED : GREY, after: 0 }));
    const status = it.status === "Not reviewed" ? "Open; not reviewed this visit" : it.status;
    const cells = [
      [ p(it.ref, { style: "RDGBody", bold: true, color, after: 0 }) ],
      desc,
      [ p("SVR " + String(it.firstVisitNum).padStart(3, "0"), { style: "RDGBody", color, after: 0 }),
        p(new Date(it.firstNoted).toLocaleDateString(), { style: "RDGMeta", color: safety ? RED : GREY, after: 0 }) ],
      [ p(it.owner || "", { style: "RDGBody", color, after: 0 }) ],
      [ p(dueText(it.due), { style: "RDGBody", color, after: 0 }) ],
      [ p(status, { style: "RDGBody", bold: true, color: it.status === "Closed" ? GREY : color, after: 0 }) ]
    ];
    rows.push(new TableRow({ cantSplit: true, children: cells.map((c, j) => cell(widths[j], c, {
      margins: pad, shading: safety ? { fill: "FBF1F0" } : undefined,
      borders: { top: NONE, right: NONE, bottom: HAIRLINE,
        left: j === 0 && safety ? { style: "single", size: 18, color: RED } : NONE } })) }));
  });
  return table(widths, rows);
}

/* ---------- photo observations ---------- */

function stampText(r) { return new Date(r.ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function dueText(due) { return /^\d{4}-\d{2}-\d{2}$/.test(due || "") ? new Date(due + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : (due || ""); }

/* Under location headings the location is already printed, so only the sheet or room shows. */
function locLine(r) { return [r.showLocation ? photoLocation(r) : "", r.sheet].filter(Boolean).join("   |   "); }

/* Number and type, location, tracked item, the comment, then owner and due.
   A blank comment is one empty RDG Comment paragraph: click into it in Word and type. */
function observationText(r) {
  const { Paragraph } = D();
  const safety = r.tag === "Safety";
  const n = String(r.observationNumber).padStart(3, "0");
  const tagColor = safety ? RED : r.tag ? INK : GREY;
  const head = [ run(n, { font: FONT_LIGHT, size: 34, color: RED }) ];
  if (r.tag) head.push(run("   " + r.tag.toUpperCase(), { bold: true, size: 15, tracking: 30, color: tagColor }));
  const out = [ new Paragraph({ keepNext: true, spacing: { after: 40 }, children: head }) ];
  const loc = locLine(r);
  if (loc) out.push(p(loc, { style: "RDGMeta", caps: true, tracking: 16, bold: safety, color: safety ? RED : GREY, after: 40 }));
  if (r.itemRef) out.push(p("Tracked item " + r.itemRef, { style: "RDGMeta", bold: true, color: safety ? RED : GREY, after: 40 }));
  out.push(p(r.note || "", { style: "RDGComment", bold: safety, color: safety ? RED : undefined, before: 60, after: 80 }));
  if (r.owner || r.due) {
    const parts = [];
    if (r.owner) parts.push(run("OWNER  ", { bold: true, size: 13, tracking: 20, color: GREY }), run(r.owner, { size: 17, bold: true, color: safety ? RED : INK }));
    if (r.owner && r.due) parts.push(run("        "));
    if (r.due) parts.push(run("DUE  ", { bold: true, size: 13, tracking: 20, color: GREY }), run(dueText(r.due), { size: 17, bold: true, color: safety ? RED : INK }));
    out.push(new Paragraph({ spacing: { before: 40, after: 0 }, children: parts }));
  }
  return out;
}

function imagePara(r, size, align) {
  const { Paragraph, ImageRun } = D();
  return new Paragraph({ alignment: align, keepNext: true, spacing: { after: 50 },
    children: [ new ImageRun({ data: r.img.buf, transformation: size }) ] });
}
function caption(r, align) { return p(stampText(r), { style: "RDGMeta", size: 14, color: GREY, after: 0, align }); }

/* Estimated printed height in inches, used only to decide how rows share pages. */
function textHeight(r, widthIn) {
  const perLine = Math.max(10, Math.floor(widthIn * 14));
  let h = 0.36 + (locLine(r) ? 0.19 : 0) + (r.itemRef ? 0.19 : 0) + ((r.owner || r.due) ? 0.22 : 0);
  if (r.note) h += r.note.split("\n").reduce((s, line) => s + Math.max(1, Math.ceil(line.length / perLine)), 0) * 0.19 + 0.12;
  else h += 0.3;
  return h + 0.2;
}

/* Location heading inside the photo pages: Heading 2 with a red bar, kept with the photo below. */
const HEADING_H = 0.34;
function locationHeading(label, opts = {}) {
  const { Paragraph, HeadingLevel } = D();
  const children = [ run(String(label).toUpperCase()) ];
  if (opts.continued) children.push(run("   CONTINUED", { size: 13, color: GREY, bold: false, tracking: 30 }));
  return new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, pageBreakBefore: !!opts.pageBreakBefore, children });
}

/* Layout "compact": photo left, comment right, three rows per page, hairline between rows. */
const COMPACT = { photoCol: 3.45, box: [3.18, 2.38], row: 2.82, page: 9.15 };
const rowBorders = { top: NONE, left: NONE, right: NONE, bottom: HAIRLINE };
function compactRow(r) {
  const { TableRow, AlignmentType } = D();
  const size = fitBox(r.img, COMPACT.box[0], COMPACT.box[1]);
  const photoW = T(COMPACT.photoCol), textW = TW_PAGE - photoW;
  return new TableRow({ cantSplit: (r.note || "").length < 1800, children: [
    cell(photoW, [ imagePara(r, size, AlignmentType.LEFT), caption(r, AlignmentType.LEFT) ],
         { borders: rowBorders, margins: { top: 170, bottom: 170, left: 0, right: 240 } }),
    cell(textW, observationText(r), { borders: rowBorders, margins: { top: 140, bottom: 170, left: 60, right: 0 } })
  ]});
}
/* Three rows per page, two when a long comment is on the page. A heading takes about a third
   of a row, so a page with headings may hold one row fewer. Groups never share a table.
   A group that runs onto a new page repeats its heading, marked continued. */
function compactPages(groups) {
  const pages = [];
  let page = [], rows = 0, heads = 0, long = false, rowTable = null;
  const fits = (n, h, isLong) => n <= ((long || isLong) ? 2 : 3) && (n === 1 || n * COMPACT.row + h * HEADING_H <= COMPACT.page);
  for (const g of groups) {
    rowTable = null;
    g.photos.forEach((r, i) => {
      const isLong = (r.note || "").length > 450;
      const head = i === 0 && g.label ? 1 : 0;
      if (page.length && !fits(rows + 1, heads + head, isLong)) {
        pages.push(page); page = []; rows = 0; heads = 0; long = false; rowTable = null;
        if (i > 0 && g.label) { page.push({ heading: g.label, continued: true }); heads++; }
      }
      if (head) { page.push({ heading: g.label }); heads++; rowTable = null; }
      if (!rowTable) { rowTable = { rows: [] }; page.push(rowTable); }
      rowTable.rows.push(r); rows++; long = long || isLong;
    });
  }
  if (page.length) pages.push(page);
  return pages.map(items => items.map(it => it.heading ? { heading: it.heading, continued: !!it.continued }
    : table([T(COMPACT.photoCol), TW_PAGE - T(COMPACT.photoCol)], it.rows.map(compactRow))));
}

/* Layout "large": landscape photos run wide with the comment beside them,
   portrait photos pair side by side with comments below. */
const LARGE = { wideCol: 4.85, wideBox: [4.6, 3.45], pairBox: [2.6, 3.4], budget: 8.9 };
function pairHeight(r, next) { return LARGE.pairBox[1] + 0.45 + Math.max(textHeight(r, 3.1), textHeight(next, 3.1)); }
function rowHeight(r) { return Math.max(LARGE.wideBox[1] + 0.55, textHeight(r, 1.9)); }

function largeBlock(b) {
  const { TableRow, AlignmentType } = D();
  if (b.kind === "wide" || b.kind === "tall") {
    const r = b.photos[0], photoW = T(LARGE.wideCol);
    return table([photoW, TW_PAGE - photoW], [ new TableRow({ cantSplit: true, children: [
      cell(photoW, [ imagePara(r, fitBox(r.img, LARGE.wideBox[0], LARGE.wideBox[1]), AlignmentType.LEFT), caption(r, AlignmentType.LEFT) ],
        { borders: rowBorders, margins: { top: 170, bottom: 170, left: 0, right: 240 } }),
      cell(TW_PAGE - photoW, observationText(r), { borders: rowBorders, margins: { top: 140, bottom: 170, left: 60, right: 0 } })
    ]}) ]);
  }
  const gap = T(0.3), col = Math.floor((TW_PAGE - gap) / 2), widths = [col, gap, TW_PAGE - gap - col];
  const [a, c] = b.photos;
  const pic = r => [ imagePara(r, fitBox(r.img, LARGE.pairBox[0], LARGE.pairBox[1]), AlignmentType.LEFT), caption(r, AlignmentType.LEFT) ];
  const top = { top: 170, bottom: 60, left: 0, right: 0 }, bottom = { top: 60, bottom: 170, left: 0, right: 0 };
  return table(widths, [
    new TableRow({ cantSplit: true, children: [ cell(widths[0], pic(a), { margins: top }), cell(gap, [p("", { after: 0 })]), cell(widths[2], pic(c), { margins: top }) ] }),
    new TableRow({ cantSplit: ((a.note || "").length + (c.note || "").length) < 1500, children: [
      cell(widths[0], observationText(a), { borders: rowBorders, margins: bottom }),
      cell(gap, [p("", { after: 0 })], { borders: rowBorders }),
      cell(widths[2], observationText(c), { borders: rowBorders, margins: bottom })
    ]})
  ]);
}
/* Fills pages in photo order. Two portraits in a row share a pair row when it fits;
   otherwise a portrait takes a single row so pages are not left half empty.
   Pairs never cross a location heading, and a heading stays on the page of its first photo. */
function largePages(groups) {
  const pages = [];
  let page = [], used = 0;
  const add = b => { used += b.h + (page.length ? 0.1 : 0); page.push(largeBlock(b)); };
  const room = h => used + h + (page.length ? 0.1 : 0) <= LARGE.budget;
  for (const g of groups) {
    const photos = g.photos;
    let i = 0, head = g.label ? HEADING_H : 0;
    const place = () => { if (head) { used += head; page.push({ heading: g.label, continued: i > 0 }); head = 0; } };
    while (i < photos.length) {
      const r = photos[i], next = photos[i + 1];
      const canPair = r.shape === "portrait" && next && next.shape === "portrait";
      if (canPair && room(pairHeight(r, next) + head)) { place(); add({ kind: "pair", photos: [r, next], h: pairHeight(r, next) }); i += 2; continue; }
      if (page.length && room(rowHeight(r) + head)) { place(); add({ kind: r.shape === "portrait" ? "tall" : "wide", photos: [r], h: rowHeight(r) }); i++; continue; }
      if (page.length) { pages.push(page); page = []; used = 0; if (g.label && i > 0) head = HEADING_H; continue; }
      place();
      if (canPair) { add({ kind: "pair", photos: [r, next], h: pairHeight(r, next) }); i += 2; }
      else { add({ kind: r.shape === "portrait" ? "tall" : "wide", photos: [r], h: rowHeight(r) }); i++; }
    }
  }
  if (page.length) pages.push(page);
  return pages;
}

const LAYOUTS = {
  compact: { label: "Photo left, comment right", pages: compactPages },
  large: { label: "Large photos, fitted to shape", pages: largePages }
};

const LIMITATIONS =
  "This report records observations made during a periodic visit to the site and does not constitute " +
  "an exhaustive or continuous inspection of the Work. The Architect is not responsible for construction " +
  "means, methods, techniques, sequences, or procedures, or for safety precautions and programs in " +
  "connection with the Work. Observations recorded here do not relieve the Contractor of the obligation " +
  "to perform the Work in accordance with the Contract Documents. Work not observed or not noted is " +
  "neither approved nor accepted. Photographs represent conditions at the time of the visit only.";

/* Word styles. Change one here (or in Word's Styles pane) and the whole report follows. */
function reportStyles() {
  const { AlignmentType } = D();
  return {
    default: { document: { run: { font: FONT, size: 20, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "RDGBody", quickFormat: true,
        run: { font: FONT, size: 19, bold: true, color: INK, characterSpacing: 36 },
        paragraph: { spacing: { before: 280, after: 120 }, keepNext: true,
          border: { bottom: { style: "single", size: 4, color: HAIR, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "RDGBody", quickFormat: true,
        run: { font: FONT, size: 18, bold: true, color: INK, characterSpacing: 40 },
        paragraph: { spacing: { before: 160, after: 20 }, keepNext: true, indent: { left: 120 },
          border: { left: { style: "single", size: 24, color: RED, space: 6 } } } },
      { id: "RDGBody", name: "RDG Body", basedOn: "Normal", quickFormat: true,
        run: { font: FONT, size: 20, color: INK }, paragraph: { spacing: { after: 60, line: 264 } } },
      { id: "RDGComment", name: "RDG Comment", basedOn: "RDGBody", quickFormat: true,
        run: { font: FONT, size: 20, color: INK }, paragraph: { spacing: { after: 80, line: 276 } } },
      { id: "RDGMeta", name: "RDG Meta", basedOn: "Normal", quickFormat: true,
        run: { font: FONT, size: 15, color: GREY }, paragraph: { spacing: { after: 40 } } },
      { id: "RDGFine", name: "RDG Fine Print", basedOn: "Normal", quickFormat: true,
        run: { font: FONT, size: 15, color: GREY }, paragraph: { spacing: { after: 120, line: 252 }, alignment: AlignmentType.LEFT } }
    ]
  };
}

/* Pages after the first carry the project, report number and date in a quiet running line. */
function runningHeader(visit) {
  const { Header, Paragraph, TabStopType, TextRun, Tab } = D();
  const style = { size: 14, color: GREY, tracking: 24 };
  return new Header({ children: [ new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TW_PAGE }],
    border: { bottom: { style: "single", size: 4, color: HAIR, space: 6 } }, spacing: { after: 0 },
    children: [
      run((visit.project || "").toUpperCase() + (visit.projNum ? "   |   " + visit.projNum : ""), { ...style, bold: true, color: INK }),
      new TextRun({ children: [ new Tab() ] }),
      run("SITE VISIT REPORT   " + reportNo(visit) + "   |   " + shortDate(visit.date).toUpperCase() + (!visit.closed || visit.editing ? "   |   DRAFT" : ""), style)
    ] }) ] });
}
function pageFooter(withFirm) {
  const { Footer, Paragraph, TextRun, PageNumber, TabStopType, Tab } = D();
  return new Footer({ children: [ new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TW_PAGE }],
    children: [
      new TextRun({ text: withFirm ? "REDLINE DESIGN GROUP" : "", size: 13, color: GREY, font: FONT, characterSpacing: 30 }),
      new TextRun({ children: [ new Tab() ], size: 14, font: FONT }),
      new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 14, color: GREY, font: FONT })
    ] }) ] });
}

async function buildReport(visit, recs, opts = {}) {
  const { Document, Packer, Paragraph, TextRun } = D();

  const omitted = recs.filter(r => r.omit).length;
  const plan = photoPlan(visit, recs.map(r => ({...r})));
  const sorted = [...plan.ordered].sort((a, b) => a.ts - b.ts);
  const times = sorted.length
    ? new Date(sorted[0].ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " to " +
      new Date(sorted[sorted.length - 1].ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";

  const items = visit.legacyReportItems || visit.items || [];

  for (const r of sorted) { const item = items.find(it => it.photoId === r.id || (it.followupPhotoIds || []).includes(r.id)); if (item) r.itemRef = item.ref; }
  for (const r of sorted) { r.observationNumber = plan.numbers.get(r.id); r.showLocation = !plan.headings; }
  const safetyPhotos = sorted.filter(r => r.tag === "Safety").sort((a, b) => a.observationNumber - b.observationNumber);
  const safetyItems = items.filter(it => it.tag === "Safety" || safetyPhotos.some(r => r.id === it.photoId));
  const otherItems = items.filter(it => !safetyItems.includes(it));
  const logo = await logoBits();

  const body = [
    mastheadTable(logo),
    redRule(160),
    headerTable(visit, times)
  ];
  if (safetyPhotos.length || safetyItems.length) {
    body.push(sectionHeading("Safety: Priority Review", { color: RED }));
    if (safetyItems.length) body.push(openItemsTable(safetyItems.map(it => ({...it, tag: "Safety"}))));
    if (safetyPhotos.length) body.push(p("Safety photo observations: " + safetyPhotos.map(r => String(r.observationNumber).padStart(3, "0")).join(", ") + (plan.mode === "time" ? ". Listed first in Photo Observations." : "."), { style: "RDGBody", bold: true, color: RED, before: 100, after: 60 }));
  }
  body.push(sectionHeading("General Notes and Observations"));
  for (const para of String(visit.generalNotes || "No general notes entered.").split(/\n+/)) body.push(p(para, { style: "RDGBody", after: 100 }));
  if (!sorted.length) body.push(p(omitted ? "No photographs selected for this report." : "No photographs recorded during this visit.", { style: "RDGBody", after: 100 }));

  if (otherItems.length) {
    body.push(sectionHeading("Item Status"));
    body.push(openItemsTable(otherItems));
  }

  body.push(sectionHeading("Limitations of This Report", { color: GREY }));
  body.push(p(LIMITATIONS, { style: "RDGFine" }));
  body.push(p("DISTRIBUTION", { style: "RDGMeta", bold: true, tracking: 20, size: 14, before: 80, after: 30 }));
  body.push(p(visit.distribution || "Owner, Contractor, File", { style: "RDGFine", after: 0 }));

  let stats = { tier: 0, label: PHOTO_TIERS[0].label, px: PHOTO_TIERS[0].px, photoBytes: 0 };
  if (sorted.length) {
    stats = await encodePhotos(plan.ordered, opts.onProgress);
    const layout = LAYOUTS[visit.reportLayout] || LAYOUTS.compact;
    const groups = plan.groups.map(g => ({ label: plan.headings ? g.label : "", photos: g.photos }));
    layout.pages(groups).forEach((page, pi) => {
      /* The first photo page opens with the section heading. Later pages start on a new page;
         the running header names the report, so no heading repeats. */
      if (pi === 0) body.push(sectionHeading("Photo Observations", { pageBreakBefore: true }));
      page.forEach((t, i) => {
        const breakHere = pi > 0 && i === 0;
        if (t.heading) { body.push(locationHeading(t.heading, { continued: t.continued, pageBreakBefore: breakHere })); return; }
        if (breakHere) body.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 0 }, children: [ new TextRun({ text: "", size: 4 }) ] }));
        else if (i && !page[i - 1].heading) body.push(p("", { after: 0, size: 8 }));
        body.push(t);
      });
    });
  }
  body.push(p("", { after: 0 }));

  const doc = new Document({
    creator: visit.preparedBy || "Redline Design Group",
    title: (visit.project || "Project") + " " + reportNo(visit) + " Site Visit Report",
    styles: reportStyles(),
    sections: [{
      properties: { titlePage: true, page: { size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1000, left: 1080, header: 560, footer: 520 } } },
      headers: { default: runningHeader(visit), first: new (D().Header)({ children: [ new Paragraph({ children: [] }) ] }) },
      footers: { default: pageFooter(true), first: pageFooter(false) },
      children: body
    }]
  });

  const blob = await Packer.toBlob(doc);
  window.SVReport.lastStats = { ...stats, bytes: blob.size, photos: sorted.length, fitsEmail: blob.size <= EMAIL_LIMIT };
  return blob;
}

function reportFileName(visit) {
  const d = new Date(visit.date), pad = n => String(n).padStart(2, "0");
  const project = String(visit.projNum || visit.project || "Project").normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').slice(0, 90) || 'Project';
  return project + "_SVR-" + String(visit.num).padStart(3, "0") + (visit.revision ? "-R" + visit.revision : "") + "_" + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + (!visit.closed || visit.editing ? "_DRAFT" : "") + ".docx";
}

window.SVReport = { buildReport, reportFileName, EMAIL_LIMIT, REPORT_BUDGET, PHOTO_TIERS, lastStats: null,
  layouts: Object.fromEntries(Object.entries(LAYOUTS).map(([k, v]) => [k, v.label])) };
