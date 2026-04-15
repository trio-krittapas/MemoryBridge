"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Heart } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"caregiver" | "patient">("patient");
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roleParam = searchParams.get("role");
    const emailParam = searchParams.get("email");
    if (roleParam === "caregiver" || roleParam === "patient") {
      setRole(roleParam);
    }
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      if (isLogin) {
        // Admin testing backdoor for passwords
        const actualPassword = password.trim() === "admin" ? "admin123" : password;
        const actualEmail = email.trim();

        // Handle Login
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: actualEmail,
          password: actualPassword,
        });

        if (signInError) throw signInError;

        // Redirect based on role — with mismatch guard
        if (data.user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

          const dbRole = profile?.role;

          // If the user arrived from a patient card but their account is a caregiver, reject
          if (role === "patient" && dbRole === "caregiver") {
            await supabase.auth.signOut();
            throw new Error(
              "This account is registered as a caregiver. Please go back and select 'Sign in as Caregiver' to log in."
            );
          }

          // If the user arrived from the caregiver link but their account is a patient, reject
          if (role === "caregiver" && dbRole === "patient") {
            await supabase.auth.signOut();
            throw new Error(
              "This account is registered as a patient. Please go back and select a patient profile to log in."
            );
          }

          if (dbRole === "caregiver") {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/chat";
          }
        }
      } else {
        // Handle Register
        const actualPassword = password.trim() === "admin" ? "admin123" : password.trim();
        const actualEmail = email.trim();
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: actualEmail,
          password: actualPassword,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Create the custom profile associated with this auth record
          const { error: profileError } = await supabase.from("user_profiles").insert([
            {
              id: data.user.id,
              role,
              display_name: displayName || email.split("@")[0],
              email: actualEmail,
              preferred_language: "en",
            },
          ]);

          if (profileError) {
            console.error("Profile creation error", profileError);
            // Optionally rollback or just show an error (we'll log and continue for demo)
          }

          if (role === "caregiver") {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/chat";
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-gradient-to-br from-[#fcf9f2] via-amber-50 to-amber-100">
      {/* Wordmark */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-8 h-8 bg-amber-600 rounded-xl flex items-center justify-center shadow">
          <Heart className="h-4 w-4 text-white fill-white" />
        </div>
        <span className="text-xl font-black text-amber-900">MemoryBridge</span>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-amber-100">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-amber-900">
            {isLogin ? "Welcome back" : "Create account"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin
              ? "Sign in to your account"
              : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isLoading}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(val: "caregiver" | "patient") => setRole(val)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="role" className="bg-amber-50 border-amber-200">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="caregiver">Caregiver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Signing in as</span>
                  <span className="text-lg font-black text-amber-700 capitalize">{role}</span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setRole(role === 'patient' ? 'caregiver' : 'patient')}
                  className="text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                >
                  Change Role
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="link"
            className="text-sm text-amber-700 hover:text-amber-900"
            onClick={() => setIsLogin(!isLogin)}
            disabled={isLoading}
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
