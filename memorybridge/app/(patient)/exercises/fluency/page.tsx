'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VoiceInput } from '@/components/chat/VoiceInput'
import { useLanguage } from '@/components/shared/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { createClient } from '@/lib/supabase/client'
import { FluencyValidationTraceItem, validateCategoryFluencyTranscript } from '@/lib/utils/exercise-validation'
import { toast } from 'sonner'
import { RefreshCw, Trophy, Timer, ArrowLeft, Brain, Star } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  { name: 'Animals', nameZh: '动物', prompt: 'Name as many animals as you can!', promptZh: '说出尽可能多的动物！', difficulty: 1 },
  { name: 'Fruits', nameZh: '水果', prompt: 'Name as many different fruits as you can!', promptZh: '说出尽可能多的水果！', difficulty: 1 },
  { name: 'Furniture', nameZh: '家具', prompt: 'Name as many types of furniture as you can!', promptZh: '说出尽可能多的家具！', difficulty: 2 },
  { name: 'Colors', nameZh: '颜色', prompt: 'Name as many colors as you can!', promptZh: '说出尽可能多的颜色！', difficulty: 2 },
  { name: 'Musical Instruments', nameZh: '乐器', prompt: 'Name as many musical instruments as you can!', promptZh: '说出尽可能多的乐器！', difficulty: 3 },
  { name: 'Countries', nameZh: '国家', prompt: 'Name as many countries as you can!', promptZh: '说出尽可能多的国家！', difficulty: 3 },
  { name: 'Emotions', nameZh: '情绪', prompt: 'Name as many emotions as you can!', promptZh: '说出尽可能多的情绪！', difficulty: 4 },
  { name: 'Chemical Elements', nameZh: '化学元素', prompt: 'Name as many chemical elements as you can!', promptZh: '说出尽可能多的化学元素！', difficulty: 4 },
  { name: 'Words starting with "S"', nameZh: '以"S"开头的词', prompt: 'Name as many words starting with the letter "S"!', promptZh: '说出尽可能多的以字母"S"开头的词！', difficulty: 5 },
]

