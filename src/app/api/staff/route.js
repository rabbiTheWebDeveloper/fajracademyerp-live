import { NextResponse } from "next/server";
import { getAllStaff, createStaff } from "@/queries/staff-queries";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getAllStaff({
      page:       Number(searchParams.get("page"))  || 1,
      limit:      Number(searchParams.get("limit")) || 20,
      search:     searchParams.get("search")     || "",
      department: searchParams.get("department") || "",
      status:     searchParams.get("status")     || "",
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/staff:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const required = [
      ["fullName",    "Full name"],
      ["email",       "Email"],
      ["password",    "Password"],
      ["gender",      "Gender"],
      ["department",  "Department"],
      ["designation", "Designation"],
    ];
    for (const [field, label] of required) {
      if (!body[field] || (typeof body[field] === "string" && !body[field].trim())) {
        return NextResponse.json({ success: false, message: `${label} is required.` }, { status: 400 });
      }
    }

    const staff = await createStaff(body);
    const safe = { ...staff };
    delete safe.password;

    await recordAuditLog(request, {
      action: "CREATE",
      resource: "Staff",
      resourceId: staff._id?.toString() || null,
      description: `Created new staff member: ${staff.fullName} (${staff.email})`,
      changes: { after: safe }
    });

    return NextResponse.json({ success: true, staff: safe }, { status: 201 });
  } catch (error) {
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map(e => e.message).join(" ");
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
    if (error.code === 11000) {
      const key = Object.keys(error.keyPattern || {})[0];
      return NextResponse.json(
        { success: false, message: `A staff member with this ${key} already exists.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
