import { NextResponse } from "next/server";
import { updateTeacherProfile } from "@/queries/teacher-portal-queries";
import { headers } from "next/headers";
import { dbConnect } from "@/service/mongo";
import { TeacherModel } from "@/model/teacher-model";
import { UserModel } from "@/model/user-model";
import { PaymentInfoModel } from "@/model/paymentInfo-model";

export async function GET() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role");

  if (!userId || userRole !== "teacher") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    // ── Run primary lookups in parallel ───────────────────────────────────────
    const [teacher, paymentInfo] = await Promise.all([
      TeacherModel.findById(userId).select("-password").lean(),
      PaymentInfoModel.findOne({ userId }).lean(),
    ]);

    let resolvedTeacher = teacher;

    if (!resolvedTeacher) {
      // Fallback: look up by User email
      const user = await UserModel.findById(userId).lean();
      if (!user) {
        return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
      }
      resolvedTeacher = await TeacherModel.findOne({ email: user.email }).select("-password").lean();

      if (!resolvedTeacher) {
        // Last resort: return UserModel data as a minimal profile
        resolvedTeacher = {
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          isUserFallback: true,
        };
      }
    }

    if (paymentInfo) resolvedTeacher.paymentInfo = paymentInfo;

    const res = NextResponse.json({ success: true, teacher: resolvedTeacher }, { status: 200 });
    // Allow browser/CDN to cache profile for 30s (private = not shared caches)
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return res;
  } catch (error) {
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
    const data = await req.json();
    // Prevent overriding important fields
    delete data._id;
    delete data.teacherId;
    delete data.email;
    delete data.salary;
    delete data.salaryType;
    delete data.status;
    delete data.rating;
    
    if (data.password) {
      delete data.password; 
    }

    await dbConnect();

    // Process standalone PaymentInfoModel update
    let updatedPInfo = null;
    if (data.paymentInfo) {
      const now = new Date();
      const day = now.getDate();
      if (day < 15 || day > 28) {
        return NextResponse.json({ 
          success: false, 
          message: "পেমেন্ট তথ্য শুধুমাত্র প্রতি মাসের ১৫ থেকে ২৮ তারিখ রাত ১১:৫৯ পর্যন্ত আপডেট করা যাবে। (Payment info updates are only allowed from the 15th to 28th 11:59 PM of each month)." 
        }, { status: 403 });
      }

      let pInfo = await PaymentInfoModel.findOne({ userId });
      if (!pInfo) {
        pInfo = new PaymentInfoModel({ userId, userModel: "Teacher" });
      }

      if ((pInfo.updateCount || 0) >= 4) {
        return NextResponse.json({ 
          success: false, 
          message: "Maximum update limit reached. You can only update payment information up to 4 times." 
        }, { status: 400 });
      }

      Object.assign(pInfo, data.paymentInfo);
      pInfo.updateCount = (pInfo.updateCount || 0) + 1;
      await pInfo.save();
      updatedPInfo = pInfo.toObject();
      
      delete data.paymentInfo; // don't try to save it to TeacherModel
    }

    // 1. Try to find directly in TeacherModel by ID
    let teacher = await TeacherModel.findById(userId);
    let user = null;

    if (teacher) {
      // Update existing Teacher
      Object.assign(teacher, data);
      await teacher.save();

      // Find and update corresponding User model if it exists
      user = await UserModel.findOne({ email: teacher.email });
      if (user) {
        if (data.fullName) user.fullName = data.fullName;
        if (data.phone !== undefined) user.phone = data.phone;
        if (data.avatar !== undefined) user.avatar = data.avatar;
        await user.save();
      }
    } else {
      // 2. Look up in UserModel by ID
      user = await UserModel.findById(userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
      }

      // Update the User model
      if (data.fullName) user.fullName = data.fullName;
      if (data.phone !== undefined) user.phone = data.phone;
      if (data.avatar !== undefined) user.avatar = data.avatar;
      await user.save();

      // Look up Teacher profile by user email
      teacher = await TeacherModel.findOne({ email: user.email });
      if (teacher) {
        Object.assign(teacher, data);
        await teacher.save();
      } else {
        // Create new Teacher profile if it didn't exist
        teacher = new TeacherModel({
          ...data,
          email: user.email,
          fullName: user.fullName,
          password: user.password,
        });
        await teacher.save();
      }
    }

    // Ensure we don't return the password
    const teacherData = teacher.toObject();
    delete teacherData.password;
    if (updatedPInfo) {
      teacherData.paymentInfo = updatedPInfo;
    }

    return NextResponse.json({ success: true, teacher: teacherData }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
