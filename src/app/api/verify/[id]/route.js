import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";
import { escapeRegex } from "@/lib/utils";

// Basic in-memory rate limiting to protect against DoS/Brute-force
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // Max 15 verification requests per minute per IP

function checkRateLimit(ip) {
  // Prevent memory leak from Map growing indefinitely
  if (rateLimitMap.size > 10000) {
    rateLimitMap.clear();
  }

  const currentTime = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, lastReset: currentTime });
    return { allowed: true };
  }
  
  const requestData = rateLimitMap.get(ip);
  if (currentTime - requestData.lastReset > RATE_LIMIT_WINDOW_MS) {
    requestData.count = 1;
    requestData.lastReset = currentTime;
    return { allowed: true };
  }
  
  if (requestData.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false };
  }
  
  requestData.count += 1;
  return { allowed: true };
}

export async function GET(request, { params }) {
  try {
    // 1. Rate Limiting Check
    const ip = request.headers.get("x-forwarded-for") || request.ip || "unknown-ip";
    const rateLimit = checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, verified: false, message: "Too many verification requests. Please wait a minute and try again." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
    const resolvedParams = await params;
    let queryId = (resolvedParams?.id || "").trim();

    if (!queryId) {
      const { searchParams } = new URL(request.url);
      queryId = (searchParams.get("id") || "").trim();
    }

    if (!queryId) {
      return NextResponse.json(
        { success: false, verified: false, message: "User ID or Email is required for verification." },
        { status: 400 }
      );
    }

    await dbConnect();

    // Import models
    const { StudentModel } = await import("@/model/student-model");
    const { TeacherCategoryModel } = await import("@/model/teacher-category-model");
    const { TeacherModel } = await import("@/model/teacher-model");
    const { StaffModel } = await import("@/model/staff-model");
    const { UserModel } = await import("@/model/user-model");

    const isMongoId = mongoose.isValidObjectId(queryId);

    const escapedQueryId = escapeRegex(queryId);

    // 1. Try finding in StudentModel
    let studentFilter = {
      $or: [
        { studentId: { $regex: `^${escapedQueryId}$`, $options: "i" } },
        { email: queryId.toLowerCase() },
      ],
    };
    if (isMongoId) studentFilter.$or.push({ _id: queryId });

    const student = await StudentModel.findOne(studentFilter)
      .populate("course", "title category")
      .lean();

    if (student) {
      const verificationId = `FAJR-STU-${(student._id.toString()).slice(-6).toUpperCase()}`;
      return NextResponse.json({
        success: true,
        verified: true,
        data: {
          userType: "Student",
          role: "Student",
          idCode: student.studentId || `STU-${student._id.toString().slice(-6)}`,
          fullName: student.fullName,
          avatar: student.avatar || "",
          gender: student.gender || "N/A",
          status: student.status || "active",
          course: student.course?.title || "Enrolled Program",
          department: "Islamic Studies",
          joinedDate: student.admissionDate || student.createdAt,
          verificationId,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    // 2. Try finding in TeacherModel
    let teacherFilter = {
      $or: [
        { teacherId: { $regex: `^${escapedQueryId}$`, $options: "i" } },
        { email: queryId.toLowerCase() },
      ],
    };
    if (isMongoId) teacherFilter.$or.push({ _id: queryId });

    const teacher = await TeacherModel.findOne(teacherFilter)
      .populate("category", "name")
      .lean();

    if (teacher) {
      const verificationId = `FAJR-TEA-${(teacher._id.toString()).slice(-6).toUpperCase()}`;
      return NextResponse.json({
        success: true,
        verified: true,
        data: {
          userType: "Teacher",
          role: "Faculty Teacher",
          idCode: teacher.teacherId || `TEA-${teacher._id.toString().slice(-6)}`,
          fullName: teacher.fullName,
          avatar: teacher.avatar || "",
          gender: teacher.gender || "N/A",
          status: teacher.status || "active",
          designation: teacher.designation || "Faculty Member",
          department: teacher.category?.name || "Academic Faculty",
          joinedDate: teacher.joinDate || teacher.createdAt,
          verificationId,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    // 3. Try finding in StaffModel
    let staffFilter = {
      $or: [
        { staffId: { $regex: `^${escapedQueryId}$`, $options: "i" } },
        { email: queryId.toLowerCase() },
      ],
    };
    if (isMongoId) staffFilter.$or.push({ _id: queryId });

    const staff = await StaffModel.findOne(staffFilter).lean();

    if (staff) {
      const verificationId = `FAJR-STF-${(staff._id.toString()).slice(-6).toUpperCase()}`;
      return NextResponse.json({
        success: true,
        verified: true,
        data: {
          userType: "Staff",
          role: "Staff Member",
          idCode: staff.staffId || `STF-${staff._id.toString().slice(-6)}`,
          fullName: staff.fullName,
          avatar: staff.avatar || "",
          gender: staff.gender || "N/A",
          status: staff.status || "active",
          designation: staff.designation || "Staff",
          department: staff.department ? staff.department.toUpperCase() : "Administration",
          joinedDate: staff.joiningDate || staff.createdAt,
          verificationId,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    // 4. Try finding in UserModel (Admin/User)
    let userFilter = {
      $or: [{ email: queryId.toLowerCase() }],
    };
    if (isMongoId) userFilter.$or.push({ _id: queryId });

    const user = await UserModel.findOne(userFilter).lean();

    if (user) {
      const verificationId = `FAJR-USR-${(user._id.toString()).slice(-6).toUpperCase()}`;
      return NextResponse.json({
        success: true,
        verified: true,
        data: {
          userType: "User",
          role: user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : "Member",
          idCode: `USR-${user._id.toString().slice(-6).toUpperCase()}`,
          fullName: user.fullName || "Fajr Academy User",
          avatar: user.avatar || "",
          gender: "N/A",
          status: "active",
          department: "Fajr Academy System",
          joinedDate: user.createdAt,
          verificationId,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        verified: false,
        message: `No active student, teacher, or staff record found matching ID/Email "${queryId}" in Fajr Academy database.`,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("[GET /api/verify]", error);
    return NextResponse.json(
      { success: false, verified: false, message: "Server error during verification." },
      { status: 500 }
    );
  }
}
