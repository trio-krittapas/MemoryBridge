"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcf9f2] via-amber-50 to-amber-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-amber-100 rounded-3xl">
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Something went wrong</h2>
            <p className="text-sm text-zinc-500 mt-2 font-mono break-all">
              {error.message || "An unexpected error occurred."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={reset}
              className="flex-1 h-12 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              asChild
              className="flex-1 h-12 rounded-2xl border-zinc-200 gap-2"
            >
              <Link href="/">
                <Home className="h-4 w-4" />
                Go home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
