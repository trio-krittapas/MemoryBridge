'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mic, MicOff, Loader2, CheckCircle, Activity } from 'lucide-react'
import { toast } from 'sonner'

export default function SpeechPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<{ wellnessScore: number; transcript: string } | null>(null)
  const [patientId, setPatientId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setPatientId(data.user.id)
    })
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        await analyzeRecording()
      }

      mediaRecorder.start()
      setIsRecording(true)
      setResult(null)
    } catch {
      toast.error('Could not access microphone. Please allow microphone access and try again.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const analyzeRecording = async () => {
    if (!patientId || chunksRef.current.length === 0) return
    setIsAnalyzing(true)

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('file', blob, 'recording.webm')
      formData.append('patientId', patientId)

      const res = await fetch('/api/speech/analyze', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setResult({ wellnessScore: data.wellnessScore, transcript: data.data?.transcript ?? '' })
      toast.success('Speech analysis complete!')
    } catch (err: any) {
      toast.error(err.message || 'Speech analysis failed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const scoreColor =
    result && result.wellnessScore >= 70
      ? 'text-emerald-600'
      : result && result.wellnessScore >= 40
      ? 'text-amber-600'
      : 'text-red-600'

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center shadow-sm">
          <Activity className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">Daily Check-In</h1>
        <p className="text-lg text-zinc-500 font-medium">
          Press the button and read a sentence or two out loud.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 md:bg-white md:rounded-[2.5rem] md:border-2 md:border-amber-100 md:shadow-sm md:py-12 md:px-10">
        {/* Big record button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          className={`w-32 h-32 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 focus:outline-none
            ${isRecording
              ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
              : 'bg-amber-500 hover:bg-amber-600 active:scale-95'
            }
            ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isAnalyzing ? (
            <Loader2 className="h-14 w-14 text-white animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-14 w-14 text-white" />
          ) : (
            <Mic className="h-14 w-14 text-white" />
          )}
        </button>

        <p className="text-base font-medium text-zinc-500">
          {isAnalyzing
            ? 'Analyzing your speech…'
            : isRecording
            ? 'Recording — tap to stop'
            : 'Tap to start recording'}
        </p>
      </div>

      {/* Result card */}
      {result && (
        <Card className="border-2 border-emerald-200 bg-emerald-50 animate-in zoom-in-95 duration-300">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0" />
              <span className="font-bold text-lg text-emerald-800">Analysis complete</span>
            </div>
            <div className="text-center py-2">
              <p className="text-sm text-zinc-500 uppercase tracking-widest font-semibold mb-1">
                Wellness Score
              </p>
              <p className={`text-6xl font-black ${scoreColor}`}>{result.wellnessScore}</p>
              <p className="text-zinc-400 text-sm mt-1">out of 100</p>
            </div>
            {result.transcript && (
              <div className="rounded-xl bg-white border border-emerald-100 p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Transcript</p>
                <p className="text-sm text-zinc-700 leading-relaxed">{result.transcript}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-zinc-400 px-4">
        Your recording is processed and then discarded. Only the score and linguistic metrics are saved.
      </p>
    </div>
  )
}
