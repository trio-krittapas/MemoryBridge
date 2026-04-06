"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Add SpeechRecognition types
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

interface UseVoiceInputProps {
  lang?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
}

export function useVoiceInput({ lang = "en-SG", onResult }: UseVoiceInputProps = {}) {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize speech recognition on mount (client-side only)
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError("Speech recognition is not supported in this browser.");
        return;
      }
      
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Stay active even after pauses
        recognition.interimResults = true;
        recognition.lang = lang;
        
        recognitionRef.current = recognition;
      } catch (err) {
        setError("Failed to initialize speech recognition.");
        console.error(err);
      }
    }
    
    return () => {
      // Cleanup
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [lang]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      setError("Speech recognition is not initialized.");
      return;
    }
    
    setError(null);
    setTranscript("");
    
    const recognition = recognitionRef.current;
    
    recognition.onresult = (event) => {
      // Reset silence timeout
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        console.log("Silence detected, stopping...");
        stop();
      }, 2000); // 2 seconds of silence

      let currentTranscript = "";
      let finalTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          currentTranscript += result[0].transcript;
        }
      }
      
      const fullTranscript = finalTranscript || currentTranscript;
      setTranscript(fullTranscript);
      
      if (onResult) {
        onResult(fullTranscript, !!finalTranscript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setError(event.error);
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
    
    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setError("Failed to start listening.");
      setIsListening(false);
    }
  }, [onResult, stop]);

  return { transcript, isListening, start, stop, error };
}
