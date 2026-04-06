'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mic, Loader2, CheckCircle, StopCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type RecordingState = 'IDLE' | 'PROMPTING' | 'RECORDING' | 'UPLOADING' | 'DONE'

const RECORDING_DURATION = 60 // seconds
const RECORDING_DATE_KEY = 'daily_recording_date'

export default function DailyRecording() {
  const [recordingState, setRecordingState] = useState<RecordingState>('IDLE')
  const [elapsed, setElapsed] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check if we should show the prompt on mount
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const lastDate = localStorage.getItem(RECORDING_DATE_KEY)
    if (lastDate !== today) {
      setRecordingState('PROMPTING')
    }
  }, [])

  // Countdown timer while recording
  useEffect(() => {
    if (recordingState === 'RECORDING') {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= RECORDING_DURATION) {
            stopRecording()
            return prev + 1
          }
          return prev + 1
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [recordingState])

  const dismiss = () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(RECORDING_DATE_KEY, today)
    setRecordingState('IDLE')
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        await uploadRecording(blob, mimeType)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setElapsed(0)
      setRecordingState('RECORDING')
    } catch {
      toast.error('Could not access microphone. Please check permissions.')
      dismiss()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setRecordingState('UPLOADING')
    }
  }

  const uploadRecording = async (blob: Blob, mimeType: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = mimeType.includes('webm') ? 'webm' : 'ogg'
      const filename = `${user.id}/${new Date().toISOString()}.${ext}`

      const { error } = await supabase.storage
        .from('audio-recordings')
        .upload(filename, blob, { contentType: mimeType })

      if (error) throw error

      // Trigger analysis via the API route (fire-and-forget)
      const { data: urlData } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(filename)

      fetch('/api/speech/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: urlData.publicUrl, patientId: user.id }),
      }).catch(() => {
        // Analysis is best-effort; don't surface errors to patient
      })

      setRecordingState('DONE')
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem(RECORDING_DATE_KEY, today)

      // Auto-dismiss after 2 seconds
      setTimeout(() => setRecordingState('IDLE'), 2000)
    } catch {
      toast.error('Could not save recording. Please try again later.')
      dismiss()
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (recordingState === 'IDLE') return null

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm animate-in zoom-in-95 duration-300">
      <Card className="bg-[#fdfbf7] border-2 border-amber-200 rounded-3xl shadow-2xl overflow-hidden">
        <CardContent className="p-6 text-center space-y-4">

          {/* PROMPTING */}
          {recordingState === 'PROMPTING' && (
            <>
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <Mic className="h-8 w-8 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-amber-900">Good morning! 早上好!</h3>
                <p className="text-base text-zinc-600 leading-snug">
                  Would you like to record your daily check-in? It helps track your wellness.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-2xl h-14 border-zinc-200 text-zinc-600"
                  onClick={dismiss}
                >
                  Maybe later
                </Button>
                <Button
                  className="flex-1 rounded-2xl h-14 bg-amber-600 hover:bg-amber-700 shadow-md text-white"
                  onClick={startRecording}
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Start Recording
                </Button>
              </div>
            </>
          )}

          {/* RECORDING */}
          {recordingState === 'RECORDING' && (
            <>
              <div className="mx-auto w-20 h-20 relative flex items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50 animate-ping" />
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <Mic className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  {formatTime(elapsed)}
                  <span className="text-base font-normal text-zinc-400"> / {formatTime(RECORDING_DURATION)}</span>
                </p>
                <p className="text-sm text-zinc-500">Recording... speak naturally</p>
              </div>
              <Button
                variant="outline"
                className="w-full rounded-2xl h-14 border-zinc-300 text-zinc-700 gap-2"
                onClick={stopRecording}
              >
                <StopCircle className="h-5 w-5 text-red-500" />
                Stop Early
              </Button>
            </>
          )}

          {/* UPLOADING */}
          {recordingState === 'UPLOADING' && (
            <>
              <div className="mx-auto w-16 h-16 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
              </div>
              <p className="text-lg font-medium text-zinc-700">Saving your recording...</p>
            </>
          )}

          {/* DONE */}
          {recordingState === 'DONE' && (
            <>
              <div className="mx-auto w-16 h-16 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-emerald-700">Recording saved!</p>
              <p className="text-sm text-zinc-500">Thank you! See you tomorrow.</p>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
