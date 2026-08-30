// utils/permissions.js
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// Utility function to get pathname and check permissions
export const checkPermissionAndRedirect = async(permissions) => {
  const headersList = headers();


  const domain = headersList.get('host') || "";
  const fullUrl = headersList.get('referer') || "";
  const [,pathname] = fullUrl.match( new RegExp(`https?:\/\/${domain}(.*)`))||[];

 

  if (!permissions.includes(pathname)) {
    // console.error("Access Denied: You do not have permission to view this page.");
    // Redirect to dashboard or another fallback page
    redirect("/dashboard/account"); 
    return false; // Prevent further rendering
  }

  return true; // Permission granted
};
