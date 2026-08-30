import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { StudentModel } from "@/model/student-model";

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
    const phone = searchParams.get("phone")?.trim();
    const email = searchParams.get("email")?.trim();
    const excludeId = searchParams.get("excludeId")?.trim();

    await dbConnect();

    // Check Phone
    if (phone) {
      const phoneVariants = getPhoneQueryVariants(phone);
      const query = { phone: { $in: phoneVariants } };
      if (excludeId) query._id = { $ne: excludeId };

      const student = await StudentModel.findOne(query)
        .select("studentId fullName phone email")
        .lean();

      if (student) {
        return NextResponse.json({
          exists: true,
          field: "phone",
          studentId: student.studentId || "N/A",
          fullName: student.fullName || "Student",
          message: `This phone number is already registered with Student ID: ${student.studentId || "N/A"}${student.fullName ? ` (${student.fullName})` : ""}.`,
        });
      }
    }

    // Check Email
    if (email) {
      const cleanEmail = email.toLowerCase();
      const query = { email: cleanEmail };
      if (excludeId) query._id = { $ne: excludeId };

      const student = await StudentModel.findOne(query)
        .select("studentId fullName phone email")
        .lean();

      if (student) {
        return NextResponse.json({
          exists: true,
          field: "email",
          studentId: student.studentId || "N/A",
          fullName: student.fullName || "Student",
          message: `This email address is already registered with Student ID: ${student.studentId || "N/A"}${student.fullName ? ` (${student.fullName})` : ""}.`,
        });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("GET /api/students/check error:", error);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
