import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { NotificationModel } from "@/model/notification-model";

export async function GET(req) {
  try {
    await dbConnect();
    // In a real app we'd filter by recipient user ID. Here we get all admin notifications
    const notifications = await NotificationModel.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return NextResponse.json({ success: true, notifications }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const { id } = await req.json();
    // Mark as read
    await NotificationModel.findByIdAndUpdate(id, { $addToSet: { readBy: "system_admin" } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
