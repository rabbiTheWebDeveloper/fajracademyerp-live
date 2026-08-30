import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Brand Color Palette ───────────────────────────────────────
type RGB = [number, number, number];

const C: Record<string, RGB> = {
  navy: [43, 57, 144], // #2b3990 (matches the blue badge)
  black: [0, 0, 0],
  gray: [211, 211, 211], // Light gray for table header
  white: [255, 255, 255],
};

function fill(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function textC(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }
function drawC(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }

function money(n: number): string {
  return Number(n || 0).toLocaleString("en-US");
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero Taka Only";
  const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  if (num < 0) return "Minus " + numberToWords(Math.abs(num));
  if (num > 999999999) return num.toString() + " Taka Only"; // Too large

  const n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0] as any] + " " + a[n[1][1] as any]) + "Crore " : "";
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0] as any] + " " + a[n[2][1] as any]) + "Lakh " : "";
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0] as any] + " " + a[n[3][1] as any]) + "Thousand " : "";
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0] as any] + " " + a[n[4][1] as any]) + "Hundred " : "";
  str += (Number(n[5]) !== 0) ? ((str !== "") ? "and " : "") + (a[Number(n[5])] || b[n[5][0] as any] + " " + a[n[5][1] as any]) : "";
  return str.trim() + " Taka Only";
}

const logoCache: Record<string, string> = {};

