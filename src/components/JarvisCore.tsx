
import React from 'react'
import { cn } from '@/utils/utils.ts'

interface JarvisCoreProps {
  isActive: boolean
  isPlaying: boolean
  isLoading: boolean
}

export const JarvisCore: React.FC<JarvisCoreProps> = ({ 
  isActive, 
  isPlaying, 
  isLoading 
}) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer ring */}
      <div 
        className={cn(
          "w-64 h-64 rounded-full border-2 transition-all duration-1000",
          isActive ? "border-cyan-400 shadow-cyan-400/50" : "border-gray-600",
          isPlaying && "animate-pulse"
        )}
        style={{
          boxShadow: isActive ? '0 0 50px rgba(34, 211, 238, 0.3)' : 'none'
        }}
      >
        {/* Middle ring */}
        <div 
          className={cn(
            "w-48 h-48 rounded-full border-2 absolute top-8 left-8 transition-all duration-700",
            isActive ? "border-cyan-300 shadow-cyan-300/30" : "border-gray-700"
          )}
          style={{
            boxShadow: isActive ? '0 0 30px rgba(103, 232, 249, 0.2)' : 'none'
          }}
        >
          {/* Inner core */}
          <div 
            className={cn(
              "w-32 h-32 rounded-full absolute top-8 left-8 transition-all duration-500 flex items-center justify-center",
              isActive ? "bg-gradient-to-r from-cyan-500 to-blue-500" : "bg-gray-800",
              isLoading && "animate-spin"
            )}
            style={{
              boxShadow: isActive ? '0 0 40px rgba(34, 211, 238, 0.5)' : 'none'
            }}
          >
            {/* Center dot */}
            <div 
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-300",
                isActive ? "bg-white shadow-white/50" : "bg-gray-500",
                isPlaying && "animate-ping"
              )}
              style={{
                boxShadow: isActive ? '0 0 20px rgba(255, 255, 255, 0.8)' : 'none'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Animated particles */}
      {isActive && (
        <>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-cyan-400 rounded-full animate-pulse"
              style={{
                top: `${50 + 40 * Math.sin((i * Math.PI) / 4)}%`,
                left: `${50 + 40 * Math.cos((i * Math.PI) / 4)}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
