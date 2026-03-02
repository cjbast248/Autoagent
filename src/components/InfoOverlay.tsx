
import React, { useState, useEffect } from 'react'
import { cn } from '@/utils/utils.ts'

interface InfoData {
  title: string
  subtitle?: string
  icon?: string
  color: string
  data?: string[]
}

interface InfoOverlayProps {
  message: string
  isVisible: boolean
}

export const InfoOverlay: React.FC<InfoOverlayProps> = ({ message, isVisible }) => {
  const [currentInfo, setCurrentInfo] = useState<InfoData | null>(null)
  const [showOverlay, setShowOverlay] = useState(false)

  const infoDatabase: Record<string, InfoData> = {
    'sistem': {
      title: 'SISTEM JARVIS',
      subtitle: 'Asistent AI Avançat',
      icon: '🤖',
      color: 'from-cyan-500 to-blue-600',
      data: ['Interfață vocală', 'Procesare în timp real', 'Recunoaștere vocală']
    },
    'securitate': {
      title: 'PROTOCOALE SECURITATE',
      subtitle: 'Nivel Maxim',
      icon: '🛡️',
      color: 'from-green-500 to-emerald-600',
      data: ['Criptare end-to-end', 'Autentificare biometrică', 'Monitoring 24/7']
    },
    'energie': {
      title: 'SISTEM ENERGETIC',
      subtitle: 'Arc Reactor v3.0',
      icon: '⚡',
      color: 'from-yellow-500 to-orange-600',
      data: ['Putere: 8.4 GW', 'Eficiență: 99.7%', 'Autonomie: Nelimitată']
    },
    'scanez': {
      title: 'SCANARE ACTIVĂ',
      subtitle: 'Detectare amenințări',
      icon: '📡',
      color: 'from-red-500 to-pink-600',
      data: ['Raza: 50km', 'Precizie: 99.9%', 'Timp real']
    },
    'analizez': {
      title: 'ANALIZĂ COMPLEXĂ',
      subtitle: 'Procesare date',
      icon: '📊',
  color: 'from-neutral-900 to-neutral-700',
      data: ['Processing: 2.4 PHz', 'Date: 847 TB/s', 'Precizie: 100%']
    },
    'calculez': {
      title: 'CALCULE AVANSATE',
      subtitle: 'Quantum Computing',
      icon: '🔢',
      color: 'from-teal-500 to-cyan-600',
      data: ['Quantum bits: 1024', 'Operații/sec: 10^15', 'Probabilități: Complexe']
    }
  }

  useEffect(() => {
    if (!isVisible || !message) {
      setShowOverlay(false)
      return
    }

    const messageLower = message.toLowerCase()
    const foundKey = Object.keys(infoDatabase).find(key => 
      messageLower.includes(key)
    )

    if (foundKey) {
      setCurrentInfo(infoDatabase[foundKey])
      setShowOverlay(true)
      
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setShowOverlay(false)
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [message, isVisible])

  if (!currentInfo || !showOverlay) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div 
        className={cn(
          "bg-black/80 backdrop-blur-lg border rounded-xl p-6 mx-4 max-w-md w-full",
          "transform transition-all duration-700 ease-out",
          showOverlay 
            ? "scale-100 opacity-100 translate-y-0" 
            : "scale-95 opacity-0 translate-y-8"
        )}
        style={{
          borderImage: `linear-gradient(135deg, ${currentInfo.color.split(' ')[1]}, ${currentInfo.color.split(' ')[3]}) 1`,
          boxShadow: `0 0 30px rgba(34, 211, 238, 0.3)`
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl animate-pulse">
            {currentInfo.icon}
          </div>
          <div>
            <h3 className={cn(
              "text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
              currentInfo.color
            )}>
              {currentInfo.title}
            </h3>
            {currentInfo.subtitle && (
              <p className="text-gray-400 text-sm font-mono">
                {currentInfo.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Data */}
        {currentInfo.data && (
          <div className="space-y-2">
            {currentInfo.data.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 text-cyan-300 font-mono text-sm",
                  "transform transition-all duration-500 ease-out",
                  showOverlay ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                )}
                style={{
                  transitionDelay: `${index * 100 + 200}ms`
                }}
              >
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                {item}
              </div>
            ))}
          </div>
        )}

        {/* Progress bar animation */}
        <div className="mt-4 w-full bg-gray-800 rounded-full h-1 overflow-hidden">
          <div 
            className={cn(
              "h-full bg-gradient-to-r rounded-full transition-all duration-4000 ease-out",
              currentInfo.color,
              showOverlay ? "w-full" : "w-0"
            )}
          />
        </div>
      </div>
    </div>
  )
}
