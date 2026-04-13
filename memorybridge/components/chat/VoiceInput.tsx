"use client";

import React, { useEffect, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/lib/speech/recognition";
import { Button } from "@/components/ui/button";

interface VoiceInputProps {
  onSend: (message: string) => void;
  lang?: string;
  isProcessing?: boolean;
  compact?: boolean;
}

export function VoiceInput({ onSend, lang = "en-SG", isProcessing = false, compact = false }: VoiceInputProps) {
  const { transcript, isListening, start, stop, error } = useVoiceInput({ lang });
  const [interimText, setInterimText] = useState("");

  // Sync the hook's transcript state locally to show interim text
  useEffect(() => {
    setInterimText(transcript);
  }, [transcript]);

  // Handle auto-send when listening ends with text recorded
  useEffect(() => {
    if (!isListening && interimText.trim() && !isProcessing) {
      onSend(interimText.trim());
      setInterimText("");
    }
  }, [isListening, interimText, onSend, isProcessing]);

  const toggleListening = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  // Compact mode: just the button, no interim text or labels
  if (compact) {
    return (
      <Button
        type="button"
        onClick={toggleListening}
        disabled={isProcessing}
        variant="outline"
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-300 shrink-0",
          "w-14 h-14 md:h-16 shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2",
          // Visual states: Idle, Listening, Processing
          isProcessing
            ? "bg-yellow-100 border-yellow-400 text-yellow-600 hover:bg-yellow-200"
            : isListening
            ? "border-green-500 bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-zinc-100 border-zinc-300 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
        )}
        aria-label={isListening ? "Stop listening" : "Start listening"}
        title={isListening ? "Stop listening" : "Start listening"}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
        ) : isListening ? (
          <Mic className="w-5 h-5 md:w-6 md:h-6" />
        ) : (
          <MicOff className="w-5 h-5 md:w-6 md:h-6" />
        )}

        {/* Pulsing ring animation when listening */}
        {isListening && !isProcessing && (
          <span className="absolute inset-0 rounded-full animate-ping border-2 border-green-400 opacity-75 duration-1000"></span>
        )}
      </Button>
    );
  }

  // Full mode: button with interim text and labels below
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-4 w-full">
      {/* Display error if any */}
      {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

      {/* Interim text display */}
      <div className="min-h-[3rem] px-4 w-full max-w-lg text-center">
        {interimText && (
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-300 animate-pulse">
            "{interimText}"
          </p>
        )}
      </div>

      {/* Mic Button */}
      <Button
        type="button"
        onClick={toggleListening}
        disabled={isProcessing}
        variant="outline"
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-300",
          "w-20 h-20 md:w-24 md:h-24 shadow-lg focus-visible:ring-4 focus-visible:ring-offset-4",
          // Visual states: Idle, Listening, Processing
          isProcessing
            ? "bg-yellow-100 border-yellow-400 text-yellow-600 hover:bg-yellow-200"
            : isListening
            ? "border-green-500 bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-zinc-100 border-zinc-300 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
        )}
        aria-label={isListening ? "Stop listening" : "Start listening"}
      >
        {isProcessing ? (
          <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin" />
        ) : isListening ? (
          <Mic className="w-8 h-8 md:w-10 md:h-10" />
        ) : (
          <MicOff className="w-8 h-8 md:w-10 md:h-10" />
        )}

        {/* Pulsing ring animation and effects when listening */}
        {isListening && !isProcessing && (
          <span className="absolute inset-0 rounded-full animate-ping border-2 border-green-400 opacity-75 duration-1000"></span>
        )}
      </Button>

      {/* Labels for accessibility and user instruction */}
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {isProcessing ? "Processing..." : isListening ? "Listening... (Tap to stop)" : "Tap to Speak"}
      </p>
    </div>
  );
}
