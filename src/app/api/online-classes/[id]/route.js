import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { getAuthUser } from "@/lib/auth-server";
import { OnlineClassModel } from "@/model/online-class-model";
import "@/model/teacher-model";
import "@/model/student-model";
import "@/model/course-model";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * GET /api/online-classes/[id]
 * Fetch single online class details with access verification
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: NO_CACHE }
      );
    }

    await dbConnect();

    const onlineClass = await OnlineClassModel.findById(id)
      .populate("teacher", "fullName teacherId email designation avatar phone")
      .populate("student", "fullName studentId email avatar phone")
      .populate("course", "title courseId thumbnail level")
      .lean();

    if (!onlineClass || !onlineClass.isActive) {
      return NextResponse.json(
        { success: false, message: "Online class not found" },
        { status: 404, headers: NO_CACHE }
      );
    }

    // Role check
    const isTeacher = auth.role === "teacher" && onlineClass.teacher?._id?.toString() === auth.id;
    const isStudent = auth.role === "student" && onlineClass.student?._id?.toString() === auth.id;
    const isAdmin = ["admin", "super-admin", "staff"].includes(auth.role);

    if (!isTeacher && !isStudent && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Access denied to this online class" },
        { status: 403, headers: NO_CACHE }
      );
    }

    return NextResponse.json(
      {
        success: true,
        class: onlineClass,
        isHost: isTeacher || isAdmin,
        currentUser: {
          id: auth.id,
          name: auth.user?.fullName || "User",
          role: auth.role,
        },
      },
      { status: 200, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[GET /api/online-classes/[id]] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch class details" },
      { status: 500, headers: NO_CACHE }
    );
  }
}

/**
 * PATCH /api/online-classes/[id]
 * Update class details (Teacher or Admin)
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: NO_CACHE }
      );
    }

    await dbConnect();
    const onlineClass = await OnlineClassModel.findById(id);
    if (!onlineClass) {
      return NextResponse.json(
        { success: false, message: "Online class not found" },
        { status: 404, headers: NO_CACHE }
      );
    }

    const isTeacher = auth.role === "teacher" && onlineClass.teacher?.toString() === auth.id;
    const isAdmin = ["admin", "super-admin", "staff"].includes(auth.role);

    if (!isTeacher && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Only assigned teacher or admin can modify this class" },
        { status: 403, headers: NO_CACHE }
      );
    }

    const body = await request.json();
    const allowedUpdates = [
      "title",
      "topic",
      "subject",
      "scheduledDate",
      "scheduledStartTime",
      "scheduledEndTime",
      "duration",
      "notes",
      "student",
      "course",
    ];

    allowedUpdates.forEach((key) => {
      if (body[key] !== undefined) {
        onlineClass[key] = body[key];
      }
    });

    await onlineClass.save();

    const updated = await OnlineClassModel.findById(id)
      .populate("teacher", "fullName teacherId email designation avatar phone")
      .populate("student", "fullName studentId email avatar phone")
      .populate("course", "title courseId thumbnail level")
      .lean();

    return NextResponse.json(
      { success: true, message: "Class updated successfully", class: updated },
      { status: 200, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[PATCH /api/online-classes/[id]] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update class" },
      { status: 500, headers: NO_CACHE }
    );
  }
}

/**
 * DELETE /api/online-classes/[id]
 * Soft delete or cancel class (Teacher or Admin)
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: NO_CACHE }
      );
    }

    await dbConnect();
    const onlineClass = await OnlineClassModel.findById(id);
    if (!onlineClass) {
      return NextResponse.json(
        { success: false, message: "Online class not found" },
        { status: 404, headers: NO_CACHE }
      );
    }

    const isTeacher = auth.role === "teacher" && onlineClass.teacher?.toString() === auth.id;
    const isAdmin = ["admin", "super-admin", "staff"].includes(auth.role);

    if (!isTeacher && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403, headers: NO_CACHE }
      );
    }

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    if (permanent) {
      await OnlineClassModel.findByIdAndDelete(id);
    } else {
      onlineClass.status = "cancelled";
      onlineClass.isActive = false;
      await onlineClass.save();
    }

    return NextResponse.json(
      { success: true, message: "Online class deleted successfully" },
      { status: 200, headers: NO_CACHE }
    );
  } catch (error) {
    console.error("[DELETE /api/online-classes/[id]] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to cancel class" },
      { status: 500, headers: NO_CACHE }
    );
  }
}
