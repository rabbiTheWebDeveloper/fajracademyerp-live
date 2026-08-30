"use client";

import { Calendar, Clock, MapPin, Loader2, User, Download, Image as ImageIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";

const N = { 950:"#060d20",900:"#0d1b3e",800:"#142258",700:"#1a2d70",600:"#1e3a8a",500:"#2563eb",400:"#60a5fa",300:"#93c5fd",200:"#bfdbfe",100:"#dbeafe",50:"#eff6ff" };
const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_SHORT: any = { monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat",sunday:"Sun" };

export default function StudentSchedulePage() {
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const getCurrentDay = () => {
    const today = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const map = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return map[today];
  };

  const [selectedDay, setSelectedDay] = useState("monday");

  useEffect(() => {
    const todayStr = getCurrentDay();
    setSelectedDay(DAYS.includes(todayStr) ? todayStr : "monday");
  }, []);

  useEffect(() => {
    fetch("/api/student-portal/schedule")
      .then(r => r.json())
      .then(d => { if (d.success) setSchedule(d.schedule); setLoading(false); });
  }, []);

  const downloadImage = async () => {
    if (!scheduleRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(scheduleRef.current, { backgroundColor:"#ffffff", pixelRatio:2 });
      const link = document.createElement("a");
      link.download = "my-schedule.png";
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error(err); }
  };

  const downloadPDF = async () => {
    if (!scheduleRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(scheduleRef.current, { backgroundColor:"#ffffff", pixelRatio:2 });
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const pdf = new jsPDF("l","mm","a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (img.height * pdfWidth) / img.width;
        pdf.addImage(dataUrl,"PNG",10,10,pdfWidth-20,pdfHeight-20);
        pdf.save("my-schedule.pdf");
      };
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden p-6" style={{ background:`linear-gradient(135deg,${N[950]},${N[800]})`, boxShadow:`0 16px 50px rgba(13,27,62,0.3)` }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full" style={{ background:"radial-gradient(circle,rgba(37,99,235,0.25) 0%,transparent 70%)" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:"rgba(37,99,235,0.3)", border:"1px solid rgba(96,165,250,0.2)" }}>
              <Calendar className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">My Schedule</h2>
              <p className="text-sm" style={{ color:"rgba(147,197,253,0.7)" }}>Weekly timetable of your classes</p>
            </div>
          </div>
          {!loading && schedule && (
            <div className="flex gap-2">
              <button onClick={downloadImage} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer" style={{ background:"rgba(255,255,255,0.1)", color:"white", border:"1px solid rgba(255,255,255,0.15)" }}>
                <ImageIcon className="w-4 h-4" /> Save Image
              </button>
              <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer" style={{ background:`rgba(37,99,235,0.4)`, color:"white", border:`1px solid rgba(96,165,250,0.3)` }}>
                <Download className="w-4 h-4" /> Export PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-64 rounded-2xl animate-pulse" style={{ background:"rgba(13,27,62,0.07)" }} />
      ) : !schedule ? (
        <div className="py-20 flex flex-col items-center justify-center rounded-3xl text-center" style={{ background:"rgba(255,255,255,0.8)", border:`1px solid ${N[200]}` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background:N[50], border:`1px solid ${N[200]}` }}>
            <Calendar className="w-8 h-8" style={{ color:N[300] }} />
          </div>
          <p className="font-bold text-lg" style={{ color:N[900] }}>No Schedule Assigned</p>
          <p className="text-sm mt-1" style={{ color:"rgba(13,27,62,0.45)" }}>Contact your administrator to assign a class schedule.</p>
        </div>
      ) : (
        <>
          {/* Class info summary card */}
          <div className="p-5 rounded-2xl" style={{ background:"rgba(255,255,255,0.9)", border:`1px solid ${N[200]}`, backdropFilter:"blur(12px)", boxShadow:`0 4px 20px rgba(13,27,62,0.06)` }}>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:N[50], border:`1px solid ${N[200]}` }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:`linear-gradient(135deg,${N[600]},${N[800]})` }}>
                  <Calendar className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold" style={{ color:N[900] }}>{schedule.course?.title || "Assigned Class"}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:N[50], border:`1px solid ${N[200]}` }}>
                <Clock className="w-4 h-4" style={{ color:N[500] }} />
                <span className="text-sm font-semibold" style={{ color:N[700] }}>{schedule.startTime||"TBD"} – {schedule.endTime||"TBD"}</span>
              </div>
              {schedule.teacher?.fullName && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:N[50], border:`1px solid ${N[200]}` }}>
                  <User className="w-4 h-4" style={{ color:N[500] }} />
                  <span className="text-sm font-semibold" style={{ color:N[700] }}>{schedule.teacher.fullName}</span>
                </div>
              )}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* DESKTOP VIEW: Weekly grid */}
          <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background:"white", border:`1px solid ${N[200]}`, boxShadow:`0 4px 20px rgba(13,27,62,0.06)` }}>
            <div className="grid grid-cols-7">
              {DAYS.map(day => (
                <div key={day} className="text-center py-3" style={{ background:`linear-gradient(135deg,${N[900]},${N[800]})`, borderRight:"1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-blue-300">{DAY_SHORT[day]}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x" style={{ borderTop:`1px solid ${N[100]}` }}>
              {DAYS.map(day => {
                const hasClass = schedule?.weekly_days_list?.includes(day);
                return (
                  <div key={day} className="min-h-[180px] p-2" style={{ background: hasClass ? N[50] : "white" }}>
                    {hasClass ? (
                      <div className="h-full p-2.5 rounded-xl" style={{ background:`linear-gradient(135deg,${N[600]}18,${N[500]}10)`, border:`1px solid ${N[200]}` }}>
                        <div className="w-full h-1 rounded-full mb-2" style={{ background:`linear-gradient(90deg,${N[500]},${N[400]})` }} />
                        <p className="font-bold text-xs leading-tight mb-2" style={{ color:N[900] }}>{schedule?.course?.title || "Class"}</p>
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="w-2.5 h-2.5 flex-shrink-0" style={{ color:N[500] }} />
                          <span className="text-[10px] font-medium" style={{ color:N[600] }}>{schedule?.startTime||"TBD"}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <User className="w-2.5 h-2.5 flex-shrink-0" style={{ color:N[500] }} />
                          <span className="text-[10px] font-medium truncate" style={{ color:N[600] }}>{schedule?.teacher?.fullName||"Teacher"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" style={{ color:N[500] }} />
                          <span className="text-[10px]" style={{ color:N[600] }}>Online</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[10px] font-medium" style={{ color:"rgba(13,27,62,0.25)" }}>Free</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* MOBILE VIEW: Interactive Tabs & Detail Card */}
          <div className="md:hidden space-y-4">
            {/* Horizontal Day selection scrolling */}
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x px-0.5">
              {DAYS.map((day) => {
                const active = selectedDay === day;
                const hasClass = schedule?.weekly_days_list?.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className="snap-center flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 outline-none cursor-pointer"
                    style={active ? {
                      background: `linear-gradient(135deg, ${N[600]}, ${N[800]})`,
                      color: "white",
                      boxShadow: `0 4px 12px rgba(37,99,235,0.25)`
                    } : {
                      background: "rgba(255, 255, 255, 0.8)",
                      border: `1px solid ${N[200]}`,
                      color: N[700]
                    }}
                  >
                    <span>{DAY_SHORT[day]}</span>
                    {hasClass && (
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white" : "bg-blue-500"}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day class content */}
            {schedule?.weekly_days_list?.includes(selectedDay) ? (
              <div className="p-5 rounded-2xl space-y-4" style={{ background: "white", border: `1px solid ${N[200]}`, boxShadow: `0 4px 20px rgba(13,27,62,0.04)` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50" style={{ border: `1px solid ${N[200]}` }}>
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: N[900] }}>Class Schedule</h4>
                    <p className="text-[11px] text-gray-400 capitalize">{selectedDay}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl space-y-3.5" style={{ background: `linear-gradient(135deg, ${N[50]}, rgba(255,255,255,0.7))`, border: `1px solid ${N[100]}` }}>
                  <div className="flex items-center justify-between pb-2" style={{ borderBottom: `1px solid ${N[100]}` }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Active Course</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Online</span>
                  </div>

                  <h3 className="font-extrabold text-base leading-snug" style={{ color: N[900] }}>{schedule?.course?.title || "Class"}</h3>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-gray-100">
                        <Clock className="w-3.5 h-3.5" style={{ color: N[500] }} />
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 font-bold">TIME</p>
                        <p className="text-xs font-bold" style={{ color: N[700] }}>{schedule?.startTime||"TBD"} – {schedule?.endTime||"TBD"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-gray-100">
                        <User className="w-3.5 h-3.5" style={{ color: N[500] }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] text-gray-400 font-bold">INSTRUCTOR</p>
                        <p className="text-xs font-bold truncate" style={{ color: N[700] }}>{schedule?.teacher?.fullName || "Teacher"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${N[200]}` }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: N[50], border: `1px solid ${N[100]}` }}>
                  <Calendar className="w-6 h-6" style={{ color: N[300] }} />
                </div>
                <p className="font-bold text-sm" style={{ color: N[900] }}>No Classes Scheduled</p>
                <p className="text-xs mt-1 text-gray-400">Enjoy your free day! There is no class on {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}.</p>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* SNAPSHOTABLE OFFSCREEN Grid Container (For PNG/PDF downloads on all devices) */}
          <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1024px" }}>
            <div ref={scheduleRef} className="rounded-2xl overflow-hidden p-6" style={{ background: "white", border: `1px solid ${N[200]}`, boxShadow: `0 4px 20px rgba(13,27,62,0.06)` }}>
              <div className="mb-4">
                <h3 className="text-xl font-bold" style={{ color: N[900] }}>Weekly Class Timetable</h3>
                <p className="text-xs" style={{ color: "rgba(13,27,62,0.4)" }}>Fajr Academy Student Portal</p>
              </div>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: N[200] }}>
                <div className="grid grid-cols-7">
                  {DAYS.map(day => (
                    <div key={day} className="text-center py-3" style={{ background: `linear-gradient(135deg,${N[900]},${N[800]})`, borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="text-xs font-bold tracking-wider uppercase text-blue-300">{DAY_SHORT[day]}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 divide-x animate-none" style={{ borderTop: `1px solid ${N[100]}`, background: "white" }}>
                  {DAYS.map(day => {
                    const hasClass = schedule?.weekly_days_list?.includes(day);
                    return (
                      <div key={day} className="min-h-[140px] p-3" style={{ background: hasClass ? N[50] : "white" }}>
                        {hasClass ? (
                          <div className="h-full p-3 rounded-xl bg-white border" style={{ borderColor: N[200] }}>
                            <div className="w-full h-1 rounded-full mb-2" style={{ background: `linear-gradient(90deg,${N[500]},${N[400]})` }} />
                            <p className="font-extrabold text-xs leading-tight mb-2" style={{ color: N[900] }}>{schedule?.course?.title || "Class"}</p>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Clock className="w-3 h-3 flex-shrink-0" style={{ color: N[500] }} />
                              <span className="text-[10px] font-semibold" style={{ color: N[600] }}>{schedule?.startTime || "TBD"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <User className="w-3 h-3 flex-shrink-0" style={{ color: N[500] }} />
                              <span className="text-[10px] font-semibold truncate" style={{ color: N[600] }}>{schedule?.teacher?.fullName || "Teacher"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: N[500] }} />
                              <span className="text-[10px] font-medium" style={{ color: N[600] }}>Online</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-[10px] font-medium" style={{ color: "rgba(13,27,62,0.25)" }}>Free</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
