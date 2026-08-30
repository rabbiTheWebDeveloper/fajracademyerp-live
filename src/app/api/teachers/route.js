import { NextResponse } from "next/server";
import { getAllTeachers, createTeacher } from "@/queries/teacher-queries";
import { recordAuditLog } from "@/lib/audit-logger";
import rateLimit from "@/lib/rate-limit";

// Limit to 3 requests per minute per IP to prevent DOS/DDoS attacks on registration
const limiter = rateLimit({ interval: 60000 });

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getAllTeachers({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 10,
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "",
      version: searchParams.get("version") || "",
      category: searchParams.get("category") || "",
      idCardStatus: searchParams.get("idCardStatus") || "",
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/teachers error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Basic IP tracking for Rate Limiting
    const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown_ip";

    try {
      await limiter.check(3, ip); // Max 3 requests per minute per IP
    } catch {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Basic required field validation
    const required = [
      ["fullName", "Full name"],
      ["designation", "Designation"],
      ["password", "Password"],
      ["gender", "Gender"],
      ["bloodGroup", "Blood group"],
      ["emergencyContactNumber", "Emergency contact number"],
      ["presentAddress", "Present address"],
      ["permanentAddress", "Permanent address"],
      ["nidOrBirthCertificatePicture", "NID / Birth certificate picture"],
    ];
    for (const [field, label] of required) {
      if (!body[field] || (typeof body[field] === "string" && !body[field].trim())) {
        return NextResponse.json(
          { success: false, message: `${label} is required.` },
          { status: 400 }
        );
      }
    }

    const teacher = await createTeacher(body);

    // Remove password from response safely
    const safeTeacher = { ...teacher };
    delete safeTeacher.password;

    await recordAuditLog(request, {
      action: "CREATE",
      resource: "Teacher",
      resourceId: teacher._id?.toString() || null,
      description: `Created new teacher: ${teacher.fullName} (ID: ${teacher.teacherId || "N/A"})`,
      changes: { after: safeTeacher }
    });

    return NextResponse.json({ success: true, teacher: safeTeacher }, { status: 201 });
  } catch (error) {
    // Handle Mongoose validation errors with user-friendly messages
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return NextResponse.json(
        { success: false, message: messages.join(" ") },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      // Identify which field caused the duplicate
      const keyPattern = error.keyPattern || {};
      if (keyPattern.email) {
        return NextResponse.json(
          { success: false, message: "A teacher with this email already exists. Please use a different email." },
          { status: 409 }
        );
      }
      if (keyPattern.teacherId) {
        return NextResponse.json(
          { success: false, message: "Duplicate teacher ID generated. Please try again." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, message: "Duplicate entry detected. Please check your inputs and try again." },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
