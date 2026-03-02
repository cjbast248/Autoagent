
import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  target,
  duration = 1000,
  prefix = '',
  suffix = '',
  className = ''
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const increment = target / (duration / 16);
    let currentValue = 0;
    
    const timer = setInterval(() => {
      currentValue += increment;
      if (currentValue >= target) {
        setCurrent(target);
        clearInterval(timer);
      } else {
        setCurrent(Math.floor(currentValue));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return (
    <span className={className}>
      {prefix}{current.toLocaleString()}{suffix}
    </span>
  );
};

export default AnimatedCounter;
