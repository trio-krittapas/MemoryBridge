'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VoiceInput } from '@/components/chat/VoiceInput'
import { useLanguage } from '@/components/shared/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { createClient } from '@/lib/supabase/client'
import { NamingAttemptDetail, normalizeText, validateObjectNamingResponse } from '@/lib/utils/exercise-validation'
import { toast } from 'sonner'
import { RefreshCw, Trophy, Target, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface NamingImage {
  id: number;
  name: string;
  url: string;
  hint: string;
  difficulty: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const TEST_IMAGES: NamingImage[] = [
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
  const t = useTranslation()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [images, setImages] = useState<NamingImage[]>([])
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [, setDifficulty] = useState(1)
  const [imgError, setImgError] = useState(false)
  const [attempts, setAttempts] = useState<NamingAttemptDetail[]>([])

  const currentItem = images[currentIndex]
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    async function loadDifficultyAndItems() {
      let currentDiff = 1

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: previousScores } = await supabase
          .from('exercise_scores')
          .select('difficulty_level')
          .eq('patient_id', user.id)
          .eq('exercise_type', 'object_naming')
          .order('completed_at', { ascending: false })
          .limit(1)

        if (previousScores && previousScores.length > 0) {
          currentDiff = previousScores[0].difficulty_level
        }
      }

      // Get 4 images close to current difficulty
      const filtered = TEST_IMAGES.filter(img => Math.abs(img.difficulty - currentDiff) <= 1)
      const pool = filtered.length >= 4 ? filtered : TEST_IMAGES
      const shuffled = shuffleArray(pool).slice(0, 4)

      if (isMounted) {
        setDifficulty(currentDiff)
        setImages(shuffled)
      }
    }

    loadDifficultyAndItems()

    return () => {
      isMounted = false
    }
  }, [])

  const handleResponse = async (transcript: string) => {
    if (!currentItem) return
    setIsChecking(true)

    const validation = validateObjectNamingResponse(currentItem.name, transcript)
    const isCorrect = validation.isCorrect
    const currentAttempt: NamingAttemptDetail = {
      itemId: currentItem.id,
      target: currentItem.name,
      response: transcript,
      normalizedResponse: normalizeText(transcript),
      isCorrect,
      matchType: validation.matchType,
      matchedCanonical: validation.matchedCanonical,
    }
    const nextAttempts = [...attempts, currentAttempt]
    setAttempts(nextAttempts)

    if (isCorrect) {
      setScore(prev => prev + 1)
      toast.success(t('exercises.correct_well_done'))
    } else {
      toast.error(`${t('exercises.not_quite_prefix')} ${currentItem.name}.`)
    }

    setTimeout(() => {
      if (currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setShowHint(false)
        setImgError(false)
      } else {
        setIsFinished(true)
        saveScore(score + (isCorrect ? 1 : 0), nextAttempts)
      }
      setIsChecking(false)
    }, 1500)
  }

  const saveScore = async (finalScore: number, finalAttempts: NamingAttemptDetail[]) => {
    try {
      const response = await fetch('/api/exercises/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseType: 'object_naming',
          score: finalScore,
          maxScore: images.length,
          details: {
            items: images.map(img => img.name),
            attempts: finalAttempts,
            scoringMode: 'lenient',
          },
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
          <h1 className="text-4xl font-bold">{t('exercises.great_job')}</h1>
          <p className="text-xl text-zinc-500">{t('exercises.completed_naming')}</p>
        </div>

        <Card className="bg-zinc-50 p-8 border-2">
          <div className="space-y-2">
            <p className="text-zinc-500 font-medium uppercase tracking-wider">{t('exercises.your_score')}</p>
            <p className="text-6xl font-black text-zinc-900">{score} / {images.length}</p>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Button size="lg" className="h-16 text-xl rounded-2xl bg-amber-600" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-6 w-6" />
            {t('exercises.try_again')}
          </Button>
          <Link href="/exercises">
            <Button variant="outline" size="lg" className="h-16 text-xl rounded-2xl w-full">
              {t('exercises.back_to_menu')}
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
    <div className="container max-w-lg py-4 md:py-10 space-y-4 md:space-y-8 animate-in fade-in duration-500">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Link href="/exercises">
          <Button variant="ghost" size="sm" className="text-zinc-500">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('exercises.back')}
          </Button>
        </Link>
        <div className="flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-full font-bold text-zinc-600">
          <Target className="h-4 w-4" />
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('exercises.what_is_object')}</h1>
        <p className="text-base md:text-lg text-zinc-500">{t('exercises.look_closely')}</p>
      </div>

      {/* Image — fixed height on mobile, aspect-square on larger screens */}
      <div className="relative h-48 sm:h-64 md:h-auto md:aspect-square w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-zinc-200 group">
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm">
            Image unavailable
          </div>
        ) : (
          <Image
            key={currentItem.id}
            src={currentItem.url}
            alt="Object naming exercise"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 384px, 512px"
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}
        {showHint && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center p-8 text-center animate-in fade-in duration-300">
             <p className="text-xl md:text-2xl font-bold text-zinc-900 leading-relaxed italic">&ldquo;{currentItem.hint}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Mic input + hint button */}
      <div className="space-y-3">
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
            {t('exercises.i_need_hint')}
          </Button>
        )}
      </div>
    </div>
  )
}
