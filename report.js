/* Builds the site visit report as a Word file, entirely in the browser.
   Depends on docx.umd.js being loaded first. */

const D = () => window.docx;

const TW_PAGE  = 9360;   /* usable width in twips on letter with 1in margins */
const TW_PHOTO = 4100;
const TW_TEXT  = TW_PAGE - TW_PHOTO;
const PHOTO_PX = 264;    /* 2.75in at 96dpi */

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

function ruledLines(n) {
  const { Paragraph } = D();
  const line = { style: "single", size: 4, color: "C9C4BD" };
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(new Paragraph({ spacing: { after: 200 }, border: { bottom: line }, children: [] }));
  }
  return out;
}

async function imageBits(blob) {
  const buf = await blob.arrayBuffer();
  const bmp = await createImageBitmap(blob);
  const h = Math.round(PHOTO_PX * (bmp.height / bmp.width));
  bmp.close && bmp.close();
  return { buf, w: PHOTO_PX, h };
}

function headerTable(visit, times) {
  const { Table, TableRow, TableCell, WidthType } = D();
  const rows = [
    ["Project",      visit.project || ""],
    ["Project No.",  visit.projNum || ""],
    ["Report No.",   "SVR " + String(visit.num).padStart(3, "0")],
    ["Date",         new Date(visit.date).toLocaleDateString([], { weekday:"long", year:"numeric", month:"long", day:"numeric" })],
    ["Time On Site", times],
    ["Weather",      [visit.weather, visit.temp].filter(Boolean).join(", ")],
    ["Present",      visit.attendees || ""],
    ["Prepared By",  visit.preparedBy || ""]
  ];
  return new Table({
    width: { size: TW_PAGE, type: WidthType.DXA },
    borders: noBorders,
    rows: rows.map(([k, v]) => new TableRow({ children: [
      new TableCell({ width: { size: 2000, type: WidthType.DXA }, borders: noBorders,
        margins: { top: 30, bottom: 30 }, children: [ p(k, { bold: true, size: 18, color: GREY, caps: true }) ] }),
      new TableCell({ width: { size: TW_PAGE - 2000, type: WidthType.DXA }, borders: noBorders,
        margins: { top: 30, bottom: 30 }, children: [ p(v, { size: 20 }) ] })
    ]}))
  });
}

async function observationTable(recs) {
  const { Table, TableRow, TableCell, WidthType, Paragraph, ImageRun, VerticalAlign } = D();
  const rows = [];

  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    const n = String(i + 1).padStart(3, "0");
    const img = await imageBits(r.blob);

    const right = [ p("OBSERVATION " + n + (r.tag ? "   |   " + r.tag.toUpperCase() : ""),
                      { bold: true, size: 20, color: RED }) ];

    const loc = [r.area, r.sheet].filter(Boolean).join("   |   ");
    if (loc) right.push(p(loc, { size: 17, color: GREY, caps: true }));

    if (r.note) {
      right.push(p(r.note, { size: 20, after: 120 }));
    } else {
      right.push(p("", { after: 40 }));
      ruledLines(4).forEach(l => right.push(l));
    }

    if (r.owner || r.due) {
      right.push(p([r.owner ? "Owner: " + r.owner : "", r.due ? "Due: " + r.due : ""]
                   .filter(Boolean).join("     "), { size: 18, bold: true, color: GREY }));
    }

    rows.push(new TableRow({
      cantSplit: false,
      children: [
        new TableCell({
          width: { size: TW_PHOTO, type: WidthType.DXA },
          borders: noBorders,
          margins: { top: 120, bottom: 240, right: 200 },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [
              new ImageRun({ data: img.buf, transformation: { width: img.w, height: img.h } })
            ]}),
            p(new Date(r.ts).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }),
              { size: 15, color: GREY })
          ]
        }),
        new TableCell({
          width: { size: TW_TEXT, type: WidthType.DXA },
          borders: noBorders,
          margins: { top: 120, bottom: 240 },
          verticalAlign: VerticalAlign.TOP,
          children: right
        })
      ]
    }));
  }

  return new Table({ width: { size: TW_PAGE, type: WidthType.DXA }, borders: noBorders, rows });
}

