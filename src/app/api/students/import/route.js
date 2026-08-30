import { NextResponse } from "next/server";
import { createStudent } from "@/queries/student-queries";
import bcrypt from "bcryptjs";

/**
 * POST /api/students/import
 * Accepts JSON array of student records and bulk-creates them.
 * The client parses CSV/Excel and sends parsed rows as JSON.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { students: rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "No student data provided." },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header

      // Validate required field
      if (!row.fullName || String(row.fullName).trim() === "") {
        results.failed++;
        results.errors.push({ row: rowNum, message: "Missing required field: fullName" });
        continue;
      }

      try {
        const rawPassword = row.password || "123456";
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const studentData = {
          fullName: String(row.fullName).trim(),
          fatherName: row.fatherName ? String(row.fatherName).trim() : "",
          motherName: row.motherName ? String(row.motherName).trim() : "",
          age: row.age ? Number(row.age) : null,
          phone: row.phone ? String(row.phone).trim() : "",
          whatsappNumber: row.whatsappNumber ? String(row.whatsappNumber).trim() : "",
          email: row.email ? String(row.email).trim().toLowerCase() : undefined,
          gender: ["male", "female", "other"].includes(String(row.gender || "").toLowerCase())
            ? String(row.gender).toLowerCase()
            : "male",
          status: ["active", "inactive", "completed", "at-risk", "suspended"].includes(
            String(row.status || "").toLowerCase()
          )
            ? String(row.status).toLowerCase()
            : "active",
          admissionDate: row.admissionDate ? new Date(row.admissionDate) : undefined,
          admissionFee: row.admissionFee ? Number(row.admissionFee) : 0,
          course: row.course ? String(row.course).trim() : "",
          monthlyFee: row.monthlyFee ? Number(row.monthlyFee) : 0,
          monthlyDue: row.monthlyDue ? Number(row.monthlyDue) : 0,
          classStartingDate: row.classStartingDate ? new Date(row.classStartingDate) : undefined,
          notes: row.notes ? String(row.notes).trim() : "",
          password: hashedPassword,
        };

        await createStudent(studentData);
        results.created++;
      } catch (err) {
        results.failed++;
        const errMsg =
          err.code === 11000
            ? `Duplicate email for student "${row.fullName}"`
            : err.message;
        results.errors.push({ row: rowNum, message: errMsg, name: row.fullName });
      }
    }

    return NextResponse.json({ success: true, ...results }, { status: 200 });
  } catch (error) {
    console.error("POST /api/students/import error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
