'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VoiceInput } from '@/components/chat/VoiceInput'
import { useLanguage } from '@/components/shared/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { RefreshCw, Trophy, Timer, ArrowLeft, Brain, Star } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  { name: 'Animals', prompt: 'Name as many animals as you can!', difficulty: 1 },
  { name: 'Fruits', prompt: 'Name as many different fruits as you can!', difficulty: 1 },
  { name: 'Furniture', prompt: 'Name as many types of furniture as you can!', difficulty: 2 },
  { name: 'Colors', prompt: 'Name as many colors as you can!', difficulty: 2 },
  { name: 'Musical Instruments', prompt: 'Name as many musical instruments as you can!', difficulty: 3 },
  { name: 'Countries', prompt: 'Name as many countries as you can!', difficulty: 3 },
  { name: 'Emotions', prompt: 'Name as many emotions as you can!', difficulty: 4 },
  { name: 'Chemical Elements', prompt: 'Name as many chemical elements as you can!', difficulty: 4 },
  { name: 'Words starting with "S"', prompt: 'Name as many words starting with the letter "S"!', difficulty: 5 },
]

export default function CategoryFluencyExercise() {
  const { language } = useLanguage()
  const [phase, setPhase] = useState<'START' | 'PLAYING' | 'FINISH'>('START')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [timeLeft, setTimeLeft] = useState(60)
  const [responses, setResponses] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [difficulty, setDifficulty] = useState(1)
  
  const supabase = createClient()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function loadDifficultyAndCategory() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: previousScores } = await supabase
        .from('exercise_scores')
        .select('difficulty_level')
        .eq('patient_id', user.id)
        .eq('exercise_type', 'category_fluency')
        .order('completed_at', { ascending: false })
        .limit(1)

      const currentDiff = previousScores && previousScores.length > 0 ? previousScores[0].difficulty_level : 1
      setDifficulty(currentDiff)

      // Time decreases with difficulty: 60, 50, 40, 30, 20
      const timeLimit = 70 - (currentDiff * 10)
      setTimeLeft(timeLimit)

      // Filter categories by difficulty (+/- 1)
      const filtered = CATEGORIES.filter(cat => Math.abs(cat.difficulty - currentDiff) <= 1)
      setCategory(filtered[Math.floor(Math.random() * filtered.length)])
    }

    loadDifficultyAndCategory()
  }, [])

  useEffect(() => {
    if (phase === 'PLAYING' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } else if (phase === 'PLAYING' && timeLeft === 0) {
      handleFinish()
    }
  }, [phase, timeLeft])

  const handleFinish = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('FINISH')
    saveScore(responses.length)
  }

  const handleVoiceInput = (transcript: string) => {
    // Basic deduplication and cleanup
    const words = transcript.toLowerCase().split(/[\s,]+/).filter(w => w.length > 2)
    const newItems = words.filter(w => !responses.includes(w))
    
    if (newItems.length > 0) {
      setResponses(prev => [...prev, ...newItems])
      toast.success(`Registered: ${newItems.join(', ')}`, { duration: 1000 })
    }
  }

  const saveScore = async (finalCount: number) => {
    try {
      const response = await fetch('/api/exercises/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseType: 'category_fluency',
          score: finalCount,
          maxScore: 20, // Baseline "good" score
          details: { category: category.name, items: responses }
        }),
      })

      if (!response.ok) throw new Error('Failed to save score')
      toast.success('Your progress has been saved.')
    } catch (err) {
      console.error('Failed to save score:', err)
      toast.error('Could not save your score.')
    }
  }

  if (phase === 'FINISH') {
    return (
      <div className="container max-w-lg py-10 space-y-10 text-center animate-in zoom-in-95 duration-500">
        <div className="space-y-4">
          <div className="mx-auto w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center">
            <Trophy className="h-12 w-12 text-amber-600" />
          </div>
          <h1 className="text-4xl font-bold">Well Done!</h1>
          <p className="text-xl text-zinc-500">You named {responses.length} {category.name}!</p>
        </div>

        <Card className="bg-zinc-50 border-2 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 bg-zinc-100 border-b flex justify-between items-center">
               <span className="font-bold text-zinc-600">Your List</span>
               <Star className="h-5 w-5 text-amber-500 fill-current" />
            </div>
            <div className="p-6 flex flex-wrap gap-2 justify-center max-h-60 overflow-y-auto">
              {responses.map((item, i) => (
                <span key={i} className="px-4 py-2 bg-white rounded-full border border-zinc-200 text-lg font-medium text-zinc-700 capitalize">
                  {item}
                </span>
              ))}
              {responses.length === 0 && <p className="text-zinc-400 italic">No items recorded</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Button size="lg" className="h-16 text-xl rounded-2xl bg-amber-600" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-6 w-6" />
            Try Again
          </Button>
          <Link href="/exercises">
            <Button variant="outline" size="lg" className="h-16 text-xl rounded-2xl w-full">
              Back to Menu
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-lg py-10 space-y-10 animate-in fade-in duration-500">
      <Link href="/exercises">
        <Button variant="ghost" size="sm" className="text-zinc-500">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      {phase === 'START' && (
        <div className="text-center space-y-12 py-10 animate-in slide-in-from-top-10">
          <div className="space-y-6">
            <div className="mx-auto w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center">
               <Timer className="h-12 w-12 text-amber-600" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{category.name}</h1>
            <p className="text-2xl text-zinc-600 leading-relaxed max-w-xs mx-auto">
              {category.prompt}
            </p>
          </div>
          
          <Button size="lg" className="h-24 w-full rounded-3xl text-3xl font-black bg-amber-600 hover:bg-amber-700 shadow-xl transform transition-transform active:scale-95" onClick={() => setPhase('PLAYING')}>
            START CLOCK
          </Button>
        </div>
      )}

      {phase === 'PLAYING' && (
        <div className="text-center space-y-10 py-10 animate-in zoom-in-95">
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
             <div className="absolute inset-0 border-8 border-zinc-100 rounded-full" />
             <div className={`absolute inset-0 border-8 rounded-full border-t-transparent animate-spin-slow ${timeLeft < 10 ? 'border-red-500' : 'border-amber-500'}`} />
             <div className="flex flex-col items-center">
                <span className={`text-6xl font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-zinc-900'}`}>{timeLeft}</span>
                <span className="text-sm font-bold text-zinc-400 uppercase tracking-tighter">seconds</span>
             </div>
          </div>

          <div className="space-y-4">
             <h2 className="text-2xl font-bold text-amber-700">Category: {category.name}</h2>
             <div className="flex items-center justify-center gap-2 text-zinc-500">
                <Brain className="h-5 w-5" />
                <span className="text-xl font-medium">{responses.length} items found</span>
             </div>
          </div>

          <div className="pt-6">
            <VoiceInput 
              onSend={handleVoiceInput} 
              lang={language === 'en' ? 'en-SG' : 'zh-CN'} 
              isProcessing={false} 
            />
            <p className="mt-8 text-zinc-400 italic">Keep speaking... I'm listening!</p>
          </div>

          <Button variant="ghost" className="text-zinc-400" onClick={handleFinish}>
             Finish Early
          </Button>
        </div>
      )}
    </div>
  )
}
