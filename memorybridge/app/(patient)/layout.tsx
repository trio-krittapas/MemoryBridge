import React from "react";
import Link from "next/link";
import { MessageSquare, LayoutGrid, Music, Activity } from "lucide-react";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { LanguageProvider } from "@/components/shared/LanguageContext";
import { ProfileDropdown } from "@/components/patient/ProfileDropdown";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <div className="flex flex-col h-screen min-h-screen bg-[#fcf9f2] text-zinc-900 selection:bg-amber-200">
        {/* Header */}
        <header className="h-20 shrink-0 flex items-center justify-between px-6 border-b border-amber-900/10 bg-[#fdfbf7]">
          <h1 className="text-2xl font-bold tracking-tight text-amber-900">
            MemoryBridge
          </h1>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ProfileDropdown />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="h-full w-full mx-auto max-w-4xl lg:text-base py-6">
            {children}
          </div>
        </main>

        {/* Bottom Navigation */}
        <nav className="h-24 shrink-0 border-t border-amber-900/10 bg-[#fdfbf7] shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10">
          <ul className="flex items-center justify-around h-full px-4 max-w-lg mx-auto w-full">
            <li>
              <Link 
                href="/chat" 
                className="flex items-center justify-center p-4 rounded-2xl transition-colors hover:bg-amber-100 active:bg-amber-200"
                aria-label="Chat"
              >
                <MessageSquare className="w-10 h-10 text-amber-800" />
              </Link>
            </li>
            <li>
              <Link 
                href="/exercises" 
                className="flex items-center justify-center p-4 rounded-2xl transition-colors hover:bg-amber-100 active:bg-amber-200"
                aria-label="Exercises"
              >
                <LayoutGrid className="w-10 h-10 text-amber-800" />
              </Link>
            </li>
            <li>
              <Link
                href="/music"
                className="flex items-center justify-center p-4 rounded-2xl transition-colors hover:bg-amber-100 active:bg-amber-200"
                aria-label="Music Therapy"
              >
                <Music className="w-10 h-10 text-amber-800" />
              </Link>
            </li>
            <li>
              <Link
                href="/speech"
                className="flex items-center justify-center p-4 rounded-2xl transition-colors hover:bg-amber-100 active:bg-amber-200"
                aria-label="Daily Check-In"
              >
                <Activity className="w-10 h-10 text-amber-800" />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </LanguageProvider>
  );
}
