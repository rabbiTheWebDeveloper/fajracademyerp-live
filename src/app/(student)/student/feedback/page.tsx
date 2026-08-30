"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Star,
  FileText,
  User,
  BookOpen,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const N = {
  950: "#060d20",
  900: "#0d1b3e",
  800: "#142258",
  700: "#1a2d70",
  600: "#1e3a8a",
  500: "#2563eb",
  400: "#60a5fa",
  300: "#93c5fd",
  200: "#bfdbfe",
  100: "#dbeafe",
  50: "#eff6ff",
};

export default function StudentFeedbackPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teacher, setTeacher] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

  // Form states
  const [courseId, setCourseId] = useState("");
  const [submittedCourseIds, setSubmittedCourseIds] = useState<string[]>([]);
  const [ratings, setRatings] = useState({
    teachingClarity: 5,
    punctuality: 5,
    subjectKnowledge: 5,
    behaviorPatience: 5,
    classEngagement: 5,
    useOfClassTime: 5,
    overallSatisfaction: 5,
  });
  const [likeMost, setLikeMost] = useState("");
  const [couldImprove, setCouldImprove] = useState("");
  const [issuesConcerns, setIssuesConcerns] = useState("");
  const [recommend, setRecommend] = useState<boolean | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchFeedbackData = async () => {
    try {
      const res = await fetch("/api/student-portal/feedback");
      const data = await res.json();
      if (data.success) {
        setCourses(data.enrolledCourses);
        setTeacher(data.teacherInfo);
        setFeedbacks(data.pastFeedbacks);
        setSubmittedCourseIds(data.submittedCourseIds || []);
        if (data.enrolledCourses.length > 0) setCourseId(data.enrolledCourses[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbackData();
  }, []);

  const isAlreadySubmitted = submittedCourseIds.includes(courseId);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!courseId) {
      setError("Please select a course.");
      return;
    }
    if (!teacher) {
      setError("No teacher assigned. Contact admin.");
      return;
    }
    if (recommend === null) {
      setError("Please specify whether you would recommend this teacher.");
      return;
    }

    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/student-portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          teacherId: teacher._id,
          rating: ratings.overallSatisfaction,
          teachingClarity: ratings.teachingClarity,
          punctuality: ratings.punctuality,
          subjectKnowledge: ratings.subjectKnowledge,
          behaviorPatience: ratings.behaviorPatience,
          classEngagement: ratings.classEngagement,
          useOfClassTime: ratings.useOfClassTime,
          likeMost,
          couldImprove,
          issuesConcerns,
          recommend,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Thank you! Feedback submitted successfully.");
        // Reset form
        setRatings({
          teachingClarity: 5,
          punctuality: 5,
          subjectKnowledge: 5,
          behaviorPatience: 5,
          classEngagement: 5,
          useOfClassTime: 5,
          overallSatisfaction: 5,
        });
        setLikeMost("");
        setCouldImprove("");
        setIssuesConcerns("");
        setRecommend(null);
        fetchFeedbackData();
      } else {
        setError(data.message || "Failed to submit feedback.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const ratingCategories = [
    { key: "teachingClarity", label: "Teaching Clarity", description: "How clearly the teacher explains concepts" },
    { key: "punctuality", label: "Punctuality", description: "Arriving on time and starting classes promptly" },
    { key: "subjectKnowledge", label: "Subject Knowledge", description: "Teacher's command over the topics" },
    { key: "behaviorPatience", label: "Behavior and Patience", description: "Interaction with students and patience level" },
    { key: "classEngagement", label: "Class Engagement", description: "Keeping students active and interactive" },
    { key: "useOfClassTime", label: "Use of Class Time", description: "Effective management of the class duration" },
  ];

  const handleRatingChange = (key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleExpandFeedback = (id: string) => {
    setExpandedFeedback(expandedFeedback === id ? null : id);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ background: `linear-gradient(135deg,${N[600]},${N[800]})` }}
          >
            <FileText className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-medium" style={{ color: "rgba(13,27,62,0.5)" }}>
            Loading feedback portal...
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div
        className="relative rounded-3xl overflow-hidden p-6"
        style={{
          background: `linear-gradient(135deg, ${N[950]}, ${N[800]})`,
          boxShadow: `0 16px 50px rgba(13,27,62,0.3)`,
        }}
      >
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full"
          style={{ background: "radial-gradient(circle,rgba(37,99,235,0.25) 0%,transparent 70%)" }}
        />
        <div className="relative z-10 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(37,99,235,0.3)",
              border: "1px solid rgba(96,165,250,0.2)",
            }}
          >
            <FileText className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Monthly Feedback</h2>
            <p className="text-sm" style={{ color: "rgba(147,197,253,0.7)" }}>
              Every month review helps us improve the quality of your classes
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container */}
        <div
          className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.95)",
            border: `1px solid ${N[200]}`,
            backdropFilter: "blur(12px)",
            boxShadow: `0 4px 20px rgba(13,27,62,0.06)`,
          }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${N[50]}, white)`,
              borderBottom: `1px solid ${N[100]}`,
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${N[600]}, ${N[800]})` }}
            >
              <Send className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: N[900] }}>
                Monthly Teacher Evaluation Form
              </h3>
              <p className="text-[10px] text-gray-500 font-medium">Provide monthly rating to help us serve you better</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-xs"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#dc2626",
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {message && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-xs"
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  color: "#15803d",
                }}
              >
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {message}
              </div>
            )}

            {/* Course & Teacher Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(13,27,62,0.6)" }}>
                  Select Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-white outline-none"
                  style={{ border: `1px solid ${N[200]}`, color: N[900] }}
                  onFocus={(e) => (e.target.style.borderColor = N[400])}
                  onBlur={(e) => (e.target.style.borderColor = N[200])}
                >
                  {courses.length === 0 ? (
                    <option value="">No active courses</option>
                  ) : (
                    courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(13,27,62,0.6)" }}>
                  Assigned Teacher
                </label>
                {teacher ? (
                  <div
                    className="flex items-center gap-3 px-3 py-2 rounded-xl h-[42px]"
                    style={{ background: N[50], border: `1px solid ${N[200]}` }}
                  >
                    {teacher.avatar ? (
                      <img
                        src={teacher.avatar}
                        alt={teacher.name}
                        className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                        style={{ border: `1.5px solid ${N[200]}` }}
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${N[600]}, ${N[800]})` }}
                      >
                        {teacher.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-tight truncate" style={{ color: N[900] }}>
                        {teacher.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs h-[42px]"
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.2)",
                      color: "#b45309",
                    }}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    No teacher assigned.
                  </div>
                )}
              </div>
            </div>

            {isAlreadySubmitted && (
              <div
                className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
                style={{
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  color: "#b45309",
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Evaluation Already Submitted</p>
                  <p className="mt-0.5 opacity-90 leading-relaxed">
                    You have already completed the monthly evaluation for this course. Reviews are limited to one submission per calendar month.
                  </p>
                </div>
              </div>
            )}

            {/* Performance Criteria (1-5 Grid) */}
            <div className="space-y-4 pt-2" style={{ opacity: isAlreadySubmitted ? 0.6 : 1 }}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Teacher Performance Ratings</h4>

              <div
                className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50/20"
              >
                {ratingCategories.map((cat) => (
                  <div
                    key={cat.key}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b last:border-0 border-gray-100 transition-colors hover:bg-gray-50/50"
                  >
                    <div>
                      <h5 className="text-sm font-semibold text-gray-800">{cat.label}</h5>
                      <p className="text-[11px] text-gray-400">{cat.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const score = (ratings as any)[cat.key];
                        return (
                          <button
                            key={val}
                            type="button"
                            disabled={isAlreadySubmitted}
                            onClick={() => handleRatingChange(cat.key, val)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all border active:scale-90 disabled:cursor-not-allowed"
                            style={
                              val <= score
                                ? {
                                    background: `linear-gradient(135deg, ${N[600]}, ${N[800]})`,
                                    borderColor: "transparent",
                                    color: "white",
                                    boxShadow: "0 2px 6px rgba(37,99,235,0.2)",
                                  }
                                : {
                                    background: "white",
                                    borderColor: "#e2e8f0",
                                    color: "#64748b",
                                  }
                            }
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Questions Section */}
            <div className="space-y-4 pt-2" style={{ opacity: isAlreadySubmitted ? 0.6 : 1 }}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Additional Class Insights</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">
                    What did you like most about this teacher's class?
                  </label>
                  <textarea
                    value={likeMost}
                    disabled={isAlreadySubmitted}
                    onChange={(e) => setLikeMost(e.target.value)}
                    placeholder="E.g., teaching style, pacing, explanations, friendliness..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                    style={{ border: `1px solid ${N[200]}`, color: N[900] }}
                    onFocus={(e) => (e.target.style.borderColor = N[400])}
                    onBlur={(e) => (e.target.style.borderColor = N[200])}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">What could be improved?</label>
                  <textarea
                    value={couldImprove}
                    disabled={isAlreadySubmitted}
                    onChange={(e) => setCouldImprove(e.target.value)}
                    placeholder="E.g., class timing, notes, homework review speed..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                    style={{ border: `1px solid ${N[200]}`, color: N[900] }}
                    onFocus={(e) => (e.target.style.borderColor = N[400])}
                    onBlur={(e) => (e.target.style.borderColor = N[200])}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-600">
                    Any issues or concerns to report?
                  </label>
                  <textarea
                    value={issuesConcerns}
                    disabled={isAlreadySubmitted}
                    onChange={(e) => setIssuesConcerns(e.target.value)}
                    placeholder="E.g., technical difficulties, audio issues, or general concerns..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                    style={{ border: `1px solid ${N[200]}`, color: N[900] }}
                    onFocus={(e) => (e.target.style.borderColor = N[400])}
                    onBlur={(e) => (e.target.style.borderColor = N[200])}
                  />
                </div>
              </div>
            </div>

            {/* Recommendation Choice */}
            <div className="space-y-3 pt-2" style={{ opacity: isAlreadySubmitted ? 0.6 : 1 }}>
              <label className="block text-xs font-semibold text-gray-600">
                Would you recommend this teacher to other students?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isAlreadySubmitted}
                  onClick={() => setRecommend(true)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed"
                  style={
                    recommend === true
                      ? {
                          background: "#f0fdf4",
                          borderColor: "#86efac",
                          color: "#166534",
                          boxShadow: "0 2px 8px rgba(34,197,94,0.08)",
                        }
                      : {
                          background: "white",
                          borderColor: "#e2e8f0",
                          color: "#64748b",
                        }
                  }
                >
                  <ThumbsUp className="w-4 h-4" />
                  Yes
                </button>
                <button
                  type="button"
                  disabled={isAlreadySubmitted}
                  onClick={() => setRecommend(false)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed"
                  style={
                    recommend === false
                      ? {
                          background: "#fef2f2",
                          borderColor: "#fca5a5",
                          color: "#991b1b",
                          boxShadow: "0 2px 8px rgba(239,68,68,0.08)",
                        }
                      : {
                          background: "white",
                          borderColor: "#e2e8f0",
                          color: "#64748b",
                        }
                  }
                >
                  <ThumbsDown className="w-4 h-4" />
                  No
                </button>
              </div>
            </div>

            {/* Overall Satisfaction */}
            <div className="pt-2 space-y-2" style={{ opacity: isAlreadySubmitted ? 0.6 : 1 }}>
              <label className="block text-xs font-semibold text-gray-600">Overall satisfaction</label>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-medium">Very Dissatisfied</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={isAlreadySubmitted}
                      onClick={() => handleRatingChange("overallSatisfaction", val)}
                      className="p-1 transition-transform hover:scale-110 active:scale-90 disabled:cursor-not-allowed"
                    >
                      <Star
                        className="w-7 h-7 transition-colors"
                        style={
                          val <= ratings.overallSatisfaction
                            ? { fill: "#f59e0b", color: "#f59e0b" }
                            : { color: "rgba(13,27,62,0.15)" }
                        }
                      />
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-gray-400 font-medium">Very Satisfied</span>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-4" style={{ borderTop: `1px solid ${N[100]}` }}>
              <button
                type="submit"
                disabled={isAlreadySubmitted || submitting || !teacher || courses.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg,${N[600]},${N[800]})`,
                  boxShadow: `0 6px 20px rgba(37,99,235,0.3)`,
                }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isAlreadySubmitted ? "Submitted For This Month" : "Submit Evaluation"}
              </button>
            </div>
          </form>
        </div>

        {/* History Container */}
        <div
          className="rounded-2xl overflow-hidden h-fit"
          style={{
            background: "rgba(255,255,255,0.95)",
            border: `1px solid ${N[200]}`,
            backdropFilter: "blur(12px)",
            boxShadow: `0 4px 20px rgba(13,27,62,0.06)`,
          }}
        >
          <div
            className="px-5 py-4 flex items-center gap-2"
            style={{
              background: `linear-gradient(135deg,${N[50]},white)`,
              borderBottom: `1px solid ${N[100]}`,
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${N[600]},${N[800]})` }}
            >
              <Clock className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-sm" style={{ color: N[900] }}>
              Evaluation History
            </h3>
            <span
              className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: N[50], color: N[600], border: `1px solid ${N[200]}` }}
            >
              {feedbacks.length}
            </span>
          </div>

          <div className="p-5 space-y-4 max-h-[680px] overflow-y-auto">
            {feedbacks.length === 0 ? (
              <div className="py-12 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: N[50], border: `1px solid ${N[200]}` }}
                >
                  <FileText className="w-7 h-7" style={{ color: N[300] }} />
                </div>
                <p className="font-bold text-sm" style={{ color: N[900] }}>
                  No evaluations yet
                </p>
                <p className="text-xs mt-1" style={{ color: "rgba(13,27,62,0.4)" }}>
                  Your submitted evaluations will appear here.
                </p>
              </div>
            ) : (
              feedbacks.map((f) => {
                const isExpanded = expandedFeedback === f._id;
                return (
                  <div
                    key={f._id}
                    className="p-4 rounded-xl space-y-3 transition-all border border-gray-100 bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg,${N[600]},${N[800]})` }}
                          >
                            <BookOpen className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-bold text-gray-800 truncate max-w-[120px] sm:max-w-none">
                            {f.course?.title || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <User className="w-3 h-3" />
                          {f.teacher?.fullName || "—"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className="w-3.5 h-3.5"
                              style={
                                s <= f.rating
                                  ? { fill: "#f59e0b", color: "#f59e0b" }
                                  : { color: "rgba(13,27,62,0.1)" }
                              }
                            />
                          ))}
                        </div>
                        <span className="text-[9px] font-bold text-gray-400">
                          {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpandFeedback(f._id)}
                      className="w-full flex items-center justify-between py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="pt-2 border-t border-gray-100 space-y-3">
                        {/* Rating Sub-scores */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-gray-50 p-2.5 rounded-lg text-[11px]">
                          <div>
                            <span className="text-gray-400">Clarity:</span>{" "}
                            <span className="font-bold text-gray-700">{f.teachingClarity ?? 5}/5</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Punctuality:</span>{" "}
                            <span className="font-bold text-gray-700">{f.punctuality ?? 5}/5</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Knowledge:</span>{" "}
                            <span className="font-bold text-gray-700">{f.subjectKnowledge ?? 5}/5</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Patience:</span>{" "}
                            <span className="font-bold text-gray-700">{f.behaviorPatience ?? 5}/5</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Engagement:</span>{" "}
                            <span className="font-bold text-gray-700">{f.classEngagement ?? 5}/5</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Time Use:</span>{" "}
                            <span className="font-bold text-gray-700">{f.useOfClassTime ?? 5}/5</span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-gray-200/50 flex items-center gap-1">
                            <span className="text-gray-400">Recommend:</span>
                            {f.recommend !== false ? (
                              <span className="text-green-600 font-bold flex items-center gap-0.5">
                                <ThumbsUp className="w-3 h-3" /> Yes
                              </span>
                            ) : (
                              <span className="text-red-600 font-bold flex items-center gap-0.5">
                                <ThumbsDown className="w-3 h-3" /> No
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Detailed Comments */}
                        <div className="space-y-2 text-xs">
                          {f.likeMost && (
                            <div>
                              <p className="font-bold text-gray-500 text-[10px] uppercase">Liked Most</p>
                              <p className="text-gray-700 mt-0.5 bg-gray-50/50 p-2 rounded-lg">{f.likeMost}</p>
                            </div>
                          )}
                          {f.couldImprove && (
                            <div>
                              <p className="font-bold text-gray-500 text-[10px] uppercase">Could Improve</p>
                              <p className="text-gray-700 mt-0.5 bg-gray-50/50 p-2 rounded-lg">{f.couldImprove}</p>
                            </div>
                          )}
                          {f.issuesConcerns && (
                            <div>
                              <p className="font-bold text-red-500 text-[10px] uppercase">Reported Issues</p>
                              <p className="text-red-700 mt-0.5 bg-red-50/30 p-2 rounded-lg border border-red-50/50">
                                {f.issuesConcerns}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
