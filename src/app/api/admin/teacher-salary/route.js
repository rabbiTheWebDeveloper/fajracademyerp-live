import { NextResponse } from "next/server";
import { 
  getAllTeacherSalaries, 
  approveTeacherSalary,
  createTeacherSalary,
  updateTeacherSalary,
  deleteTeacherSalary
} from "@/queries/admin-salary-queries";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || "";

    const result = await getAllTeacherSalaries(month);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    if (!data.teacherId || !data.month) {
      return NextResponse.json({ success: false, message: "Teacher and Month are required" }, { status: 400 });
    }
    const result = await createTeacherSalary(data);
    
    if (result.success) {
      await recordAuditLog(request, {
        action: "CREATE",
        resource: "TeacherSalary",
        resourceId: result.salary?._id?.toString() || result.data?._id?.toString() || null,
        description: `Generated salary record for month ${data.month}`,
        changes: { after: result.salary || result.data || result }
      });
    }

    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { salaryId, status, ...otherUpdates } = await request.json();
    if (!salaryId) {
      return NextResponse.json({ success: false, message: "Salary ID is required" }, { status: 400 });
    }
    
    let result;
    if (status !== undefined && Object.keys(otherUpdates).length === 0) {
      // Direct approval action compatibility check
      if (status === "paid") {
        result = await approveTeacherSalary(salaryId);
      } else {
        result = await updateTeacherSalary(salaryId, { status });
      }
    } else {
      result = await updateTeacherSalary(salaryId, { status, ...otherUpdates });
    }

    if (result.success) {
      await recordAuditLog(request, {
        action: status === "paid" ? "APPROVE" : "UPDATE",
        resource: "TeacherSalary",
        resourceId: salaryId,
        description: status === "paid" 
          ? `Approved and marked teacher salary ID ${salaryId} as paid` 
          : `Updated teacher salary ID ${salaryId} fields: ${Object.keys({ status, ...otherUpdates }).join(", ")}`,
        changes: { after: result.salary || result.data || result }
      });
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Salary ID is required" }, { status: 400 });
    }
    const result = await deleteTeacherSalary(id);

    if (result.success) {
      await recordAuditLog(request, {
        action: "DELETE",
        resource: "TeacherSalary",
        resourceId: id,
        description: `Deleted teacher salary record ID ${id}`,
        changes: { before: result.salary || result.data || result }
      });
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
