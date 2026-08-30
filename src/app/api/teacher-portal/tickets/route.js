import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { resolveTeacherId } from "@/queries/teacher-portal-queries";
import { SupportTicketModel } from "@/model/support-ticket-model";
import { TeacherModel } from "@/model/teacher-model";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { escapeRegex } from "@/lib/utils";

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
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    const tid = new mongoose.Types.ObjectId(teacherId);

    // Build filter: tickets raised by this teacher
    const query = {
      $or: [
        { raisedBy: tid },
        { raisedBy: teacherId }
      ]
    };

    if (status && status !== "all") {
      query.status = status;
    }

    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      query.$and = [
        {
          $or: [
            { title: { $regex: escaped, $options: "i" } },
            { description: { $regex: escaped, $options: "i" } },
            { ticketId: { $regex: escaped, $options: "i" } },
            { category: { $regex: escaped, $options: "i" } },
          ]
        }
      ];
    }

    const skip = (page - 1) * limit;

    // Ensure UserModel is registered for populate
    const { UserModel } = await import("@/model/user-model");
    UserModel.init();

    // Base query for counting without the page-level status filter
    const baseQuery = {
      $or: [{ raisedBy: tid }, { raisedBy: teacherId }]
    };

    const [tickets, total, statusAgg] = await Promise.all([
      SupportTicketModel.find(query)
        .populate("assignedTo", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicketModel.countDocuments(query),
      SupportTicketModel.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
    ]);

    // Build status counts map
    const statusCounts = { open: 0, "in-progress": 0, resolved: 0, closed: 0, "on-hold": 0 };
    for (const row of statusAgg) {
      if (row._id && statusCounts.hasOwnProperty(row._id)) {
        statusCounts[row._id] = row.count;
      }
    }

    return NextResponse.json({
      success: true,
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      statusCounts,
    }, { status: 200 });
  } catch (error) {
    console.error("GET /api/teacher-portal/tickets error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

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

    const tid = new mongoose.Types.ObjectId(teacherId);

    // Rule: Check if teacher already has an active support ticket (open, in-progress, on-hold)
    const activeTicket = await SupportTicketModel.findOne({
      $or: [{ raisedBy: tid }, { raisedBy: teacherId }],
      status: { $in: ["open", "in-progress", "on-hold"] }
    }).lean();

    if (activeTicket) {
      const activeId = activeTicket.ticketId ? `#${activeTicket.ticketId}` : `ticket`;
      return NextResponse.json({
        success: false,
        activeTicketId: activeTicket.ticketId || activeTicket._id.toString(),
        message: `You already have an active support ticket (${activeId} - Status: ${activeTicket.status.toUpperCase()}). You can create a new ticket once your current ticket is resolved or closed.`
      }, { status: 400 });
    }

    const body = await req.json();
    const { category, description, title } = body;

    if (!description || !description.trim()) {
      return NextResponse.json({ success: false, message: "Ticket description is required" }, { status: 400 });
    }

    const ticketCategory = category || "general";
    const ticketTitle = (title && title.trim()) ? title.trim() : (category ? category : "Support Request");

    // Generate 5-digit numeric ticket ID
    const count = await SupportTicketModel.countDocuments();
    const candidateId = String(70000 + count + 1);

    const ticket = new SupportTicketModel({
      ticketId: candidateId,
      title: ticketTitle,
      description: description.trim(),
      raisedBy: new mongoose.Types.ObjectId(teacherId),
      raisedByModel: "Teacher",
      raisedByName: teacher.fullName || "Teacher",
      raisedByEmail: teacher.email || "",
      category: ticketCategory.toLowerCase().includes("internet") ? "technical" :
                ticketCategory.toLowerCase().includes("salary") || ticketCategory.toLowerCase().includes("billing") ? "billing" :
                ticketCategory.toLowerCase().includes("academic") ? "academic" : "general",
      priority: "medium",
      status: "open",
      messages: [
        {
          sender: new mongoose.Types.ObjectId(teacherId),
          senderModel: "Teacher",
          senderName: teacher.fullName || "Teacher",
          content: description.trim(),
          sentAt: new Date(),
        }
      ]
    });

    await ticket.save();

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error) {
    console.error("POST /api/teacher-portal/tickets error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
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

    const body = await req.json();
    const { ticketId, category, description, title } = body;

    if (!ticketId) {
      return NextResponse.json({ success: false, message: "Ticket ID parameter is required" }, { status: 400 });
    }

    const tid = new mongoose.Types.ObjectId(teacherId);

    // Find ticket raised by this teacher (support lookup by Mongo _id or custom ticketId)
    const ticket = await SupportTicketModel.findOne({
      $and: [
        {
          $or: [
            { _id: mongoose.Types.ObjectId.isValid(ticketId) ? new mongoose.Types.ObjectId(ticketId) : null },
            { ticketId: String(ticketId) }
          ]
        },
        {
          $or: [{ raisedBy: tid }, { raisedBy: teacherId }]
        }
      ]
    });

    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found or unauthorized" }, { status: 404 });
    }

    if (ticket.status !== "open") {
      return NextResponse.json({ success: false, message: "Only open tickets can be edited. Tickets under review, resolved, or closed cannot be edited." }, { status: 400 });
    }

    if (category) {
      ticket.category = category.toLowerCase().includes("internet") ? "technical" :
                        category.toLowerCase().includes("salary") || category.toLowerCase().includes("billing") ? "billing" :
                        category.toLowerCase().includes("academic") ? "academic" : "general";
    }
    if (title && title.trim()) ticket.title = title.trim();
    if (description && description.trim()) ticket.description = description.trim();

    await ticket.save();

    return NextResponse.json({ success: true, ticket }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/teacher-portal/tickets error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
