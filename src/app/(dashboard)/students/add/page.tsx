"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Save, Loader2, AlertCircle, 
  User, BookOpen, Phone, GraduationCap, DollarSign,
  Search, X, Check as CheckIcon, ChevronDown, CheckCircle
} from "lucide-react";
import Link from "next/link";
import { PhoneInput, isValidPhoneNumber } from "@/components/ui/phone-input";

/* ─────────────── Searchable Teacher Select Component ─────────────── */
function TeacherSearchSelect({
  teachers,
  value,
  onChange,
  disabled,
}: {
  teachers: any[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Sort teachers A to Z by full name
  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) =>
      (a.fullName || "").localeCompare(b.fullName || "", undefined, { sensitivity: "base" })
    );
  }, [teachers]);

  // 2. Filter teachers based on search query
  const filteredTeachers = useMemo(() => {
    if (!query.trim()) return sortedTeachers;
    const q = query.toLowerCase().trim();
    return sortedTeachers.filter(
      (t) =>
        t.fullName?.toLowerCase().includes(q) ||
        t.teacherId?.toLowerCase().includes(q) ||
        t.specialization?.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q)
    );
  }, [sortedTeachers, query]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t._id === value || t.teacherId === value),
    [teachers, value]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-left disabled:bg-gray-50 disabled:cursor-not-allowed min-h-[42px]"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedTeacher ? (
            <>
              {selectedTeacher.avatar ? (
                <img
                  src={selectedTeacher.avatar}
                  alt={selectedTeacher.fullName}
                  className="w-5 h-5 rounded-full object-cover border border-gray-200 flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                  {selectedTeacher.fullName?.charAt(0)?.toUpperCase() || "T"}
                </div>
              )}
              <span className="font-medium text-gray-900 truncate text-sm">
                {selectedTeacher.fullName}
              </span>
              {selectedTeacher.teacherId && (
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold flex-shrink-0">
                  {selectedTeacher.teacherId}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-400 text-sm">Select a Teacher...</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${
            open ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-64">
          {/* Search box */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/90 sticky top-0 z-10">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search teacher by name or ID (A-Z)..."
                className="w-full text-xs outline-none bg-transparent text-gray-800 placeholder:text-gray-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Teacher List */}
          <div className="overflow-y-auto p-1 space-y-0.5 divide-y divide-gray-50">
            {/* Clear / Unassign Option */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                !value
                  ? "bg-blue-50/70 text-blue-700 font-semibold"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <span>— Unassigned (No Teacher) —</span>
              {!value && <CheckIcon className="w-3.5 h-3.5 text-blue-600" />}
            </button>

            {filteredTeachers.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                No teachers found matching &quot;{query}&quot;
              </div>
            ) : (
              filteredTeachers.map((teacher) => {
                const isSelected = teacher._id === value || teacher.teacherId === value;
                return (
                  <button
                    key={teacher._id}
                    type="button"
                    onClick={() => {
                      onChange(teacher._id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-900 font-medium"
                        : "hover:bg-gray-50 text-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {teacher.avatar ? (
                        <img
                          src={teacher.avatar}
                          alt={teacher.fullName}
                          className="w-6 h-6 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                          {teacher.fullName?.charAt(0)?.toUpperCase() || "T"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate text-gray-900">{teacher.fullName}</span>
                          {teacher.teacherId && (
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200">
                              {teacher.teacherId}
                            </span>
                          )}
                        </div>
                        {teacher.specialization && (
                          <span className="text-[10px] text-gray-400 block truncate">
                            {teacher.specialization}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  
  const [form, setForm] = useState({
    fullName: "",
    fatherName: "",
    motherName: "",
    age: "",
    whatsappNumber: "",
    email: "",
    password: "",
    gender: "male",
    status: "active",
    phone: "",
    crmRefId: "",
    admissionDate: new Date().toISOString().split("T")[0],
    admissionFee: 0,
    course: "",
    monthlyFee: 0,
    monthlyDue: 0,
    teacherId: "",
    classStartingDate: "",
    notes: ""
  });
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(true);

  // 1. Sort courses alphabetically A to Z
  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" })
    );
  }, [courses]);

  // 2. Sort admins alphabetically A to Z
  const sortedAdmins = useMemo(() => {
    return [...admins].sort((a, b) =>
      (a.fullName || "").localeCompare(b.fullName || "", undefined, { sensitivity: "base" })
    );
  }, [admins]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersRes, teachersRes, coursesRes] = await Promise.all([
          fetch("/api/users?limit=100"), 
          fetch("/api/teachers?limit=100"),
          fetch("/api/courses?limit=100")
        ]);
        const usersData = await usersRes.json();
        const teachersData = await teachersRes.json();
        const coursesData = await coursesRes.json();
        
        if (usersData.success) {
          setAdmins(usersData.users || []); 
        }
        if (teachersData.success) setTeachers(teachersData.teachers || []);
        if (coursesData.success) setCourses(coursesData.courses || []);
      } catch (err) {
        console.error("Failed to fetch selector data", err);
      } finally {
        setFetchingData(false);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPhoneError("");
    setWhatsappError("");

    // Validate phone number if present
    if (form.phone && form.phone.trim() && !isValidPhoneNumber(form.phone.trim())) {
      setPhoneError("Please enter a valid international phone number.");
      setError("Please enter a valid phone number.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Validate WhatsApp number if present
    if (form.whatsappNumber && form.whatsappNumber.trim() && !isValidPhoneNumber(form.whatsappNumber.trim())) {
      setWhatsappError("Please enter a valid international WhatsApp number.");
      setError("Please enter a valid WhatsApp number.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (!data.success) {
        setError(data.message || "Failed to create student.");
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      
      router.push("/students");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/students" className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Add New Student</h2>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the details below to enroll a new student into the system.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. Personal Details Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Personal Information</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                placeholder="e.g. Salim Mansoor"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gender</label>
              <select
                value={form.gender}
                onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Father&apos;s Name</label>
              <input
                type="text"
                value={form.fatherName}
                onChange={e => setForm(p => ({ ...p, fatherName: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                placeholder="e.g. Abdullah Mansoor"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mother&apos;s Name</label>
              <input
                type="text"
                value={form.motherName}
                onChange={e => setForm(p => ({ ...p, motherName: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                placeholder="e.g. Mariam Begum"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Age</label>
              <input
                type="number"
                min={1}
                value={form.age}
                onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                placeholder="e.g. 18"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Enrollment Status</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="at-risk">At Risk</option>
                <option value="completed">Completed</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Contact Information Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm">Contact Information</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                light
                defaultCountry="BD"
                placeholder="01700 000000"
                value={form.phone}
                onChange={(val) => {
                  setForm(p => ({ ...p, phone: val || "" }));
                  if (phoneError) setPhoneError("");
                }}
                hasError={!!phoneError}
              />
              {phoneError && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" /> {phoneError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                WhatsApp Number
              </label>
              <PhoneInput
                light
                defaultCountry="BD"
                placeholder="01700 000000"
                value={form.whatsappNumber}
                onChange={(val) => {
                  setForm(p => ({ ...p, whatsappNumber: val || "" }));
                  if (whatsappError) setWhatsappError("");
                }}
                hasError={!!whatsappError}
              />
              {whatsappError && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" /> {whatsappError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                placeholder="student@example.com (Auto-generated if empty)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                placeholder="Default: 123456"
              />
            </div>
          </div>
        </div>

        {/* 3. Academic & Teacher Assignment Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900 text-sm">Academic &amp; Teacher Assignment</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Assigned Course</label>
              <select
                value={form.course}
                onChange={e => setForm(p => ({ ...p, course: e.target.value }))}
                disabled={fetchingData}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm disabled:bg-gray-50"
              >
                <option value="">Select a Course</option>
                {sortedCourses.map(course => (
                  <option key={course._id} value={course._id}>{course.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Assigned Teacher <span className="text-gray-400 font-normal text-[11px]">(Searchable A-Z)</span>
              </label>
              <TeacherSearchSelect
                teachers={teachers}
                value={form.teacherId}
                onChange={(id) => setForm(p => ({ ...p, teacherId: id }))}
                disabled={fetchingData}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Admission Date</label>
              <input
                type="date"
                value={form.admissionDate}
                onChange={e => setForm(p => ({ ...p, admissionDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Class Starting Date</label>
              <input
                type="date"
                value={form.classStartingDate}
                onChange={e => setForm(p => ({ ...p, classStartingDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">CRM Ref. ID (Admin / Manager)</label>
              <select
                value={form.crmRefId}
                onChange={e => setForm(p => ({ ...p, crmRefId: e.target.value }))}
                disabled={fetchingData}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm disabled:bg-gray-50"
              >
                <option value="">Select an Admin / CRM</option>
                {sortedAdmins.map(admin => (
                  <option key={admin._id} value={admin._id}>{admin.fullName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. Financial Structure Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900 text-sm">Fees &amp; Billing ($)</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Admission Fee ($)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  value={form.admissionFee}
                  onChange={e => setForm(p => ({ ...p, admissionFee: Number(e.target.value) }))}
                  className="w-full pl-8 pr-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Monthly Fee ($)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  value={form.monthlyFee}
                  onChange={e => setForm(p => ({ ...p, monthlyFee: Number(e.target.value) }))}
                  className="w-full pl-8 pr-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Monthly Due ($)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  value={form.monthlyDue}
                  onChange={e => setForm(p => ({ ...p, monthlyDue: Number(e.target.value) }))}
                  className="w-full pl-8 pr-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Notes Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Additional Notes &amp; Remarks</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm min-h-[90px]"
              placeholder="Any comments, schedule preferences, or requirements..."
            />
          </div>
        </div>

        {/* Form Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/students"
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-70 flex items-center gap-2 shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? "Saving Student..." : "Save Student"}
          </button>
        </div>

      </form>
    </div>
  );
}
