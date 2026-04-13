'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Brain, MessageSquare, Timer, ArrowRight, Activity } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'

const EXERCISES = [
  {
    id: 'naming',
    titleKey: 'exercises.naming',
    description: 'Name the object shown in the image.',
    icon: Brain,
    color: 'bg-emerald-500',
    href: '/exercises/naming'
  },
  {
    id: 'recall',
    titleKey: 'exercises.recall',
    description: 'Remember the words mentioned earlier.',
    icon: MessageSquare,
    color: 'bg-purple-500',
    href: '/exercises/recall'
  },
  {
    id: 'fluency',
    titleKey: 'exercises.fluency',
    description: 'Name as many items in a category as you can.',
    icon: Timer,
    color: 'bg-amber-500',
    href: '/exercises/fluency'
  }
]

export default function ExerciseSelectionPage() {
  const t = useTranslation()

  return (
    <div className="w-full max-w-lg md:max-w-2xl mx-auto px-4 md:px-8 py-10 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-black tracking-tight text-zinc-900">{t('exercises.title')}</h1>
        <p className="text-xl text-zinc-500 font-medium">Let's keep your mind sharp and active!</p>
      </div>

      <div className="grid gap-6">
        {EXERCISES.map((ex) => (
          <Link href={ex.href} key={ex.id}>
            <Card className="hover:shadow-2xl transition-all border-2 active:scale-95 group rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-0 flex h-32 md:h-40">
                <div className={`${ex.color} w-32 md:w-40 flex items-center justify-center`}>
                  <ex.icon className="h-12 w-12 md:h-14 md:w-14 text-white" />
                </div>
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                  <h2 className="text-2xl font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">
                    {t(ex.titleKey)}
                  </h2>
                  <p className="text-zinc-500 font-medium line-clamp-1">{ex.description}</p>
                </div>
                <div className="w-12 flex items-center justify-center text-zinc-300">
                  <ArrowRight className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="bg-zinc-100/50 border-dashed border-2 rounded-[2rem] p-6 text-center">
         <div className="flex justify-center mb-2">
            <Activity className="h-6 w-6 text-emerald-500" />
         </div>
         <p className="text-zinc-500 font-bold">Your progress is automatically shared with your caregiver.</p>
      </Card>
    </div>
  )
}
