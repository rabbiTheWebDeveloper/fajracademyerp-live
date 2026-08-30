import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { resolveTeacherId } from "@/queries/teacher-portal-queries";
import { TeacherModel } from "@/model/teacher-model";
import { CeoRequestModel } from "@/model/ceo-request-model";
import { TeacherGemsModel } from "@/model/teacher-gems-model";
import { headers } from "next/headers";
import mongoose from "mongoose";

// Helper to escape HTML special characters
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Helper: Send Telegram notification
async function sendTelegramNotification(request, teacher) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CEO_CHAT_ID;

  if (!token || !chatId) return false;

  const typeLabel = request.type === "meeting_request" ? "📅 Meeting Request" : "⚠️ Problem Report";
  const submittedAt = new Date(request.createdAt).toLocaleString("en-US", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const text = [
    `🔔 <b>New CEO Request — Fajr Academy</b>`,
    ``,
    `📋 <b>Type:</b> ${escapeHtml(typeLabel)}`,
    `🆔 <b>Request ID:</b> <code>${escapeHtml(request.requestId)}</code>`,
    ``,
    `👤 <b>Teacher:</b> ${escapeHtml(request.teacherName)}`,
    teacher.teacherId ? `🪪 <b>Teacher ID:</b> <code>${escapeHtml(teacher.teacherId)}</code>` : null,
    request.teacherDesignation ? `💼 <b>Designation:</b> ${escapeHtml(request.teacherDesignation)}` : null,
    request.teacherEmail ? `📧 <b>Email:</b> ${escapeHtml(request.teacherEmail)}` : null,
    request.teacherPhone ? `📞 <b>Phone:</b> ${escapeHtml(request.teacherPhone)}` : null,
    ``,
    `📌 <b>Subject:</b> ${escapeHtml(request.subject)}`,
    ``,
    `💬 <b>Message:</b>`,
    `<i>${escapeHtml(request.message)}</i>`,
    ``,
    `🕐 <b>Submitted:</b> ${escapeHtml(submittedAt)}`,
    ``,
    `🔗 <a href="${process.env.APP_URL || 'https://app.fajracademy.io'}/ceo-requests">Review in Admin Dashboard</a>`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );
    const data = await res.json();
    return data.ok === true;
  } catch (err) {
    console.error("Telegram send error:", err);
    return false;
  }
}


// GET — teacher fetches their own requests
export async function GET(req) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const teacherId = await resolveTeacherId(userId);
    if (!teacherId) {
      return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";

    const query = { teacherId: new mongoose.Types.ObjectId(teacherId) };
    if (type && type !== "all") query.type = type;
    if (status && status !== "all") query.status = status;

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      CeoRequestModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CeoRequestModel.countDocuments(query),
    ]);

    // Calculate monthly problem count for this teacher (BD time boundary)
    const now = new Date();
    const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const startOfBdMonth = new Date(Date.UTC(bdTime.getUTCFullYear(), bdTime.getUTCMonth(), 1));
    const startOfMonth = new Date(startOfBdMonth.getTime() - 6 * 60 * 60 * 1000);

    const monthlyProblemCount = await CeoRequestModel.countDocuments({
      teacherId: new mongoose.Types.ObjectId(teacherId),
      type: "problem_report",
      createdAt: { $gte: startOfMonth },
    });

    return NextResponse.json({
      success: true,
      requests,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      monthlyProblemCount,
    });
  } catch (error) {
    console.error("GET /api/teacher-portal/ceo-requests error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST — teacher submits a new request
export async function POST(req) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const teacherId = await resolveTeacherId(userId);
    if (!teacherId) {
      return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
    }

    const teacher = await TeacherModel.findById(teacherId).lean();
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    }

    const body = await req.json();
    const { type, subject, message } = body;

    if (!type || !["meeting_request", "problem_report"].includes(type)) {
      return NextResponse.json({ success: false, message: "Invalid request type" }, { status: 400 });
    }
    if (!subject || !subject.trim()) {
      return NextResponse.json({ success: false, message: "Subject is required" }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, message: "Message is required" }, { status: 400 });
    }

    // Enforce limit of 3 problem reports per month
    if (type === "problem_report") {
      const now = new Date();
      const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      const startOfBdMonth = new Date(Date.UTC(bdTime.getUTCFullYear(), bdTime.getUTCMonth(), 1));
      const startOfMonth = new Date(startOfBdMonth.getTime() - 6 * 60 * 60 * 1000);

      const count = await CeoRequestModel.countDocuments({
        teacherId: new mongoose.Types.ObjectId(teacherId),
        type: "problem_report",
        createdAt: { $gte: startOfMonth },
      });

      if (count >= 3) {
        return NextResponse.json({
          success: false,
          message: "You have reached the monthly limit of 3 problem reports. You can submit another report next month."
        }, { status: 400 });
      }
    }

    if (type === "meeting_request") {
      const gemsDoc = await TeacherGemsModel.findOne({ teacher: new mongoose.Types.ObjectId(teacherId) });
      const currentGems = gemsDoc ? gemsDoc.totalGems : 0;
      if (currentGems < 10) {
        return NextResponse.json({
          success: false,
          message: "You need at least 10 gems to request a CEO meeting."
        }, { status: 400 });
      }

      const deduction = -10;
      const historyEntry = { action: "ceo_meeting", gems: deduction, ref: null };
      
      await TeacherGemsModel.findOneAndUpdate(
        { teacher: new mongoose.Types.ObjectId(teacherId) },
        { 
          $inc: { totalGems: deduction, monthlyGems: deduction },
          $push: { history: { $each: [historyEntry], $slice: -100 } }
        },
        { new: true, upsert: true }
      );
    }

    const ceoRequest = new CeoRequestModel({
      type,
      subject: subject.trim(),
      message: message.trim(),
      teacherId: new mongoose.Types.ObjectId(teacherId),
      teacherName: teacher.fullName || "",
      teacherEmail: teacher.email || "",
      teacherPhone: teacher.phone || teacher.mobile || "",
      teacherDesignation: teacher.designation || "",
      status: "pending",
    });

    await ceoRequest.save();

    // Send Telegram notification (non-blocking)
    const telegramSent = await sendTelegramNotification(ceoRequest, teacher);
    if (telegramSent) {
      await CeoRequestModel.findByIdAndUpdate(ceoRequest._id, { telegramSent: true });
    }

    return NextResponse.json({ success: true, request: ceoRequest }, { status: 201 });
  } catch (error) {
    console.error("POST /api/teacher-portal/ceo-requests error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
