import React, { useEffect, useRef } from 'react';

interface LiquidWaveAnimationProps {
  size?: number;
  className?: string;
}

const LiquidWaveAnimation: React.FC<LiquidWaveAnimationProps> = ({
  size = 200,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const settings = {
      speed: 0.02,
      lines: 3,
      baseRadius: size * 0.2,
      amplitude: size * 0.05,
      gap: size * 0.083,
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      for (let j = 0; j < settings.lines; j++) {
        ctx.beginPath();

        const opacity = 1 - j * 0.25;
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 1.5;

        for (let i = 0; i <= 360; i++) {
          const angle = (i * Math.PI) / 180;
          const noise =
            Math.sin(angle * 3 + timeRef.current + j) *
            Math.cos(angle * 2 - timeRef.current);
          const currentRadius =
            settings.baseRadius +
            j * settings.gap +
            noise * settings.amplitude;

          const x = centerX + Math.cos(angle) * currentRadius;
          const y = centerY + Math.sin(angle) * currentRadius;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.stroke();
      }

      timeRef.current += settings.speed;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size]);

  return (
    <div
      className={`relative flex items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, backgroundColor: '#000000' }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute inset-0"
      />
      {/* Central button */}
      <div
        className="relative z-10 flex items-center justify-center rounded-full bg-black border-2 border-white transition-all duration-500 hover:bg-white group cursor-pointer"
        style={{
          width: size * 0.35,
          height: size * 0.35,
          boxShadow: '0 0 15px rgba(255, 255, 255, 0.2)',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white group-hover:text-black transition-colors duration-500"
          style={{ width: size * 0.12, height: size * 0.12 }}
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
    </div>
  );
};

export default LiquidWaveAnimation;
