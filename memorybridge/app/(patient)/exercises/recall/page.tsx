'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VoiceInput } from '@/components/chat/VoiceInput'
import { useLanguage } from '@/components/shared/LanguageContext'
import { useTranslation } from '@/hooks/useTranslation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronRight, RefreshCw, Trophy, Brain, ArrowLeft, Volume2 } from 'lucide-react'
import Link from 'next/link'

const WORD_POOL = [
  'Apple', 'Table', 'Penny', 'Cloud', 'Bread', 'River', 'Clock', 'House', 'Grass',
  'Mountain', 'Pencil', 'Orange', 'Street', 'Yellow', 'Forest', 'Bridge', 'Letter',
  'Hammer', 'Bottle', 'Silver', 'Garden', 'Window', 'Mirror', 'Candle', 'Rocket'
]

export default function WordRecallExercise() {
  const { language } = useLanguage()
  const t = useTranslation()
  const [phase, setPhase] = useState<'PRESENT' | 'DELAY' | 'RECALL' | 'FINISH'>('PRESENT')
  const [wordSet, setWordSet] = useState<string[]>([])
  const [recitedWords, setRecitedWords] = useState<string[]>([])
  const [timer, setTimer] = useState(10)
  const [maxTimer, setMaxTimer] = useState(10)
  const [, setDifficulty] = useState(1)

  const supabase = createClient()

  useEffect(() => {
    async function loadDifficultyAndWords() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: previousScores } = await supabase
        .from('exercise_scores')
        .select('difficulty_level')
        .eq('patient_id', user.id)
        .eq('exercise_type', 'word_recall')
        .order('completed_at', { ascending: false })
        .limit(1)

      const currentDiff = previousScores && previousScores.length > 0 ? previousScores[0].difficulty_level : 1
      setDifficulty(currentDiff)

      // Difficulty impacts number of words (3 to 7) and timer (10 to 30)
      const wordCount = 2 + currentDiff
      const delayTime = 5 + (currentDiff * 5)

      const shuffled = [...WORD_POOL].sort(() => 0.5 - Math.random())
      setWordSet(shuffled.slice(0, wordCount))
      setTimer(delayTime)
      setMaxTimer(delayTime)
    }

    loadDifficultyAndWords()
  }, [])

  useEffect(() => {
    if (phase === 'DELAY' && timer > 0) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000)
      return () => clearInterval(interval)
    } else if (phase === 'DELAY' && timer === 0) {
      setPhase('RECALL')
    }
  }, [phase, timer])

  const speakWords = () => {
    const utterance = new SpeechSynthesisUtterance(wordSet.join(', '))
    utterance.lang = language === 'en' ? 'en-SG' : 'zh-CN'
    window.speechSynthesis.speak(utterance)
  }

  const handleRecall = (transcript: string) => {
    const found = wordSet.filter(word =>
      transcript.toLowerCase().includes(word.toLowerCase())
    )
    setRecitedWords(found)

    setTimeout(() => {
      setPhase('FINISH')
      saveScore(found.length, found)
    }, 1500)
  }

  const saveScore = async (count: number, recalled: string[] = []) => {
    try {
      const response = await fetch('/api/exercises/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseType: 'word_recall',
          score: count,
          maxScore: wordSet.length,
          details: { presented: wordSet, recalled }
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
          <div className="mx-auto w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center">
            <Trophy className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold">{t('exercises.excellent_recall')}</h1>
          <p className="text-xl text-zinc-500">
            {t('exercises.remembered_out_of')
              .replace('{count}', String(recitedWords.length))
              .replace('{total}', String(wordSet.length))}
          </p>
        </div>

        <div className="grid gap-4">
          {wordSet.map(word => (
            <div key={word} className={`p-4 rounded-xl border-2 flex justify-between items-center ${recitedWords.includes(word) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-100 bg-zinc-50 text-zinc-400'}`}>
              <span className="text-2xl font-bold">{word}</span>
              {recitedWords.includes(word) ? <span className="font-bold">✓</span> : <span className="font-bold">✗</span>}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <Button size="lg" className="h-16 text-xl rounded-2xl bg-emerald-600" onClick={() => window.location.reload()}>
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
    <div className="container max-w-lg py-10 space-y-10 animate-in fade-in duration-500">
      <Link href="/exercises">
        <Button variant="ghost" size="sm" className="text-zinc-500">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('exercises.back')}
        </Button>
      </Link>

      {phase === 'PRESENT' && (
        <div className="text-center space-y-8 py-10 animate-in slide-in-from-top-10">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{t('exercises.remember_these_words')}</h1>
            <p className="text-xl text-zinc-500">{t('exercises.take_deep_breath')}</p>
          </div>

          <div className="grid gap-6">
            {wordSet.map((word, i) => (
              <Card key={word} className="border-2 border-zinc-100 shadow-lg animate-in zoom-in-95" style={{ animationDelay: `${i * 200}ms` }}>
                <CardContent className="p-10 text-4xl font-black text-emerald-600">{word}</CardContent>
              </Card>
            ))}
          </div>

          <div className="pt-6 space-y-4">
            <Button size="lg" variant="secondary" className="h-16 px-10 rounded-2xl text-xl" onClick={speakWords}>
              <Volume2 className="mr-3 h-8 w-8" />
              {t('exercises.listen')}
            </Button>
            <Button size="lg" className="h-20 w-full rounded-2xl text-2xl bg-emerald-600" onClick={() => setPhase('DELAY')}>
              {t('exercises.ive_got_them')}
              <ChevronRight className="ml-2 h-8 w-8" />
            </Button>
          </div>
        </div>
      )}

      {phase === 'DELAY' && (
        <div className="text-center space-y-12 py-20 animate-in fade-in">
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('exercises.wait_a_moment')}</h1>
            <p className="text-xl text-zinc-500">{t('exercises.recall_in_mind')}</p>
          </div>
          {/* SVG countdown arc — depletes as timer counts down */}
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            <svg className="-rotate-90 absolute inset-0" width="192" height="192" viewBox="0 0 192 192">
              {/* Track */}
              <circle cx="96" cy="96" r="80" fill="none" stroke="#e4e4e7" strokeWidth="12" />
              {/* Progress arc */}
              <circle
                cx="96" cy="96" r="80"
                fill="none"
                stroke="#10b981"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 80}
                strokeDashoffset={2 * Math.PI * 80 * (1 - (maxTimer > 0 ? timer / maxTimer : 0))}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <span className="text-6xl font-black text-emerald-600">{timer}</span>
          </div>
        </div>
      )}

      {phase === 'RECALL' && (
        <div className="text-center space-y-10 py-10 animate-in slide-in-from-bottom-10">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">{t('exercises.tell_me_words')}</h1>
            <p className="text-xl text-zinc-500">{t('exercises.say_all_words')}</p>
          </div>

          <div className="bg-zinc-100 rounded-3xl p-10 h-40 flex items-center justify-center border-2 border-zinc-200 border-dashed">
             <Brain className="h-16 w-16 text-zinc-300 animate-pulse" />
          </div>

          <div className="pt-6">
            <VoiceInput
              onSend={handleRecall}
              lang={language === 'en' ? 'en-SG' : 'zh-CN'}
              isProcessing={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}
