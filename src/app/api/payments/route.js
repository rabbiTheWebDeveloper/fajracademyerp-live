import { NextResponse } from "next/server";
import { getAllPayments, createPayment, getRevenueStats } from "@/queries/payment-queries";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Return revenue stats if requested
    if (searchParams.get("stats") === "true") {
      const stats = await getRevenueStats({
        startDate: searchParams.get("startDate") || "",
        endDate: searchParams.get("endDate") || "",
        status: searchParams.get("status") || "",
        type: searchParams.get("type") || "",
        search: searchParams.get("search") || "",
        studentId: searchParams.get("studentId") || "",
        teacherId: searchParams.get("teacherId") || "",
        month: searchParams.get("month") || "",
      });
      return NextResponse.json({ success: true, stats }, { status: 200 });
    }

    const result = await getAllPayments({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
      status: searchParams.get("status") || "",
      type: searchParams.get("type") || "",
      search: searchParams.get("search") || "",
      studentId: searchParams.get("studentId") || "",
      teacherId: searchParams.get("teacherId") || "",
      month: searchParams.get("month") || "",
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.student || !body.amount) {
      return NextResponse.json(
        { success: false, message: "student and amount are required" },
        { status: 400 }
      );
    }
    const payment = await createPayment(body);

    await recordAuditLog(request, {
      action: "CREATE",
      resource: "Payment",
      resourceId: payment._id?.toString() || null,
      description: `Created new payment transaction: ${payment.transactionId} of $${payment.amount}`,
      changes: { after: payment }
    });

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
