"use client";

import { useState, useEffect } from "react";
import { User, Mail, Save, Loader2, BookOpen, UserCheck, Calendar, DollarSign, FileText, Camera, Shield, Lock, Eye, EyeOff, KeyRound, CheckCircle2, XCircle } from "lucide-react";

const N = { 950:"#060d20",900:"#0d1b3e",800:"#142258",700:"#1a2d70",600:"#1e3a8a",500:"#2563eb",400:"#60a5fa",300:"#93c5fd",200:"#bfdbfe",100:"#dbeafe",50:"#eff6ff" };

export default function StudentSettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState({ text: "", ok: false });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });

  useEffect(() => {
    fetch("/api/student-portal/profile")
      .then(r => r.json())
      .then(d => { if (d.success) setProfile(d.student); setLoading(false); });
  }, []);

  const handleImageUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMessage("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload",{method:"POST",body:formData});
      const data = await res.json();
      if (data.success) { setProfile((p: any) => ({...p,avatar:data.secure_url})); setMessage("Photo uploaded! Save to apply."); }
      else { setMessage(data.message || "Upload failed."); }
    } catch { setMessage("Upload failed due to network error."); }
    finally { setUploading(false); }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true); setMessage("");
    try {
      const r = await fetch("/api/student-portal/profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName:profile.fullName,gender:profile.gender,avatar:profile.avatar})});
      const d = await r.json();
      if (d.success) { setMessage("Profile updated successfully!"); setProfile(d.student); }
      else { setMessage("Failed to update profile."); }
    } catch { setMessage("Network error."); }
    finally { setSaving(false); setTimeout(()=>setMessage(""),4000); }
  };

  const handlePasswordChange = async (e: any) => {
    e.preventDefault();
    setPwSaving(true); setPwMessage({ text: "", ok: false });
    try {
      const r = await fetch("/api/student-portal/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwForm),
      });
      const d = await r.json();
      if (d.success) {
        setPwMessage({ text: d.message, ok: true });
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPwMessage({ text: d.message || "Failed to update password.", ok: false });
      }
    } catch { setPwMessage({ text: "Network error. Please try again.", ok: false }); }
    finally { setPwSaving(false); setTimeout(()=>setPwMessage({ text: "", ok: false }),5000); }
  };

  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: "", color: "transparent" };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
      { label: "Very Weak", color: "#ef4444" },
      { label: "Weak",      color: "#f97316" },
      { label: "Fair",      color: "#eab308" },
      { label: "Good",      color: "#22c55e" },
      { label: "Strong",    color: "#16a34a" },
    ];
    return { score, ...levels[Math.min(score, 4)] };
  };
  const pwStrength = getPasswordStrength(pwForm.newPassword);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse" style={{background:`linear-gradient(135deg,${N[600]},${N[800]})`}}>
          <Shield className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-medium" style={{color:"rgba(13,27,62,0.5)"}}>Loading settings...</p>
      </div>
    </div>
  );

  const infoRows = [
    { icon:UserCheck, label:"Student ID", value:profile?.studentId },
    { icon:BookOpen, label:"Enrolled Course", value:profile?.course, badge:true },
    { icon:User, label:"Assigned Teacher", value:profile?.teacherName },
    { icon:DollarSign, label:"Monthly Fee", value:profile?.monthlyFee ? `BDT ${profile.monthlyFee}` : undefined },
    { icon:DollarSign, label:"Monthly Due", value:profile?.monthlyDue ? `BDT ${profile.monthlyDue}` : undefined },
    { icon:Calendar, label:"Class Starting Date", value:profile?.classStartingDate ? new Date(profile.classStartingDate).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : undefined },
  ];

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden p-6" style={{background:`linear-gradient(135deg,${N[950]},${N[800]})`,boxShadow:`0 16px 50px rgba(13,27,62,0.3)`}}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full" style={{background:"radial-gradient(circle,rgba(37,99,235,0.25) 0%,transparent 70%)"}} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:"rgba(37,99,235,0.3)",border:"1px solid rgba(96,165,250,0.2)"}}>
            <Shield className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Account Settings</h2>
            <p className="text-sm" style={{color:"rgba(147,197,253,0.7)"}}>Manage your profile and view enrollment info</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit Profile */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{background:"rgba(255,255,255,0.95)",border:`1px solid ${N[200]}`,backdropFilter:"blur(12px)",boxShadow:`0 4px 20px rgba(13,27,62,0.06)`}}>
          {/* Avatar header */}
          <div className="relative px-6 py-6" style={{background:`linear-gradient(135deg,${N[950]},${N[800]})`,borderBottom:`1px solid ${N[100]}`}}>
            <div className="absolute inset-0 opacity-10" style={{background:"radial-gradient(circle at 30% 50%, rgba(37,99,235,0.5) 0%, transparent 60%)"}} />
            <div className="relative flex items-center gap-5">
              <div className="relative group flex-shrink-0">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" style={{border:"3px solid rgba(96,165,250,0.4)",boxShadow:"0 8px 25px rgba(37,99,235,0.3)"}} />
                ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white" style={{background:`linear-gradient(135deg,${N[600]},${N[800]})`,border:"3px solid rgba(96,165,250,0.3)"}}>
                    {profile?.fullName?.charAt(0) || "S"}
                  </div>
                )}
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-2xl text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-center">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin mb-0.5" /> : <Camera className="w-5 h-5 mb-0.5" />}
                  {uploading ? "Uploading" : "Change"}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">{profile?.fullName || "Student"}</h3>
                <p className="text-sm mt-0.5" style={{color:"rgba(147,197,253,0.7)"}}>{profile?.email}</p>
                <p className="text-xs font-mono mt-1" style={{color:"rgba(147,197,253,0.5)"}}>{profile?.studentId}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{color:"rgba(13,27,62,0.6)"}}>Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{color:N[400]}} />
                  <input type="text" required value={profile?.fullName||""} onChange={e=>setProfile((p:any)=>({...p,fullName:e.target.value}))}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all" style={{border:`1px solid ${N[200]}`,color:N[900]}}
                    onFocus={e=>(e.target.style.borderColor=N[400])} onBlur={e=>(e.target.style.borderColor=N[200])} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{color:"rgba(13,27,62,0.6)"}}>Gender</label>
                <select value={profile?.gender||"male"} onChange={e=>setProfile((p:any)=>({...p,gender:e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-white outline-none transition-all" style={{border:`1px solid ${N[200]}`,color:N[900]}}
                  onFocus={e=>(e.target.style.borderColor=N[400])} onBlur={e=>(e.target.style.borderColor=N[200])}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1.5" style={{color:"rgba(13,27,62,0.6)"}}>Email Address <span className="font-normal opacity-60">(Read-only)</span></label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{color:"rgba(13,27,62,0.3)"}} />
                  <input type="email" value={profile?.email||""} disabled className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl cursor-not-allowed" style={{border:`1px solid ${N[100]}`,background:N[50],color:"rgba(13,27,62,0.5)"}} />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between" style={{borderTop:`1px solid ${N[100]}`}}>
              {message ? (
                <span className="text-sm font-medium" style={{color:message.includes("success")?"#16a34a":"#dc2626"}}>{message}</span>
              ) : <span />}
              <button type="submit" disabled={saving||uploading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60"
                style={{background:`linear-gradient(135deg,${N[600]},${N[800]})`,boxShadow:`0 6px 20px rgba(37,99,235,0.3)`}}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Enrollment Info */}
        <div className="rounded-2xl overflow-hidden h-fit" style={{background:"rgba(255,255,255,0.95)",border:`1px solid ${N[200]}`,backdropFilter:"blur(12px)",boxShadow:`0 4px 20px rgba(13,27,62,0.06)`}}>
          <div className="px-5 py-4 flex items-center gap-2" style={{background:`linear-gradient(135deg,${N[50]},white)`,borderBottom:`1px solid ${N[100]}`}}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:`linear-gradient(135deg,${N[600]},${N[800]})`}}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold" style={{color:N[900]}}>Enrollment Info</h3>
          </div>

          <div className="p-5 space-y-4">
            {infoRows.map(({icon:Icon,label,value,badge}) => (
              <div key={label}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5" style={{color:N[400]}} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{color:"rgba(13,27,62,0.4)"}}>{label}</span>
                </div>
                {badge ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" style={{background:N[50],color:N[700],border:`1px solid ${N[200]}`}}>{value || "—"}</span>
                ) : (
                  <p className="text-sm font-semibold" style={{color:N[900]}}>{value || "—"}</p>
                )}
              </div>
            ))}

            {profile?.notes && (
              <div className="p-3 rounded-xl" style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)"}}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Notes</span>
                </div>
                <p className="text-xs text-amber-900">{profile.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className="rounded-2xl overflow-hidden" style={{background:"rgba(255,255,255,0.95)",border:`1px solid ${N[200]}`,backdropFilter:"blur(12px)",boxShadow:`0 4px 20px rgba(13,27,62,0.06)`}}>
        {/* Card header */}
        <div className="px-6 py-4 flex items-center gap-3" style={{background:`linear-gradient(135deg,${N[950]},${N[800]})`,borderBottom:`1px solid ${N[100]}`}}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"rgba(37,99,235,0.3)",border:"1px solid rgba(96,165,250,0.2)"}}>
            <KeyRound className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Change Password</h3>
            <p className="text-xs" style={{color:"rgba(147,197,253,0.65)"}}>Keep your account secure with a strong password</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Current password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{color:"rgba(13,27,62,0.6)"}}>Current Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{color:N[400]}} />
                <input
                  type={showPw.current ? "text" : "password"}
                  required
                  value={pwForm.currentPassword}
                  onChange={e=>setPwForm(p=>({...p,currentPassword:e.target.value}))}
                  placeholder="Current password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none transition-all"
                  style={{border:`1px solid ${N[200]}`,color:N[900]}}
                  onFocus={e=>(e.target.style.borderColor=N[400])} onBlur={e=>(e.target.style.borderColor=N[200])}
                />
                <button type="button" onClick={()=>setShowPw(s=>({...s,current:!s.current}))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{color:"rgba(13,27,62,0.6)"}}>New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{color:N[400]}} />
                <input
                  type={showPw.newPw ? "text" : "password"}
                  required
                  value={pwForm.newPassword}
                  onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))}
                  placeholder="New password (min. 6 chars)"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none transition-all"
                  style={{border:`1px solid ${N[200]}`,color:N[900]}}
                  onFocus={e=>(e.target.style.borderColor=N[400])} onBlur={e=>(e.target.style.borderColor=N[200])}
                />
                <button type="button" onClick={()=>setShowPw(s=>({...s,newPw:!s.newPw}))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw.newPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength meter */}
              {pwForm.newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map(i=>(
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{background: i<=pwStrength.score ? pwStrength.color : N[100]}} />
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold" style={{color:pwStrength.color}}>{pwStrength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{color:"rgba(13,27,62,0.6)"}}>Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{color:N[400]}} />
                <input
                  type={showPw.confirm ? "text" : "password"}
                  required
                  value={pwForm.confirmPassword}
                  onChange={e=>setPwForm(p=>({...p,confirmPassword:e.target.value}))}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none transition-all"
                  style={{border:`1px solid ${N[200]}`,color:N[900]}}
                  onFocus={e=>(e.target.style.borderColor=N[400])} onBlur={e=>(e.target.style.borderColor=N[200])}
                />
                <button type="button" onClick={()=>setShowPw(s=>({...s,confirm:!s.confirm}))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Match indicator */}
              {pwForm.confirmPassword && (
                <div className="mt-1.5 flex items-center gap-1">
                  {pwForm.newPassword === pwForm.confirmPassword
                    ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-[10px] font-semibold text-green-600">Passwords match</span></>
                    : <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-[10px] font-semibold text-red-500">Passwords do not match</span></>}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 flex items-center justify-between" style={{borderTop:`1px solid ${N[100]}`}}>
            {pwMessage.text ? (
              <span className="flex items-center gap-1.5 text-sm font-medium" style={{color:pwMessage.ok?"#16a34a":"#dc2626"}}>
                {pwMessage.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {pwMessage.text}
              </span>
            ) : <span />}
            <button type="submit" disabled={pwSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{background:`linear-gradient(135deg,${N[600]},${N[800]})`,boxShadow:`0 6px 20px rgba(37,99,235,0.3)`}}>
              {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
