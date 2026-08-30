import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { SupportTicketModel } from "@/model/support-ticket-model";
import { recordAuditLog } from "@/lib/audit-logger";
import { escapeRegex } from "@/lib/utils";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const category = searchParams.get("category") || "";
    const priority = searchParams.get("priority") || "";

    const query = {};
    if (status && status !== "all") {
      let dbStatus = status.toLowerCase();
      if (dbStatus === "in progress") dbStatus = "in-progress";
      if (dbStatus === "on hold") dbStatus = "on-hold";
      query.status = dbStatus;
    }
    if (category && category !== "all") query.category = category.toLowerCase();
    if (priority && priority !== "all") query.priority = priority.toLowerCase();

    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { ticketId: { $regex: escaped, $options: "i" } },
        { raisedByName: { $regex: escaped, $options: "i" } },
        { raisedByEmail: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    const tickets = await SupportTicketModel.find(query).sort({ createdAt: -1 }).lean();

    // Map to frontend format
    const formattedTickets = tickets.map((t) => {
      const rawStatus = (t.status || "open").toLowerCase();
      const statusMap = {
        "open": "Open",
        "in-progress": "In Progress",
        "resolved": "Resolved",
        "closed": "Closed",
        "on-hold": "On Hold",
      };

      const rawPriority = (t.priority || "medium").toLowerCase();
      const formattedPriority = rawPriority.charAt(0).toUpperCase() + rawPriority.slice(1);

      return {
        id: t._id.toString(),
        ticketId: t.ticketId || t._id.toString().slice(-6).toUpperCase(),
        subject: t.title || "Untitled Ticket",
        student: t.raisedByName || t.raisedByEmail || "Unknown",
        category: t.category || "general",
        status: statusMap[rawStatus] || (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)),
        priority: formattedPriority,
        createdAt: t.createdAt || new Date().toISOString(),
        notes: t.messages?.[0]?.content || t.description || "No description provided.",
        messages: t.messages || [],
      };
    });

    return NextResponse.json({ success: true, tickets: formattedTickets }, { status: 200 });
  } catch (error) {
    console.error("GET /api/support error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await dbConnect();
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ success: false, message: "Missing ticket id or status" }, { status: 400 });
    }

    let dbStatus = status.toLowerCase();
    if (dbStatus === "in progress") dbStatus = "in-progress";
    if (dbStatus === "on hold") dbStatus = "on-hold";

    const beforeTicket = await SupportTicketModel.findById(id).lean();
    const updateData = { status: dbStatus };
    if (dbStatus === "resolved") {
      updateData.resolvedAt = new Date();
    } else if (dbStatus === "closed") {
      updateData.closedAt = new Date();
    }

    const ticket = await SupportTicketModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!ticket) return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 });

    await recordAuditLog(req, {
      action: "UPDATE",
      resource: "SupportTicket",
      resourceId: id,
      description: `Updated status of support ticket "${ticket.title}" to ${dbStatus}`,
      changes: { before: beforeTicket, after: ticket }
    });

    return NextResponse.json({ success: true, ticket }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/support error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
