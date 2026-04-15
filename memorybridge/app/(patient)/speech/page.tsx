'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mic, MicOff, Loader2, CheckCircle, Activity, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'

const CHECKIN_KEY = 'checkin_done_date'

function todayString() {
  return new Date().toDateString()
}

export default function SpeechPage() {
  const t = useTranslation()
  const [isRecording, setIsRecording] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<{ wellnessScore: number; transcript: string } | null>(null)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [completedToday, setCompletedToday] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setPatientId(data.user.id)
    })
    // Check if already completed today
    setCompletedToday(localStorage.getItem(CHECKIN_KEY) === todayString())
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

      // Mark check-in as done for today and notify BottomNav
      localStorage.setItem(CHECKIN_KEY, todayString())
      setCompletedToday(true)
      window.dispatchEvent(new Event('checkin-complete'))

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
    <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-6 animate-in fade-in duration-500">
      {/* Completion banner — shown when already done today (and no fresh result) */}
      {completedToday && !result && (
        <div className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-5 py-4 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">Completed today!</p>
            <p className="text-emerald-600 text-xs mt-0.5">You can record again to update your score.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center shadow-sm">
          <Activity className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">{t('speech.title')}</h1>
        <p className="text-lg text-zinc-500 font-medium">{t('speech.description')}</p>
      </div>

      {/* Reading prompt card */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-base font-medium text-amber-900 leading-relaxed italic">
              &ldquo;{t('speech.reading_prompt')}&rdquo;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Record button area */}
      <div className="flex flex-col items-center gap-4 md:bg-white md:rounded-[2.5rem] md:border-2 md:border-amber-100 md:shadow-sm md:py-10 md:px-10">
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
            ? t('speech.analyzing')
            : isRecording
            ? t('speech.recording')
            : t('speech.tap_to_record')}
        </p>
      </div>

      {/* Result card */}
      {result && (
        <Card className="border-2 border-emerald-200 bg-emerald-50 animate-in zoom-in-95 duration-300">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0" />
              <span className="font-bold text-lg text-emerald-800">{t('speech.analysis_complete')}</span>
            </div>
            <div className="text-center py-2">
              <p className="text-sm text-zinc-500 uppercase tracking-widest font-semibold mb-1">
                {t('speech.wellness_score_label')}
              </p>
              <p className={`text-6xl font-black ${scoreColor}`}>{result.wellnessScore}</p>
              <p className="text-zinc-400 text-sm mt-1">{t('speech.out_of_100')}</p>
            </div>
            {result.transcript && (
              <div className="rounded-xl bg-white border border-emerald-100 p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{t('speech.transcript_label')}</p>
                <p className="text-sm text-zinc-700 leading-relaxed">{result.transcript}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-zinc-400 px-4">
        {t('speech.privacy_note')}
      </p>
    </div>
  )
}
