import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { sendCustomEmail } from "@/utlis/mail";
import { getEmailLogs, logSentEmail } from "@/queries/email-queries";
import { TeacherModel } from "@/model/teacher-model";
import { StudentModel } from "@/model/student-model";
import { StaffModel } from "@/model/staff-model";
import { recordAuditLog } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;

    const result = await getEmailLogs({ page, limit });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/emails:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { recipientType, customEmail, subject, body: emailBody, action } = body;

    if (action === "test") {
      if (!customEmail) {
        return NextResponse.json({ success: false, message: "Test recipient email is required." }, { status: 400 });
      }
      try {
        await sendCustomEmail({
          toEmail: customEmail,
          subject: "Fajr Academy ERP - SMTP Test Connection",
          htmlBody: `
            <h3>SMTP Test Connection Successful! 🎉</h3>
            <p>This email confirms that the SMTP server credentials at process.env.GMAIL_APP_PASSWORD are properly configured and operational.</p>
            <p><strong>Sender:</strong> ${process.env.GMAIL_USER || "su31f2@gmail.com"}</p>
            <p><strong>Recipient:</strong> ${customEmail}</p>
          `
        });

        await logSentEmail({
          to: customEmail,
          subject: "Fajr Academy ERP - SMTP Test Connection",
          body: "SMTP Test Successful",
          status: "success",
          sentBy: "System Admin (Test)"
        });

        return NextResponse.json({ success: true, message: "Test email sent successfully!" }, { status: 200 });
      } catch (err) {
        await logSentEmail({
          to: customEmail,
          subject: "Fajr Academy ERP - SMTP Test Connection",
          body: "SMTP Test Failed",
          status: "failed",
          sentBy: "System Admin (Test)",
          error: err.message
        });
        throw err;
      }
    }

    if (!recipientType || !subject || !emailBody) {
      return NextResponse.json({ success: false, message: "recipientType, subject, and body are required." }, { status: 400 });
    }

    await dbConnect();
    let recipients = [];

    if (recipientType === "custom") {
      if (!customEmail) {
        return NextResponse.json({ success: false, message: "Custom email address is required." }, { status: 400 });
      }
      recipients = [customEmail.trim()];
    } else if (recipientType === "teachers") {
      const list = await TeacherModel.find({ status: "active" }).select("email").lean();
      recipients = list.map(t => t.email).filter(Boolean);
    } else if (recipientType === "students") {
      const list = await StudentModel.find({ status: "active" }).select("email").lean();
      recipients = list.map(s => s.email).filter(Boolean);
    } else if (recipientType === "staff") {
      const list = await StaffModel.find({ status: "active" }).select("email").lean();
      recipients = list.map(s => s.email).filter(Boolean);
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, message: "No active recipients found for selected group." }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // Send emails in loop
    for (const email of recipients) {
      try {
        await sendCustomEmail({
          toEmail: email,
          subject: subject,
          htmlBody: emailBody
        });
        
        await logSentEmail({
          to: email,
          subject: subject,
          body: emailBody,
          status: "success",
          sentBy: "System Admin"
        });
        successCount++;
      } catch (err) {
        await logSentEmail({
          to: email,
          subject: subject,
          body: emailBody,
          status: "failed",
          sentBy: "System Admin",
          error: err.message
        });
        failCount++;
        errors.push({ email, error: err.message });
      }
    }

    // Record audit log
    await recordAuditLog(request, {
      action: "SEND_BULK_EMAIL",
      resource: "Email",
      resourceId: null,
      description: `Sent bulk email: "${subject}" to ${recipientType} (${successCount} succeeded, ${failCount} failed)`,
      changes: { recipientType, successCount, failCount, errors }
    });

    return NextResponse.json({
      success: true,
      message: `Bulk email sent: ${successCount} successful, ${failCount} failed.`,
      successCount,
      failCount,
      errors
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/admin/emails:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
