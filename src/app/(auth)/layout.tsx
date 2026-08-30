import Link from "next/link";
import { ShieldCheck, BookOpen } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[url('/login-bg.png')] bg-cover bg-center flex items-center justify-center p-4 relative font-sans">
      {/* Background Overlay with Brand Navy #0B1A45 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1A45]/90 via-[#060e24]/85 to-[#040817]/90 backdrop-blur-xs pointer-events-none" />

      {/* Top Header Navigation for Public Verification */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <Link
          href="/verify"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold shadow-xl border border-white/20 backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-amber-400 animate-pulse" />
          Verify Member / ID
        </Link>
      </div>

      {/* Centered Form Wrapper */}
      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-3 cursor-pointer group">
            <div className="w-11 h-11 rounded-2xl bg-[#0B1A45] border border-white/20 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">
              FAJR <span className="font-normal text-white/90">Academy</span>
            </span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
