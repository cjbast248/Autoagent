
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, Settings } from 'lucide-react';

export const InteractiveDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState('restaurant');

  const demos = [
    {
      id: 'restaurant',
      title: 'Restaurant Booking',
      description: 'AI handles table reservations with natural conversation',
      voice: 'Sofia - Professional & Friendly'
    },
    {
      id: 'medical',
      title: 'Medical Appointment',
      description: 'Schedule appointments with HIPAA-compliant AI assistant',
      voice: 'Marcus - Calm & Reassuring'
    },
    {
      id: 'support',
      title: 'Customer Support',
      description: 'Resolve customer issues with intelligent problem-solving',
      voice: 'Alex - Helpful & Efficient'
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Experience AI in{' '}
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Action
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Listen to real conversations between our AI agents and customers. See how natural and effective they are.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Demo Selection */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {demos.map((demo) => (
              <Card
                key={demo.id}
                className={`p-6 cursor-pointer transition-all duration-300 border-2 ${
                  selectedDemo === demo.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedDemo(demo.id)}
              >
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">{demo.title}</h3>
                  <p className="text-muted-foreground">{demo.description}</p>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Volume2 className="w-4 h-4" />
                    {demo.voice}
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>

          {/* Audio Player */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-blue-500/5 border-2">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-semibold mb-2">
                    {demos.find(d => d.id === selectedDemo)?.title}
                  </h3>
                  <p className="text-muted-foreground">
                    Live conversation demo
                  </p>
                </div>

                {/* Waveform Visualization */}
                <div className="h-32 bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 bg-primary/60 rounded-full transition-all duration-150 ${
                          isPlaying ? 'animate-pulse' : ''
                        }`}
                        style={{
                          height: `${Math.random() * 60 + 10}px`,
                          animationDelay: `${i * 50}ms`
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </Button>
                  
                  <Button variant="outline" size="icon" className="rounded-full">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {isPlaying ? 'Playing conversation...' : 'Click play to start demo'}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
