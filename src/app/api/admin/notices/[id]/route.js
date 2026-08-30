import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { NoticeModel } from "@/model/notice-model";
import { recordAuditLog } from "@/lib/audit-logger";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    await dbConnect();

    const beforeNotice = await NoticeModel.findById(id).lean();
    const updatedNotice = await NoticeModel.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!updatedNotice) {
      return NextResponse.json({ success: false, message: "Notice not found" }, { status: 404 });
    }

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "Notice",
      resourceId: id,
      description: `Updated notice: ${updatedNotice.title}`,
      changes: { before: beforeNotice, after: updatedNotice }
    });

    return NextResponse.json({ success: true, notice: updatedNotice });
  } catch (error) {
    console.error("PUT /api/admin/notices/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    const deletedNotice = await NoticeModel.findByIdAndDelete(id);

    if (!deletedNotice) {
      return NextResponse.json({ success: false, message: "Notice not found" }, { status: 404 });
    }

    await recordAuditLog(request, {
      action: "DELETE",
      resource: "Notice",
      resourceId: id,
      description: `Deleted notice: ${deletedNotice.title}`,
      changes: { before: deletedNotice }
    });

    return NextResponse.json({ success: true, message: "Notice deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/notices/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
