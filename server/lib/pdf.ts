import PDFDocument from "pdfkit";

// Real, downloadable complaint PDF (Docs/06 §6). Returns a Buffer; the
// orchestrator stores it and serves it from /api/pdf/:id.

export interface PdfData {
  trackingId: string;
  department: string;
  area: string;
  lat?: number;
  lng?: number;
  ward?: number;
  issueType: string;
  severity: number;
  costMin: number;
  costMax: number;
  risk: string;
  subject: string;
  body: string;
  transcript?: string;
  transcriptLang?: string | null;
  photo?: Buffer;
}

const TEAL = "#0F6E66";
const INK = "#241B12";
const MUTED = "#6F6052";

export function buildComplaintPdf(d: PdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 54 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // letterhead
    doc.fillColor(TEAL).fontSize(20).font("Helvetica-Bold").text("Jagrik", { continued: true });
    doc.fillColor(MUTED).fontSize(11).font("Helvetica").text("  —  Citizen Civic Report");
    doc.moveDown(0.2);
    doc.strokeColor(TEAL).lineWidth(2).moveTo(54, doc.y).lineTo(541, doc.y).stroke();
    doc.moveDown(0.8);

    const row = (label: string, value: string) => {
      doc.fillColor(MUTED).fontSize(9).font("Helvetica-Bold").text(label.toUpperCase());
      doc.fillColor(INK).fontSize(11).font("Helvetica").text(value);
      doc.moveDown(0.5);
    };

    doc.fillColor(INK).fontSize(13).font("Helvetica-Bold").text(d.subject);
    doc.moveDown(0.6);

    row("Tracking ID", d.trackingId);
    row("Date", new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" }));
    row("To", d.department);
    row(
      "Location",
      `${d.area}${d.ward ? ` · Ward ${d.ward}` : ""}${
        d.lat && d.lng ? ` · ${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}` : ""
      }`,
    );
    row("Issue", `${d.issueType} · severity ${d.severity}/5 · est. ₹${d.costMin.toLocaleString("en-IN")}–${d.costMax.toLocaleString("en-IN")}`);
    if (d.risk) row("Risk", d.risk);

    doc.moveDown(0.4);
    doc.strokeColor("#E7D8C9").lineWidth(1).moveTo(54, doc.y).lineTo(541, doc.y).stroke();
    doc.moveDown(0.8);

    doc.fillColor(INK).fontSize(11).font("Helvetica").text(d.body, { align: "left", lineGap: 3 });

    if (d.photo) {
      doc.moveDown(1);
      doc.fillColor(MUTED).fontSize(9).font("Helvetica-Bold").text("PHOTO EVIDENCE");
      doc.moveDown(0.3);
      try {
        doc.image(d.photo, { fit: [320, 240] });
      } catch {
        doc.fillColor(MUTED).fontSize(10).font("Helvetica").text("(photo attached to email)");
      }
    }

    doc.moveDown(1.2);
    doc.fillColor(MUTED).fontSize(8.5).font("Helvetica").text("Filed via Jagrik on behalf of a citizen. See it. Say it. Solved.");

    doc.end();
  });
}