async function loadBrandLogo(): Promise<string | null> {
  const candidateUrls = ["/mainlogo.png", "/fajr-logo.png", "/logo.png", "/fajr-academy-logo.png"];
  for (const url of candidateUrls) {
    if (logoCache[url]) return logoCache[url];
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      if (base64) {
        logoCache[url] = base64;
        return base64;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

// Draw a fake barcode
function drawBarcode(doc: jsPDF, x: number, y: number, w: number, h: number, text: string) {
  fill(doc, C.black);
  let curX = x;
  while (curX < x + w) {
    const barW = Math.random() * 1.5 + 0.3; // random bar width
    if (curX + barW > x + w) break;
    if (Math.random() > 0.3) {
      doc.rect(curX, y, barW, h, "F");
    }
    curX += barW + Math.random() * 0.8;
  }
  // Draw barcode text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(text, x + w/2, y + h + 3, { align: "center" });
}

// Generate dynamic QR code or fallback to fake
async function getQRCodeBase64(data: string): Promise<string | null> {
  try {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

// Draw a fake QR code (fallback)
function drawFakeQRCode(doc: jsPDF, x: number, y: number, size: number) {
  fill(doc, C.black);
  const cells = 21;
  const cSize = size / cells;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      if ((i < 7 && j < 7) || (i > cells - 8 && j < 7) || (i < 7 && j > cells - 8)) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || i === cells - 1 || i === cells - 7 || j === cells - 1 || j === cells - 7) {
          doc.rect(x + j * cSize, y + i * cSize, cSize, cSize, "F");
        }
        if ((i >= 2 && i <= 4 && j >= 2 && j <= 4) || (i >= cells - 5 && i <= cells - 3 && j >= 2 && j <= 4) || (i >= 2 && i <= 4 && j >= cells - 5 && j <= cells - 3)) {
          doc.rect(x + j * cSize, y + i * cSize, cSize, cSize, "F");
        }
      } else {
        if (Math.random() > 0.5) doc.rect(x + j * cSize, y + i * cSize, cSize, cSize, "F");
      }
    }
  }
}

// Draw circular text (top arc - clockwise from left to right)
function drawCircularTextTop(
  doc: jsPDF,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number = 205,
  angleRangeDeg: number = 130
) {
  const chars = text.split("");
  const step = chars.length > 1 ? angleRangeDeg / (chars.length - 1) : 0;
  for (let i = 0; i < chars.length; i++) {
    const angleDeg = startAngleDeg + i * step;
    const rad = (angleDeg * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);
    const textAngle = -(angleDeg + 90);
    doc.text(chars[i], x, y, { align: "center", baseline: "middle", angle: textAngle });
  }
}

// Draw circular text (bottom arc - upright from left to right, NOT reversed!)
function drawCircularTextBottom(
  doc: jsPDF,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number = 155,
  angleRangeDeg: number = 130
) {
  const chars = text.split("");
  const step = chars.length > 1 ? angleRangeDeg / (chars.length - 1) : 0;
  for (let i = 0; i < chars.length; i++) {
    const angleDeg = startAngleDeg - i * step;
    const rad = (angleDeg * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);
    const textAngle = -(angleDeg - 90);
    doc.text(chars[i], x, y, { align: "center", baseline: "middle", angle: textAngle });
  }
}

// Draw the circular digital seal with Circular Text
async function drawDigitalStampSeal(doc: jsPDF, cx: number, cy: number, status: string, invoiceNo: string) {
  const r = 22; // outer radius
  const color = status.toLowerCase() === "paid" ? [18, 145, 95] as RGB : (status.toLowerCase() === "pending" ? [217, 119, 6] as RGB : [220, 38, 38] as RGB);
  
  // Outer rings
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(1.2);
  (doc as any).circle(cx, cy, r, "S");
  doc.setLineWidth(0.4);
  (doc as any).circle(cx, cy, r - 1.5, "S");
  (doc as any).circle(cx, cy, r - 15, "S"); // inner circle bounding the center text

  // Circular Text
  doc.setFont("helvetica", "bold");
  doc.setTextColor(color[0], color[1], color[2]);
  doc.setFontSize(8.5);
  
  // Top text: FAJR ACADEMY (span from top-left to top-right)
  drawCircularTextTop(doc, "F A J R   A C A D E M Y", cx, cy, r - 8, 205, 130);
  
  // Bottom text: FAJR ACADEMY (reading correctly from left to right along bottom)
  drawCircularTextBottom(doc, "F A J R   A C A D E M Y", cx, cy, r - 8, 155, 130);

  // Stars on left and right
  doc.setFontSize(12);
  doc.text("*", cx - (r - 8), cy, { align: "center", baseline: "middle" });
  doc.text("*", cx + (r - 8), cy, { align: "center", baseline: "middle" });

  // Center Text (PAID / UNPAID)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(12);
  doc.text(status.toUpperCase(), cx, cy, { align: "center", baseline: "middle" });
}

export async function generateInvoicePDF(txn: any, isPrint: boolean = false) {
  if (!txn) return;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [160, 240] }); // Custom small receipt size to match the proportions in the image
  const PW = doc.internal.pageSize.getWidth();   
  const PH = doc.internal.pageSize.getHeight();  
  const cx = PW / 2;

  // ── Transaction Data ──────────────────────────────────────────────────────
  const rawStatus = (txn.status || "pending").toLowerCase();
  const isPaid    = ["completed", "approved", "paid"].includes(rawStatus);
  const isPending = rawStatus === "pending" || rawStatus === "in_review";
  const statusLabel = isPaid ? "PAID" : isPending ? "PENDING" : "UNPAID";

  const amount    = Number(txn.amount || 0);
  const discount  = Number(txn.discount || 0);
  const totalDue  = Math.max(0, amount - discount);

  const invoiceNo = txn.invoiceId || txn.transactionId || `INV-${String(txn._id || "").slice(-8).toUpperCase()}`;
  const mrNo      = txn.mrNumber || invoiceNo;
  const issueDate = new Date(txn.createdAt || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).replace(/\//g, "-");
  const targetMonth = txn.month || new Date(txn.createdAt || Date.now()).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  
  const student      = txn.student || {};
  const studentName  = student.fullName || student.name || txn.studentName || "Valued Student";
  const studentId    = student.studentId || txn.studentId || "STU-001";
  
  // ── Dynamic Schedule & Teacher Extraction ───────────────────────────
  let dynamicSchedule: any = txn.schedule || student.scheduleInfo || null;
  const studentMongoId =
    student._id ||
    (typeof txn.student === "string" && txn.student.match(/^[0-9a-fA-F]{24}$/) ? txn.student : null);

  if (!dynamicSchedule && studentMongoId && typeof window !== "undefined") {
    try {
      const sRes = await fetch(`/api/schedules?studentId=${studentMongoId}`);
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData?.success && sData.schedule) {
          dynamicSchedule = sData.schedule;
        }
      }
    } catch {}
  }

  // Teacher Name extraction
  let teacherName =
    txn.teacher?.fullName ||
    txn.teacherName ||
    dynamicSchedule?.teacher?.fullName ||
    student.teacherInfo?.name ||
    student.teacher?.fullName ||
    student.teacherName ||
    student.assignedTeacher?.fullName ||
    txn.assignedTeacher ||
    "—";

  // Routine Days mapping (e.g. SAT, SUN, MON or MON, WED, FRI)
  const DAY_MAP: Record<string, string> = {
    saturday: "SAT",
    sunday: "SUN",
    monday: "MON",
    tuesday: "TUE",
    wednesday: "WED",
    thursday: "THU",
    friday: "FRI",
    sat: "SAT",
    sun: "SUN",
    mon: "MON",
    tue: "TUE",
    wed: "WED",
    thu: "THU",
    fri: "FRI",
  };

  const rawDays =
    txn.routine ||
    txn.weeklyDays ||
    txn.scheduleDays ||
    dynamicSchedule?.weekly_days_list ||
    (Array.isArray(dynamicSchedule?.day_times) ? dynamicSchedule.day_times.map((dt: any) => dt.day) : null) ||
    student.weekly_days_list ||
    student.routine ||
    student.schedule ||
    txn.days;

  let routineDays = "SAT, SUN, MON";
  if (Array.isArray(rawDays) && rawDays.length > 0) {
    routineDays = rawDays
      .map((d: any) => {
        const key = String(d?.day || d || "").trim().toLowerCase();
        return DAY_MAP[key] || key.slice(0, 3).toUpperCase();
      })
      .filter(Boolean)
      .join(", ");
  } else if (typeof rawDays === "string" && rawDays.trim()) {
    routineDays = rawDays.trim().toUpperCase();
  }

  const courseTitle  = txn.course?.title || txn.courseName || student.course || "Tuition Fee";
  const feeLabel     = (txn.type || "").toLowerCase().includes("admission") ? "Admission Fee" : courseTitle;
  
  const amountStr = money(totalDue);
  const words = numberToWords(totalDue);

  // ── 0. Watermark Background ────────────────────────────────────
  let logoPlaced = false;
  let logoData: string | null = null;
  try {
    logoData = await loadBrandLogo();
    if (logoData) {
      // Draw large, highly transparent logo in the center
      try {
        if ((doc as any).GState) {
          const gState = new (doc as any).GState({ opacity: 0.08 });
          (doc as any).saveGraphicsState();
          (doc as any).setGState(gState);
        }
      } catch {}
      // Make watermark logo much larger
      doc.addImage(logoData, "PNG", cx - 70, 75, 140, 40);
      try {
        if ((doc as any).GState) (doc as any).restoreGraphicsState();
      } catch {}
    }
  } catch {}

  // ── 1. Top Logo & Institution Info ─────────────────────────────
  try {
    if (logoData) {
      // Make top logo much larger
      doc.addImage(logoData, "PNG", cx - 50, 5, 100, 28);
      logoPlaced = true;
    }
  } catch {
    logoPlaced = false;
  }

  if (!logoPlaced) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    textC(doc, C.navy);
    doc.text("FAJR ACADEMY", cx, 20, { align: "center" });
    doc.setFontSize(10);
    textC(doc, C.black);
    doc.text("BALANCED EDUCATION FOR DUNYA AND AKHIRAH", cx, 26, { align: "center" });
  }

  // ── 2. "MONEY RECEIPT" Badge ───────────────────────────────────
  fill(doc, C.navy);
  doc.roundedRect(cx - 35, 35, 70, 10, 5, 5, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  textC(doc, C.white);
  doc.text("MONEY RECEIPT", cx, 42, { align: "center" });

  // ── 3. Main Box ────────────────────────────────────────────────
  const boxX = 40;
  const boxY = 50;
  const boxW = 160;
  const boxH = 95;
  
  drawC(doc, C.black);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "S");

  // Inside Box - Top Info
  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  textC(doc, C.black);
  
  // Row 1: MR No & Date
  doc.text("MR No: ", boxX + 5, boxY + 7);
  doc.setFont("times", "bold");
  doc.text(mrNo, boxX + 22, boxY + 7);
  
  doc.setFont("times", "normal");
  doc.text("Date: ", boxX + boxW - 40, boxY + 7);
  doc.setFont("times", "bold");
  doc.text(issueDate, boxX + boxW - 28, boxY + 7);

  // Row 2: Student Name & Teacher Name
  doc.setFont("times", "normal");
  doc.text("Student Name: ", boxX + 5, boxY + 14);
  doc.setFont("times", "bold");
  doc.text(studentName, boxX + 32, boxY + 14);

  doc.setFont("times", "normal");
  doc.text("Teacher: ", boxX + boxW - 68, boxY + 14);
  doc.setFont("times", "bold");
  doc.text(teacherName, boxX + boxW - 52, boxY + 14);

  // Row 3: Student ID & Routine
  doc.setFont("times", "normal");
  doc.text("Student ID: ", boxX + 5, boxY + 21);
  doc.setFont("times", "bold");
  doc.text(studentId, boxX + 28, boxY + 21);

  doc.setFont("times", "normal");
  doc.text("Routine: ", boxX + boxW - 68, boxY + 21);
  doc.setFont("times", "bold");
  doc.text(routineDays, boxX + boxW - 52, boxY + 21);

  // ── 4. Table ───────────────────────────────────────────────────
  const tY = boxY + 26;
  const col1 = 12; // SL width
  const colMonth = 25; // Month width
  const col3 = 30; // Amount width
  const col4 = 30; // Scholarship width
  const col2 = boxW - col1 - colMonth - col3 - col4; // Particulars width
  
  const x1 = boxX;
  const x2 = x1 + col1;
  const xMonth = x2 + col2;
  const x3 = xMonth + colMonth;
  const x4 = x3 + col3;
  const x5 = boxX + boxW;

  // Table Header Background
  fill(doc, C.gray);
  doc.rect(x1, tY, boxW, 10, "F");

  // Table Lines
  drawC(doc, C.black);
  doc.setLineWidth(0.2);
  doc.line(x1, tY, x5, tY); // top
  doc.line(x1, tY + 10, x5, tY + 10); // header bottom
  doc.line(x1, tY + 18, x5, tY + 18); // row 1 bottom
  doc.line(x1, tY + 26, x4, tY + 26); // total row bottom (stops at scholarship)
  doc.line(x1, tY + 32, x4, tY + 32); // in word bottom (stops at scholarship)

  // Vertical lines
  doc.line(x2, tY, x2, tY + 18); // SL | Particulars
  doc.line(xMonth, tY, xMonth, tY + 18); // Particulars | Month
  doc.line(x3, tY, x3, tY + 26); // Month | Amount
  doc.line(x4, tY, x4, tY + 32); // Amount | Scholarship (extends down to enclose "In word")

  // Header Text
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("SL", x1 + 2, tY + 6);
  doc.text("Particulars", x2 + (col2/2), tY + 6, { align: "center" });
  doc.text("Month", xMonth + (colMonth/2), tY + 6, { align: "center" });
  doc.text("Amount(Tk)", x3 + (col3/2), tY + 6, { align: "center" });
  
  doc.text("Scholarship", x4 + (col4/2), tY + 4, { align: "center" });
  doc.text("Amount(Tk)", x4 + (col4/2), tY + 8, { align: "center" });

  // Row 1
  doc.setFont("times", "normal");
  doc.text("1", x1 + 2, tY + 15);
  doc.text(feeLabel, x2 + 2, tY + 15);
  doc.text(targetMonth, xMonth + (colMonth/2), tY + 15, { align: "center" });
  doc.text(amountStr, x4 - 2, tY + 15, { align: "right" });

  // Total Row
  doc.setFont("times", "bold");
  doc.text("Total", x3 - 5, tY + 23, { align: "right" });
  doc.text(amountStr, x4 - 2, tY + 23, { align: "right" });

  // In word Row
  doc.setFont("times", "normal");
  doc.text(`In word: ${words}`, x1 + 2, tY + 30);

  // ── 5. Bottom Signatures ───────────────────────────────────────
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  
  const signY = boxY + 75;
  doc.text("Account Clearance", boxX + 5, signY);
  

  


  // ── 5b. Digital Stamp Seal ───────────────────────────────────────
  await drawDigitalStampSeal(doc, boxX + boxW - 35, boxY + 65, statusLabel, invoiceNo);

  // ── 6. Left Sidebar (Barcode & QR) ─────────────────────────────
  const leftX = 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  textC(doc, C.black);
  doc.text("Please don't write/stamp", leftX + 13, boxY + 10, { align: "center" });
  doc.text("inside barcode area", leftX + 13, boxY + 13, { align: "center" });

  drawBarcode(doc, leftX, boxY + 16, 26, 12, "213004800");
  drawFakeQRCode(doc, leftX + 1, boxY + 35, 24);

  // ── 7. Right Sidebar ("STUDENT'S COPY") ────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("STUDENT'S COPY", boxX + boxW + 8, boxY + 45, { angle: -90 });

  // ── 8. Footer (Customer Care) ──────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(C.navy[0], C.navy[1], C.navy[2]);
  doc.text("Customer Care Helpdesk: +880 1410-764581  |  Email: hellofajracademy@gmail.com", cx, boxY + boxH + 9, { align: "center" });

  // ── 10. Output ────────────────────────────────────────────────────────────
  const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25);
  const safeInv  = invoiceNo.replace(/[^a-zA-Z0-9\-_]/g, "_");

  if (isPrint) {
    doc.autoPrint();
    const blobUrl = doc.output("bloburl");
    const printWindow = window.open(blobUrl, "_blank");
    if (printWindow) printWindow.focus();
  } else {
    doc.save(`FajrAcademy_Receipt_${safeInv}_${safeName}.pdf`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  FINANCIAL TRANSACTIONS STATEMENT PDF
// ═════════════════════════════════════════════════════════════════════════════
export async function exportTransactionsStatementPDF(payments: any[], filterMeta: any = {}, isPrint: boolean = false) {
    // Left empty for now, just to satisfy exports if imported elsewhere
}
