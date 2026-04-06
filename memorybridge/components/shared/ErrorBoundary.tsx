'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Brain, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-50 p-6 text-center animate-in fade-in duration-500">
          <div className="mb-8 rounded-full bg-emerald-100 p-8 shadow-inner">
            <Brain className="h-20 w-20 text-emerald-600" />
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-zinc-900">
            Ah Ma is resting...
          </h1>
          <p className="mb-10 max-w-sm text-xl font-medium text-zinc-500 leading-relaxed">
            MemoryBridge encountered a small hiccup. Don't worry, we're making sure everything is safe.
          </p>
          <div className="flex w-full max-w-xs flex-col gap-4">
            <Button 
              size="lg" 
              className="h-16 rounded-2xl text-xl font-bold bg-emerald-600 hover:bg-emerald-700"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="mr-2 h-6 w-6" />
              Try Again
            </Button>
            <Link href="/" className="w-full">
              <Button 
                variant="outline" 
                size="lg" 
                className="h-16 w-full rounded-2xl text-xl font-bold"
              >
                <Home className="mr-2 h-6 w-6" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
