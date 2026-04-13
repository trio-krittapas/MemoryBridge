import React from "react";
import Link from "next/link";
import { LayoutDashboard, BookText, Music, Settings, User, HeartPulse } from "lucide-react";
import { LogoutButton } from "@/components/caregiver/LogoutButton";

export default function CaregiverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Life Story Profile", href: "/profile", icon: BookText },
    { name: "Health Profile", href: "/health", icon: HeartPulse },
    { name: "Playlist", href: "/playlist", icon: Music },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0 gap-3">
          <div className="flex bg-blue-600 rounded-md p-1.5 shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight truncate">
            Caregiver Portal
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="flex flex-col gap-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group text-[15px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
                  aria-label={item.name}
                >
                  <item.icon className="w-5 h-5 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-3">
          <LogoutButton />
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium px-3">
            MemoryBridge v1.0
          </div>
        </div>
      </aside>

      {/* Main Content Dashboard */}
      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="p-8 max-w-6xl mx-auto w-full h-full text-base">
          {children}
        </div>
      </main>
    </div>
  );
}
