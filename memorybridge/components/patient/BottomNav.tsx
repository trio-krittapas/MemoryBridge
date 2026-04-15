"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, LayoutGrid, Music, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

const CHECKIN_KEY = "checkin_done_date";

const NAV_ITEMS = [
  { href: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { href: "/exercises", icon: LayoutGrid, labelKey: "nav.exercises" },
  { href: "/music", icon: Music, labelKey: "nav.music" },
  { href: "/speech", icon: Activity, labelKey: "nav.checkin", showDot: true },
];

function hasCompletedCheckinToday(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem(CHECKIN_KEY) === new Date().toDateString();
}

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslation();
  const [checkinDone, setCheckinDone] = useState<boolean>(() => hasCompletedCheckinToday());

  useEffect(() => {
    const refreshCheckinState = () => setCheckinDone(hasCompletedCheckinToday());
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshCheckinState();
    };

    window.addEventListener('focus', refreshCheckinState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshCheckinState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Listen for real-time completion signal from the speech page
  useEffect(() => {
    const handleCheckinComplete = () => setCheckinDone(true);
    window.addEventListener('checkin-complete', handleCheckinComplete);
    return () => window.removeEventListener('checkin-complete', handleCheckinComplete);
  }, []);

  return (
    <nav className="h-24 shrink-0 border-t border-amber-900/10 bg-[#fdfbf7] shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10">
      <ul className="flex items-center justify-around h-full px-4 max-w-lg mx-auto w-full">
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey, showDot }) => {
          const isActive = pathname.startsWith(href);
          const showBadge = Boolean(showDot);
          const badgeColor = checkinDone ? "bg-emerald-500" : "bg-red-500";
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={t(labelKey)}
                className={`relative flex items-center justify-center p-4 rounded-2xl transition-all duration-200
                  ${isActive
                    ? "bg-amber-100 ring-2 ring-amber-400"
                    : "hover:bg-amber-100 active:bg-amber-200"
                  }`}
              >
                <Icon
                  className={`w-10 h-10 transition-colors ${
                    isActive ? "text-amber-700" : "text-amber-800"
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {/* Daily check-in status dot: red when pending, green when done. */}
                {showBadge && (
                  <span className={`absolute top-2.5 right-2.5 w-3 h-3 ${badgeColor} rounded-full border-2 border-[#fdfbf7]`} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