function openItemsTable(items) {
  const { Table, TableRow, TableCell, WidthType } = D();
  const line = { style: "single", size: 4, color: "C9C4BD" };
  const b = { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line };
  const head = ["Item", "Description", "First Noted", "Owner", "Due", "Status"];
  const widths = [900, 4000, 1200, 1400, 1000, 860];

  const rows = [ new TableRow({ tableHeader: true, children: head.map((h, i) =>
    new TableCell({ width: { size: widths[i], type: WidthType.DXA }, borders: b,
      shading: { fill: "EFEDEA" }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [ p(h, { bold: true, size: 17, caps: true, color: GREY }) ] })) }) ];

  items.forEach((it, i) => {
    const cells = [
      String(i + 1).padStart(3, "0"),
      it.note || "(no description)",
      new Date(it.ts).toLocaleDateString(),
      it.owner || "",
      it.due || "",
      "Open"
    ];
    rows.push(new TableRow({ children: cells.map((c, j) =>
      new TableCell({ width: { size: widths[j], type: WidthType.DXA }, borders: b,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [ p(c, { size: 18 }) ] })) }));
  });

  return new Table({ width: { size: TW_PAGE, type: WidthType.DXA }, borders: b, rows });
}

const LIMITATIONS =
  "This report records observations made during a periodic visit to the site and does not constitute " +
  "an exhaustive or continuous inspection of the Work. The Architect is not responsible for construction " +
  "means, methods, techniques, sequences, or procedures, or for safety precautions and programs in " +
  "connection with the Work. Observations recorded here do not relieve the Contractor of the obligation " +
  "to perform the Work in accordance with the Contract Documents. Work not observed or not noted is " +
  "neither approved nor accepted. Photographs represent conditions at the time of the visit only. " +
  "[PLACEHOLDER. Confirm against RDG standard language before issue.]";

async function buildReport(visit, recs) {
  const { Document, Packer, Paragraph, TextRun, Footer, PageNumber, AlignmentType } = D();

  const sorted = recs.slice().sort((a, b) => a.ts - b.ts);
  const times = sorted.length
    ? new Date(sorted[0].ts).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" }) + " to " +
      new Date(sorted[sorted.length - 1].ts).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })
    : "";

  const items = sorted.filter(r => r.tag === "Issue" || r.tag === "Action");

  const body = [
    p("REDLINE DESIGN GROUP", { bold: true, size: 24, color: RED, after: 0 }),
    p("925 Tuckaseegee Road, Suite 110, Charlotte, NC 28208   |   704.377.2990", { size: 15, color: GREY, after: 240 }),
    p("SITE VISIT REPORT", { bold: true, size: 30, after: 200 }),
    headerTable(visit, times),
    p("", { after: 200 }),
    p("OBSERVATIONS", { bold: true, size: 20, color: GREY, caps: true, after: 160 }),
    await observationTable(sorted)
  ];

  if (items.length) {
    body.push(p("", { after: 240 }));
    body.push(p("OPEN ITEMS", { bold: true, size: 20, color: GREY, caps: true, after: 160 }));
    body.push(openItemsTable(items));
  }

  body.push(p("", { after: 300 }));
  body.push(p("LIMITATIONS OF THIS REPORT", { bold: true, size: 17, color: GREY, caps: true, after: 80 }));
  body.push(p(LIMITATIONS, { size: 16, color: GREY, after: 200 }));
  body.push(p("DISTRIBUTION", { bold: true, size: 17, color: GREY, caps: true, after: 80 }));
  body.push(p("Owner, Contractor, File   [PLACEHOLDER]", { size: 16, color: GREY }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
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
  const d = new Date(visit.date);
  const pad = n => String(n).padStart(2, "0");
  const num = (visit.projNum || "PROJ").replace(/[^A-Za-z0-9._-]/g, "");
  return num + "_SVR-" + String(visit.num).padStart(3, "0") + "_" +
         d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()) + ".docx";
}

window.SVReport = { buildReport, reportFileName };
