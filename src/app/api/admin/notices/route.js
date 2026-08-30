import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { NoticeModel } from "@/model/notice-model";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET(request) {
  try {
    await dbConnect();
    const notices = await NoticeModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, notices });
  } catch (error) {
    console.error("GET /api/admin/notices error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    await dbConnect();

    const newNotice = await NoticeModel.create(body);

    await recordAuditLog(request, {
      action: "CREATE",
      resource: "Notice",
      resourceId: newNotice._id?.toString() || null,
      description: `Created notice: ${newNotice.title}`,
      changes: { after: newNotice }
    });

    return NextResponse.json({ success: true, notice: newNotice });
  } catch (error) {
    console.error("POST /api/admin/notices error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
