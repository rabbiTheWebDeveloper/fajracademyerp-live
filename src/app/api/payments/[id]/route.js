import { NextResponse } from "next/server";
import { getPaymentById } from "@/queries/payment-queries";
import { dbConnect } from "@/service/mongo";
import { PaymentModel } from "@/model/payment-model";
import { recordAuditLog } from "@/lib/audit-logger";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const payment = await getPaymentById(id);
    if (!payment) return NextResponse.json({ success: false, message: "Payment not found" }, { status: 404 });
    return NextResponse.json({ success: true, payment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    await dbConnect();
    
    const beforePayment = await PaymentModel.findById(id).lean();
    if (!beforePayment) {
      return NextResponse.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    const payment = await PaymentModel.findById(id);

    const targetStudent = body.student !== undefined ? (body.student?._id || body.student) : payment.student;
    const targetMonth = body.month !== undefined ? body.month : payment.month;
    const targetType = body.type !== undefined ? body.type : payment.type;

    // Only enforce duplicate check if target month/student/type changed for course fees
    const isMonthChanged = body.month !== undefined && body.month !== beforePayment.month;
    const isStudentChanged = body.student !== undefined && String(body.student?._id || body.student) !== String(beforePayment.student);
    const isTypeChanged = body.type !== undefined && body.type !== beforePayment.type;

    if (
      (isMonthChanged || isStudentChanged || isTypeChanged) &&
      targetStudent &&
      targetMonth &&
      typeof targetMonth === "string" &&
      targetMonth.trim() !== "" &&
      (targetType === "monthly-fee" || targetType === "installment")
    ) {
      const existing = await PaymentModel.findOne({
        _id: { $ne: id },
        student: targetStudent,
        month: targetMonth.trim(),
        type: { $in: ["monthly-fee", "installment"] },
        status: { $ne: "cancelled" }
      });

      if (existing) {
        return NextResponse.json({
          success: false,
          message: `A monthly payment record for this student for ${targetMonth} already exists.`
        }, { status: 400 });
      }
    }

    if (body.student !== undefined) {
      payment.student = body.student?._id || body.student;
    }
    if (body.course !== undefined) {
      const courseVal = body.course?._id || body.course;
      payment.course = courseVal && String(courseVal).trim() ? courseVal : null;
    }
    if (body.amount !== undefined) {
      payment.amount = Number(body.amount);
    }
    if (body.type !== undefined) {
      payment.type = body.type;
    }
    if (body.status !== undefined) {
      payment.status = body.status;
    }
    if (body.paymentMethod !== undefined) {
      payment.paymentMethod = body.paymentMethod;
    }
    if (body.paymentMethodDetails !== undefined) {
      payment.paymentMethodDetails = body.paymentMethodDetails || "";
    }
    if (body.mrNumber !== undefined) {
      payment.mrNumber = body.mrNumber || "";
    }
    if (body.notes !== undefined) {
      payment.notes = body.notes || "";
    }
    if (body.month !== undefined) {
      payment.month = body.month || "";
    }
    if (body.dueDate !== undefined) {
      payment.dueDate = body.dueDate && String(body.dueDate).trim() ? new Date(body.dueDate) : null;
    }
    if (body.print !== undefined) {
      payment.print = Boolean(body.print);
    }

    if (body.status === "completed" && !payment.paidAt) {
      payment.paidAt = new Date();
    } else if (body.status && body.status !== "completed") {
      payment.paidAt = null;
    }

    await payment.save();

    // Auto-activate student account if payment status is completed (e.g. registration/admission payment)
    if (payment.status === "completed" && payment.student) {
      try {
        const { StudentModel } = await import("@/model/student-model");
        const studentDoc = await StudentModel.findById(payment.student);
        if (studentDoc && (studentDoc.status === "inactive" || studentDoc.isActive === false)) {
          studentDoc.status = "active";
          studentDoc.isActive = true;
          if (!studentDoc.admissionDate) {
            studentDoc.admissionDate = new Date();
          }
          await studentDoc.save();
        }
      } catch (stErr) {
        console.error("Failed to auto-activate student on payment completion:", stErr);
      }
    }

    const afterPayment = payment.toObject();

    await recordAuditLog(request, {
      action: "UPDATE",
      resource: "Payment",
      resourceId: id,
      description: `Updated payment transaction: ${payment.transactionId}`,
      changes: { before: beforePayment, after: afterPayment }
    });

    const populatedPayment = await PaymentModel.findById(id)
      .populate("student", "fullName studentId email avatar teacherId course")
      .populate("course", "title")
      .lean();

    if (populatedPayment && populatedPayment.student && populatedPayment.student.teacherId) {
      const { TeacherModel } = await import("@/model/teacher-model");
      const teacher = await TeacherModel.findById(populatedPayment.student.teacherId).select("fullName avatar").lean();
      if (teacher) {
        populatedPayment.student.teacherInfo = {
          name: teacher.fullName,
          avatar: teacher.avatar || ""
        };
      }
    }

    return NextResponse.json({ success: true, payment: populatedPayment || afterPayment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    const payment = await PaymentModel.findById(id).lean();
    if (!payment) {
      return NextResponse.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    await PaymentModel.findByIdAndDelete(id);

    await recordAuditLog(request, {
      action: "DELETE",
      resource: "Payment",
      resourceId: id,
      description: `Deleted payment transaction: ${payment.transactionId} of $${payment.amount}`,
      changes: { before: payment }
    });

    return NextResponse.json({ success: true, message: "Payment deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
