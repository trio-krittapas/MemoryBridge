"use client";

import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";

interface Profile {
  id: string;
  role: string;
  display_name: string;
  email: string;
  preferred_language: string;
  created_at: string;
  avatar_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  phone: string | null;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getFirstName(name: string | null | undefined): string {
  if (!name) return "Profile";
  return name.trim().split(/\s+/)[0];
}

function calcBMI(
  weight: number | null,
  height: number | null
): number | null {
  if (!weight || !height || height === 0) return null;
  return Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
}

function getBMICategory(bmi: number): {
  label: string;
  className: string;
} {
  if (bmi < 18.5)
    return { label: "Underweight", className: "bg-blue-100 text-blue-800 border-blue-200" };
  if (bmi < 25)
    return { label: "Normal", className: "bg-green-100 text-green-800 border-green-200" };
  if (bmi < 30)
    return { label: "Overweight", className: "bg-amber-100 text-amber-800 border-amber-200" };
  return { label: "Obese", className: "bg-red-100 text-red-800 border-red-200" };
}

export function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);

  // Profile tab state
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Health tab state
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  const loadProfile = useCallback(async () => {
    if (profile) return; // already loaded
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      const p: Profile = data.profile;
      setProfile(p);
      setDisplayName(p.display_name ?? "");
      setAvatarUrl(p.avatar_url ?? "");
      setPhone(p.phone ?? "");
      setDateOfBirth(p.date_of_birth ?? "");
      setHeightCm(p.height_cm != null ? String(p.height_cm) : "");
      setWeightKg(p.weight_kg != null ? String(p.weight_kg) : "");
    } catch {
      toast.error("Could not load profile data.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) loadProfile();
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          avatar_url: avatarUrl || null,
          phone: phone || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      const data = await res.json();
      setProfile((prev) =>
        prev ? { ...prev, ...data.profile } : data.profile
      );
      toast.success("Profile saved successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to change password");
      }
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveHealth = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_of_birth: dateOfBirth || null,
          height_cm: heightCm ? Number(heightCm) : null,
          weight_kg: weightKg ? Number(weightKg) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      const data = await res.json();
      setProfile((prev) =>
        prev ? { ...prev, ...data.profile } : data.profile
      );
      toast.success("Health info saved successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save health info.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const bmi = calcBMI(
    weightKg ? Number(weightKg) : null,
    heightCm ? Number(heightCm) : null
  );
  const bmiCategory = bmi !== null ? getBMICategory(bmi) : null;

  const initials = getInitials(profile?.display_name);
  const firstName = getFirstName(profile?.display_name);
  const avatarSrc = profile?.avatar_url || avatarUrl || undefined;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* Avatar trigger button */}
      <button
        onClick={() => handleOpenChange(true)}
        className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        aria-label="Open profile"
      >
        <Avatar className="size-9 ring-2 ring-amber-200">
          {avatarSrc ? (
            <AvatarImage src={avatarSrc} alt={profile?.display_name ?? "Avatar"} />
          ) : null}
          <AvatarFallback className="bg-amber-500 text-white font-semibold text-sm">
            {loading ? "..." : initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden md:block text-sm font-medium text-amber-900 max-w-[120px] truncate">
          {loading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            firstName
          )}
        </span>
      </button>

      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 bg-[#fdfbf7]">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-amber-900/10">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 ring-2 ring-amber-200">
              {avatarSrc ? (
                <AvatarImage src={avatarSrc} alt={profile?.display_name ?? "Avatar"} />
              ) : null}
              <AvatarFallback className="bg-amber-500 text-white font-bold text-lg">
                {loading ? "..." : initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-amber-900 text-lg font-bold">
                My Profile
              </SheetTitle>
              {loading ? (
                <Skeleton className="h-4 w-32 mt-1" />
              ) : (
                <p className="text-sm text-zinc-500 mt-0.5">
                  {profile?.email ?? ""}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="profile" className="flex-1">
                  Profile
                </TabsTrigger>
                <TabsTrigger value="health" className="flex-1">
                  Health Info
                </TabsTrigger>
              </TabsList>

              {/* ── Profile Tab ── */}
              <TabsContent value="profile">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="display-name" className="text-zinc-700 font-medium">
                      Display Name
                    </Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                      className="border-amber-200 focus-visible:ring-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-zinc-700 font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      value={profile?.email ?? ""}
                      readOnly
                      disabled
                      className="bg-zinc-50 text-zinc-400 border-zinc-200 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="avatar-url" className="text-zinc-700 font-medium">
                      Avatar URL
                    </Label>
                    <Input
                      id="avatar-url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="border-amber-200 focus-visible:ring-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-zinc-700 font-medium">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                      className="border-amber-200 focus-visible:ring-amber-400"
                    />
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </Button>

                  <Separator className="my-2 bg-amber-900/10" />

                  {/* Change Password */}
                  <div>
                    <p className="text-sm font-semibold text-zinc-700 mb-3">
                      Change Password
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="current-password" className="text-zinc-700 font-medium">
                          Current Password
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="border-amber-200 focus-visible:ring-amber-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="new-password" className="text-zinc-700 font-medium">
                          New Password
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="border-amber-200 focus-visible:ring-amber-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="confirm-password" className="text-zinc-700 font-medium">
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="border-amber-200 focus-visible:ring-amber-400"
                        />
                      </div>
                      <Button
                        onClick={handleChangePassword}
                        disabled={changingPassword || !currentPassword || !newPassword}
                        variant="outline"
                        className="w-full border-amber-300 text-amber-800 hover:bg-amber-100"
                      >
                        {changingPassword ? "Changing..." : "Change Password"}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ── Health Info Tab ── */}
              <TabsContent value="health">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dob" className="text-zinc-700 font-medium">
                      Date of Birth
                    </Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="border-amber-200 focus-visible:ring-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="height" className="text-zinc-700 font-medium">
                      Height (cm)
                    </Label>
                    <Input
                      id="height"
                      type="number"
                      min="50"
                      max="300"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="e.g. 170"
                      className="border-amber-200 focus-visible:ring-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="weight" className="text-zinc-700 font-medium">
                      Weight (kg)
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      min="10"
                      max="500"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="e.g. 65"
                      className="border-amber-200 focus-visible:ring-amber-400"
                    />
                  </div>

                  {/* BMI Display */}
                  {bmi !== null && bmiCategory !== null && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs text-zinc-500 mb-1 font-medium uppercase tracking-wide">
                        BMI (calculated)
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-zinc-800">
                          {bmi}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${bmiCategory.className}`}
                        >
                          {bmiCategory.label}
                        </span>
                      </div>
                    </div>
                  )}

                  {bmi === null && (heightCm || weightKg) && (
                    <p className="text-xs text-zinc-400 italic">
                      Enter both height and weight to calculate BMI.
                    </p>
                  )}

                  <Button
                    onClick={handleSaveHealth}
                    disabled={saving}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {saving ? "Saving..." : "Save Health Info"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer: Logout */}
        <SheetFooter className="px-6 py-4 border-t border-amber-900/10">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2"
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
