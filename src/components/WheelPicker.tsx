import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/utils/utils.ts'

interface WheelPickerProps {
  items: { id: string; name: string }[]
  selectedValue: string
  onSelectionChange: (value: string) => void
  className?: string
}

export const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedValue,
  onSelectionChange,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemHeight = 60
  const visibleItems = 5
  const containerHeight = itemHeight * visibleItems

  // Find initial index
  useEffect(() => {
    const index = items.findIndex(item => item.id === selectedValue)
    if (index !== -1) {
      setCurrentIndex(index)
      setScrollTop(index * itemHeight)
    }
  }, [selectedValue, items])

  // Create iPhone-style tick sound
  const playTickSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // iPhone-style tick: quick high frequency burst
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.05)
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.05)
    } catch (error) {
      // Fallback for browsers without audio context
      console.log('tick')
    }
  }, [])

  // Snap to nearest item with animation
  const snapToNearest = useCallback((targetScrollTop: number) => {
    const targetIndex = Math.round(targetScrollTop / itemHeight)
    const clampedIndex = Math.max(0, Math.min(items.length - 1, targetIndex))
    const finalScrollTop = clampedIndex * itemHeight
    
    if (clampedIndex !== currentIndex) {
      setCurrentIndex(clampedIndex)
      onSelectionChange(items[clampedIndex].id)
      playTickSound()
    }
    
    // Smooth animation to final position
    const startScroll = scrollTop
    const distance = finalScrollTop - startScroll
    const duration = 200
    const startTime = Date.now()
    
    const animateScroll = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease out animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentScroll = startScroll + (distance * easeOut)
      
      setScrollTop(currentScroll)
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      }
    }
    
    requestAnimationFrame(animateScroll)
    return finalScrollTop
  }, [currentIndex, items, onSelectionChange, playTickSound, scrollTop])

  // Handle wheel scroll - slower sensitivity
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    
    // Much slower scroll sensitivity
    const scrollSensitivity = 0.3
    const deltaY = e.deltaY * scrollSensitivity
    const newScrollTop = Math.max(0, Math.min((items.length - 1) * itemHeight, scrollTop + deltaY))
    
    setScrollTop(newScrollTop)
    
    // Debounced snapping after wheel stops
    clearTimeout((window as any).wheelTimeout)
    ;(window as any).wheelTimeout = setTimeout(() => {
      snapToNearest(newScrollTop)
    }, 150)
  }, [scrollTop, items.length, snapToNearest])

  // Handle mouse/touch start
  const handleStart = (clientY: number) => {
    setIsDragging(true)
    setStartY(clientY)
    setVelocity(0)
    // Clear any pending wheel timeout
    clearTimeout((window as any).wheelTimeout)
  }

  // Handle mouse/touch move
  const handleMove = useCallback((clientY: number) => {
    if (!isDragging) return
    
    // Slower drag sensitivity
    const dragSensitivity = 0.5
    const deltaY = (startY - clientY) * dragSensitivity
    const newScrollTop = Math.max(0, Math.min((items.length - 1) * itemHeight, scrollTop + deltaY))
    setScrollTop(newScrollTop)
    setVelocity(deltaY * 0.3) // Reduced velocity for slower momentum
  }, [isDragging, startY, scrollTop, items.length])

  // Handle mouse/touch end
  const handleEnd = useCallback(() => {
    setIsDragging(false)
    
    // Apply reduced momentum and snap
    let finalScrollTop = scrollTop + velocity * 2 // Reduced momentum multiplier
    finalScrollTop = snapToNearest(finalScrollTop)
  }, [scrollTop, velocity, snapToNearest])

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientY)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientY)
  }, [handleMove])

  const handleMouseUp = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY)
  }

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    handleMove(e.touches[0].clientY)
  }, [handleMove])

  const handleTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Add wheel listener
    container.addEventListener('wheel', handleWheel, { passive: false })

    // Add global drag listeners when dragging
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY)
      const handleMouseUp = () => handleEnd()
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        handleMove(e.touches[0].clientY)
      }
      const handleTouchEnd = () => handleEnd()

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [isDragging, handleWheel, handleMove, handleEnd])

  // Render items with iPhone-style fade effect
  const renderItems = () => {
    const centerIndex = scrollTop / itemHeight
    const extendedItems = []
    
    // Create extended list for smooth scrolling
    for (let i = -2; i < items.length + 2; i++) {
      const item = items[i] || { id: '', name: '' }
      const distance = Math.abs(i - centerIndex)
      const isSelected = Math.round(centerIndex) === i
      
      // Calculate opacity and scale based on distance from center
      let opacity = 1
      let scale = 1
      
      if (distance <= 1) {
        opacity = 1 - (distance * 0.7)
        scale = 1 - (distance * 0.2)
      } else if (distance <= 2) {
        opacity = 0.3 - ((distance - 1) * 0.3)
        scale = 0.8 - ((distance - 1) * 0.2)
      } else {
        opacity = 0
        scale = 0.6
      }
      
      extendedItems.push(
        <div
          key={`${item.id}-${i}`}
          className={cn(
            "absolute inset-x-0 flex items-center justify-center font-light transition-all duration-150",
            isSelected ? "text-white text-3xl font-normal" : "text-gray-400 text-2xl"
          )}
          style={{
            height: `${itemHeight}px`,
            top: `${i * itemHeight - scrollTop + containerHeight / 2 - itemHeight / 2}px`,
            opacity: item.name ? opacity : 0,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            zIndex: isSelected ? 10 : 1
          }}
        >
          {item.name}
        </div>
      )
    }
    
    return extendedItems
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          height: `${containerHeight}px`,
          background: 'rgba(0, 0, 0, 0.95)',
          borderRadius: '16px'
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          handleStart(e.clientY)
        }}
        onTouchStart={(e) => {
          handleStart(e.touches[0].clientY)
        }}
      >
        {/* Selection indicator line - subtle like iPhone */}
        <div
          className="absolute inset-x-4 pointer-events-none z-20"
          style={{
            top: `${containerHeight / 2 - itemHeight / 2}px`,
            height: `${itemHeight}px`,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        />
        
        {/* Items container */}
        <div className="relative w-full h-full">
          {renderItems()}
        </div>
      </div>
    </div>
  )
}
