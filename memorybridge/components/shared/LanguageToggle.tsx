"use client";

import { useLanguage } from "./LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage, isLoading } = useLanguage();

  const toggleLanguage = async () => {
    const newLang = language === "en" ? "zh" : "en";
    await setLanguage(newLang);
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center gap-2 rounded-full px-4 w-28 text-base shadow-sm">
        <Globe className="w-5 h-5 text-zinc-300 animate-spin" />
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={toggleLanguage}
      className="flex items-center gap-2 rounded-full px-4 text-base font-medium shadow-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <Globe className="w-5 h-5 text-zinc-500" />
      <span>{language === "en" ? "English" : "中文"}</span>
    </Button>
  );
}
