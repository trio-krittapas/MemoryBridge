import Link from "next/link";
import { Heart, LayoutDashboard, Brain, Music, BarChart2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcf9f2] via-amber-50 to-amber-100 flex flex-col">
      {/* Decorative background circles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <svg
          className="absolute -top-32 -left-32 opacity-20"
          width="600"
          height="600"
          viewBox="0 0 600 600"
          fill="none"
        >
          <circle cx="300" cy="300" r="280" stroke="#d97706" strokeWidth="1.5" />
          <circle cx="300" cy="300" r="220" stroke="#d97706" strokeWidth="1" />
          <circle cx="300" cy="300" r="160" stroke="#d97706" strokeWidth="0.8" />
          <circle cx="300" cy="300" r="100" stroke="#d97706" strokeWidth="0.5" />
        </svg>
        <svg
          className="absolute -bottom-40 -right-40 opacity-10"
          width="700"
          height="700"
          viewBox="0 0 700 700"
          fill="none"
        >
          <circle cx="350" cy="350" r="330" stroke="#92400e" strokeWidth="1.5" />
          <circle cx="350" cy="350" r="260" stroke="#92400e" strokeWidth="1" />
          <circle cx="350" cy="350" r="190" stroke="#92400e" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Hero Header */}
      <header className="relative z-10 flex flex-col items-center justify-center pt-16 pb-10 px-6 text-center">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Heart className="h-8 w-8 text-white fill-white" />
          </div>
          <h1 className="text-5xl font-black text-amber-900 tracking-tight">MemoryBridge</h1>
        </div>
        <p className="text-xl text-amber-700/80 max-w-md leading-relaxed">
          Compassionate AI care for your loved ones — bridging language, memory, and connection.
        </p>
      </header>

      {/* Role Selection Cards */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">

          {/* Patient Card */}
          <Link
            href="/chat"
            className="group flex-1 flex flex-col items-center justify-center gap-5 p-10 h-64 rounded-[3rem] bg-amber-600 hover:bg-amber-700 shadow-2xl hover:shadow-amber-300/60 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <div className="w-20 h-20 bg-white/20 rounded-[1.5rem] flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Heart className="h-10 w-10 text-white fill-white" />
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-white">I am the Patient</p>
              <p className="text-lg text-amber-100 mt-1">Start your daily companion chat</p>
            </div>
          </Link>

          {/* Caregiver Card */}
          <Link
            href="/dashboard"
            className="group flex-1 flex flex-col items-center justify-center gap-5 p-10 h-64 rounded-[3rem] bg-zinc-900 hover:bg-zinc-800 shadow-2xl hover:shadow-zinc-500/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <div className="w-20 h-20 bg-white/10 rounded-[1.5rem] flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <LayoutDashboard className="h-10 w-10 text-zinc-300" />
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-white">I am a Caregiver</p>
              <p className="text-lg text-zinc-400 mt-1">Monitor cognitive health &amp; manage care</p>
            </div>
          </Link>
        </div>

        {/* Feature Strip */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <span className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-4 py-2 text-sm font-medium shadow-sm">
            <Brain className="h-4 w-4" />
            Daily Companion Chat
          </span>
          <span className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-4 py-2 text-sm font-medium shadow-sm">
            <Music className="h-4 w-4" />
            Music Memory Therapy
          </span>
          <span className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-4 py-2 text-sm font-medium shadow-sm">
            <BarChart2 className="h-4 w-4" />
            Cognitive Monitoring
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-6 px-6">
        <p className="text-xs text-amber-700/50">
          This is not a medical device. For support and companionship only.
        </p>
        <p className="text-xs text-amber-700/40 mt-1">
          NAISC 2026 · LKCMedicine Track B — Daily Support
        </p>
      </footer>
    </div>
  );
}
