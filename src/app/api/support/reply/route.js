import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { SupportTicketModel } from "@/model/support-ticket-model";
import { UserModel } from "@/model/user-model";
import { TeacherModel } from "@/model/teacher-model";
import { recordAuditLog } from "@/lib/audit-logger";

export async function POST(req) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ticketId, content } = await req.json();
    if (!ticketId || !content) {
      return NextResponse.json({ success: false, message: "Missing ticketId or content" }, { status: 400 });
    }

    await dbConnect();

    // Determine sender details
    let senderName = "Staff";
    let senderModel = "User";

    if (userRole === "teacher") {
      // Find the teacher
      let teacher = await TeacherModel.findById(userId).lean();
      if (!teacher) {
        const user = await UserModel.findById(userId).lean();
        if (user) {
          teacher = await TeacherModel.findOne({ email: user.email }).lean();
        }
      }
      senderName = teacher ? teacher.fullName : "Teacher";
      senderModel = "Teacher";
    } else if (userRole === "student") {
      const { StudentModel } = await import("@/model/student-model");
      let student = await StudentModel.findById(userId).lean();
      senderName = student ? student.fullName : "Student";
      senderModel = "Student";
    } else {
      // Admin / Staff
      const user = await UserModel.findById(userId).lean();
      if (user) {
        senderName = user.fullName;
      }
      senderModel = "User";
    }

    const ticket = await SupportTicketModel.findByIdAndUpdate(
      ticketId,
      {
        $push: {
          messages: {
            sender: userId,
            senderModel,
            senderName,
            content,
            sentAt: new Date()
          }
        },
        $set: { status: "in-progress" } // update status to in-progress on reply
      },
      { new: true }
    );

    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 });
    }

    await recordAuditLog(req, {
      action: "REPLY",
      resource: "SupportTicket",
      resourceId: ticketId,
      description: `${senderName} replied to support ticket "${ticket.title}"`
    });

    return NextResponse.json({ success: true, ticket }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
