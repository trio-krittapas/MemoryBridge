"use client";

import React, { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error logging out", error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group text-[15px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
      aria-label="Logout"
    >
      <LogOut className="w-5 h-5 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300" />
      {loading ? "Signing out..." : "Sign Out"}
    </button>
  );
}
