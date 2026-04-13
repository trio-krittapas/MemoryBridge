'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VoiceInput } from '@/components/chat/VoiceInput'
import { useLanguage } from '@/components/shared/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronRight, RefreshCw, Trophy, Target, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const TEST_IMAGES = [
  { id: 1, name: 'Durian', url: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=500&q=80', hint: 'The king of fruits, known for its strong smell.', difficulty: 1 },
  { id: 2, name: 'Merlion', url: 'https://images.unsplash.com/photo-1525625230556-8e8d85520cfc?w=500&q=80', hint: 'Iconic statue in Singapore with a lion head and fish body.', difficulty: 1 },
  { id: 3, name: 'Satay', url: 'https://images.unsplash.com/photo-1534939561126-755ecf1d5d36?w=500&q=80', hint: 'Grilled skewered meat served with peanut sauce.', difficulty: 2 },
  { id: 4, name: 'Bicycle', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500&q=80', hint: 'Has two wheels and pedals.', difficulty: 2 },
  { id: 5, name: 'Kopitiam', url: 'https://images.unsplash.com/photo-1582213719003-8e85489f074d?w=500&q=80', hint: 'Traditional Singaporean coffee shop.', difficulty: 3 },
  { id: 6, name: 'Chilli Crab', url: 'https://images.unsplash.com/photo-1621293954908-d51442bb7d61?w=500&q=80', hint: 'Famous Singaporean seafood dish in a spicy sauce.', difficulty: 3 },
  { id: 7, name: 'Abacus', url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&q=80', hint: 'Old tool for counting.', difficulty: 4 },
  { id: 8, name: 'Phonograph', url: 'https://images.unsplash.com/photo-1545594119-943cc9794e24?w=500&q=80', hint: 'Plays music from records.', difficulty: 5 },
]

export default function NamingExercise() {
  const { language } = useLanguage()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [images, setImages] = useState<any[]>([])
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [difficulty, setDifficulty] = useState(1)
  
  const currentItem = images[currentIndex]
  const supabase = createClient()

  useEffect(() => {
    async function loadDifficultyAndItems() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: previousScores } = await supabase
        .from('exercise_scores')
        .select('difficulty_level')
        .eq('patient_id', user.id)
        .eq('exercise_type', 'object_naming')
        .order('completed_at', { ascending: false })
        .limit(1)

      const currentDiff = previousScores && previousScores.length > 0 ? previousScores[0].difficulty_level : 1
      setDifficulty(currentDiff)

      // Get 4 images close to current difficulty
      const filtered = TEST_IMAGES.filter(img => Math.abs(img.difficulty - currentDiff) <= 1)
      const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 4)
      setImages(shuffled)
    }

    loadDifficultyAndItems()
  }, [])

  const handleResponse = async (transcript: string) => {
    if (!currentItem) return
    setIsChecking(true)
    
    const isCorrect = transcript.toLowerCase().includes(currentItem.name.toLowerCase())
    
    if (isCorrect) {
      setScore(prev => prev + 1)
      toast.success('Correct! Well done.')
    } else {
      toast.error(`Not quite! That was a ${currentItem.name}.`)
    }

    setTimeout(() => {
      if (currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setShowHint(false)
      } else {
        setIsFinished(true)
        saveScore(score + (isCorrect ? 1 : 0))
      }
      setIsChecking(false)
    }, 1500)
  }

  const saveScore = async (finalScore: number) => {
    try {
      const response = await fetch('/api/exercises/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseType: 'object_naming',
          score: finalScore,
          maxScore: images.length,
          details: { items: images.map(img => img.name) }
        }),
      })

      if (!response.ok) throw new Error('Failed to save score')
      
      toast.success('Your progress has been saved.')
    } catch (err) {
      console.error('Failed to save score:', err)
      toast.error('Could not save your score.')
    }
  }

  if (isFinished) {
    return (
      <div className="container max-w-lg py-10 space-y-10 text-center animate-in zoom-in-95 duration-500">
        <div className="space-y-4">
          <div className="mx-auto w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center">
            <Trophy className="h-12 w-12 text-amber-600" />
          </div>
          <h1 className="text-4xl font-bold">Great Job!</h1>
          <p className="text-xl text-zinc-500">You completed the Object Naming exercise.</p>
        </div>

        <Card className="bg-zinc-50 p-8 border-2">
          <div className="space-y-2">
            <p className="text-zinc-500 font-medium uppercase tracking-wider">Your Score</p>
            <p className="text-6xl font-black text-zinc-900">{score} / {images.length}</p>
          </div>
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

  if (!currentItem) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="container max-w-lg py-10 space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link href="/exercises">
          <Button variant="ghost" size="sm" className="text-zinc-500">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-full font-bold text-zinc-600">
          <Target className="h-4 w-4" />
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">What is this object?</h1>
        <p className="text-lg text-zinc-500">Look closely at the image below.</p>
      </div>

      <div className="relative aspect-square w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-zinc-200 group">
        <Image 
          src={currentItem.url} 
          alt="Object naming exercise" 
          fill 
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {showHint && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center p-8 text-center animate-in fade-in duration-300">
             <p className="text-2xl font-bold text-zinc-900 leading-relaxed italic">"{currentItem.hint}"</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <VoiceInput 
          onSend={handleResponse} 
          lang={language === 'en' ? 'en-SG' : 'zh-CN'} 
          isProcessing={isChecking} 
        />
        
        {!showHint && (
          <Button 
            variant="link" 
            className="w-full text-amber-600 text-lg font-bold" 
            onClick={() => setShowHint(true)}
          >
            I need a hint
          </Button>
        )}
      </div>
    </div>
  )
}
