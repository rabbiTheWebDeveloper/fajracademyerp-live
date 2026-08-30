"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Star,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Mail,
  MapPin,
  Clock,
  Heart,
  Globe,
  Lock,
  ChevronRight,
  Play,
  Compass,
  Check,
  Send,
  Loader2,
} from "lucide-react";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FajrLogo } from "@/components/FajrLogo";

function WhatsappIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.333 5.001l-1.416 5.172 5.294-1.388c1.464.798 3.116 1.216 4.779 1.217h.004c5.506 0 9.989-4.478 9.99-9.985 0-2.668-1.039-5.176-2.926-7.062a9.923 9.923 0 0 0-7.068-2.939zm.004 1.667c4.586 0 8.32 3.731 8.322 8.317 0 2.227-.867 4.32-2.444 5.895a8.274 8.274 0 0 1-5.882 2.447h-.003c-1.466 0-2.909-.39-4.175-1.128l-.3-.178-3.104.813.827-3.023-.195-.311a8.272 8.272 0 0 1-1.267-4.331c.001-4.586 3.737-8.318 8.32-8.318zm-3.568 4.24c-.198 0-.518.074-.79.37-.272.296-1.038 1.013-1.038 2.47 0 1.457 1.062 2.864 1.21 3.062.148.198 2.091 3.193 5.067 4.478.708.306 1.26.488 1.691.625.71.226 1.356.194 1.866.118.57-.085 1.754-.716 2.001-1.408.247-.692.247-1.285.173-1.408-.074-.124-.272-.198-.569-.346-.297-.148-1.754-.865-2.026-.964-.272-.099-.47-.148-.668.148-.198.297-.766.964-.939 1.162-.173.198-.346.222-.643.074-.297-.148-1.255-.462-2.39-1.475-.883-.787-1.48-1.759-1.653-2.056-.173-.297-.018-.458.13-.605.133-.133.297-.346.445-.519.148-.173.198-.297.297-.494.099-.198.049-.371-.025-.519-.074-.148-.668-1.606-.915-2.2-.24-.578-.485-.5-.668-.509z" />
    </svg>
  );
}

