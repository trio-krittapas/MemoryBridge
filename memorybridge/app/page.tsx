import Link from "next/link";
import { Heart, LayoutDashboard, Brain, Music, BarChart2, ChevronRight } from "lucide-react";

// Demo patients shown on the landing page.
// Each card links to the login page pre-filled with the patient's email.
const DEMO_PATIENTS = [
  {
    name: "John Toh",
    age: 77,
    tagline: "Retired teacher & orchid grower",
    email: "patient@memorybridge.test",
    initials: "JT",
    color: "bg-amber-500",
  },
];

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
      <header className="relative z-10 flex flex-col items-center justify-center pt-14 pb-8 px-6 text-center">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Heart className="h-8 w-8 text-white fill-white" />
          </div>
          <h1 className="text-5xl font-black text-amber-900 tracking-tight">MemoryBridge</h1>
        </div>
        <p className="text-xl text-amber-700/80 max-w-md leading-relaxed">
          Compassionate AI care for your loved ones — bridging language, memory, and connection.
        </p>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6 pb-10 gap-10">

        {/* Patient Selection */}
        <section className="w-full max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-700/60 mb-4 text-center">
            Select a Profile to Continue
          </p>

          <div className="flex flex-col gap-4">
            {DEMO_PATIENTS.map((patient) => (
              <Link
                key={patient.email}
                href={`/login?role=patient&email=${encodeURIComponent(patient.email)}`}
                className="group flex items-center gap-5 p-6 rounded-[2rem] bg-amber-600 hover:bg-amber-700 shadow-2xl hover:shadow-amber-300/60 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                  <span className="text-2xl font-black text-white">{patient.initials}</span>
                </div>

                {/* Info */}
                <div className="flex-1 text-left">
                  <p className="text-2xl font-black text-white leading-tight">{patient.name}</p>
                  <p className="text-amber-100 text-base mt-0.5">
                    Age {patient.age} · {patient.tagline}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-7 w-7 text-white/70 group-hover:text-white shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        {/* Caregiver access */}
        <section className="w-full max-w-2xl flex flex-col items-center gap-3">
          <div className="w-full border-t border-amber-200" />
          <p className="text-sm text-amber-700/50 font-medium">Are you a caregiver or family member?</p>
          <Link
            href="/login?role=caregiver"
            className="group flex items-center gap-3 px-7 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <LayoutDashboard className="h-5 w-5 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
            <span className="text-white font-bold text-base">Sign in as Caregiver</span>
            <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </Link>
        </section>

        {/* Feature strip */}
        <div className="flex flex-wrap justify-center gap-3">
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
