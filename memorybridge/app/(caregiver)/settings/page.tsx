"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link2Icon, Loader2 } from "lucide-react";

export default function CaregiverSettings() {
  const [patientEmail, setPatientEmail] = useState("");
  const [relationship, setRelationship] = useState("parent");
  const [isLoading, setIsLoading] = useState(false);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientEmail.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/caregiver/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientEmail, relationship }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Patient successfully linked!");
        setPatientEmail("");
      } else {
        toast.error(data.error || "Failed to link patient.");
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2Icon className="h-5 w-5" />
            Link Patient Profile
          </CardTitle>
          <CardDescription>
            Enter the email address of the patient you wish to care for. They must already have a MemoryBridge account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patientEmail">Patient Email</Label>
              <Input
                id="patientEmail"
                type="email"
                placeholder="patient@example.com"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Select 
                value={relationship} 
                onValueChange={setRelationship}
                disabled={isLoading}
              >
                <SelectTrigger id="relationship">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="relative">Relative</SelectItem>
                  <SelectItem value="professional">Professional Caregiver</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading || !patientEmail}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Linking..." : "Link Patient"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-xs text-zinc-500 border-t pt-4">
          Once linked, you will be able to view their cognitive trends and conversation history on the dashboard.
        </CardFooter>
      </Card>
    </div>
  );
}
