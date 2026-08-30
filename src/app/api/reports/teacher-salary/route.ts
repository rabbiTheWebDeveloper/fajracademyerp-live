import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { ClassSessionModel } from "@/model/class-model";
import { TeacherModel } from "@/model/teacher-model";
import { PaymentModel } from "@/model/payment-model";
import { StudentModel } from "@/model/student-model";
import { TeacherSalaryModel } from "@/model/teacherSalary-model";
import mongoose from "mongoose";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // Format: YYYY-MM
    
    if (!monthParam) {
      return NextResponse.json({ error: "Month is required (YYYY-MM)" }, { status: 400 });
    }

    const [year, month] = monthParam.split("-").map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    // Fetch all active teachers
    const teachers = await TeacherModel.find({ status: "active" }, { 
      _id: 1, teacherId: 1, fullName: 1, phone: 1, avatar: 1, salary: 1, salaryType: 1 
    }).lean();
    
    if (!teachers.length) {
      return NextResponse.json({ data: [] });
    }

    const teacherIds = teachers.map((t) => t._id);

    // Fetch classes for this month to compute attendance
    const classes = await ClassSessionModel.find({
      teacher: { $in: teacherIds },
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    // Group class data by teacher
    const classDataByTeacher = classes.reduce((acc, cls) => {
      const tId = cls.teacher.toString();
      if (!acc[tId]) {
        acc[tId] = {
          totalClasses: 0,
          presentCount: 0,
          absentCount: 0,
        };
      }
      acc[tId].totalClasses += 1;
      if (cls.studentAttendance === "present") acc[tId].presentCount += 1;
      if (cls.studentAttendance === "absent") acc[tId].absentCount += 1;
      return acc;
    }, {} as Record<string, any>);

    // Fetch ALL active students to group by teacherId
    const students = await StudentModel.find({ teacherId: { $in: teacherIds } }, { _id: 1, teacherId: 1, studentId: 1 }).lean();
    
    const studentsByTeacher = students.reduce((acc, s) => {
      const tId = s.teacherId?.toString();
      if (tId) {
        if (!acc[tId]) acc[tId] = [];
        acc[tId].push(s);
      }
      return acc;
    }, {} as Record<string, any[]>);

    const studentIds = students.map(s => s._id);

    // Fetch payments for these students in this month
    const payments = await PaymentModel.find({
      student: { $in: studentIds },
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate("student", "studentId teacherId").lean();

    const paymentsByTeacher = payments.reduce((acc, p: any) => {
      const student = p.student as any;
      const tId = student?.teacherId?.toString();
      if (tId) {
        if (!acc[tId]) acc[tId] = { completed: 0, pending: 0, studentIdsSet: new Set<string>() };
        
        const sIdStr = student?.studentId || "";
        
        if (p.status === "completed") {
          acc[tId].completed += (p.amount || 0);
          if (sIdStr) acc[tId].studentIdsSet.add(sIdStr);
        } else if (p.status === "pending") {
          acc[tId].pending += (p.amount || 0);
        }
      }
      return acc;
    }, {} as Record<string, { completed: number, pending: number, studentIdsSet: Set<string> }>);

    // Fetch existing salary records for this month to mark isGenerated
    const existingSalaries = await TeacherSalaryModel.find({ 
      teacher: { $in: teacherIds },
      month: monthParam
    }, { teacher: 1 }).lean();
    
    const generatedTeacherIds = new Set(existingSalaries.map(s => s.teacher?.toString()));

    const reportData = teachers.map((teacher, index) => {
      const tId = teacher._id.toString();
      const isGenerated = generatedTeacherIds.has(tId);
      
      // Class data
      const cData = classDataByTeacher[tId] || { totalClasses: 0, presentCount: 0, absentCount: 0 };
      const totalClasses = cData.totalClasses;

      // Student data
      const tStudents = studentsByTeacher[tId] || [];
      const totalStudents = tStudents.length;

      // Payment data
      const pData = paymentsByTeacher[tId] || { completed: 0, pending: 0, studentIdsSet: new Set<string>() };
      const studentPaymentCompleted = pData.completed;
      const studentPaymentDue = pData.pending;
      const studentPaidCount = pData.studentIdsSet.size;
      const studentPaidIds = Array.from(pData.studentIdsSet).join(", ") || "—";

      // Calculate Teacher Salary
      const baseSalary = teacher.salary || 0;
      const salaryType = teacher.salaryType || "monthly";
      let calculatedTotalSalary = 0;

      if (salaryType === "monthly") {
        calculatedTotalSalary = baseSalary;
      } else if (salaryType === "per-student-percentage") {
        calculatedTotalSalary = (studentPaymentCompleted * baseSalary) / 100;
      } else if (salaryType === "per-student-amount") {
        calculatedTotalSalary = totalStudents * baseSalary;
      }

      // Calculate Attendance & Performance
      const totalAttendanceMarked = cData.presentCount + cData.absentCount;
      const attendancePercentage = totalAttendanceMarked > 0 
        ? ((cData.presentCount / totalAttendanceMarked) * 100).toFixed(2)
        : "0.00";
        
      // For overall performance, let's just use attendance percentage for now. 
      // Can be enhanced if other metrics are desired.
      let overallPerformance = "Average";
      const attNum = parseFloat(attendancePercentage);
      if (attNum >= 90) overallPerformance = "Excellent";
      else if (attNum >= 75) overallPerformance = "Good";
      else if (attNum >= 50) overallPerformance = "Average";
      else overallPerformance = "Poor";
      if (totalClasses === 0) overallPerformance = "N/A";

      return {
        serial: 0, // will be set after sorting
        teacherName: teacher.fullName,
        teacherId: teacher.teacherId,
        _id: tId,
        avatar: teacher.avatar || "",
        phoneNumber: teacher.phone || "—",
        totalClasses,
        totalStudents,
        studentPaidCount,
        studentPaidIds,
        studentPaymentCompleted,
        studentPaymentDue, // added for 'due' requirement
        salaryType,
        baseSalary,
        calculatedTotalSalary,
        attendancePercentage: parseFloat(attendancePercentage),
        overallPerformance,
        isGenerated
      };
    });

    // Sort by totalStudents descending (highest student wise), then calculatedTotalSalary descending
    reportData.sort((a, b) => b.totalStudents - a.totalStudents || b.calculatedTotalSalary - a.calculatedTotalSalary);
    reportData.forEach((row, idx) => { row.serial = idx + 1; });

    return NextResponse.json({ data: reportData });
  } catch (error) {
    console.error("Error fetching teacher salary report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
