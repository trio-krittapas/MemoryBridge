"use client";

export const dynamic = "force-dynamic";

import { useChat } from '@ai-sdk/react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { VoiceInput } from '@/components/chat/VoiceInput';
import { useLanguage } from '@/components/shared/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import MusicPlayer from '@/components/chat/MusicPlayer';
import DailyRecording from '@/components/chat/DailyRecording';
import { useMusicStore } from '@/lib/spotify/player-state';

export default function ChatPage() {
  const { language } = useLanguage();
  const [isInitializing, setIsInitializing] = useState(true);
  const { state, setSuggesting, reset } = useMusicStore();
  
  const chatConfig = useChat({
    api: '/api/chat',
    body: {
      language
    }
  } as any) as any;
  const { messages, setMessages, input, handleInputChange, handleSubmit, append, isLoading } = chatConfig;

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

    // 2. Parse for [PLAY_SONG:id] in the last message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.id !== lastProcessedMessageId.current) {
      const match = lastMessage.content.match(/\[PLAY_SONG:(.*?)\]/);
      if (match) {
        setSuggesting(match[1]);
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

  if (isInitializing) {
    return <div className="flex h-screen items-center justify-center p-4">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 md:p-8">
      <Card className="flex-1 mb-4 overflow-hidden border-2 border-amber-900/10 bg-white shadow-lg">
        <ScrollArea className="h-full p-4 md:p-6 text-xl">
          <div className="flex flex-col gap-6 w-full" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex justify-center h-full items-center text-zinc-500">
                <p className="text-2xl text-center">Hello! How are you doing today?</p>
              </div>
            )}
            {messages.filter((m: any) => m.role !== 'system').map((m: any) => (
              <div
                key={m.id}
                className={`flex w-full ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 md:p-6 text-xl md:text-2xl font-medium leading-relaxed
                    ${
                      m.role === 'user'
                        ? 'bg-amber-600 text-white rounded-br-sm'
                        : 'bg-zinc-100 text-zinc-900 rounded-bl-sm border-2 border-zinc-200'
                    }`}
                >
                  {m.content.replace(/\[PLAY_SONG:.*?\]/g, '').trim()}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="w-full flex justify-start">
               <div className="max-w-[85%] rounded-2xl p-4 md:p-6 bg-zinc-100 rounded-bl-sm animate-pulse border-2 border-zinc-200">
                 Thinking...
               </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      <div className="flex flex-col gap-4 mb-10">
        <VoiceInput 
          onSend={handleVoiceSend} 
          lang={language === 'en' ? 'en-SG' : 'zh-CN'} 
          isProcessing={isLoading || state === 'PLAYING'} 
        />
        
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={state === 'PLAYING' ? "Music is playing..." : "Type a message..."}
            disabled={state === 'PLAYING'}
            className="flex-1 text-xl md:text-2xl h-16 md:h-20 rounded-2xl border-2 border-amber-900/20 shadow-sm px-6"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim() || state === 'PLAYING'}
            className="h-16 w-16 md:h-20 md:w-20 rounded-2xl shadow-sm bg-amber-600 hover:bg-amber-700"
          >
            <SendIcon className="h-8 w-8 md:h-10 md:w-10 text-white" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>

      <MusicPlayer />
      <DailyRecording />
    </div>
  );
}
