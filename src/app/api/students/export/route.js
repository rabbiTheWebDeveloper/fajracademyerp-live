import { NextResponse } from "next/server";
import { getAllStudents } from "@/queries/student-queries";

/**
 * GET /api/students/export
 * Returns all students as JSON for client-side CSV/Excel generation.
 * Query params: ?format=json (default, for client to handle CSV/Excel)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";
    const month = searchParams.get("month") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const teacherFilter = searchParams.get("teacherFilter") || "";
    const crmFilter = searchParams.get("crmFilter") || "";
    const courseId = searchParams.get("courseId") || "";

    // Fetch all matching students (no pagination)
    const result = await getAllStudents({
      page: 1,
      limit: 100000,
      search,
      status,
      fromDate,
      toDate,
      month,
      paymentStatus,
      teacherFilter,
      crmFilter,
      courseId
    });

    const students = result.students.map((s) => ({
      fullName: s.fullName || "",
      phone: s.phone || "",
      email: s.email || "",
      gender: s.gender || "",
      status: s.status || "",
      admissionDate: s.admissionDate
        ? new Date(s.admissionDate).toISOString().split("T")[0]
        : "",
      admissionFee: s.admissionFee ?? 0,
      course: s.course?.title || s.course || "",
      monthlyFee: s.monthlyFee ?? 0,
      monthlyDue: s.monthlyDue ?? 0,
      classStartingDate: s.classStartingDate
        ? new Date(s.classStartingDate).toISOString().split("T")[0]
        : "",
      notes: s.notes || "",
      studentId: s.studentId || "",
      teacher: s.teacherInfo?.name || "",
      crmInCharge: s.crmInfo?.name || "",
      paymentStatus: s.paymentInfo?.status || "unpaid",
      createdAt: s.createdAt || "",
      updatedAt: s.updatedAt || "",
    }));

    return NextResponse.json({ success: true, students, total: students.length });
  } catch (error) {
    console.error("GET /api/students/export error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