export default function FajrAcademyHomePage() {
  const [trialForm, setTrialForm] = useState({
    name: "",
    phone: "",
    course: "Quran Recitation & Tajweed",
    level: "Beginner",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleTrialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#faf8f5] dark:bg-[#050b17] text-[#0a1931] dark:text-[#f5f7fa] font-sans antialiased selection:bg-[#c5a059]/30 selection:text-[#0a1931] transition-colors duration-300">
        
        {/* ── Top Islamic Banner ── */}
        <div className="bg-gradient-to-r from-[#071326] via-[#0b1b3d] to-[#071326] text-[#dfb76c] text-xs py-2 px-4 text-center border-b border-[#c5a059]/25 flex items-center justify-center gap-3">
          <span className="hidden sm:inline-block font-arabic text-sm opacity-90">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </span>
          <span className="opacity-80">·</span>
          <span className="font-medium tracking-wide">
            Admissions Open: Book a Free 1-on-1 Trial Assessment Class with Certified Scholars
          </span>
          <Link
            href="#trial-booking"
            className="hidden md:inline-flex items-center gap-1 font-bold text-white hover:text-[#dfb76c] underline underline-offset-2 transition-colors ml-2"
          >
            Claim Free Class <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* ── Sticky Luxury Navbar ── */}
        <header className="sticky top-0 z-50 bg-[#faf8f5]/90 dark:bg-[#070e1c]/90 backdrop-blur-md border-b border-gray-200/80 dark:border-white/[0.08] transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <FajrLogo size="md" href="/home" />

              {/* Desktop Nav Links */}
              <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-gray-700 dark:text-slate-300">
                <Link href="#courses" className="hover:text-[#99793d] dark:hover:text-[#dfb76c] transition-colors">
                  Islamic Courses
                </Link>
                <Link href="#methodology" className="hover:text-[#99793d] dark:hover:text-[#dfb76c] transition-colors">
                  Methodology
                </Link>
                <Link href="#faculty" className="hover:text-[#99793d] dark:hover:text-[#dfb76c] transition-colors">
                  Faculty &amp; Ijazaah
                </Link>
                <Link href="/verify" className="flex items-center gap-1.5 hover:text-[#99793d] dark:hover:text-[#dfb76c] transition-colors">
                  <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
                  ID Verification
                </Link>
                <Link href="#testimonials" className="hover:text-[#99793d] dark:hover:text-[#dfb76c] transition-colors">
                  Reviews
                </Link>
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#0a1931] dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] transition-colors"
              >
                Portal Sign In
              </Link>

              <Link
                href="#trial-booking"
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold btn-gold"
              >
                <span>Free Trial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* ── HERO SECTION ── */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#c5a059]/10 to-transparent rounded-full blur-3xl dark:from-[#c5a059]/5" />
            <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-[#0b1b3d]/5 dark:bg-[#0b1b3d]/30 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              
              {/* Surah Calligraphic Tag */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c5a059]/10 dark:bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#88692c] dark:text-[#dfb76c] text-xs font-semibold tracking-wide shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ · Sacred Quranic Learning for Global Students</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0a1931] dark:text-[#f8f6f0] leading-[1.15]">
                Illuminating Minds with{" "}
                <span className="text-gold-gradient">Sacred Islamic Knowledge</span> &amp; Academic Excellence
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-gray-600 dark:text-slate-300 leading-relaxed font-normal">
                A premier Islamic institution providing personalized 1-on-1 Quran, Tajweed, Hifz, Arabic, and Islamic Studies education with certified Alim/Alimah faculty and dedicated female teachers for sisters and children worldwide.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  href="#trial-booking"
                  className="px-7 py-3.5 rounded-xl text-sm font-bold btn-gold shadow-lg"
                >
                  Book Free 1-on-1 Trial Class
                </Link>

                <Link
                  href="/verify"
                  className="px-6 py-3.5 rounded-xl text-sm font-semibold btn-navy flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#dfb76c]" />
                  Verify Member / ID
                </Link>

                <Link
                  href="/login"
                  className="px-6 py-3.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] transition-all"
                >
                  ERP Dashboard
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-gray-500 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#c5a059]" />
                  <span>100% Verified Ijazaah Scholars</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#c5a059]" />
                  <span>Female Teachers for Sisters</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#c5a059]" />
                  <span>Flexible 24/7 Time Slots</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#c5a059]" />
                  <span>Interactive ERP Tracking</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── STATS & IMPACT SECTION ── */}
        <section className="border-y border-gray-200/80 dark:border-white/[0.08] bg-white dark:bg-[#070e1c] py-12 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-[#0a1931] dark:text-[#f8f6f0] tracking-tight">
                  12,000<span className="text-[#c5a059]">+</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium">
                  Active Students Worldwide
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-[#0a1931] dark:text-[#f8f6f0] tracking-tight">
                  450<span className="text-[#c5a059]">+</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium">
                  Certified Islamic Teachers
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-[#0a1931] dark:text-[#f8f6f0] tracking-tight">
                  99.4<span className="text-[#c5a059]">%</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium">
                  Student &amp; Parent Satisfaction
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-[#0a1931] dark:text-[#f8f6f0] tracking-tight">
                  28<span className="text-[#c5a059]">+</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium">
                  Countries Represented
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── FEATURED ISLAMIC CURRICULUM ── */}
        <section id="courses" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#99793d] dark:text-[#dfb76c]">
              Academic Offerings
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0a1931] dark:text-[#f8f6f0] tracking-tight">
              Comprehensive Islamic Curriculum
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Tailored learning paths structured from foundational reading to advanced Ijazaah certification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Course Card 1 */}
            <div className="bg-white dark:bg-[#080d1a] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl p-7 shadow-sm hover:shadow-xl dark:hover:border-[#c5a059]/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#c5a059]/10 dark:bg-[#c5a059]/20 text-[#88692c] dark:text-[#dfb76c] flex items-center justify-center font-bold mb-5 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#99793d] dark:text-[#dfb76c] bg-[#c5a059]/10 px-2.5 py-1 rounded-full">
                Beginner to Advanced
              </span>
              <h3 className="text-xl font-bold text-[#0a1931] dark:text-slate-100 mt-3 mb-2">
                Quran Recitation &amp; Tajweed Mastery
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-5">
                Master correct Makharij (articulation points), Sifaat, and melodic rhythmic Quranic recitation with certified Tajweed scholars.
              </p>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-300 mb-6 border-t border-gray-100 dark:border-white/[0.06] pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Noorani &amp; Baghdadi Qaida foundation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Rules of Noon &amp; Meem Saakinah, Madd
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> 1-on-1 personalized pronunciation correction
                </li>
              </ul>
              <Link
                href="#trial-booking"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#88692c] dark:text-[#dfb76c] group-hover:translate-x-1 transition-transform"
              >
                Enroll in Tajweed <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Course Card 2 */}
            <div className="bg-white dark:bg-[#080d1a] border border-[#c5a059]/40 dark:border-[#c5a059]/40 rounded-2xl p-7 shadow-md hover:shadow-2xl transition-all relative group bg-gradient-to-b from-white to-[#fcfaf7] dark:from-[#080d1a] dark:to-[#0c1424]">
              <span className="absolute top-4 right-4 bg-gradient-to-r from-[#dfb76c] to-[#c5a059] text-[#050b17] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
                Most Prestigious
              </span>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0b1b3d] to-[#132a52] text-[#dfb76c] flex items-center justify-center font-bold mb-5 group-hover:scale-110 transition-transform shadow-md">
                <Award className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#99793d] dark:text-[#dfb76c] bg-[#c5a059]/10 px-2.5 py-1 rounded-full">
                Memorization Track
              </span>
              <h3 className="text-xl font-bold text-[#0a1931] dark:text-slate-100 mt-3 mb-2">
                Hifz-ul-Quran (Full &amp; Surah Track)
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-5">
                Structured daily Sabaq, Sabqi, and Manzil retention revision system guided by Hafiz tutors with verified Mutqin credentials.
              </p>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-300 mb-6 border-t border-gray-100 dark:border-white/[0.06] pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Individual daily memorization schedule
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Rigorous revision &amp; retention tracking ERP
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Sanad &amp; Ijazaah upon completion
                </li>
              </ul>
              <Link
                href="#trial-booking"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#88692c] dark:text-[#dfb76c] group-hover:translate-x-1 transition-transform"
              >
                Start Hifz Track <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Course Card 3 */}
            <div className="bg-white dark:bg-[#080d1a] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl p-7 shadow-sm hover:shadow-xl dark:hover:border-[#c5a059]/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#c5a059]/10 dark:bg-[#c5a059]/20 text-[#88692c] dark:text-[#dfb76c] flex items-center justify-center font-bold mb-5 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#99793d] dark:text-[#dfb76c] bg-[#c5a059]/10 px-2.5 py-1 rounded-full">
                Language &amp; Grammar
              </span>
              <h3 className="text-xl font-bold text-[#0a1931] dark:text-slate-100 mt-3 mb-2">
                Classical &amp; Quranic Arabic
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-5">
                Understand the divine language of the Quran directly without translation. Learn Nahw, Sarf, and rich Quranic vocabulary.
              </p>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-300 mb-6 border-t border-gray-100 dark:border-white/[0.06] pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Madinah Arabic &amp; Al-Arabiyyah Bayna Yadayk
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Direct Quranic Ayah linguistic breakdown
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Conversational &amp; textual fluency
                </li>
              </ul>
              <Link
                href="#trial-booking"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#88692c] dark:text-[#dfb76c] group-hover:translate-x-1 transition-transform"
              >
                Learn Quranic Arabic <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Course Card 4 */}
            <div className="bg-white dark:bg-[#080d1a] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl p-7 shadow-sm hover:shadow-xl dark:hover:border-[#c5a059]/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#c5a059]/10 dark:bg-[#c5a059]/20 text-[#88692c] dark:text-[#dfb76c] flex items-center justify-center font-bold mb-5 group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#99793d] dark:text-[#dfb76c] bg-[#c5a059]/10 px-2.5 py-1 rounded-full">
                Young Learners (Ages 4-14)
              </span>
              <h3 className="text-xl font-bold text-[#0a1931] dark:text-slate-100 mt-3 mb-2">
                Kids Islamic Foundation &amp; Akhlaq
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-5">
                Engaging interactive curriculum instilling love for Allah, the Prophet ﷺ, daily Adhkar, Salah mechanics, and Islamic character.
              </p>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-300 mb-6 border-t border-gray-100 dark:border-white/[0.06] pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Fun storytelling from Quran &amp; Seerah
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Step-by-step Wudu &amp; Salah training
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Weekly parent progress reports via ERP
                </li>
              </ul>
              <Link
                href="#trial-booking"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#88692c] dark:text-[#dfb76c] group-hover:translate-x-1 transition-transform"
              >
                Enroll Child <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Course Card 5 */}
            <div className="bg-white dark:bg-[#080d1a] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl p-7 shadow-sm hover:shadow-xl dark:hover:border-[#c5a059]/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#c5a059]/10 dark:bg-[#c5a059]/20 text-[#88692c] dark:text-[#dfb76c] flex items-center justify-center font-bold mb-5 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#99793d] dark:text-[#dfb76c] bg-[#c5a059]/10 px-2.5 py-1 rounded-full">
                Sisters &amp; Women Exclusive
              </span>
              <h3 className="text-xl font-bold text-[#0a1931] dark:text-slate-100 mt-3 mb-2">
                Alimah Faculty Sisters Program
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-5">
                Complete privacy with certified female Alimahs for sisters wanting to learn Tajweed, Fiqh of Taharah, Tafseer, and Islamic parenting.
              </p>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-300 mb-6 border-t border-gray-100 dark:border-white/[0.06] pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> 100% Female scholars and instructors
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Flexible schedule for working women &amp; mothers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Private 1-on-1 interactive virtual classroom
                </li>
              </ul>
              <Link
                href="#trial-booking"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#88692c] dark:text-[#dfb76c] group-hover:translate-x-1 transition-transform"
              >
                Join Sisters Circle <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Course Card 6 */}
            <div className="bg-white dark:bg-[#080d1a] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl p-7 shadow-sm hover:shadow-xl dark:hover:border-[#c5a059]/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#c5a059]/10 dark:bg-[#c5a059]/20 text-[#88692c] dark:text-[#dfb76c] flex items-center justify-center font-bold mb-5 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#99793d] dark:text-[#dfb76c] bg-[#c5a059]/10 px-2.5 py-1 rounded-full">
                Advanced Islamic Sciences
              </span>
              <h3 className="text-xl font-bold text-[#0a1931] dark:text-slate-100 mt-3 mb-2">
                Fiqh, Hadith &amp; Seerah Studies
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-5">
                Systematic study of daily Fiqh, Riyadh as-Saliheen, 40 Hadith of Imam Nawawi, and in-depth Prophetic biography with authentic commentary.
              </p>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-300 mb-6 border-t border-gray-100 dark:border-white/[0.06] pt-4">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Contemporary Islamic jurisprudence answers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Certified Sanad curriculum
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Digital course materials &amp; study guides
                </li>
              </ul>
              <Link
                href="#trial-booking"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#88692c] dark:text-[#dfb76c] group-hover:translate-x-1 transition-transform"
              >
                Explore Islamic Studies <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        </section>

        {/* ── METHODOLOGY & WHY FAJR ACADEMY ── */}
        <section id="methodology" className="bg-[#f5f1e8] dark:bg-[#070e1c] py-20 lg:py-28 border-y border-gray-200/80 dark:border-white/[0.08]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              <div className="space-y-6">
                <span className="text-xs font-bold uppercase tracking-widest text-[#99793d] dark:text-[#dfb76c]">
                  Our Pedagogical Pillars
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#0a1931] dark:text-[#f8f6f0] tracking-tight">
                  Modern EdTech Precision Combined with Classical Sanad Tradition
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 leading-relaxed">
                  Fajr Academy bridges centuries of sacred Islamic pedagogy with modern technological excellence, delivering an unparalleled learning experience for students of all ages.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0b1b3d] text-[#dfb76c] flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                      1
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#0a1931] dark:text-slate-100">
                        1-on-1 Dedicated Personalized Tutoring
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1">
                        100% individual attention. No crowded classrooms where students fall behind. Your teacher paces every lesson to your exact learning speed.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0b1b3d] text-[#dfb76c] flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                      2
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#0a1931] dark:text-slate-100">
                        Verified Digital ID &amp; QR Security System
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1">
                        Every student, teacher, and certificate is cryptographically verifiable via our public verification portal, guaranteeing academic trust.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0b1b3d] text-[#dfb76c] flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                      3
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#0a1931] dark:text-slate-100">
                        Comprehensive ERP Attendance &amp; Progress Portal
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1">
                        Track homework, recitation errors, attendance records, feedback scores, and monthly fee receipts directly in your portal.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Link
                    href="/verify"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold btn-gold shadow-md"
                  >
                    <ShieldCheck className="w-4 h-4" /> Verify Any Member ID Online
                  </Link>
                </div>
              </div>

              {/* Decorative Showcase Card */}
              <div className="relative">
                <div className="bg-white dark:bg-[#080d1a] border border-[#c5a059]/30 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] pb-4">
                    <FajrLogo size="sm" />
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60">
                      ● Active Session
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#faf8f5] dark:bg-[#0e1628] border border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Current Sabaq (Surah)</p>
                        <p className="text-sm font-bold text-[#0a1931] dark:text-slate-100">Surah Al-Mulk (Ayah 1-12)</p>
                      </div>
                      <span className="text-xs font-bold text-[#99793d] dark:text-[#dfb76c]">Tajweed: Perfect</span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#faf8f5] dark:bg-[#0e1628] border border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Assigned Teacher</p>
                        <p className="text-sm font-bold text-[#0a1931] dark:text-slate-100">Ustadh Ahmad Al-Qari (Ijazaah 10 Qiraat)</p>
                      </div>
                      <div className="flex text-amber-400">
                        {"★".repeat(5)}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#0b1b3d] to-[#132a52] text-white space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#dfb76c]">
                        <span>Monthly Attendance &amp; Score</span>
                        <span className="font-bold">100% On-Time</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div className="bg-[#dfb76c] h-2 rounded-full w-[94%]" />
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Live interactive virtual classroom with crystal clear HD audio and screen Quran reader.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── REAL REVIEWS & TESTIMONIALS ── */}
        <section id="testimonials" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#99793d] dark:text-[#dfb76c]">
              Student &amp; Parent Experiences
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0a1931] dark:text-[#f8f6f0] tracking-tight">
              Trusted by Thousands of Muslim Families
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Read authentic feedback from our global community learning Quran and Islamic Studies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Review 1 */}
            <div className="bg-white dark:bg-[#080d1a] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl p-7 shadow-sm space-y-4">
              <div className="flex items-center text-amber-400 gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed italic">
                "My 8-year-old son started from basic Qaida and in just 6 months he is reciting Juz Amma with beautiful Tajweed. His teacher is patient, encouraging, and the ERP feedback portal lets me track every single class."
              </p>
              <div className="pt-2 border-t border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0b1b3d] text-white flex items-center justify-center font-bold text-xs">
                  FR
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0a1931] dark:text-slate-100">Fatima Rahman</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">London, United Kingdom</p>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="bg-white dark:bg-[#080d1a] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl p-7 shadow-sm space-y-4">
              <div className="flex items-center text-amber-400 gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed italic">
                "Finding an authentic female Alimah with Sanad for my daughters was very difficult until we joined Fajr Academy. The flexible timings fit perfectly around our US school schedule."
              </p>
              <div className="pt-2 border-t border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0b1b3d] text-white flex items-center justify-center font-bold text-xs">
                  TH
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0a1931] dark:text-slate-100">Tariq Hassan</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Texas, United States</p>
                </div>
              </div>
            </div>

            {/* Review 3 */}
            <div className="bg-white dark:bg-[#080d1a] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl p-7 shadow-sm space-y-4">
              <div className="flex items-center text-amber-400 gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed italic">
                "I am an adult professional learning Classical Arabic to understand the Quran. The teacher is exceptionally knowledgeable in Nahw and Sarf. Highly recommend Fajr Academy to anyone serious about Islamic education."
              </p>
              <div className="pt-2 border-t border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0b1b3d] text-white flex items-center justify-center font-bold text-xs">
                  KA
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0a1931] dark:text-slate-100">Dr. Kazi Ariful</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Sydney, Australia</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── BOOK FREE TRIAL FORM SECTION ── */}
        <section id="trial-booking" className="py-20 bg-gradient-to-b from-[#f5f1e8] to-[#faf8f5] dark:from-[#060e1d] dark:to-[#050b17] border-t border-gray-200/80 dark:border-white/[0.08]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-[#080d1a] border border-[#c5a059]/30 rounded-3xl p-8 sm:p-12 shadow-2xl">
              <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#99793d] dark:text-[#dfb76c]">
                  Get Started Today
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0a1931] dark:text-[#f8f6f0] tracking-tight">
                  Book Your Free 1-on-1 Assessment Class
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                  Experience a 30-minute private evaluation with a certified teacher. No credit card required.
                </p>
              </div>

              {submitted ? (
                <div className="text-center p-8 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 space-y-3 animate-in fade-in duration-300">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h3 className="text-lg font-bold text-[#0a1931] dark:text-slate-100">
                    JazakAllah Khair! Your Free Trial is Requested.
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-300 max-w-md mx-auto">
                    Our academic coordinator will contact you via WhatsApp / Phone to schedule your preferred class time slot.
                  </p>
                  <div className="pt-2">
                    <a
                      href="https://wa.me/8801641028312?text=Hello%20Fajr%20Academy%2C%20I%20just%20submitted%20my%20Free%20Trial%20request."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-105"
                    >
                      <WhatsappIcon className="w-4 h-4" /> Message Us on WhatsApp
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleTrialSubmit} className="space-y-5 max-w-lg mx-auto">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      Student / Parent Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={trialForm.name}
                      onChange={(e) => setTrialForm({ ...trialForm, name: e.target.value })}
                      placeholder="e.g. Abdullah Khan"
                      className="w-full px-4 py-3 text-sm bg-[#faf8f5] dark:bg-[#05080f] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-[#c5a059] focus:outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      WhatsApp / Phone Number with Country Code
                    </label>
                    <input
                      type="tel"
                      required
                      value={trialForm.phone}
                      onChange={(e) => setTrialForm({ ...trialForm, phone: e.target.value })}
                      placeholder="e.g. +880 1857-381244 or +1 (555) 000-0000"
                      className="w-full px-4 py-3 text-sm bg-[#faf8f5] dark:bg-[#05080f] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-[#c5a059] focus:outline-none dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Preferred Course
                      </label>
                      <select
                        value={trialForm.course}
                        onChange={(e) => setTrialForm({ ...trialForm, course: e.target.value })}
                        className="w-full px-3 py-3 text-sm bg-[#faf8f5] dark:bg-[#05080f] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-[#c5a059] focus:outline-none dark:text-white"
                      >
                        <option>Quran Recitation &amp; Tajweed</option>
                        <option>Hifz-ul-Quran Track</option>
                        <option>Quranic &amp; Classical Arabic</option>
                        <option>Kids Islamic Foundation</option>
                        <option>Sisters Alimah Program</option>
                        <option>Islamic Studies &amp; Fiqh</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Student Level
                      </label>
                      <select
                        value={trialForm.level}
                        onChange={(e) => setTrialForm({ ...trialForm, level: e.target.value })}
                        className="w-full px-3 py-3 text-sm bg-[#faf8f5] dark:bg-[#05080f] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-[#c5a059] focus:outline-none dark:text-white"
                      >
                        <option>Complete Beginner (Qaida)</option>
                        <option>Intermediate (Reading Quran)</option>
                        <option>Advanced (Tajweed &amp; Hifz)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-6 rounded-xl text-sm font-bold btn-gold shadow-lg flex items-center justify-center gap-2 mt-4"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling Assessment…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Confirm Free Assessment Class</>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-gray-500 dark:text-slate-400">
                    🔒 We respect your privacy. Your information is 100% secure and will only be used for scheduling.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* ── PRESTIGE ISLAMIC FOOTER ── */}
        <footer className="bg-[#050b17] text-white border-t border-[#c5a059]/20 pt-16 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/[0.08]">
              
              {/* Brand Col */}
              <div className="lg:col-span-2 space-y-4">
                <FajrLogo size="md" variant="white" href="/home" />
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm">
                  FAJR Academy is a premier international Islamic institution dedicated to imparting authentic Quranic recitation, memorization, Arabic language, and Shariah education.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <a
                    href="https://wa.me/8801641028312"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-600/30 transition-colors"
                  >
                    <WhatsappIcon className="w-3.5 h-3.5" /> WhatsApp Support
                  </a>
                  <Link
                    href="/verify"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c5a059]/15 text-[#dfb76c] border border-[#c5a059]/30 text-xs font-semibold hover:bg-[#c5a059]/25 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> ID Verification
                  </Link>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#dfb76c] uppercase tracking-wider">
                  Academic Programs
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li><Link href="#courses" className="hover:text-[#dfb76c] transition-colors">Tajweed Mastery</Link></li>
                  <li><Link href="#courses" className="hover:text-[#dfb76c] transition-colors">Hifz-ul-Quran Track</Link></li>
                  <li><Link href="#courses" className="hover:text-[#dfb76c] transition-colors">Classical Arabic</Link></li>
                  <li><Link href="#courses" className="hover:text-[#dfb76c] transition-colors">Kids Foundation</Link></li>
                  <li><Link href="#courses" className="hover:text-[#dfb76c] transition-colors">Sisters Circle</Link></li>
                </ul>
              </div>

              {/* Portals */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#dfb76c] uppercase tracking-wider">
                  Academy Portals
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li><Link href="/login" className="hover:text-[#dfb76c] transition-colors">Student ERP Portal</Link></li>
                  <li><Link href="/login" className="hover:text-[#dfb76c] transition-colors">Teacher Faculty Portal</Link></li>
                  <li><Link href="/login" className="hover:text-[#dfb76c] transition-colors">Staff &amp; Admin Dashboard</Link></li>
                  <li><Link href="/verify" className="hover:text-[#dfb76c] transition-colors">Verify Certificate / ID</Link></li>
                  <li><Link href="/student-registration" className="hover:text-[#dfb76c] transition-colors">New Registration</Link></li>
                </ul>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#dfb76c] uppercase tracking-wider">
                  Official Contact
                </h4>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5 text-[#dfb76c]" />
                    <span>01857-381244</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#dfb76c]" />
                    <span>support@fajracademy.io</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#dfb76c] mt-0.5" />
                    <span>Fajr Academy International Campus</span>
                  </li>
                </ul>
              </div>

            </div>

            {/* Bottom Bar */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
              <p>© {new Date().getFullYear()} FAJR Academy. All rights reserved. Shariah Compliant Islamic Education Platform.</p>
              <div className="flex items-center gap-4">
                <Link href="/verify" className="hover:text-[#dfb76c] transition-colors">Verification</Link>
                <Link href="/login" className="hover:text-[#dfb76c] transition-colors">Portal</Link>
                <Link href="#trial-booking" className="hover:text-[#dfb76c] transition-colors">Free Trial</Link>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </ThemeProvider>
  );
}
