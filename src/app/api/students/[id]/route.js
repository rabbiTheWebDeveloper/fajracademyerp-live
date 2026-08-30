import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getStudentById, updateStudent, deleteStudent } from "@/queries/student-queries";
import { recordAuditLog } from "@/lib/audit-logger";
import { dbConnect } from "@/service/mongo";
import { UserModel } from "@/model/user-model";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const student = await getStudentById(id);
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, student }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    // Don't allow password update through this route
    delete body.password;
    
    // Prevent setting email to empty string
    if (!body.email || body.email.trim() === "") {
      delete body.email;
    }

    const beforeStudent = await getStudentById(id);
    if (!beforeStudent) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }
    const cleanBefore = { ...beforeStudent };
    delete cleanBefore.password;

    const student = await updateStudent(id, body);
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }
    const cleanAfter = { ...student };
    delete cleanAfter.password;

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "Student",
      resourceId: id,
      description: `Updated student: ${student.fullName}`,
      changes: { before: cleanBefore, after: cleanAfter }
    });

    return NextResponse.json({ success: true, student }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    // 1. Resolve user role from headers or JWT auth_token cookie
    let userRole = request.headers.get("x-user-role");
    let userId = request.headers.get("x-user-id");

    if (!userRole) {
      const cookieStore = await cookies();
      const token = cookieStore.get("auth_token")?.value;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userRole = decoded.role;
          userId = decoded.id;
        } catch {
          // Token invalid or expired
        }
      }
    }

    const allowedRoles = ["super-admin", "admin"];
    let isAuthorized = allowedRoles.includes(userRole);

    // If not directly authorized by role, check if user has wildcard permissions in UserModel
    if (!isAuthorized && userId) {
      try {
        await dbConnect();
        const userDoc = await UserModel.findById(userId).select("role permissions").lean();
        if (userDoc && (allowedRoles.includes(userDoc.role) || userDoc.permissions?.includes("*"))) {
          isAuthorized = true;
          userRole = userDoc.role;
        }
      } catch {
        // DB error or model lookup error
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Only admin or super-admin can delete students." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const beforeStudent = await getStudentById(id);
    if (!beforeStudent) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }
    const cleanBefore = { ...beforeStudent };
    delete cleanBefore.password;

    await deleteStudent(id);

    await recordAuditLog(request, {
      action: "DELETE",
      resource: "Student",
      resourceId: id,
      description: `Deleted student: ${beforeStudent.fullName || id}`,
      changes: { before: cleanBefore }
    });

    return NextResponse.json({ success: true, message: "Student deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
