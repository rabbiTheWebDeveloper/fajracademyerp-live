import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { ScheduleModel } from "@/model/schedule-model";
import mongoose from "mongoose";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    
    if (!studentId) {
      return NextResponse.json({ success: false, message: "studentId is required" }, { status: 400 });
    }

    await dbConnect();
    const schedules = await ScheduleModel.find({ student: studentId })
      .populate("teacher", "fullName")
      .populate("course", "title")
      .lean();
      
    // Assuming one main schedule per student for now in this mode
    const schedule = schedules.length > 0 ? schedules[0] : null;

    return NextResponse.json({ success: true, schedule }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { studentId, teacherId, courseId, weekly_days, weekly_days_list, startTime, endTime } = body;

    if (!studentId || !teacherId || !courseId) {
      return NextResponse.json(
        { success: false, message: "studentId, teacherId, and courseId are required" },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Upsert the schedule for this student
    const schedule = await ScheduleModel.findOneAndUpdate(
      { student: studentId },
      {
        student: studentId,
        teacher: teacherId,
        course: courseId,
        weekly_days: Number(weekly_days) || 0,
        weekly_days_list: weekly_days_list || [],
        startTime: startTime || "",
        endTime: endTime || "",
      },
      { new: true, upsert: true }
    );

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "Schedule",
      resourceId: schedule._id?.toString() || null,
      description: `Updated class schedule for student ID: ${studentId}`,
      changes: { after: schedule }
    });

    return NextResponse.json({ success: true, schedule }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
