import { NextResponse } from "next/server";
import { getStudentAuth } from "@/lib/student-auth";
import { dbConnect } from "@/service/mongo";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    const { userId, userRole } = await getStudentAuth(request);

    if (!userId || userRole !== "student") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const Student = mongoose.models.Student;
    const Payment = mongoose.models.Payment || mongoose.model("Payment");
    const Enrollment = mongoose.models.Enrollment || mongoose.model("Enrollment");
    const Course = mongoose.models.Course || mongoose.model("Course");

    const [payments, enrollments, student] = await Promise.all([
      Payment.find({ student: userId })
        .populate("student", "fullName studentId email phone teacherId")
        .populate("course", "title")
        .sort({ createdAt: -1 })
        .lean(),
      Enrollment.find({ student: userId, status: "active" })
        .populate("course", "title")
        .lean(),
      Student.findById(userId).select("fullName studentId email phone course monthlyFee classStartingDate admissionDate teacherId").lean()
    ]);

    const enrolledCourses = enrollments.map(e => e.course).filter(Boolean);

    // Resolve student.course (now stored as ObjectId) if not already in enrolledCourses list
    let resolvedCourseName = "";
    if (student && student.course) {
      const courseObj = await Course.findById(student.course).select("title").lean();
      if (courseObj) {
        resolvedCourseName = courseObj.title;
        const alreadyAdded = enrolledCourses.some(c => c._id.toString() === courseObj._id.toString());
        if (!alreadyAdded) {
          enrolledCourses.push({
            _id: courseObj._id.toString(),
            title: courseObj.title
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      payments,
      enrolledCourses,
      studentInfo: student ? {
        monthlyFee: student.monthlyFee || 0,
        joinDate: student.classStartingDate || student.admissionDate || null,
        course: resolvedCourseName
      } : null
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { userId, userRole } = await getStudentAuth(req);

    if (!userId || userRole !== "student") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, paymentMethod, paymentMethodDetails, notes, course, month } = body;

    if (!amount || !paymentMethod) {
      return NextResponse.json(
        { success: false, message: "Amount and payment method are required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const Payment = mongoose.models.Payment || mongoose.model("Payment");

    const payment = new Payment({
      student: userId,
      course: course || null,
      amount: Number(amount),
      paymentMethod,
      paymentMethodDetails: paymentMethodDetails || "",
      notes: notes || "",
      month: month || "",
      status: "pending",
      paidAt: new Date()
    });

    await payment.save();

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
