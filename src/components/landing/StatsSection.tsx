
import React from 'react';
import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const stats = [
  {
    number: "99.9%",
    label: "Uptime Guarantee",
    description: "Enterprise-grade reliability"
  },
  {
    number: "< 100ms",
    label: "Response Time",
    description: "Lightning-fast AI processing"
  },
  {
    number: "29+",
    label: "Languages",
    description: "Global communication support"
  },
  {
    number: "10,000+",
    label: "Happy Customers",
    description: "Businesses trust our platform"
  }
];

export const StatsSection = () => {
  const { ref, isVisible } = useScrollReveal('up', 0.3);

  return (
    <section ref={ref} className="py-24 bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Trusted by Industry Leaders
          </h2>
          <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
            Join thousands of businesses that have revolutionized their customer service with our AI platform.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center space-y-4"
            >
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-br from-primary-foreground to-primary-foreground/70 bg-clip-text text-transparent">
                {stat.number}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{stat.label}</h3>
                <p className="text-primary-foreground/70">{stat.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center mt-16"
        >
          <div className="inline-flex items-center gap-8 px-8 py-4 bg-primary-foreground/10 rounded-full backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">All systems operational</span>
            </div>
            <div className="text-sm text-primary-foreground/70">
              Last updated: 2 minutes ago
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
