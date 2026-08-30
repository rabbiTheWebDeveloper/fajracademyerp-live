import { NextResponse } from "next/server";
import { updateActivity, deleteActivity } from "@/queries/staff-queries";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    // Auto-set startTime when moving to in-progress
    if (body.status === "in-progress" && !body.startTime) {
      const now = new Date();
      body.startTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    }
    // Auto-set endTime when completing
    if (body.status === "done" && !body.endTime) {
      const now = new Date();
      body.endTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    }
    const activity = await updateActivity(id, body);
    if (!activity) return NextResponse.json({ success: false, message: "Activity not found" }, { status: 404 });
    return NextResponse.json({ success: true, activity }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteActivity(id);
    return NextResponse.json({ success: true, message: "Activity deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
