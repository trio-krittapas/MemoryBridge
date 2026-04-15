"use client";

export const dynamic = "force-dynamic";

import { useChat } from '@ai-sdk/react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendIcon, Music } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { VoiceInput } from '@/components/chat/VoiceInput';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import { createClient } from '@/lib/supabase/client';
import MusicPlayer from '@/components/chat/MusicPlayer';
import DailyRecording from '@/components/chat/DailyRecording';
import { useMusicStore } from '@/lib/spotify/player-state';
import { toast } from 'sonner';

interface SongSuggestion {
  name: string;
  artist: string;
}

export default function ChatPage() {
  const { language } = useLanguage();
  const t = useTranslation();
  const [isInitializing, setIsInitializing] = useState(true);
  const { state, setSuggesting, reset } = useMusicStore();

  // Song suggestion state
  const [songSuggestion, setSongSuggestion] = useState<SongSuggestion | null>(null);
  const [suggestionRequested, setSuggestionRequested] = useState(false);

  const chatConfig = useChat({
    api: '/api/chat',
    body: {
      language
    }
  } as any) as any;
  const { messages, setMessages, input, handleInputChange, handleSubmit, append, isLoading, error } = chatConfig;

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastProcessedMessageId = useRef<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: history } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (history && history.length > 0) {
          const formattedMessages = history.reverse().map(msg => ({
            id: msg.id,
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          }));
          setMessages(formattedMessages as any);
        }
      }
      setIsInitializing(false);
    }
    loadHistory();
  }, [setMessages]);

  useEffect(() => {
    // 1. Scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    // 2. Parse the last assistant message for [PLAY_SONG:] and [SUGGEST_SONG:]
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.id !== lastProcessedMessageId.current) {
      // Handle [PLAY_SONG:]
      const playMatch = lastMessage.content.match(/\[PLAY_SONG:(.*?)\]/);
      if (playMatch) {
        setSuggesting(playMatch[1]);
        lastProcessedMessageId.current = lastMessage.id;
      }

      // Handle [SUGGEST_SONG:]
      const suggestMatch = lastMessage.content.match(/\[SUGGEST_SONG:(.*?)\|?(.*?)\]/);
      if (suggestMatch) {
        setSongSuggestion({ name: suggestMatch[1].trim(), artist: suggestMatch[2]?.trim() ?? '' });
        setSuggestionRequested(false);
        lastProcessedMessageId.current = lastMessage.id;
      }
    }
  }, [messages, isInitializing, setSuggesting]);

  // Handle Post-Song Reminiscence
  useEffect(() => {
    if (state === 'POST_SONG' && !isLoading) {
      append({
        role: 'system',
        content: 'The song has finished. Ask the patient how they felt listening to it or if it brought back any specific memories.'
      });
      reset(); // Back to IDLE after triggering prompt
    }
  }, [state, isLoading, append, reset]);

  const handleVoiceSend = (message: string) => {
    append({ role: 'user', content: message });
  };

  async function handleSongRequest() {
    if (!songSuggestion) return;
    try {
      const res = await fetch('/api/music/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_name: songSuggestion.name,
          artist: songSuggestion.artist || undefined,
          source: 'ai_suggestion',
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuggestionRequested(true);
      toast.success(t('chat.request_success'));
      // Hide card after a short delay
      setTimeout(() => {
        setSongSuggestion(null);
        setSuggestionRequested(false);
      }, 2000);
    } catch {
      toast.error(t('chat.request_error'));
    }
  }

  function handleDismissSuggestion() {
    setSongSuggestion(null);
    setSuggestionRequested(false);
  }

  // Strip both [PLAY_SONG:] and [SUGGEST_SONG:] tags from displayed text
  function cleanMessageContent(content: string): string {
    return content
      .replace(/\[PLAY_SONG:.*?\]/g, '')
      .replace(/\[SUGGEST_SONG:.*?\]/g, '')
      .replace(/\[\w+_SONG:.*?\]/g, '') // Generic fallback for any future song tags
      .trim();
  }

  if (isInitializing) {
    return <div className="flex h-screen items-center justify-center p-4">{t('errors.loading')}</div>;
  }

  // Determine whether to show the suggestion card (only after the last assistant message)
  const lastAssistantIndex = [...messages].reverse().findIndex((m: any) => m.role === 'assistant');
  const lastAssistantMessage =
    lastAssistantIndex !== -1 ? messages[messages.length - 1 - lastAssistantIndex] : null;

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto px-4 md:px-8">
      {/* Chat history — takes up ALL available space */}
      <Card className="flex-1 overflow-hidden border-2 border-amber-900/10 bg-white shadow-lg mb-4">
        <ScrollArea className="h-full w-full p-4 md:p-6">
          <div className="flex flex-col gap-6 w-full" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex justify-center h-full items-center text-zinc-500">
                <p className="text-2xl text-center">{t('chat.welcome')}</p>
              </div>
            )}
            {messages.filter((m: any) => m.role !== 'system').map((m: any) => (
              <div key={m.id}>
                <div
                  className={`flex w-full ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 md:p-6 text-lg md:text-xl font-medium leading-relaxed
                      ${
                        m.role === 'user'
                          ? 'bg-amber-600 text-white rounded-br-sm'
                          : 'bg-zinc-100 text-zinc-900 rounded-bl-sm border-2 border-zinc-200'
                      }`}
                  >
                    {cleanMessageContent(m.content)}
                  </div>
                </div>

                {/* Song suggestion card — rendered right below the last assistant message */}
                {songSuggestion &&
                  lastAssistantMessage?.id === m.id &&
                  m.role === 'assistant' && (
                    <div className="flex justify-start mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="max-w-[85%] w-full rounded-2xl rounded-bl-sm border-2 border-amber-300 bg-amber-50 p-4 space-y-3 shadow-sm">
                        {/* Song info */}
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                            <Music className="h-4 w-4 text-amber-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-zinc-900 leading-snug">
                              &ldquo;{songSuggestion.name}&rdquo;
                              {songSuggestion.artist && (
                                <span className="font-normal text-zinc-600">
                                  {' '}by {songSuggestion.artist}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-zinc-500 mt-0.5">
                              {t('chat.suggestion_prompt')}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        {suggestionRequested ? (
                          <p className="text-sm font-semibold text-green-600 pl-12">
                            {t('chat.requested')} \u2713
                          </p>
                        ) : (
                          <div className="flex gap-2 pl-12">
                            <Button
                              size="sm"
                              onClick={handleSongRequest}
                              className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-sm"
                            >
                              {t('chat.request_song')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleDismissSuggestion}
                              className="h-9 px-4 rounded-xl text-zinc-500 hover:text-zinc-700 font-semibold text-sm"
                            >
                              {t('chat.no_thanks')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))}
            {isLoading && (
              <div className="w-full flex justify-start">
               <div className="max-w-[85%] rounded-2xl p-4 md:p-6 bg-zinc-100 rounded-bl-sm animate-pulse border-2 border-zinc-200">
                 {t('chat.processing')}
               </div>
              </div>
            )}
            {error && (
              <div className="w-full flex justify-start">
                <div className="max-w-[85%] rounded-2xl p-4 md:p-6 bg-red-50 text-red-700 border-2 border-red-200 text-lg font-medium">
                  Sorry, I couldn&apos;t respond just now. Please check that the chat service is running and try again.
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Input section — fixed height, all controls on one row */}
      <form onSubmit={handleSubmit} className="shrink-0 flex gap-2 w-full items-center pb-4">
        {/* Mic button — compact mode */}
        <VoiceInput
          onSend={handleVoiceSend}
          lang={language === 'en' ? 'en-SG' : 'zh-CN'}
          isProcessing={isLoading || state === 'PLAYING'}
          compact={true}
        />

        {/* Text input */}
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={state === 'PLAYING' ? t('chat.music_playing') : t('chat.placeholder')}
          disabled={state === 'PLAYING'}
          className="flex-1 text-lg md:text-lg h-14 md:h-16 rounded-2xl border-2 border-amber-900/20 shadow-sm px-6"
        />

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim() || state === 'PLAYING'}
          className="h-14 w-14 md:h-16 md:w-16 rounded-2xl shadow-sm bg-amber-600 hover:bg-amber-700 shrink-0"
        >
          <SendIcon className="h-6 w-6 md:h-8 md:w-8 text-white" />
          <span className="sr-only">{t('chat.send')}</span>
        </Button>
      </form>

      <MusicPlayer />
      <DailyRecording />
    </div>
  );
}
