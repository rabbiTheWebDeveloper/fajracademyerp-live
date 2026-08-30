"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen, Search, Plus, X, Loader2, Users,
  ChevronLeft, ChevronRight, Edit2, Trash2, AlertCircle, UserPlus,
  ImageIcon, CheckCircle2, Globe, ToggleLeft, ToggleRight,
} from "lucide-react";
import { usePermissions } from "@/context/PermissionContext";
import { ReadOnlyNotice } from "@/components/PermissionGuard";

/* ─── Constants ─── */
const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft:     "bg-amber-100 text-amber-700 border-amber-200",
  archived:  "bg-gray-100 text-gray-600 border-gray-200",
};

const LEVEL_COLORS: Record<string, string> = {
  beginner:     "bg-blue-100 text-blue-700",
  intermediate: "bg-purple-100 text-purple-700",
  advanced:     "bg-rose-100 text-rose-700",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner:     "Beginner",
  intermediate: "Intermediate",
  advanced:     "Advanced",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  level: "beginner",
  status: "draft",
  thumbnail: "",
  language: "English",
  isActive: true,
};

/* ─── Image Upload ─── */
function ImageUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPreview(value || ""); }, [value]);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError("Image must be under 5 MB."); return; }
    setUploadError("");
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) { setUploadError(data.message || "Upload failed."); setPreview(value || ""); return; }
      onChange(data.secure_url);
      setPreview(data.secure_url);
    } catch {
      setUploadError("Network error during upload.");
      setPreview(value || "");
    } finally { setUploading(false); }
  };

  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">Course Thumbnail</label>
      <div
        className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer
          ${uploading ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/40"}`}
        style={{ minHeight: 130 }}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {preview ? (
          <div className="relative w-full" style={{ height: 160 }}>
            <img src={preview} alt="preview" className="w-full h-full object-cover rounded-xl" />
            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              {uploading
                ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                : <span className="text-xs text-white font-medium">Click to change</span>}
            </div>
            {!uploading && (
              <button type="button" onClick={e => { e.stopPropagation(); onChange(""); setPreview(""); }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            {uploading
              ? <><Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" /><p className="text-sm text-blue-500 font-medium">Uploading...</p></>
              : <><ImageIcon className="w-8 h-8 text-gray-300 mb-2" /><p className="text-sm text-gray-500 font-medium">Drop image here or <span className="text-blue-600">browse</span></p><p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — max 5 MB</p></>}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </div>
      {uploadError && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{uploadError}</p>}
    </div>
  );
}

/* ─── Course Form Modal (Create & Edit) ─── */
function CourseFormModal({ open, onClose, onSuccess, editCourse }: any) {
  const isEdit = !!editCourse;
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(isEdit && editCourse ? {
        title:       editCourse.title       || "",
        description: editCourse.description || "",
        level:       editCourse.level       || "beginner",
        status:      editCourse.status      || "draft",
        thumbnail:   editCourse.thumbnail   || "",
        language:    editCourse.language    || "English",
        isActive:    editCourse.isActive    !== undefined ? editCourse.isActive : true,
      } : { ...EMPTY_FORM });
    }
  }, [open, editCourse, isEdit]);

  if (!open) return null;

  const set = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url    = isEdit ? `/api/courses/${editCourse._id}` : "/api/courses";
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data   = await res.json();
      if (!data.success) { setError(data.message); setLoading(false); return; }
      onSuccess();
      onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8 border border-gray-100">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Course" : "Create New Course"}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? "Update course details" : "Fill in the details below"}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Thumbnail */}
            <ImageUploadField value={form.thumbnail} onChange={url => set("thumbnail", url)} />

            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Title *</label>
              <input type="text" required value={form.title} onChange={e => set("title", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Quran for Beginners" />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Brief description of the course..." />
            </div>

            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select value={form.level} onChange={e => set("level", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <input type="text" value={form.language} onChange={e => set("language", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. English, Arabic" />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3 pt-5">
              <button type="button" onClick={() => set("isActive", !form.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                  ${form.isActive ? "bg-blue-600" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm font-medium text-gray-700">{form.isActive ? "Active" : "Inactive"}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition-colors shadow-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {loading ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Changes" : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirm Modal ─── */
function DeleteConfirmModal({ course, open, onClose, onConfirm, deleting }: any) {
  if (!open || !course) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Delete Course?</h3>
          <p className="text-sm text-gray-500 mb-1">You are about to delete:</p>
          <p className="text-sm font-semibold text-gray-800 mb-3 px-4 truncate">"{course.title}"</p>
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            This will also remove all enrollments linked to this course. This action cannot be undone.
          </p>
        </div>
        <div className="flex border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <div className="w-px bg-gray-100" />
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Enroll Student Modal ─── */
function EnrollStudentModal({ course, open, onClose, onSuccess }: any) {
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open) {
      setFetching(true);
      fetch("/api/students?limit=100").then(r => r.json()).then(d => { if (d.success) setStudents(d.students); }).finally(() => setFetching(false));
      setStudentId(""); setError("");
    }
  }, [open]);

  if (!open || !course) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res  = await fetch(`/api/courses/${course._id}/enroll`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId }) });
      const data = await res.json();
      if (!data.success) { setError(data.message); setLoading(false); return; }
      onSuccess(); onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8 border border-gray-100">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Enroll Student</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <input type="text" disabled value={course.title} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student *</label>
            <select required value={studentId} onChange={e => setStudentId(e.target.value)} disabled={fetching}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{fetching ? "Loading students..." : "Select a student..."}</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.fullName} ({s.studentId})</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !studentId} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? "Enrolling..." : "Enroll Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Course Card ─── */
function CourseCard({ course, onEdit, onDelete, onEnroll }: any) {
  const { can } = usePermissions();
  const canUpdate = can("course-management", "update");
  const canDelete = can("course-management", "delete");

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col hover:shadow-lg transition-shadow duration-200 group">
      {/* Thumbnail */}
      <div className="h-40 relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-blue-100">
        {course.thumbnail
          ? <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <BookOpen className="w-12 h-12 text-blue-300" />
        }

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[course.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
            {course.status}
          </span>
        </div>

        {/* Level badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${LEVEL_COLORS[course.level] || "bg-gray-100 text-gray-600"}`}>
            {LEVEL_LABELS[course.level] || course.level}
          </span>
        </div>

        {/* Inactive overlay */}
        {!course.isActive && (
          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
            <span className="text-xs text-white font-semibold bg-gray-800/70 px-3 py-1 rounded-full">Inactive</span>
          </div>
        )}

        {/* Action buttons on hover */}
        <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {canUpdate && (
            <button onClick={() => onEnroll(course)} className="p-1.5 bg-white text-gray-500 hover:text-emerald-600 rounded-lg shadow border border-gray-200 transition-colors" title="Enroll Student">
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}
          {canUpdate && (
            <button onClick={() => onEdit(course)} className="p-1.5 bg-white text-gray-500 hover:text-blue-600 rounded-lg shadow border border-gray-200 transition-colors" title="Edit Course">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(course)} className="p-1.5 bg-white text-gray-400 hover:text-red-600 rounded-lg shadow border border-gray-200 transition-colors" title="Delete Course">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-xs text-blue-600 font-mono mb-1">{course.courseId}</p>
        <h3 className="text-base font-bold text-gray-900 leading-tight mb-1 line-clamp-1">{course.title}</h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-4 flex-1">{course.description || "No description."}</p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Enrolled */}
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">{course.enrolledCount ?? 0}</span>
            <span className="text-gray-400 text-xs">enrolled</span>
          </div>
          {/* Language */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Globe className="w-3.5 h-3.5 text-gray-400" />
            <span>{course.language || "English"}</span>
          </div>
          {/* Active dot */}
          <div className="flex items-center gap-1 text-xs">
            <span className={`w-2 h-2 rounded-full ${course.isActive ? "bg-emerald-400" : "bg-gray-300"}`} />
            <span className={course.isActive ? "text-emerald-600" : "text-gray-400"}>{course.isActive ? "Active" : "Inactive"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CoursesPage() {
  const { can } = usePermissions();
  const [courses, setCourses]       = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]         = useState("");
  const [status, setStatus]         = useState("");
  const [loading, setLoading]       = useState(true);

  // Modals
  const [modalOpen, setModalOpen]       = useState(false);
  const [editCourse, setEditCourse]     = useState<any>(null);
  const [enrollCourse, setEnrollCourse] = useState<any>(null);
  const [deleteCourse, setDeleteCourse] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const LIMIT = 12;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), search, status });
      const res  = await fetch(`/api/courses?${params}`);
      const data = await res.json();
      if (data.success) { setCourses(data.courses); setTotal(data.total); setTotalPages(data.totalPages); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleDeleteConfirm = async () => {
    if (!deleteCourse) return;
    setDeleting(true);
    await fetch(`/api/courses/${deleteCourse._id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteCourse(null);
    fetchCourses();
  };

  const openCreate = () => { setEditCourse(null); setModalOpen(true); };
  const openEdit   = (c: any) => { setEditCourse(c); setModalOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Course Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage all courses and student enrollments.
            <span className="ml-2 font-semibold text-gray-700">{total} courses</span>
          </p>
        </div>
        {can("course-management", "create") && (
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Create Course
          </button>
        )}
      </div>

      <ReadOnlyNotice module="course-management" featureName="Course Management" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search by title, ID, or description..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-40">
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-pulse">
              <div className="h-40 bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <BookOpen className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">No courses found</p>
          <p className="text-sm mt-1 mb-4">
            {can("course-management", "create")
              ? "Create your first course to get started"
              : "No courses currently available."}
          </p>
          {can("course-management", "create") && (
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <CourseCard key={course._id} course={course} onEdit={openEdit} onDelete={setDeleteCourse} onEnroll={setEnrollCourse} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-gray-600">Page <span className="font-bold">{page}</span> of <span className="font-bold">{totalPages}</span></span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 text-sm transition-colors">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      <CourseFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditCourse(null); }} onSuccess={fetchCourses} editCourse={editCourse} />
      <DeleteConfirmModal course={deleteCourse} open={!!deleteCourse} onClose={() => setDeleteCourse(null)} onConfirm={handleDeleteConfirm} deleting={deleting} />
      <EnrollStudentModal course={enrollCourse} open={!!enrollCourse} onClose={() => setEnrollCourse(null)} onSuccess={fetchCourses} />
    </div>
  );
}
