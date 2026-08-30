import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { getAuthUser } from "@/lib/auth-server";
import { OnlineClassModel } from "@/model/online-class-model";
import { createGoogleMeetLink } from "@/lib/google-calendar";
import "@/model/teacher-model";
import "@/model/student-model";
import "@/model/course-model";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * GET /api/online-classes
 * Role-based access:
 * - Admin/Super-Admin: All online classes
 * - Teacher: Online classes assigned to this teacher
 * - Student: Online classes assigned to this student
 */
export async function GET(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: NO_CACHE }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const search = searchParams.get("search");
    const platform = searchParams.get("platform");

    const query = { isActive: true };

    // Role-based security filter
    if (auth.role === "teacher") {
      query.teacher = auth.id;
    } else if (auth.role === "student") {
      query.student = auth.id;
    } else if (!["admin", "super-admin", "staff"].includes(auth.role)) {
      // Custom roles without admin privileges
      return NextResponse.json(
        { success: false, message: "Access denied for this role" },
        { status: 403, headers: NO_CACHE }
      );
    }

    if (platform && platform !== "all") {
      if (platform === "google-meet") {
        query.$or = [{ platform: "google-meet" }, { meetLink: { $exists: true, $ne: "" } }];
      } else if (platform === "livekit") {
        query.platform = { $in: ["livekit", null, undefined] };
      } else {
        query.platform = platform;
      }
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (date) {
      const d = new Date(date);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      query.scheduledDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (search) {
      const searchOr = [
        { title: { $regex: search, $options: "i" } },
        { topic: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const classes = await OnlineClassModel.find(query)
      .populate("teacher", "fullName teacherId email designation avatar phone")
      .populate("student", "fullName studentId email avatar phone")
      .populate("course", "title courseId thumbnail level")
      .sort({ scheduledDate: -1, scheduledStartTime: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: classes.length,
        classes,
      },
      { status: 200, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[GET /api/online-classes] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch online classes" },
      { status: 500, headers: NO_CACHE }
    );
  }
}

/**
 * POST /api/online-classes
 * Create a new Online Class (Admin, Super-Admin, or Teacher)
 */
export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: NO_CACHE }
      );
    }

    const allowedRoles = ["admin", "super-admin", "staff", "teacher"];
    if (!allowedRoles.includes(auth.role)) {
      return NextResponse.json(
        { success: false, message: "Only teachers and admins can create online classes" },
        { status: 403, headers: NO_CACHE }
      );
    }

    await dbConnect();
    const body = await request.json();

    const {
      title,
      subject,
      topic,
      teacherId,
      studentId,
      courseId,
      scheduledDate,
      scheduledStartTime,
      scheduledEndTime,
      duration = 45,
      notes = "",
      platform = "livekit",
      meetLink = "",
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Class title or subject is required" },
        { status: 400, headers: NO_CACHE }
      );
    }

    // Determine teacher ID
    let finalTeacherId = teacherId;
    if (auth.role === "teacher") {
      finalTeacherId = auth.id;
    }

    if (!finalTeacherId) {
      return NextResponse.json(
        { success: false, message: "Teacher is required" },
        { status: 400, headers: NO_CACHE }
      );
    }

    // Auto-generate a secure, unique session identifier
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sessionName = `fajr_${platform === "google-meet" ? "meet" : "online"}_${Date.now()}_${randomSuffix}`;

    // Handle Google Meet link generation if platform is google-meet and meetLink is empty
    let finalMeetLink = meetLink ? meetLink.trim() : "";
    if (platform === "google-meet" && !finalMeetLink) {
      try {
        finalMeetLink = await createGoogleMeetLink(
          title,
          scheduledStartTime || "10:00",
          scheduledEndTime || "10:45",
          scheduledDate || new Date()
        );
      } catch (meetErr) {
        console.warn("[POST /api/online-classes] Error generating meet link:", meetErr);
        finalMeetLink = "";
      }
    }

    const newClass = await OnlineClassModel.create({
      title,
      subject: subject || title,
      topic: topic || "",
      teacher: finalTeacherId,
      student: studentId || null,
      course: courseId || null,
      platform,
      meetLink: finalMeetLink,
      sessionName,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      scheduledStartTime: scheduledStartTime || "10:00",
      scheduledEndTime: scheduledEndTime || "",
      duration: Number(duration) || 45,
      status: "scheduled",
      createdBy: auth.id,
      notes,
    });

    const populated = await OnlineClassModel.findById(newClass._id)
      .populate("teacher", "fullName teacherId email designation avatar phone")
      .populate("student", "fullName studentId email avatar phone")
      .populate("course", "title courseId thumbnail level")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Online class created successfully",
        class: populated,
      },
      { status: 201, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[POST /api/online-classes] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create online class" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
