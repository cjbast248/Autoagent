
import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

export const useJarvis = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)

  const addMessage = useCallback((text: string, isUser: boolean) => {
    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      isUser,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, message])
    return message
  }, [])

  const playAudio = useCallback(async (base64Audio: string) => {
    try {
      setIsPlaying(true)
      
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      const blob = new Blob([bytes], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(blob)
      
      const audio = new Audio(audioUrl)
      
      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          setIsPlaying(false)
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        
        audio.onerror = () => {
          setIsPlaying(false)
          URL.revokeObjectURL(audioUrl)
          reject(new Error('Audio playback failed'))
        }
        
        audio.play().catch(reject)
      })
    } catch (error) {
      setIsPlaying(false)
      throw error
    }
  }, [])

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      
      setMediaRecorder(recorder)
      setIsListening(true)
      
      const audioChunks: Blob[] = []
      
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        
        // Convert to base64
        const reader = new FileReader()
        reader.onload = async () => {
          const base64Audio = (reader.result as string).split(',')[1]
          await processVoiceInput(base64Audio)
        }
        reader.readAsDataURL(audioBlob)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        setIsListening(false)
        setMediaRecorder(null)
      }
      
      recorder.start()
    } catch (error) {
      console.error('Error starting voice recording:', error)
      setIsListening(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
  }, [mediaRecorder])

  const processVoiceInput = useCallback(async (audioBase64: string) => {
    setIsLoading(true)
    
    try {
      // Speech to text
      const { data: sttData, error: sttError } = await supabase.functions.invoke('speech-to-text', {
        body: { audio: audioBase64 }
      })
      
      if (sttError) throw sttError
      
      const userText = sttData?.text || 'Nu am înțeles'
      addMessage(userText, true)
      
      // Generate response
      const responses = [
        "Da, Sir. Înțeleg cerința dumneavoastră.",
        "Procesez informația acum, Sir.",
        "Sistemele sunt operaționale, Sir.",
        "Analizez datele în timp real, Sir.",
        "Protocolul este activ, Sir.",
        "Scanez pentru amenințări, Sir. Totul pare în regulă.",
        "Calculez probabilitățile, Sir.",
        "Interfața este stabilă, Sir."
      ]
      
      const response = responses[Math.floor(Math.random() * responses.length)]
      addMessage(response, false)
      
      // Convert to speech with masculine voice
      const { data: ttsData, error: ttsError } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: response, 
          voice: 'onwK4e9ZLuTAKqWW03F9' // Daniel - masculine voice
        }
      })
      
      if (ttsError) throw ttsError
      
      if (ttsData?.audioContent) {
        await playAudio(ttsData.audioContent)
      }
      
    } catch (error) {
      console.error('Error processing voice input:', error)
      addMessage('Scuze, Sir. Am întâmpinat o problemă tehnică.', false)
    } finally {
      setIsLoading(false)
    }
  }, [addMessage, playAudio])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return

    setIsLoading(true)
    
    try {
      addMessage(text, true)
      
      const responses = [
        "Da, Sir. Înțeleg cerința dumneavoastră.",
        "Procesez informația acum, Sir.",
        "Sistemele sunt operaționale, Sir.",
        "Analizez datele în timp real, Sir.",
        "Protocolul este activ, Sir.",
        "Scanez pentru amenințări, Sir. Totul pare în regulă.",
        "Calculez probabilitățile, Sir.",
        "Interfața este stabilă, Sir."
      ]
      
      const response = responses[Math.floor(Math.random() * responses.length)]
      addMessage(response, false)
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: response, 
          voice: 'Gfhrma537MvDQAJskf28' // Daniel - masculine voice
        }
      })
      
      if (error) throw error
      
      if (data?.audioContent) {
        await playAudio(data.audioContent)
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage('Scuze, Sir. Am întâmpinat o problemă tehnică.', false)
    } finally {
      setIsLoading(false)
    }
  }, [addMessage, playAudio])

  return {
    messages,
    isPlaying,
    isLoading,
    isListening,
    sendMessage,
    startListening,
    stopListening,
  }
}
