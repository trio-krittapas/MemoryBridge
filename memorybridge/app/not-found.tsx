import Link from "next/link";
import { Heart, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcf9f2] via-amber-50 to-amber-100 flex flex-col items-center justify-center p-6 text-center">
      <p className="text-8xl font-black text-amber-200 select-none leading-none">404</p>
      <h1 className="text-3xl font-bold text-amber-900 mt-2">Page not found</h1>
      <p className="text-lg text-amber-700/70 mt-3 max-w-xs">
        Sorry, we couldn&apos;t find what you were looking for.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 h-14 px-7 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-lg font-semibold transition-colors shadow-md"
        >
          <Heart className="h-5 w-5 fill-white" />
          Go to Chat
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 h-14 px-7 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-lg font-semibold transition-colors shadow-md"
        >
          <LayoutDashboard className="h-5 w-5" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
