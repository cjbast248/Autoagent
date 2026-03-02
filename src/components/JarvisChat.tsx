
import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TypingAnimation } from '@/components/TypingAnimation'
import { cn } from '@/utils/utils.ts'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

interface JarvisChatProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  isLoading: boolean
  isPlaying: boolean
  isListening: boolean
  onStartListening: () => void
  onStopListening: () => void
}

export const JarvisChat: React.FC<JarvisChatProps> = ({
  messages,
  onSendMessage,
  isLoading,
  isPlaying,
  isListening,
  onStartListening,
  onStopListening
}) => {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    // Auto-scroll dezactivat - utilizatorul controlează scrolling-ul manual
    // messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    // Nu mai fac auto-scroll automat la fiecare mesaj nou
    // scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleVoiceToggle = () => {
    if (isListening) {
      onStopListening()
    } else {
      onStartListening()
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-black/40 backdrop-blur-md rounded-lg border border-cyan-500/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 p-4 border-b border-cyan-500/30">
        <div className="flex items-center justify-between">
          <h3 className="text-cyan-400 font-mono text-lg">JARVIS VOICE INTERFACE</h3>
          <div className="flex items-center gap-2">
            {isPlaying ? (
              <Volume2 className="w-5 h-5 text-cyan-400 animate-pulse" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-500" />
            )}
            <div className={cn(
              "w-3 h-3 rounded-full",
              messages.length > 0 ? "bg-green-400 animate-pulse" : "bg-gray-500"
            )} />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-cyan-400/70 font-mono">
            <p>SISTEM VOCAL ACTIV</p>
            <p className="text-sm mt-2">Apăsați butonul de microfon pentru a vorbi, Sir...</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.isUser ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-xs lg:max-w-md px-4 py-2 rounded-lg font-mono text-sm",
                  message.isUser
                    ? "bg-cyan-600/30 text-cyan-100 border border-cyan-500/50"
                    : "bg-blue-600/30 text-blue-100 border border-blue-500/50"
                )}
              >
                {message.isUser ? (
                  message.text
                ) : (
                  <TypingAnimation 
                    text={message.text} 
                    speed={25}
                  />
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-blue-600/30 text-blue-100 border border-blue-500/50 px-4 py-2 rounded-lg font-mono text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Control */}
      <div className="p-4 border-t border-cyan-500/30">
        <div className="flex items-center justify-center mb-4">
          <Button
            onClick={handleVoiceToggle}
            disabled={isLoading || isPlaying}
            className={cn(
              "w-16 h-16 rounded-full transition-all duration-300",
              isListening 
                ? "bg-red-600 hover:bg-red-700 animate-pulse shadow-red-500/50" 
                : "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/50",
              "border border-cyan-500 shadow-lg"
            )}
            style={{
              boxShadow: isListening ? '0 0 30px rgba(239, 68, 68, 0.5)' : '0 0 30px rgba(34, 211, 238, 0.3)'
            }}
          >
            {isListening ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </Button>
        </div>
        
        <div className="text-center text-cyan-400/60 text-sm font-mono mb-4">
          {isListening ? "ASCULT..." : "APĂSAȚI PENTRU A VORBI"}
        </div>

        {/* Fallback text input - hidden by default */}
        <details className="mt-4">
          <summary className="text-cyan-400/60 text-xs font-mono cursor-pointer">
            Text input (pentru urgențe)
          </summary>
          <form onSubmit={handleSubmit} className="mt-2">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Introduceți comanda..."
                className="flex-1 bg-black/50 border-cyan-500/50 text-cyan-100 placeholder-cyan-400/50 font-mono focus:border-cyan-400"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white border border-cyan-500"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </details>
      </div>
    </div>
  )
}
