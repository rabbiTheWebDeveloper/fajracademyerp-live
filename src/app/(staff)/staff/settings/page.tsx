"use client";

import { useState } from "react";
import {
  Settings, User, Lock, Bell, Clock, Shield,
  Save, Eye, EyeOff, CheckCircle2, Camera,
} from "lucide-react";

const TABS = [
  { key: "profile",       label: "Profile",        icon: User    },
  { key: "security",      label: "Security",        icon: Lock    },
  { key: "notifications", label: "Notifications",   icon: Bell    },
  { key: "schedule",      label: "Work Schedule",   icon: Clock   },
];

export default function StaffSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [profile, setProfile] = useState({
    fullName:  "Fatima Zahra",
    email:     "fatima@fajracademy.io",
    phone:     "+8801712345678",
    designation: "Sales Executive",
    department:  "sales",
    bio:       "",
    linkedIn:  "",
  });

  const [security, setSecurity] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notifications, setNotifications] = useState({
    emailLeaveStatus:     true,
    emailPayslip:         true,
    emailDailyReminder:   false,
    browserAttendance:    true,
    browserLeave:         true,
    browserAnnouncement:  true,
  });

  const [schedule, setSchedule] = useState({
    officeStart: "09:00",
    officeEnd:   "18:00",
    workingDays: ["sunday","monday","tuesday","wednesday","thursday"],
  });

  const allDays = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

  const toggleDay = (day: string) => {
    setSchedule(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your profile, security, and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <aside className="lg:w-52 flex-shrink-0">
          <nav className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 space-y-0.5">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                  ${activeTab === key
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${activeTab === key ? "text-violet-600" : "text-slate-400"}`} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSave}>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">

              {/* ── PROFILE TAB ── */}
              {activeTab === "profile" && (
                <div className="p-6 space-y-6">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-4">Profile Information</h3>

                  {/* Avatar */}
                  <div className="flex items-center gap-5">
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                        FZ
                      </div>
                      <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-violet-700 transition-colors">
                        <Camera className="w-3.5 h-3.5 text-white" />
                        <input type="file" accept="image/*" className="hidden" />
                      </label>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{profile.fullName}</p>
                      <p className="text-xs text-slate-400 capitalize mt-0.5">{profile.designation} · {profile.department}</p>
                      <p className="text-xs text-violet-500 mt-1 cursor-pointer hover:underline">Change photo</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Full Name",    field: "fullName",    type: "text",  placeholder: "Your full name" },
                      { label: "Email",        field: "email",       type: "email", placeholder: "your@email.com" },
                      { label: "Phone Number", field: "phone",       type: "text",  placeholder: "+880 ..." },
                      { label: "Designation",  field: "designation", type: "text",  placeholder: "e.g. Sales Executive" },
                    ].map(({ label, field, type, placeholder }) => (
                      <div key={field}>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
                        <input
                          type={type}
                          value={profile[field as keyof typeof profile]}
                          onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 transition-all"
                        />
                      </div>
                    ))}

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Department</label>
                      <select
                        value={profile.department}
                        onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                      >
                        {["sales","business-development","marketing","cam","customer-executive","admin","hr","finance","it","other"].map(d => (
                          <option key={d} value={d}>{d.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">LinkedIn Profile</label>
                      <input
                        type="url"
                        value={profile.linkedIn}
                        onChange={e => setProfile(p => ({ ...p, linkedIn: e.target.value }))}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bio / About Me</label>
                    <textarea
                      rows={3}
                      value={profile.bio}
                      onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell something about yourself..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ── SECURITY TAB ── */}
              {activeTab === "security" && (
                <div className="p-6 space-y-6">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-4">Change Password</h3>
                  <div className="max-w-md space-y-4">
                    {[
                      { label: "Current Password", field: "oldPassword", show: showOldPass, toggle: () => setShowOldPass(v => !v) },
                      { label: "New Password",      field: "newPassword", show: showNewPass, toggle: () => setShowNewPass(v => !v) },
                      { label: "Confirm New Password", field: "confirmPassword", show: showNewPass, toggle: () => setShowNewPass(v => !v) },
                    ].map(({ label, field, show, toggle }) => (
                      <div key={field}>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
                        <div className="relative">
                          <input
                            type={show ? "text" : "password"}
                            value={security[field as keyof typeof security]}
                            onChange={e => setSecurity(p => ({ ...p, [field]: e.target.value }))}
                            placeholder="••••••••"
                            className="w-full px-4 pr-11 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                          />
                          <button type="button" onClick={toggle}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs text-amber-700 font-medium">
                        🔐 Password must be at least 6 characters. Use a mix of letters and numbers for better security.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS TAB ── */}
              {activeTab === "notifications" && (
                <div className="p-6 space-y-6">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-4">Notification Preferences</h3>
                  <div className="space-y-6">
                    {[
                      {
                        section: "Email Notifications",
                        items: [
                          { key: "emailLeaveStatus",   label: "Leave approval / rejection",   desc: "Get notified when your leave request is actioned" },
                          { key: "emailPayslip",       label: "Payslip generated",             desc: "Receive an email when your monthly payslip is ready" },
                          { key: "emailDailyReminder", label: "Daily report reminder",         desc: "Evening reminder to submit your daily work report" },
                        ],
                      },
                      {
                        section: "Browser Notifications",
                        items: [
                          { key: "browserAttendance",   label: "Attendance reminder",           desc: "Morning reminder to mark your attendance" },
                          { key: "browserLeave",        label: "Leave status updates",          desc: "Real-time notifications for leave approvals" },
                          { key: "browserAnnouncement", label: "Office announcements",          desc: "Important announcements from management" },
                        ],
                      },
                    ].map(({ section, items }) => (
                      <div key={section}>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{section}</p>
                        <div className="space-y-3">
                          {items.map(({ key, label, desc }) => (
                            <div key={key} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setNotifications(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0
                                  ${notifications[key as keyof typeof notifications] ? "bg-violet-600" : "bg-slate-200"}`}
                              >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform
                                  ${notifications[key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0.5"}`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SCHEDULE TAB ── */}
              {activeTab === "schedule" && (
                <div className="p-6 space-y-6">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-50 pb-4">Work Schedule</h3>
                  <div className="max-w-md space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Office Start Time</label>
                        <input
                          type="time"
                          value={schedule.officeStart}
                          onChange={e => setSchedule(p => ({ ...p, officeStart: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Office End Time</label>
                        <input
                          type="time"
                          value={schedule.officeEnd}
                          onChange={e => setSchedule(p => ({ ...p, officeEnd: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-3">Working Days</label>
                      <div className="flex flex-wrap gap-2">
                        {allDays.map(day => {
                          const active = schedule.workingDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all
                                ${active
                                  ? "bg-violet-600 text-white shadow-sm shadow-violet-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                            >
                              {day.slice(0, 3).toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {schedule.workingDays.length} days/week selected
                      </p>
                    </div>

                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-violet-600" />
                        <p className="text-sm font-bold text-violet-800">Your Schedule Summary</p>
                      </div>
                      <p className="text-xs text-violet-600">
                        Working <strong>{schedule.workingDays.length}</strong> days/week,{" "}
                        <strong>{schedule.officeStart}</strong> to <strong>{schedule.officeEnd}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="px-6 pb-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                {saved && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" /> Changes saved successfully!
                  </div>
                )}
                {!saved && <div />}
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
