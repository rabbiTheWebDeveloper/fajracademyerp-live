import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { CeoRequestModel } from "@/model/ceo-request-model";
import { TeacherModel } from "@/model/teacher-model";
import { headers } from "next/headers";
import { escapeRegex } from "@/lib/utils";

// GET — Admin fetches all CEO requests
export async function GET(req) {
  const headersList = await headers();
  const userRole = headersList.get("x-user-role");

  if (!userRole || !["admin", "super-admin", "manager"].includes(userRole)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    const query = {};
    if (type && type !== "all") query.type = type;
    if (status && status !== "all") query.status = status;
    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      query.$or = [
        { subject: { $regex: escaped, $options: "i" } },
        { message: { $regex: escaped, $options: "i" } },
        { teacherName: { $regex: escaped, $options: "i" } },
        { requestId: { $regex: escaped, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [requests, total, statsAgg] = await Promise.all([
      CeoRequestModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("teacherId", "avatar")
        .lean(),
      CeoRequestModel.countDocuments(query),
      CeoRequestModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const stats = { pending: 0, seen: 0, "in-review": 0, responded: 0, closed: 0 };
    for (const row of statsAgg) {
      if (row._id && stats.hasOwnProperty(row._id)) stats[row._id] = row.count;
    }

    const typesAgg = await CeoRequestModel.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);
    const typeStats = { meeting_request: 0, problem_report: 0 };
    for (const row of typesAgg) {
      if (row._id && typeStats.hasOwnProperty(row._id)) typeStats[row._id] = row.count;
    }

    return NextResponse.json({
      success: true,
      requests,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      stats,
      typeStats,
    });
  } catch (error) {
    console.error("GET /api/admin/ceo-requests error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH — Admin responds to / updates status of a CEO request
export async function PATCH(req) {
  const headersList = await headers();
  const userRole = headersList.get("x-user-role");
  const userName = headersList.get("x-user-name") || "Admin";

  if (!userRole || !["admin", "super-admin", "manager"].includes(userRole)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const { id, status, adminResponse } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Request ID is required" }, { status: 400 });
    }

    const request = await CeoRequestModel.findById(id);
    if (!request) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    }

    if (status) request.status = status;
    if (adminResponse !== undefined) request.adminResponse = adminResponse.trim();

    // Mark seenAt when first seen
    if (status === "seen" && !request.seenAt) {
      request.seenAt = new Date();
    }

    // Mark respondedAt when a response is submitted
    if (adminResponse && adminResponse.trim()) {
      request.respondedAt = new Date();
      request.respondedBy = userName;
      if (!status || status === "seen" || status === "in-review") {
        request.status = "responded";
      }
    }

    await request.save();

    const populatedRequest = await CeoRequestModel.findById(request._id)
      .populate("teacherId", "avatar")
      .lean();

    return NextResponse.json({ success: true, request: populatedRequest });
  } catch (error) {
    console.error("PATCH /api/admin/ceo-requests error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE — Admin deletes a CEO request
export async function DELETE(req) {
  const headersList = await headers();
  const userRole = headersList.get("x-user-role");

  if (!userRole || !["admin", "super-admin", "manager"].includes(userRole)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Request ID is required" }, { status: 400 });
    }

    const request = await CeoRequestModel.findByIdAndDelete(id);
    if (!request) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Request deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/ceo-requests error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
