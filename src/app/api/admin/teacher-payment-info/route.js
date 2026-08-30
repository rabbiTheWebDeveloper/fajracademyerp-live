import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { PaymentInfoModel } from "@/model/paymentInfo-model";

export async function GET(request) {
  try {
    await dbConnect();

    // 1. Fetch all active teachers
    const teachers = await TeacherModel.find({ status: "active" })
      .select("_id fullName teacherId salary salaryType")
      .sort({ createdAt: 1 });
    
    // 2. Fetch all payment infos for teachers
    const paymentInfos = await PaymentInfoModel.find({ userModel: "Teacher" });

    // Map payment infos by userId
    const paymentMap = {};
    for (const info of paymentInfos) {
      paymentMap[info.userId.toString()] = info;
    }
    
    const formattedData = teachers.map((teacher, index) => {
      const pInfo = paymentMap[teacher._id.toString()] || {};
      
      let rawBank = pInfo.bankName || "IBBL";
      // Format "Islami Bank Bangladesh PLC." or empty bank name to "IBBL"
      let bankName = rawBank;
      if (!rawBank || rawBank.toLowerCase().includes("islami bank") || rawBank.toUpperCase() === "IBBL") {
        bankName = "IBBL";
      }

      const totalGross = teacher.salary || 0;
      const commission = 0;
      const advance = 0;
      const netAmount = totalGross + commission - advance;

      return {
        "SL No": String(index + 1).padStart(2, '0'),
        "Bank Name": bankName,
        "Branch Name": pInfo.branchName || "",
        "Routing Number": pInfo.routingNumber || "",
        "Account Number": pInfo.accountNumber || "",
        "Employee Name": teacher.fullName || "",
        "Total Gross": totalGross,
        "Commision": commission,
        "Advance": advance,
        "Net Amount": netAmount
      };
    });

    return NextResponse.json({ success: true, data: formattedData }, { status: 200 });

  } catch (error) {
    console.error("GET /api/admin/teacher-payment-info error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
