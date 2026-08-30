import jwt from "jsonwebtoken";
import { dbConnect } from "@/service/mongo";
import { UserModel } from "@/model/user-model";
import { TeacherModel } from "@/model/teacher-model";
import { StudentModel } from "@/model/student-model";

/**
 * Extracts and verifies the authenticated user from a Next.js Request.
 * Checks Cookies (`auth_token` or `token`) and `Authorization: Bearer <token>` headers.
 * 
 * @param {Request} request 
 * @returns {Promise<{ user: any, role: string, id: string } | null>}
 */
export async function getAuthUser(request) {
  try {
    let token = null;

    // 1. Check cookies
    const cookieHeader = request.headers.get("cookie") || "";
    const authMatch = cookieHeader.match(/(?:^|;\s*)(?:auth_token|token)=([^;]+)/);
    if (authMatch) {
      token = authMatch[1];
    }

    // 2. Check Authorization Header
    if (!token) {
      const authHeader = request.headers.get("authorization") || "";
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7).trim();
      }
    }

    // 3. Fallback to middleware injected headers
    const headerUserId = request.headers.get("x-user-id");
    const headerRole = request.headers.get("x-user-role");

    if (!token && !headerUserId) {
      return null;
    }

    let decoded = null;
    if (token) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        if (!headerUserId) return null;
      }
    }

    const userId = decoded?.id || headerUserId;
    const role = decoded?.role || headerRole || "student";

    if (!userId) {
      return null;
    }

    await dbConnect();

    let user = null;
    if (role === "teacher") {
      user = await TeacherModel.findById(userId).select("-password -resetPasswordToken").lean();
      if (user) user.role = "teacher";
    } else if (role === "student") {
      user = await StudentModel.findById(userId).select("-password -resetPasswordToken").lean();
      if (user) user.role = "student";
    } else {
      user = await UserModel.findById(userId).select("-password -resetPasswordToken").lean();
      if (user && !user.role) user.role = role;
    }

    if (!user) {
      return {
        user: { _id: userId, fullName: decoded?.fullName || "User", role },
        role,
        id: userId,
      };
    }

    return {
      user,
      role: user.role || role,
      id: user._id.toString(),
    };
  } catch (error) {
    console.error("[getAuthUser] Error authenticating request:", error);
    return null;
  }
}