export default function CategoryFluencyExercise() {
  const { language } = useLanguage()
  const t = useTranslation()
  const [phase, setPhase] = useState<'START' | 'PLAYING' | 'FINISH'>('START')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [timeLeft, setTimeLeft] = useState(60)
  const [maxTime, setMaxTime] = useState(60)
  const [responses, setResponses] = useState<string[]>([])
  const [, setDifficulty] = useState(1)
  const [filteredOutItems, setFilteredOutItems] = useState<string[]>([])
  const [validationTrace, setValidationTrace] = useState<FluencyValidationTraceItem[]>([])

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
      setMaxTime(timeLimit)

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
    const { valid, invalid, details } = validateCategoryFluencyTranscript(category.name, transcript, responses)

    if (details.length > 0) {
      setValidationTrace(prev => [...prev, ...details])
    }

    if (valid.length > 0) {
      setResponses(prev => [...prev, ...valid])
    }

    if (invalid.length > 0) {
      setFilteredOutItems(prev => Array.from(new Set([...prev, ...invalid])))
    }

    if (valid.length > 0 && invalid.length > 0) {
      toast.success(`Accepted: ${valid.join(', ')}. Filtered out: ${invalid.join(', ')}`, { duration: 1300 })
    } else if (valid.length > 0) {
      toast.success(`Accepted: ${valid.join(', ')}`, { duration: 1000 })
    } else if (invalid.length > 0) {
      toast.info(`Filtered out: ${invalid.join(', ')}`, { duration: 1000 })
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
          maxScore: 20,
          details: {
            category: category.name,
            items: responses,
            validatedItems: responses,
            filteredOutItems,
            validationTrace,
            scoringMode: 'lenient',
          }
        }),
      })

      if (!response.ok) throw new Error('Failed to save score')
      toast.success('Your progress has been saved.')
    } catch (err) {
      console.error('Failed to save score:', err)
      toast.error('Could not save your score.')
    }
  }

  const categoryDisplay = language === 'zh' ? category.nameZh : category.name
  const promptDisplay = language === 'zh' ? category.promptZh : category.prompt

  if (phase === 'FINISH') {
    return (
      <div className="container max-w-lg py-10 space-y-10 text-center animate-in zoom-in-95 duration-500">
        <div className="space-y-4">
          <div className="mx-auto w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center">
            <Trophy className="h-12 w-12 text-amber-600" />
          </div>
          <h1 className="text-4xl font-bold">{t('exercises.well_done')}</h1>
          <p className="text-xl text-zinc-500">
            {t('exercises.you_named')} {responses.length} {categoryDisplay}!
          </p>
        </div>

        <Card className="bg-zinc-50 border-2 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 bg-zinc-100 border-b flex justify-between items-center">
               <span className="font-bold text-zinc-600">{t('exercises.your_list')}</span>
               <Star className="h-5 w-5 text-amber-500 fill-current" />
            </div>
            <div className="p-6 flex flex-wrap gap-2 justify-center max-h-60 overflow-y-auto">
              {responses.map((item, i) => (
                <span key={i} className="px-4 py-2 bg-white rounded-full border border-zinc-200 text-lg font-medium text-zinc-700 capitalize">
                  {item}
                </span>
              ))}
              {responses.length === 0 && <p className="text-zinc-400 italic">{t('exercises.no_items_recorded')}</p>}
            </div>
          </CardContent>
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

  return (
    <div className="container max-w-lg py-4 md:py-10 space-y-4 md:space-y-8 animate-in fade-in duration-500">
      <Link href="/exercises">
        <Button variant="ghost" size="sm" className="text-zinc-500">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('exercises.back')}
        </Button>
      </Link>

      {phase === 'START' && (
        <div className="text-center space-y-8 py-6 animate-in slide-in-from-top-10">
          <div className="space-y-6">
            <div className="mx-auto w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center">
               <Timer className="h-12 w-12 text-amber-600" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{categoryDisplay}</h1>
            <p className="text-2xl text-zinc-600 leading-relaxed max-w-xs mx-auto">
              {promptDisplay}
            </p>
          </div>

          <Button size="lg" className="h-24 w-full rounded-3xl text-3xl font-black bg-amber-600 hover:bg-amber-700 shadow-xl transform transition-transform active:scale-95" onClick={() => setPhase('PLAYING')}>
            {t('exercises.start_clock')}
          </Button>
        </div>
      )}

      {phase === 'PLAYING' && (
        <div className="text-center space-y-4 py-4 animate-in zoom-in-95">
          {/* SVG countdown arc — smaller on mobile */}
          <div className="relative w-36 h-36 md:w-48 md:h-48 mx-auto flex items-center justify-center">
            <svg className="-rotate-90 absolute inset-0 w-full h-full" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="80" fill="none" stroke="#e4e4e7" strokeWidth="12" />
              <circle
                cx="96" cy="96" r="80"
                fill="none"
                stroke={timeLeft < 10 ? '#ef4444' : '#f59e0b'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 80}
                strokeDashoffset={2 * Math.PI * 80 * (1 - (maxTime > 0 ? timeLeft / maxTime : 0))}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className={`text-5xl md:text-6xl font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-zinc-900'}`}>{timeLeft}</span>
              <span className="text-xs md:text-sm font-bold text-zinc-400 uppercase tracking-tighter">seconds</span>
            </div>
          </div>

          <div className="space-y-2">
             <h2 className="text-xl md:text-2xl font-bold text-amber-700">{t('exercises.category_label')}: {categoryDisplay}</h2>
             <div className="flex items-center justify-center gap-2 text-zinc-500">
                <Brain className="h-5 w-5" />
                <span className="text-lg md:text-xl font-medium">{responses.length} {t('exercises.items_found')}</span>
             </div>
          </div>

          {/* Mic button */}
          <div>
            <VoiceInput
              onSend={handleVoiceInput}
              lang={language === 'en' ? 'en-SG' : 'zh-CN'}
              isProcessing={false}
            />
            <p className="mt-2 text-zinc-400 italic text-sm">{t('exercises.keep_speaking')}</p>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="border-2 border-zinc-300 text-zinc-500 hover:bg-zinc-100 hover:border-zinc-400 hover:text-zinc-700 rounded-xl px-10 transition-all"
            onClick={handleFinish}
          >
            {t('exercises.finish_early')}
          </Button>
        </div>
      )}
    </div>
  )
}
