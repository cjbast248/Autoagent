import { useEffect, useRef, useState } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';

export function useScrollReveal(direction: Direction = 'up', delay: number = 0) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: number | undefined;
    let fallbackId: number | undefined;
    
    const makeVisible = () => {
      timeoutId = window.setTimeout(() => setIsVisible(true), delay * 1000);
    };

    // If IntersectionObserver is unavailable, show immediately
    if (typeof IntersectionObserver === 'undefined') {
      makeVisible();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          makeVisible();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    // Fallback: if nothing triggered after 800ms, force visible
    fallbackId = window.setTimeout(() => {
      setIsVisible(true);
    }, Math.max(800, delay * 1000));

    return () => {
      if (ref.current) observer.unobserve(ref.current);
      if (timeoutId) window.clearTimeout(timeoutId);
      if (fallbackId) window.clearTimeout(fallbackId);
    };
  }, [delay]);

  return { ref, isVisible };
}