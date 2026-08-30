"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Loader2, AlertCircle,
  UserCircle, FileText, MapPin, GraduationCap, Image, Plus, Trash2
} from "lucide-react";
import Link from "next/link";

interface Qualification {
  degree: string;
  institute: string;
  passingYear: string | number;
}

export default function AddTeacherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    designation: "",
    category: "",
    email: "",
    phone: "",
    emergencyContactNumber: "",
    gender: "male",
    password: "",
    avatar: "",
    salary: 0,
    salaryType: "monthly",
    joinDate: new Date().toISOString().split("T")[0],
    bloodGroup: "A+",
    presentAddress: "",
    permanentAddress: "",
    nidOrBirthCertificatePicture: "",
    status: "active",
    bio: "",
    version: [] as string[],
    rating: 0,
  });

  useEffect(() => {
    fetch("/api/teachers/category")
      .then(r => r.json())
      .then(data => { if (data.success) setCategories(data.categories || []); });
  }, []);

  const [qualifications, setQualifications] = useState<Qualification[]>([
    { degree: "", institute: "", passingYear: "" }
  ]);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingNID, setUploadingNID] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "avatar" | "nidOrBirthCertificatePicture") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fieldName === "avatar") setUploadingAvatar(true);
    else setUploadingNID(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, [fieldName]: data.secure_url }));
      } else {
        alert(data.message || "Failed to upload file");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file. Please try again.");
    } finally {
      if (fieldName === "avatar") setUploadingAvatar(false);
      else setUploadingNID(false);
    }
  };

  const handleQualificationChange = (index: number, field: keyof Qualification, value: string) => {
    const updated = [...qualifications];
    updated[index] = { ...updated[index], [field]: value };
    setQualifications(updated);
  };

  const addQualification = () => {
    setQualifications([...qualifications, { degree: "", institute: "", passingYear: "" }]);
  };

  const removeQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    const phoneRegex = /^[0-9+\-\s]{10,15}$/;
    
    if (form.phone && !phoneRegex.test(form.phone)) {
      setError("Contact Number must be between 10 and 15 digits (digits, spaces, hyphens, and + allowed)");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!phoneRegex.test(form.emergencyContactNumber)) {
      setError("Emergency Contact Number must be between 10 and 15 digits (digits, spaces, hyphens, and + allowed)");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!form.nidOrBirthCertificatePicture) {
      setError("Picture of NID/Birth Certificate is required");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);

    // Format payload
    const formattedQualifications = qualifications
      .filter((q) => q.degree.trim() || q.institute.trim() || q.passingYear)
      .map((q) => ({
        degree: q.degree.trim(),
        institute: q.institute.trim(),
        passingYear: q.passingYear ? Number(q.passingYear) : undefined,
      }));

    const payload = {
      ...form,
      salary: Number(form.salary),
      qualifications: formattedQualifications,
    };

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to add teacher");
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      router.push("/teachers");
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
        <Link href="/teachers" className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Add New Teacher</h2>
          <p className="text-sm text-gray-500 mt-1">Register a new instructor with all personal, professional, and certification details.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Personal Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input type="text" required value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" placeholder="e.g. Sheikh Abdullah" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" placeholder="teacher@fajracademy.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <input type="password" required minLength={6} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" placeholder="Min 6 characters" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
              <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" placeholder="e.g. +8801712345678" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Number <span className="text-red-500">*</span></label>
              <input type="text" required value={form.emergencyContactNumber} onChange={e => setForm(p => ({ ...p, emergencyContactNumber: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" placeholder="e.g. +8801812345678" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group <span className="text-red-500">*</span></label>
              <select value={form.bloodGroup} onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm">
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar Image</label>
              <div className="flex items-center gap-4">
                {form.avatar && (
                  <img src={form.avatar} alt="Avatar Preview" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                )}
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, "avatar")}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                  {uploadingAvatar && <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">Address Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Present Address <span className="text-red-500">*</span></label>
              <textarea required value={form.presentAddress} onChange={e => setForm(p => ({ ...p, presentAddress: e.target.value }))} rows={2}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm resize-none" placeholder="Enter present residential address..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address <span className="text-red-500">*</span></label>
              <textarea required value={form.permanentAddress} onChange={e => setForm(p => ({ ...p, permanentAddress: e.target.value }))} rows={2}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm resize-none" placeholder="Enter permanent address as in NID..." />
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Professional Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation / Teacher Category <span className="text-red-500">*</span></label>
              <select
                required
                value={form.category}
                onChange={e => {
                  const catId = e.target.value;
                  const catName = categories.find(c => c._id === catId)?.name || "";
                  setForm(p => ({ ...p, category: catId, designation: catName }));
                }}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-blue-500 transition-all text-sm"
              >
                <option value="">Select Category...</option>
                {categories.map((c: any) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date <span className="text-red-500">*</span></label>
              <input type="date" required value={form.joinDate} onChange={e => setForm(p => ({ ...p, joinDate: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type</label>
              <select value={form.salaryType} onChange={e => setForm(p => ({ ...p, salaryType: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm">
                <option value="monthly">Monthly</option>
                <option value="per-student-percentage">Per Student Percentage</option>
                <option value="per-student-amount">Per Student Amount</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.salaryType === "per-student-percentage" ? "Percentage (%)" : "Salary Amount"}
              </label>
              <input type="number" min={0} value={form.salary} onChange={e => setForm(p => ({ ...p, salary: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                placeholder={form.salaryType === "per-student-percentage" ? "e.g. 50" : "0"} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on-leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Version <span className="text-red-500">*</span></label>
              <div className="flex gap-4">
                {["Bangla", "English", "Arabic"].map(ver => (
                  <label key={ver} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.version.includes(ver)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm(p => ({
                          ...p,
                          version: checked ? [...p.version, ver] : p.version.filter(v => v !== ver)
                        }));
                      }}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    {ver}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Rating (Out of 5)</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button type="button" key={star} onClick={() => setForm(p => ({ ...p, rating: star }))}
                    className={`p-1 transition-colors ${form.rating >= star ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'}`}>
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </button>
                ))}
                <span className="ml-2 text-xs font-semibold text-gray-500">{form.rating} / 5</span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3}
                className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm resize-none" placeholder="Brief professional background or introduction..." />
            </div>
          </div>
        </div>

        {/* Qualifications */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Qualifications</h3>
            </div>
            <button type="button" onClick={addQualification}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>
          <div className="p-6 space-y-4">
            {qualifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No qualifications added yet. Click Add Row to add details.</p>
            ) : (
              qualifications.map((q, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Degree / Certificate</label>
                    <input type="text" value={q.degree} onChange={e => handleQualificationChange(index, "degree", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm" placeholder="e.g. Hafiz-e-Quran" />
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Institute / Board</label>
                    <input type="text" value={q.institute} onChange={e => handleQualificationChange(index, "institute", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm" placeholder="e.g. Al-Azhar University" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Passing Year</label>
                    <input type="number" value={q.passingYear} onChange={e => handleQualificationChange(index, "passingYear", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm" placeholder="e.g. 2020" />
                  </div>
                  <div className="md:col-span-1 text-right">
                    <button type="button" onClick={() => removeQualification(index)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Verification Document Upload */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Verification Document</h3>
          </div>
          <div className="p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Picture of NID or Birth Certificate <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="flex-1 w-full">
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, "nidOrBirthCertificatePicture")}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer" />
                  {uploadingNID && <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading document to Cloudinary...</p>}
                  <p className="text-xs text-gray-400 mt-2">Please upload a clear picture of the teacher's National ID Card (NID) or Birth Certificate.</p>
                </div>
                {form.nidOrBirthCertificatePicture && (
                  <div className="w-48 h-32 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 relative group shadow-sm bg-gray-50">
                    <img src={form.nidOrBirthCertificatePicture} alt="NID/BC Document Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <a href={form.nidOrBirthCertificatePicture} target="_blank" rel="noopener noreferrer" className="text-white text-xs font-semibold underline">View Full Size</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/teachers" className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={loading || uploadingAvatar || uploadingNID}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2 shadow-sm">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? "Adding Teacher..." : "Save Teacher"}
          </button>
        </div>
      </form>
    </div>
  );
}
