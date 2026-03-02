import React, { useEffect, useState } from 'react';

interface KalinaWelcomeAnimationProps {
  onComplete: () => void;
}

export const KalinaWelcomeAnimation: React.FC<KalinaWelcomeAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);
  // 0: initial, 1: text appears, 2: line expands, 3: content fades, 4: curtain opens

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),      // Text starts appearing
      setTimeout(() => setPhase(2), 1200),     // Line expands
      setTimeout(() => setPhase(3), 2800),     // Content lifts up elegantly
      setTimeout(() => setPhase(4), 3300),     // Curtain opens
      setTimeout(() => onComplete(), 4000),    // Complete
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Left curtain */}
      <div
        className="absolute top-0 left-0 h-full w-1/2 transition-transform ease-[cubic-bezier(0.76,0,0.24,1)]"
        style={{
          backgroundColor: '#0a0a0a',
          transform: phase >= 4 ? 'translateX(-100%)' : 'translateX(0)',
          transitionDuration: '700ms',
        }}
      />

      {/* Right curtain */}
      <div
        className="absolute top-0 right-0 h-full w-1/2 transition-transform ease-[cubic-bezier(0.76,0,0.24,1)]"
        style={{
          backgroundColor: '#0a0a0a',
          transform: phase >= 4 ? 'translateX(100%)' : 'translateX(0)',
          transitionDuration: '700ms',
        }}
      />

      {/* Center content container */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-all ease-out pointer-events-none"
        style={{
          opacity: phase >= 3 ? 0 : 1,
          transform: phase >= 3 ? 'translateY(-40px) scale(0.95)' : 'translateY(0) scale(1)',
          transitionDuration: '500ms',
        }}
      >
        {/* Subtle gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #141414 0%, #0a0a0a 100%)',
          }}
        />

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* AGENTAUTO text */}
          <h1
            className="text-6xl sm:text-7xl md:text-8xl font-semibold tracking-[0.15em] text-white"
            style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            {'AGENTAUTO'.split('').map((letter, index) => (
              <span
                key={index}
                className="inline-block transition-all duration-700 ease-out"
                style={{
                  opacity: phase >= 1 ? 1 : 0,
                  transform: phase >= 1 ? 'translateY(0)' : 'translateY(25px)',
                  transitionDelay: `${index * 70}ms`,
                }}
              >
                {letter}
              </span>
            ))}
          </h1>

          {/* Animated line under text */}
          <div className="mt-6 h-[2px] bg-white/80 transition-all duration-700 ease-out"
            style={{
              width: phase >= 2 ? '120px' : '0px',
              opacity: phase >= 2 ? 1 : 0,
            }}
          />

          {/* Subtitle */}
          <p
            className="mt-5 text-sm tracking-[0.3em] text-white/50 uppercase transition-all duration-500 ease-out"
            style={{
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? 'translateY(0)' : 'translateY(10px)',
              transitionDelay: '200ms',
            }}
          >
            Voice AI Platform
          </p>
        </div>
      </div>
    </div>
  );
};
