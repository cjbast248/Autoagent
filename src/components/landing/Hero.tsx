import { useEffect, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function Hero() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const titleReveal = useScrollReveal('up', 0.2);
  const descReveal = useScrollReveal('up', 0.3);
  const buttonsReveal = useScrollReveal('up', 0.4);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const childVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <section id="hero" className="relative py-10 pt-24 overflow-hidden min-h-screen flex items-center">
      {/* Dynamic background elements */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`,
          transition: 'transform 0.3s ease-out'
        }}
      >
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full animate-float"></div>
        <div className="absolute top-60 right-32 w-24 h-24 bg-gradient-to-br from-secondary/40 to-primary/40 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-32 w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Centered Content */}
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          <div className="space-y-6">
            <div className="space-y-6">
              <div ref={titleReveal.ref}>
                <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight"
                variants={containerVariants}
                initial="hidden"
                animate={titleReveal.isVisible ? "visible" : "hidden"}
              >
                <motion.span variants={childVariants}>Creează agent </motion.span>
                <motion.span variants={childVariants} className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary animate-gradient">
                  AI
                </motion.span>
                <motion.span variants={childVariants}> în </motion.span>
                <motion.span variants={childVariants} className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary animate-gradient" style={{ animationDelay: '0.5s' }}>
                  3 minute
                </motion.span>
                </motion.h1>
              </div>
              
              <div ref={descReveal.ref}>
                <motion.p
                className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed"
                variants={childVariants}
                initial="hidden"
                animate={descReveal.isVisible ? "visible" : "hidden"}
              >
                Transformă-ți afacerea cu primul angajat digital perfect instruit.
                </motion.p>
              </div>
            </div>
            
            
            <div ref={buttonsReveal.ref}>
              <motion.div
                className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center"
                variants={containerVariants}
                initial="hidden"
                animate={buttonsReveal.isVisible ? "visible" : "hidden"}
              >
                <motion.div variants={childVariants}>
                  <Link to="/auth">
                    <button className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 group text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg animate-pulse">
                      Începe Trial Gratuit
                      <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                    </button>
                  </Link>
                </motion.div>
                
                <motion.div variants={childVariants}>
                  <Link to="/auth">
                    <button className="border border-border bg-background hover:bg-muted text-foreground flex items-center gap-2 group text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-lg transition-all duration-300 hover:scale-105">
                      <span className="group-hover:scale-110 transition-transform duration-300">▶</span>
                      Vizualizează Demo
                    </button>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}