
import React, { useState, useEffect } from 'react'
import { cn } from '@/utils/utils.ts'

interface FloatingWord {
  id: string
  text: string
  x: number
  y: number
  delay: number
}

interface FloatingWordsProps {
  message: string
  isVisible: boolean
}

export const FloatingWords: React.FC<FloatingWordsProps> = ({ message, isVisible }) => {
  const [words, setWords] = useState<FloatingWord[]>([])

  useEffect(() => {
    if (!isVisible || !message) {
      setWords([])
      return
    }

    // Split message into words and create floating elements
    const messageWords = message.split(' ').filter(word => word.length > 2)
    
    const newWords = messageWords.map((word, index) => ({
      id: `${Date.now()}-${index}`,
      text: word,
      x: Math.random() * 80 + 10, // 10% to 90% of screen width
      y: Math.random() * 70 + 15, // 15% to 85% of screen height
      delay: index * 200 // Stagger the animations
    }))

    setWords(newWords)

    // Clear words after animation completes
    const timer = setTimeout(() => {
      setWords([])
    }, 3000)

    return () => clearTimeout(timer)
  }, [message, isVisible])

  if (!isVisible || words.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {words.map((word) => (
        <div
          key={word.id}
          className={cn(
            "absolute text-cyan-400 font-mono font-bold text-lg",
            "transform transition-all duration-1000 ease-out",
            "animate-pulse"
          )}
          style={{
            left: `${word.x}%`,
            top: `${word.y}%`,
            animationDelay: `${word.delay}ms`,
            textShadow: '0 0 10px rgba(34, 211, 238, 0.8)'
          }}
        >
          {word.text}
        </div>
      ))}
    </div>
  )
}
