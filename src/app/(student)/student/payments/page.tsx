"use client";

import { useState, useEffect } from "react";
import { CreditCard, DollarSign, Send, History, CheckCircle, Clock, AlertCircle, Calendar, Loader2, Info, Banknote, FileText, Download, Printer } from "lucide-react";
import { generateInvoicePDF } from "@/lib/invoice-generator";

const N = { 950:"#060d20",900:"#0d1b3e",800:"#142258",700:"#1a2d70",600:"#1e3a8a",500:"#2563eb",400:"#60a5fa",300:"#93c5fd",200:"#bfdbfe",100:"#dbeafe",50:"#eff6ff" };
const STATUS: any = {
  pending:   { bg:"rgba(245,158,11,0.1)",  color:"#b45309", border:"rgba(245,158,11,0.25)" },
  completed: { bg:"rgba(34,197,94,0.1)",   color:"#15803d", border:"rgba(34,197,94,0.25)" },
  refunded:  { bg:"rgba(59,130,246,0.1)",  color:"#1d4ed8", border:"rgba(59,130,246,0.25)" },
  failed:    { bg:"rgba(239,68,68,0.1)",   color:"#dc2626", border:"rgba(239,68,68,0.25)" },
  cancelled: { bg:"rgba(107,114,128,0.1)", color:"#374151", border:"rgba(107,114,128,0.25)" },
};

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [course, setCourse] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank-transfer");
  const [details, setDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [month, setMonth] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getMonthOptions = () => {
    const options: string[] = [];
    const now = new Date();
    for (let i = -6; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(d.toLocaleString("en-US", { month:"long", year:"numeric" }));
    }
    return options.reverse();
  };

  const fetchPaymentsData = async () => {
    try {
      const res = await fetch("/api/student-portal/payments");
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
        setCourses(data.enrolledCourses);
        setStudentInfo(data.studentInfo);
        if (data.enrolledCourses.length > 0) setCourse(data.enrolledCourses[0]._id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPaymentsData();
    setMonth(new Date().toLocaleString("en-US",{month:"long",year:"numeric"}));
  }, []);

  const handleDownloadInvoice = async (txn: any, isPrint: boolean = false) => {
    if (!txn) return;
    setDownloadingId(txn._id);
    try {
      // Ensure student info is complete for invoice generation
      const enrichedTxn = {
        ...txn,
        student: {
          ...(typeof txn.student === "object" ? txn.student : {}),
          fullName: txn.student?.fullName || studentInfo?.fullName || "Valued Student",
          studentId: txn.student?.studentId || studentInfo?.studentId || "",
          phone: txn.student?.phone || studentInfo?.phone || "",
          course: txn.course?.title || txn.student?.course || studentInfo?.course || "Academic Program",
        }
      };
      await generateInvoicePDF(enrichedTxn, isPrint);
    } catch (err) {
      console.error("Error generating invoice:", err);
      alert("Could not generate invoice. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError("Please enter a valid amount."); return; }
    setError(""); setMessage(""); setSubmitting(true);
    try {
      const res = await fetch("/api/student-portal/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:Number(amount),course,paymentMethod,paymentMethodDetails:details,notes,month})});
      const data = await res.json();
      if (data.success) {
        setMessage("Payment verification submitted successfully!");
        setAmount(""); setDetails(""); setNotes("");
        setMonth(new Date().toLocaleString("en-US",{month:"long",year:"numeric"}));
        fetchPaymentsData();
      } else { setError(data.message || "Failed to submit."); }
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse" style={{background:`linear-gradient(135deg,${N[600]},${N[800]})`}}>
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-medium" style={{color:"rgba(13,27,62,0.5)"}}>Loading payments...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden p-6" style={{background:`linear-gradient(135deg,${N[950]},${N[800]})`,boxShadow:`0 16px 50px rgba(13,27,62,0.3)`}}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full" style={{background:"radial-gradient(circle,rgba(37,99,235,0.25) 0%,transparent 70%)"}} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:"rgba(37,99,235,0.3)",border:"1px solid rgba(96,165,250,0.2)"}}>
            <CreditCard className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Payments</h2>
            <p className="text-sm" style={{color:"rgba(147,197,253,0.7)"}}>Submit payment slips and track your history</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative p-5 rounded-2xl overflow-hidden text-white" style={{background:`linear-gradient(135deg,${N[700]},${N[900]})`,boxShadow:`0 8px 25px rgba(13,27,62,0.25)`}}>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full" style={{background:"rgba(96,165,250,0.1)"}} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{color:"rgba(147,197,253,0.7)"}}>Monthly Tuition</p>
          <p className="text-3xl font-black mt-1">${studentInfo?.monthlyFee || 0}</p>
          <DollarSign className="absolute bottom-4 right-4 w-8 h-8 opacity-10" />
        </div>

        <div className="relative p-5 rounded-2xl overflow-hidden" style={{background:"rgba(255,255,255,0.9)",border:`1px solid ${N[200]}`,backdropFilter:"blur(12px)"}}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:"rgba(13,27,62,0.4)"}}>Class Start Date</p>
          <p className="text-base font-bold" style={{color:N[900]}}>
            {studentInfo?.joinDate ? new Date(studentInfo.joinDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}
          </p>
          <Calendar className="absolute bottom-4 right-4 w-8 h-8" style={{color:N[200]}} />
        </div>

        {/* Payment Info - Full Width below */}
        </div>

      {/* Payment Methods Info */}
      <div className="rounded-2xl overflow-hidden" style={{background:"rgba(255,255,255,0.97)",border:`1px solid ${N[200]}`,backdropFilter:"blur(12px)",boxShadow:`0 4px 24px rgba(13,27,62,0.07)`}}>
        {/* Section Header */}
        <div className="px-5 py-4 flex items-center gap-2" style={{background:`linear-gradient(135deg,${N[950]},${N[800]})`,borderBottom:`1px solid ${N[100]}`}}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:"rgba(96,165,250,0.2)",border:"1px solid rgba(96,165,250,0.3)"}}>
            <Banknote className="w-4 h-4 text-blue-300" />
          </div>
          <h3 className="font-bold text-white text-sm">How to Pay — Choose a Method</h3>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:"rgba(96,165,250,0.15)",color:"#93c5fd",border:"1px solid rgba(96,165,250,0.2)"}}>3 Options Available</span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Option 1: Bank Transfer */}
          <div className="rounded-2xl overflow-hidden border" style={{border:"1px solid rgba(30,58,138,0.15)",background:"linear-gradient(145deg,#f8faff,#eff6ff)"}}>
            <div className="px-4 py-3 flex items-center gap-2" style={{background:"linear-gradient(135deg,#1e3a8a,#1a2d70)"}}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"rgba(255,255,255,0.15)"}}>
                <span className="text-base">🏦</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider">Option 1</p>
                <p className="text-xs font-bold text-white">Bank Transfer</p>
              </div>
            </div>
            <div className="p-4 space-y-2.5 text-[11px]">
              {[
                ["Account Name", "Fajr Academy"],
                ["Account Number", "20502900100141913"],
                ["Bank", "Islami Bank Bangladesh Limited"],
                ["Branch", "Panthapath Branch"],
                ["Routing No.", "125263614"],
                ["SWIFT Code", "IBBLBDDH"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-gray-500 font-medium flex-shrink-0">{label}</span>
                  <span className="font-bold text-right font-mono" style={{color:"#1e3a8a"}}>{value}</span>
                </div>
              ))}
              <div className="pt-2 mt-1 border-t border-blue-100">
                <p className="text-[10px] text-blue-600 font-semibold">📌 Reference: Your Name or Student ID</p>
              </div>
            </div>
          </div>

          {/* Option 2: bKash Merchant */}
          <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(236,72,153,0.2)",background:"linear-gradient(145deg,#fff7fb,#fdf2f8)"}}>
            <div className="px-4 py-3 flex items-center gap-2" style={{background:"linear-gradient(135deg,#be185d,#9d174d)"}}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"rgba(255,255,255,0.15)"}}>
                <span className="text-base">💳</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-pink-200 uppercase tracking-wider">Option 2</p>
                <p className="text-xs font-bold text-white">bKash Merchant</p>
              </div>
            </div>
            <div className="p-4 space-y-3 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Merchant No.</span>
                <span className="font-mono font-bold px-2 py-1 rounded-lg text-xs" style={{background:"rgba(236,72,153,0.1)",color:"#be185d",border:"1px solid rgba(236,72,153,0.2)"}}>01410764581</span>
              </div>
              <div className="rounded-xl p-3" style={{background:"rgba(236,72,153,0.06)",border:"1px solid rgba(236,72,153,0.15)"}}>
                <p className="text-[10px] leading-relaxed" style={{color:"#9d174d"}}>
                  Use <strong>"Make Payment"</strong> in bKash app, or scan the merchant QR code. Include bKash transaction fee if possible.
                </p>
              </div>
              <div className="pt-1 border-t border-pink-100">
                <p className="text-[10px] text-pink-600 font-semibold">📌 Reference: Your Name or Student ID</p>
              </div>
            </div>
          </div>

          {/* Option 3: Personal bKash Send Money */}
          <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(236,72,153,0.15)",background:"linear-gradient(145deg,#fff9fb,#fef3f8)"}}>
            <div className="px-4 py-3 flex items-center gap-2" style={{background:"linear-gradient(135deg,#db2777,#be185d)"}}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"rgba(255,255,255,0.15)"}}>
                <span className="text-base">📲</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-pink-200 uppercase tracking-wider">Option 3</p>
                <p className="text-xs font-bold text-white">bKash — Send Money</p>
              </div>
            </div>
            <div className="p-4 space-y-3 text-[11px]">
              <div className="flex flex-col items-center justify-center gap-2 py-2">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Personal Number</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💸</span>
                  <span className="font-mono font-black text-lg" style={{color:"#be185d",letterSpacing:"0.05em"}}>+880 1634-813888</span>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{background:"rgba(236,72,153,0.06)",border:"1px solid rgba(236,72,153,0.15)"}}>
                <p className="text-[10px] leading-relaxed" style={{color:"#9d174d"}}>
                  Open bKash → <strong>Send Money</strong> → Enter the number above and your amount.
                </p>
              </div>
              <div className="pt-1 border-t border-pink-100">
                <p className="text-[10px] text-pink-600 font-semibold">📌 Reference: Your Name or Student ID</p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Reminder Bar */}
        <div className="mx-5 mb-5 rounded-xl px-4 py-3 flex items-center gap-2 text-xs" style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)"}}>
          <span className="text-lg flex-shrink-0">⚠️</span>
          <p style={{color:"#92400e"}}>
            <strong>After payment:</strong> Submit your transaction ID or screenshot using the form below to verify your payment. Payments are activated within 24 hours of verification.
          </p>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit form */}
        <div className="lg:col-span-1 rounded-2xl overflow-hidden" style={{background:"rgba(255,255,255,0.95)",border:`1px solid ${N[200]}`,backdropFilter:"blur(12px)",boxShadow:`0 4px 20px rgba(13,27,62,0.06)`}}>
          <div className="px-5 py-4 flex items-center gap-2" style={{background:`linear-gradient(135deg,${N[50]},white)`,borderBottom:`1px solid ${N[100]}`}}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:`linear-gradient(135deg,${N[600]},${N[800]})`}}>
              <Send className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold" style={{color:N[900]}}>Submit Verification</h3>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#dc2626"}}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            {message && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",color:"#15803d"}}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> {message}
              </div>
            )}

            {[
              { label:"Enrolled Course", type:"select", options: courses.length===0?[{v:"",l:"No enrolled courses"}]:courses.map(c=>({v:c._id,l:c.title})), value:course, onChange:(v:string)=>setCourse(v) },
              { label:"Target Month", type:"select", options: getMonthOptions().map(m=>({v:m,l:m})), value:month, onChange:(v:string)=>setMonth(v) },
              { label:"Payment Method", type:"select", options:[{v:"bank-transfer",l:"Bank Transfer"},{v:"mobile-banking",l:"Mobile Banking"},{v:"paypal",l:"PayPal"},{v:"credit-card",l:"Credit/Debit Card"},{v:"cash",l:"Cash"},{v:"other",l:"Other"}], value:paymentMethod, onChange:(v:string)=>setPaymentMethod(v) },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold mb-1.5" style={{color:"rgba(13,27,62,0.6)"}}>{f.label}</label>
                <select value={f.value} onChange={e=>f.onChange(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-xl bg-white outline-none transition-all" style={{border:`1px solid ${N[200]}`,color:N[900]}}
                  onFocus={e=>(e.target.style.borderColor=N[400])} onBlur={e=>(e.target.style.borderColor=N[200])}>
                  {f.options.map((o:any)=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{color:"rgba(13,27,62,0.6)"}}>Amount ($) *</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{color:N[400]}} />
                <input type="number" required placeholder="e.g. 150" value={amount} onChange={e=>setAmount(e.target.value)} min="1"
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all" style={{border:`1px solid ${N[200]}`,color:N[900]}}
                  onFocus={e=>(e.target.style.borderColor=N[400])} onBlur={e=>(e.target.style.borderColor=N[200])} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{color:"rgba(13,27,62,0.6)"}}>Transaction Details *</label>
              <textarea required value={details} onChange={e=>setDetails(e.target.value)} placeholder="Transaction ID, sender name, bank details..." rows={3}
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none resize-none transition-all" style={{border:`1px solid ${N[200]}`,color:N[900]}}
                onFocus={e=>(e.target.style.borderColor=N[400])} onBlur={e=>(e.target.style.borderColor=N[200])} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{color:"rgba(13,27,62,0.6)"}}>Notes</label>
              <input type="text" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Extra info..."
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none transition-all" style={{border:`1px solid ${N[200]}`,color:N[900]}}
                onFocus={e=>(e.target.style.borderColor=N[400])} onBlur={e=>(e.target.style.borderColor=N[200])} />
            </div>

            <button type="submit" disabled={submitting||courses.length===0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{background:`linear-gradient(135deg,${N[600]},${N[800]})`,boxShadow:`0 6px 20px rgba(37,99,235,0.3)`}}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Report
            </button>
          </form>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{background:"rgba(255,255,255,0.95)",border:`1px solid ${N[200]}`,backdropFilter:"blur(12px)",boxShadow:`0 4px 20px rgba(13,27,62,0.06)`}}>
          <div className="px-5 py-4 flex items-center gap-2" style={{background:`linear-gradient(135deg,${N[50]},white)`,borderBottom:`1px solid ${N[100]}`}}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:`linear-gradient(135deg,${N[600]},${N[800]})`}}>
              <History className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold" style={{color:N[900]}}>Payment History</h3>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{background:N[50],color:N[600],border:`1px solid ${N[200]}`}}>{payments.length} records</span>
          </div>

          {payments.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:N[50],border:`1px solid ${N[200]}`}}>
                <Clock className="w-7 h-7" style={{color:N[300]}} />
              </div>
              <p className="font-bold" style={{color:N[900]}}>No payment records</p>
              <p className="text-xs mt-1" style={{color:"rgba(13,27,62,0.4)"}}>Submit a verification to record your first payment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead style={{background:`linear-gradient(135deg,${N[50]},white)`,borderBottom:`1px solid ${N[100]}`}}>
                  <tr>
                    {["Transaction","Course","Method","Amount","Date","Status","Receipt"].map(h=>(
                      <th key={h} className={`px-4 py-3 text-xs font-bold whitespace-nowrap ${h === "Receipt" ? "text-center" : ""}`} style={{color:"rgba(13,27,62,0.5)"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => {
                    const st = STATUS[p.status] || STATUS.cancelled;
                    return (
                      <tr key={p._id} className="transition-colors" style={{borderBottom:`1px solid rgba(13,27,62,0.05)`}}
                        onMouseEnter={e=>(e.currentTarget.style.background=N[50])} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-xs" style={{color:N[900]}}>{p.transactionId}</p>
                          {p.month && <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:N[50],color:N[600],border:`1px solid ${N[200]}`}}>{p.month}</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium whitespace-nowrap" style={{color:"rgba(13,27,62,0.7)"}}>{p.course?.title || studentInfo?.course || "—"}</td>
                        <td className="px-4 py-3 text-xs capitalize whitespace-nowrap" style={{color:"rgba(13,27,62,0.5)"}}>{p.paymentMethod?.replace("-"," ")}</td>
                        <td className="px-4 py-3 font-black whitespace-nowrap" style={{color:N[900]}}>BDT {Number(p.amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{color:"rgba(13,27,62,0.5)"}}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{background:st.bg,color:st.color,border:`1px solid ${st.border}`}}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            disabled={downloadingId === p._id}
                            onClick={() => handleDownloadInvoice(p, false)}
                            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl border border-blue-200 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Download Official Money Receipt PDF"
                          >
                            {downloadingId === p._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                            <span>{downloadingId === p._id ? "PDF..." : "Invoice"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
