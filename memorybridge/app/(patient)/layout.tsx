import React from "react";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { LanguageProvider } from "@/components/shared/LanguageContext";
import { ProfileDropdown } from "@/components/patient/ProfileDropdown";
import { BottomNav } from "@/components/patient/BottomNav";

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

        <BottomNav />
      </div>
    </LanguageProvider>
  );
}
