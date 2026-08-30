import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { UserModel } from "@/model/user-model";
import { StudentModel } from "@/model/student-model";
import { PaymentModel } from "@/model/payment-model";
import { StaffModel } from "@/model/staff-model";

export async function GET(request) {
  try {
    const headersList = await headers();
    const userRole = headersList.get("x-user-role");

    // Strictly restrict to super-admin (or admin if authorized)
    if (userRole !== "super-admin") {
      return NextResponse.json(
        { success: false, message: "Access Denied: Only Super Admin can access Affiliation Links." },
        { status: 403 }
      );
    }

    await dbConnect();

    // 1. Fetch all users from UserModel (Admins, Super-Admins, Staff, Managers, etc.)
    const users = await UserModel.find({ isActive: true })
      .select("_id fullName email phone role avatar createdAt")
      .sort({ fullName: 1 })
      .lean();

    // 2. Fetch all staff members to complement any non-user staff if present
    const staffMembers = await StaffModel.find({ status: "active" })
      .select("_id fullName email phone designation staffId avatar")
      .lean();

    // Combine unique affiliates by email or _id
    const affiliateMap = new Map();

    users.forEach((u) => {
      affiliateMap.set(u._id.toString(), {
        _id: u._id.toString(),
        fullName: u.fullName || "Unnamed User",
        email: u.email || "",
        phone: u.phone || "",
        role: u.role || "staff",
        avatar: u.avatar || "",
        type: "user",
        createdAt: u.createdAt,
      });
    });

    staffMembers.forEach((s) => {
      const existing = Array.from(affiliateMap.values()).find(
        (a) => a.email && s.email && a.email.toLowerCase() === s.email.toLowerCase()
      );
      if (!existing) {
        affiliateMap.set(s._id.toString(), {
          _id: s._id.toString(),
          fullName: s.fullName || "Staff Member",
          email: s.email || "",
          phone: s.phone || "",
          role: s.designation || "staff",
          avatar: s.avatar || "",
          type: "staff",
          createdAt: s.createdAt,
        });
      }
    });

    const affiliatesList = Array.from(affiliateMap.values());

    // 3. Fetch all students that have a crmRefId set
    const affiliatedStudents = await StudentModel.find({
      crmRefId: { $nin: [null, ""] },
    })
      .select("_id studentId fullName email phone status monthlyFee admissionFee course crmRefId createdAt")
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .lean();

    // 4. Fetch payments from affiliated students to calculate revenue
    const affiliatedStudentIds = affiliatedStudents.map((s) => s._id);
    const payments = await PaymentModel.find({
      student: { $in: affiliatedStudentIds },
      status: "completed",
    })
      .select("student amount")
      .lean();

    const revenueMap = new Map();
    payments.forEach((p) => {
      const sId = p.student.toString();
      revenueMap.set(sId, (revenueMap.get(sId) || 0) + (Number(p.amount) || 0));
    });

    // 5. Group students by crmRefId
    const studentsByCrm = new Map();
    affiliatedStudents.forEach((student) => {
      const crmKey = (student.crmRefId || "").toString().trim();
      if (!studentsByCrm.has(crmKey)) {
        studentsByCrm.set(crmKey, []);
      }
      const studentRev = revenueMap.get(student._id.toString()) || 0;
      studentsByCrm.get(crmKey).push({
        _id: student._id.toString(),
        studentId: student.studentId || "N/A",
        fullName: student.fullName,
        email: student.email,
        phone: student.phone,
        status: student.status,
        monthlyFee: student.monthlyFee || 0,
        admissionFee: student.admissionFee || 0,
        courseTitle: student.course?.title || "N/A",
        registeredAt: student.createdAt,
        totalPaid: studentRev,
      });
    });

    // 6. Enrich each affiliate with their student count, active/inactive count, and revenue
    const enrichedAffiliates = affiliatesList.map((aff) => {
      const students = studentsByCrm.get(aff._id) || [];
      const totalStudents = students.length;
      const activeStudents = students.filter((s) => s.status === "active").length;
      const inactiveStudents = students.filter((s) => s.status === "inactive" || s.status === "suspended").length;
      const totalRevenue = students.reduce((sum, s) => sum + s.totalPaid, 0);

      // Remove from map to see if any custom tags are left
      studentsByCrm.delete(aff._id);

      return {
        ...aff,
        affiliateLink: `https://app.fajracademy.io/student-registration?crm=${aff._id}`,
        totalStudents,
        activeStudents,
        inactiveStudents,
        totalRevenue,
        students,
      };
    });

    // 7. Include any custom / unmapped CRM tags that have registered students
    const customCampaigns = [];
    studentsByCrm.forEach((students, crmTag) => {
      const totalStudents = students.length;
      const activeStudents = students.filter((s) => s.status === "active").length;
      const inactiveStudents = students.filter((s) => s.status === "inactive" || s.status === "suspended").length;
      const totalRevenue = students.reduce((sum, s) => sum + s.totalPaid, 0);

      customCampaigns.push({
        _id: crmTag,
        fullName: `Campaign / Tag (${crmTag})`,
        email: "Custom Tag",
        phone: "N/A",
        role: "custom-campaign",
        avatar: "",
        type: "campaign",
        affiliateLink: `https://app.fajracademy.io/student-registration?crm=${encodeURIComponent(crmTag)}`,
        totalStudents,
        activeStudents,
        inactiveStudents,
        totalRevenue,
        students,
      });
    });

    const allAffiliates = [...enrichedAffiliates, ...customCampaigns].sort(
      (a, b) => b.totalStudents - a.totalStudents
    );

    // 8. Overall KPI calculations
    const totalAffiliatedStudents = affiliatedStudents.length;
    const totalActiveAffiliated = affiliatedStudents.filter((s) => s.status === "active").length;
    const totalInactiveAffiliated = affiliatedStudents.filter(
      (s) => s.status === "inactive" || s.status === "suspended"
    ).length;
    const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const activeAffiliatesCount = allAffiliates.filter((a) => a.totalStudents > 0).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalAffiliatedStudents,
        totalActiveAffiliated,
        totalInactiveAffiliated,
        totalRevenue,
        activeAffiliatesCount,
        totalAffiliatesCount: allAffiliates.length,
      },
      affiliates: allAffiliates,
    });
  } catch (error) {
    console.error("GET /api/admin/affiliation error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
