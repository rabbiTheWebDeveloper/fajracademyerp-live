"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Download, Award } from "lucide-react";
import jsPDF from "jspdf";

export default function CertificatePage() {
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/student-portal/certificate")
      .then(r => r.json())
      .then(d => {
        if (d.success) setCert(d.certificate);
        setLoading(false);
      });
  }, []);

  const formatDate = (date: string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  });

  const downloadPDF = async () => {
    if (!cert) return;

    const pdf = new jsPDF("l", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();

    // ── Background & Borders ──
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, w, h, "F");

    // Outer decorative border
    pdf.setDrawColor(15, 53, 83);
    pdf.setLineWidth(3);
    pdf.rect(8, 8, w - 16, h - 16);

    // Inner decorative border
    pdf.setDrawColor(180, 150, 80);
    pdf.setLineWidth(0.8);
    pdf.rect(12, 12, w - 24, h - 24);

    // Inner dotted accent border
    pdf.setDrawColor(180, 150, 80);
    pdf.setLineWidth(0.3);
    pdf.rect(15, 15, w - 30, h - 30);

    // ── Top decorative gold line ──
    pdf.setDrawColor(180, 150, 80);
    pdf.setLineWidth(0.6);
    pdf.line(60, 40, w - 60, 40);

    // ── Logo placeholder area ──
    // Add logo from public directory
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = "/fajr-logo.png";
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        setTimeout(reject, 3000);
      });
      const logoW = 50;
      const logoH = (logoImg.height / logoImg.width) * logoW;
      pdf.addImage(logoImg, "PNG", (w - logoW) / 2, 22, logoW, logoH);
    } catch {
      // Fallback: text-based logo
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(15, 53, 83);
      pdf.text("FAJR ACADEMY", w / 2, 35, { align: "center" });
    }

    // ── Certificate Title ──
    pdf.setFont("times", "normal");
    pdf.setFontSize(14);
    pdf.setTextColor(140, 120, 60);
    pdf.text("CERTIFICATE", w / 2, 56, { align: "center" });

    pdf.setFont("times", "bold");
    pdf.setFontSize(32);
    pdf.setTextColor(15, 53, 83);
    pdf.text("Certificate of Enrollment", w / 2, 68, { align: "center" });

    // ── Decorative line under title ──
    pdf.setDrawColor(180, 150, 80);
    pdf.setLineWidth(0.6);
    pdf.line(90, 73, w - 90, 73);

    // ── "This is to certify that" ──
    pdf.setFont("times", "normal");
    pdf.setFontSize(13);
    pdf.setTextColor(80, 80, 80);
    pdf.text("This is to certify that", w / 2, 84, { align: "center" });

    // ── Student Name ──
    pdf.setFont("times", "bolditalic");
    pdf.setFontSize(28);
    pdf.setTextColor(15, 53, 83);
    pdf.text(cert.studentName || "Student Name", w / 2, 98, { align: "center" });

    // Name underline
    const nameWidth = pdf.getTextWidth(cert.studentName || "Student Name");
    pdf.setDrawColor(180, 150, 80);
    pdf.setLineWidth(0.5);
    pdf.line((w - nameWidth) / 2 - 10, 101, (w + nameWidth) / 2 + 10, 101);

    // ── Body Text ──
    pdf.setFont("times", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(80, 80, 80);
    pdf.text("has been officially enrolled and is an active student at Fajr Academy for the course:", w / 2, 112, { align: "center" });

    // ── Course Name ──
    pdf.setFont("times", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(15, 53, 83);
    pdf.text(`"${cert.courseName}"`, w / 2, 125, { align: "center" });

    // ── Details Row ──
    pdf.setFont("times", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Student ID: ${cert.studentId || "N/A"}`, 40, 140);
    pdf.text(`Instructor: ${cert.teacherName}`, w / 2, 140, { align: "center" });
    pdf.text(`Date of Enrollment: ${formatDate(cert.admissionDate || cert.classStartingDate)}`, w - 40, 140, { align: "right" });

    // ── Decorative separator ──
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(40, 147, w - 40, 147);

    // ── Signature Section ──
    // Left: Director
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(0.5);
    pdf.line(45, 175, 115, 175);
    pdf.setFont("times", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(15, 53, 83);
    pdf.text("Academy Director", 80, 182, { align: "center" });
    pdf.setFont("times", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text("FAJR Academy", 80, 188, { align: "center" });

    // Center: Seal area
    pdf.setDrawColor(180, 150, 80);
    pdf.setLineWidth(0.6);
    pdf.circle(w / 2, 172, 14);
    pdf.circle(w / 2, 172, 11);
    pdf.setFont("times", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(180, 150, 80);
    pdf.text("OFFICIAL", w / 2, 170, { align: "center" });
    pdf.text("SEAL", w / 2, 175, { align: "center" });

    // Right: Date
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(0.5);
    pdf.line(w - 115, 175, w - 45, 175);
    pdf.setFont("times", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(15, 53, 83);
    pdf.text("Date of Issue", w - 80, 182, { align: "center" });
    pdf.setFont("times", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text(currentDate, w - 80, 188, { align: "center" });

    // ── Bottom gold line ──
    pdf.setDrawColor(180, 150, 80);
    pdf.setLineWidth(0.6);
    pdf.line(60, 195, w - 60, 195);

    pdf.save(`${cert.studentName}-Certificate.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <Award className="w-12 h-12 text-gray-300 mb-4" />
        <p className="font-medium">Certificate data unavailable</p>
        <p className="text-sm mt-1">Please contact administration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">My Certificate</h2>
          <p className="text-sm text-gray-500 mt-1">Your official enrollment certificate from Fajr Academy.</p>
        </div>
        <button
          onClick={downloadPDF}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      {/* Mobile Swipe Help Notice */}
      <div className="block md:hidden bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-center">
        <p className="text-xs font-bold text-blue-700 flex items-center justify-center gap-1.5 animate-pulse">
          <span>← Swipe horizontally to preview full certificate →</span>
        </p>
      </div>

      {/* Certificate Preview */}
      <div className="w-full overflow-x-auto pb-6 scrollbar-thin rounded-2xl">
        <div className="min-w-[860px] p-4 flex justify-center bg-gray-50/50 rounded-2xl border border-gray-100">
          <div
            ref={certRef}
            className="bg-white shadow-2xl rounded-lg overflow-hidden flex-shrink-0"
            style={{ width: "840px" }}
          >
          {/* Certificate Inner Container */}
          <div className="relative" style={{
            border: "4px solid #0f3553",
            margin: "12px",
            padding: "8px"
          }}>
            {/* Inner gold border */}
            <div style={{
              border: "1.5px solid #b49650",
              padding: "32px 48px"
            }}>
              {/* Corner decorations */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#b49650]" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#b49650]" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#b49650]" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#b49650]" />

              {/* Gold accent line top */}
              <div className="w-40 h-0.5 bg-[#b49650] mx-auto mb-4" />

              {/* Logo */}
              <div className="flex justify-center mb-2">
                <img src="/fajr-logo.png" alt="Fajr Academy Logo" className="h-16 object-contain" />
              </div>

              {/* Certificate type */}
              <p className="text-center text-[#b49650] tracking-[0.4em] uppercase text-xs font-medium mt-3">Certificate</p>

              {/* Title */}
              <h1 className="text-center text-3xl font-serif font-bold text-[#0f3553] mt-1 mb-1">
                Certificate of Enrollment
              </h1>

              {/* Gold accent line */}
              <div className="w-48 h-0.5 bg-[#b49650] mx-auto my-3" />

              {/* Body */}
              <p className="text-center text-gray-500 text-sm font-serif mt-4">This is to certify that</p>

              {/* Student Name */}
              <h2 className="text-center text-4xl font-serif font-bold italic text-[#0f3553] mt-3 mb-1">
                {cert.studentName}
              </h2>
              <div className="w-64 h-0.5 bg-[#b49650] mx-auto my-2" />

              <p className="text-center text-gray-500 text-sm font-serif mt-3 max-w-lg mx-auto leading-relaxed">
                has been officially enrolled and is an active student at <strong className="text-[#0f3553]">Fajr Academy</strong> for the course:
              </p>

              {/* Course Name */}
              <h3 className="text-center text-2xl font-serif font-bold text-[#0f3553] mt-4 mb-2">
                &ldquo;{cert.courseName}&rdquo;
              </h3>

              {/* Details Row */}
              <div className="grid grid-cols-3 gap-4 mt-6 text-center text-xs text-gray-500 font-serif">
                <div>
                  <p className="font-semibold text-[#0f3553]">Student ID</p>
                  <p className="mt-0.5">{cert.studentId || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0f3553]">Instructor</p>
                  <p className="mt-0.5">{cert.teacherName}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#0f3553]">Date of Enrollment</p>
                  <p className="mt-0.5">{formatDate(cert.admissionDate || cert.classStartingDate)}</p>
                </div>
              </div>

              {/* Separator */}
              <div className="w-full h-px bg-gray-200 my-6" />

              {/* Signature Section */}
              <div className="grid grid-cols-3 items-end mt-2 mb-2">
                {/* Director Signature */}
                <div className="text-center">
                  <div className="w-28 h-px bg-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#0f3553] font-serif">Academy Director</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">FAJR Academy</p>
                </div>

                {/* Official Seal */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-[#b49650] flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border border-[#b49650] flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-[#b49650] tracking-wider">OFFICIAL</span>
                      <span className="text-[10px] font-bold text-[#b49650] tracking-wider">SEAL</span>
                    </div>
                  </div>
                </div>

                {/* Date of Issue */}
                <div className="text-center">
                  <div className="w-28 h-px bg-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#0f3553] font-serif">Date of Issue</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{currentDate}</p>
                </div>
              </div>

              {/* Bottom gold accent */}
              <div className="w-40 h-0.5 bg-[#b49650] mx-auto mt-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
