/**
 * Universal Permissions & Granular CRUD Management for Fajr Academy ERP
 */

export type CrudAction = "read" | "create" | "update" | "delete";

export const CRUD_ACTIONS: { id: CrudAction; label: string; short: string; color: string; bg: string }[] = [
  { id: "read",   label: "Read / View", short: "R", color: "text-blue-700 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800" },
  { id: "create", label: "Create",      short: "C", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800" },
  { id: "update", label: "Update",      short: "U", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800" },
  { id: "delete", label: "Delete",      short: "D", color: "text-rose-700 dark:text-rose-400",   bg: "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800" },
];

export interface PermissionModule {
  id: string;
  label: string;
  group: string;
  description?: string;
}

export const PERMISSION_MODULES: PermissionModule[] = [
  // General & Dashboard
  { id: "dashboard",            label: "Main Dashboard",           group: "General & Overview", description: "Overview stats, revenue, activity summary" },
  { id: "notifications",        label: "System Notifications",     group: "General & Overview", description: "Admin broadcast alerts and reminders" },
  { id: "notice-board",         label: "Global Notices",           group: "General & Overview", description: "Public and internal notice management" },

  // Student CRM
  { id: "student-crm",          label: "Student List & Directory", group: "Student CRM",        description: "Student profiles, enrollments, admissions" },
  { id: "student-feedback",     label: "Student Feedback",         group: "Student CRM",        description: "Course reviews and student ratings" },
  { id: "student-attendance",   label: "Student Attendance",       group: "Student CRM",        description: "Classroom attendance records and reports" },
  { id: "onboarding-crm",       label: "Onboarding CRM",           group: "Student CRM",        description: "New student conversion and onboarding" },

  // Teacher Management
  { id: "teacher-management",   label: "Teacher List & Directory", group: "Teacher Management", description: "Teacher profiles, verification, credentials" },
  { id: "teacher-schedule",     label: "Teacher Schedule",         group: "Teacher Management", description: "Class schedules, shift planning, timetables" },
  { id: "teacher-category",     label: "Teacher Categories",       group: "Teacher Management", description: "Departments, specialties, salary grades" },
  { id: "teacher-salaries",     label: "Teacher Salaries",         group: "Teacher Management", description: "Base salary rates, deductions, bonuses" },
  { id: "teacher-payment-info", label: "Teacher Payment Info",     group: "Teacher Management", description: "Bank and mobile banking disbursement details" },
  { id: "teacher-gems",         label: "Gems & Badges",            group: "Teacher Management", description: "Reward points, star ratings, recognition" },

  // Staff Management
  { id: "staff-management",     label: "Staff Directory",          group: "Staff Management",   description: "Office staff profiles and account management" },
  { id: "staff-attendance",     label: "Staff Attendance",         group: "Staff Management",   description: "Daily office clock-in, clock-out logs" },
  { id: "staff-leave",          label: "Leave Requests",           group: "Staff Management",   description: "Leave application approvals and balances" },
  { id: "staff-payroll",        label: "Staff Payroll",            group: "Staff Management",   description: "Monthly payroll processing and pay slips" },
  { id: "daily-reports",        label: "Daily Reports",            group: "Staff Management",   description: "End-of-day staff performance and tasks" },
  { id: "activity-logs",        label: "Staff Activity Logs",      group: "Staff Management",   description: "Audit trail of staff interactions" },

  // Academic & Courses
  { id: "course-management",    label: "Course Management",        group: "Courses & Classes",  description: "Courses, curriculums, pricing, syllabi" },
  { id: "classrooms",           label: "Classes Overview",         group: "Courses & Classes",  description: "Active class batches, zoom meetings, schedules" },
  { id: "exams-assignments",    label: "Exams & Assignments",      group: "Courses & Classes",  description: "Student tests, quiz submissions, scoring" },

  // Finance & Payroll
  { id: "finance-billing",      label: "Finance & Invoicing",      group: "Finance & Billing",  description: "Revenue records, tuition fee invoices" },
  { id: "salary-report",        label: "Monthly Salary Report",    group: "Finance & Billing",  description: "Monthly payroll breakdown and export sheets" },
  { id: "salary-management",    label: "Salary Processing",        group: "Finance & Billing",  description: "Direct salary disbursement approvals" },

  // Support & Operations
  { id: "support-tickets",      label: "Support Tickets",          group: "Support & Operations", description: "Student and teacher support queries" },
  { id: "ceo-requests",         label: "CEO Requests & Approvals", group: "Support & Operations", description: "High-priority administrative approvals" },

  // System & Administration
  { id: "roles-permissions",    label: "Role & Permission Admin",  group: "System & Administration", description: "Manage roles, CRUD access rights, admin users" },
  { id: "email-management",     label: "Email & Broadcasts",       group: "System & Administration", description: "Bulk announcements, system email templates" },
  { id: "settings",             label: "System Settings",          group: "System & Administration", description: "Platform configuration and ID card settings" },
  { id: "system-health",        label: "System Health & Status",   group: "System & Administration", description: "Server telemetry, database connection status" },
  { id: "audit-logs",           label: "Security Audit Logs",      group: "System & Administration", description: "Security events, modifications audit trail" },
  { id: "visitor-stats",        label: "Visitor Analytics",        group: "System & Administration", description: "Website traffic and conversion analytics" },
  { id: "system-logs",          label: "Server Logs",              group: "System & Administration", description: "Error logs and performance metrics" },
  { id: "ai-assistant",         label: "AI Assistant",             group: "System & Administration", description: "Automated support and operational AI" },
];

export const PERMISSION_MODULE_GROUPS: Record<string, PermissionModule[]> = PERMISSION_MODULES.reduce((acc: any, p) => {
  if (!acc[p.group]) acc[p.group] = [];
  acc[p.group].push(p);
  return acc;
}, {});

/**
 * Check if a user or permission array has a specific CRUD action on a module
 */
export function hasModuleAction(
  permissions: string[] | null | undefined,
  moduleId: string,
  action: CrudAction = "read"
): boolean {
  if (!permissions) return false;
  if (permissions.includes("*")) return true;

  if (action === "read") {
    // Read is allowed if user has moduleId, moduleId:read, or any action on moduleId
    return (
      permissions.includes(moduleId) ||
      permissions.includes(`${moduleId}:read`) ||
      permissions.includes(`${moduleId}:create`) ||
      permissions.includes(`${moduleId}:update`) ||
      permissions.includes(`${moduleId}:delete`)
    );
  }

  return permissions.includes(`${moduleId}:${action}`);
}

export interface ModulePermissionSummary {
  hasRead: boolean;
  hasCreate: boolean;
  hasUpdate: boolean;
  hasDelete: boolean;
  isFull: boolean;
  isReadOnly: boolean;
  hasAny: boolean;
  actionCount: number;
}

/**
 * Summarize CRUD status for a single module within a permissions list
 */
export function getModulePermissionSummary(
  permissions: string[] | null | undefined,
  moduleId: string
): ModulePermissionSummary {
  const perms = permissions || [];
  if (perms.includes("*")) {
    return {
      hasRead: true,
      hasCreate: true,
      hasUpdate: true,
      hasDelete: true,
      isFull: true,
      isReadOnly: false,
      hasAny: true,
      actionCount: 4,
    };
  }

  const hasCreate = perms.includes(`${moduleId}:create`);
  const hasUpdate = perms.includes(`${moduleId}:update`);
  const hasDelete = perms.includes(`${moduleId}:delete`);
  const hasRead =
    perms.includes(`${moduleId}:read`) ||
    perms.includes(moduleId) ||
    hasCreate ||
    hasUpdate ||
    hasDelete;

  const count = [hasRead, hasCreate, hasUpdate, hasDelete].filter(Boolean).length;
  const isFull = hasRead && hasCreate && hasUpdate && hasDelete;
  const isReadOnly = hasRead && !hasCreate && !hasUpdate && !hasDelete;

  return {
    hasRead,
    hasCreate,
    hasUpdate,
    hasDelete,
    isFull,
    isReadOnly,
    hasAny: count > 0,
    actionCount: count,
  };
}
