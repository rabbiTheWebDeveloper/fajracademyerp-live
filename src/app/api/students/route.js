import { NextResponse } from "next/server";
import { getAllStudents, createStudent } from "@/queries/student-queries";
import bcrypt from "bcryptjs";
import { recordAuditLog } from "@/lib/audit-logger";
import rateLimit from "@/lib/rate-limit";
import { dbConnect } from "@/service/mongo";
import { StudentModel } from "@/model/student-model";
import { PaymentModel } from "@/model/payment-model";

// Limit to 3 requests per minute per IP to prevent DOS/DDoS attacks on registration
const limiter = rateLimit({ interval: 60000 });

function getPhoneQueryVariants(rawPhone) {
  if (!rawPhone) return [];
  const clean = String(rawPhone).trim();
  const digitsOnly = clean.replace(/\D/g, "");
  const variants = [clean];
  if (clean.startsWith("+")) {
    variants.push(clean.slice(1));
  } else {
    variants.push(`+${clean}`);
  }
  if (/^01[3-9]\d{8}$/.test(digitsOnly)) {
    variants.push(`+88${digitsOnly}`);
    variants.push(`88${digitsOnly}`);
    variants.push(digitsOnly);
  } else if (/^8801[3-9]\d{8}$/.test(digitsOnly)) {
    variants.push(`+${digitsOnly}`);
    variants.push(digitsOnly);
    variants.push(`0${digitsOnly.slice(2)}`);
  }
  return [...new Set(variants.filter(Boolean))];
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getAllStudents({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 10,
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "",
      courseId: searchParams.get("courseId") || "",
      month: searchParams.get("month") || "",
      paymentStatus: searchParams.get("paymentStatus") || "",
      teacherFilter: searchParams.get("teacherFilter") || "",
      crmFilter: searchParams.get("crmFilter") || "",
      fromDate: searchParams.get("fromDate") || "",
      toDate: searchParams.get("toDate") || "",
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/students error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Basic IP tracking for Rate Limiting
    const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    // Fallback to "unknown" if headers are absent (e.g. localhost)
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

    // Validate required fields
    if (!body.fullName || !String(body.fullName).trim()) {
      return NextResponse.json(
        { success: false, message: "Full Name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // 1. Check if phone number already exists
    if (body.phone && String(body.phone).trim()) {
      const phoneVariants = getPhoneQueryVariants(body.phone);
      const existingStudentByPhone = await StudentModel.findOne({
        phone: { $in: phoneVariants },
      })
        .select("studentId fullName phone email")
        .lean();

      if (existingStudentByPhone) {
        return NextResponse.json(
          {
            success: false,
            message: `This phone number is already registered with Student ID: ${existingStudentByPhone.studentId || "N/A"}${existingStudentByPhone.fullName ? ` (${existingStudentByPhone.fullName})` : ""}.`,
            studentId: existingStudentByPhone.studentId || null,
            field: "phone",
          },
          { status: 409 }
        );
      }
    }

    // 2. Check if email already exists
    if (body.email && String(body.email).trim()) {
      const cleanEmail = String(body.email).trim().toLowerCase();
      const existingStudentByEmail = await StudentModel.findOne({
        email: cleanEmail,
      })
        .select("studentId fullName phone email")
        .lean();

      if (existingStudentByEmail) {
        return NextResponse.json(
          {
            success: false,
            message: `This email address is already registered with Student ID: ${existingStudentByEmail.studentId || "N/A"}${existingStudentByEmail.fullName ? ` (${existingStudentByEmail.fullName})` : ""}.`,
            studentId: existingStudentByEmail.studentId || null,
            field: "email",
          },
          { status: 409 }
        );
      }
    }

    // Default password if not provided
    const rawPassword = body.password || "123456";
    // Hash password
    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    
    const initialStatus = body.status || "active";
    const initialIsActive = initialStatus === "active" ? true : (body.isActive !== undefined ? body.isActive : false);

    // Create student
    const student = await createStudent({
      ...body,
      status: initialStatus,
      isActive: initialIsActive,
      password: hashedPassword,
    });
    const { password: _, ...safeStudent } = student;

    // Automatically generate pending invoice in PaymentModel if monthly fee or admission fee is present
    const monthlyAmount = Number(body.monthlyFee ?? student.monthlyFee ?? 0);
    const admissionAmount = Number(body.admissionFee ?? student.admissionFee ?? 0);
    const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    let createdMonthlyInvoice = null;
    let createdAdmissionInvoice = null;

    if (monthlyAmount > 0) {
      try {
        let pendingPayment = await PaymentModel.findOne({
          student: student._id,
          month: currentMonth,
          type: "monthly-fee",
          status: { $ne: "cancelled" },
        });

        if (!pendingPayment) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7);

          pendingPayment = new PaymentModel({
            student: student._id,
            course: student.course || null,
            amount: monthlyAmount,
            currency: "BDT",
            type: "monthly-fee",
            status: "pending",
            paymentMethod: "other",
            month: currentMonth,
            dueDate: dueDate,
            notes: `Monthly tuition fee invoice for ${currentMonth}`,
          });

          await pendingPayment.save();
        }
        createdMonthlyInvoice = pendingPayment.toObject ? pendingPayment.toObject() : pendingPayment;
      } catch (invoiceErr) {
        console.error("Failed to auto-create monthly pending invoice in PaymentModel:", invoiceErr);
      }
    }

    if (admissionAmount > 0) {
      try {
        const pendingAdmission = new PaymentModel({
          student: student._id,
          course: student.course || null,
          amount: admissionAmount,
          currency: "BDT",
          type: "admission-fee",
          status: "pending",
          paymentMethod: "other",
          month: currentMonth,
          notes: `Admission fee invoice for registration`,
        });

        await pendingAdmission.save();
        createdAdmissionInvoice = pendingAdmission.toObject();
      } catch (admissionErr) {
        console.error("Failed to auto-create admission fee invoice in PaymentModel:", admissionErr);
      }
    }

    await recordAuditLog(request, {
      action: "CREATE",
      resource: "Student",
      resourceId: student._id?.toString() || null,
      description: `Created new student: ${student.fullName} (ID: ${student.studentId || "N/A"})`,
      changes: { after: safeStudent }
    });

    return NextResponse.json({
      success: true,
      student: safeStudent,
      invoice: createdMonthlyInvoice,
      admissionInvoice: createdAdmissionInvoice,
    }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      await dbConnect();
      const keyPattern = error.keyPattern || {};
      const keyValue = error.keyValue || {};

      let field = Object.keys(keyPattern)[0] || "";
      if (!field && error.message) {
        if (error.message.includes("phone")) field = "phone";
        else if (error.message.includes("email")) field = "email";
        else if (error.message.includes("studentId")) field = "studentId";
      }

      if (field === "phone") {
        const val = keyValue.phone;
        const phoneVariants = getPhoneQueryVariants(val);
        const existing = await StudentModel.findOne({
          phone: { $in: phoneVariants.length > 0 ? phoneVariants : [val] },
        })
          .select("studentId fullName")
          .lean();

        const idText = existing?.studentId
          ? ` with Student ID: ${existing.studentId}${existing.fullName ? ` (${existing.fullName})` : ""}`
          : "";

        return NextResponse.json(
          {
            success: false,
            message: `This phone number is already registered${idText}.`,
            studentId: existing?.studentId || null,
            field: "phone",
          },
          { status: 409 }
        );
      }

      if (field === "email") {
        const val = keyValue.email;
        const existing = val
          ? await StudentModel.findOne({ email: String(val).toLowerCase().trim() })
              .select("studentId fullName")
              .lean()
          : null;

        const idText = existing?.studentId
          ? ` with Student ID: ${existing.studentId}${existing.fullName ? ` (${existing.fullName})` : ""}`
          : "";

        return NextResponse.json(
          {
            success: false,
            message: `This email is already registered${idText}.`,
            studentId: existing?.studentId || null,
            field: "email",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, message: `A student with this ${field || "information"} already exists.` },
        { status: 409 }
      );
    }
    console.error("POST /api/students error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

