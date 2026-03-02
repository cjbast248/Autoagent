
import React from 'react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Clock, 
  Globe, 
  Shield, 
  Zap, 
  BarChart3,
  MessageSquare,
  Settings,
  Users
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: "Advanced AI Technology",
    description: "Powered by cutting-edge language models for natural, human-like conversations",
    color: "text-blue-500"
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Your AI agents work around the clock, never missing a call or opportunity",
    color: "text-green-500"
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description: "Communicate with customers in 29+ languages with perfect pronunciation",
    color: "text-purple-500"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade security with end-to-end encryption for all conversations",
    color: "text-orange-500"
  },
  {
    icon: Zap,
    title: "Instant Setup",
    description: "Deploy your AI agent in under 3 minutes with our intuitive builder",
    color: "text-yellow-500"
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Detailed insights and performance metrics for continuous improvement",
    color: "text-pink-500"
  },
  {
    icon: MessageSquare,
    title: "Natural Conversations",
    description: "Context-aware AI that understands nuance and responds appropriately",
    color: "text-indigo-500"
  },
  {
    icon: Settings,
    title: "Full Customization",
    description: "Tailor your agent's personality, voice, and behavior to match your brand",
    color: "text-teal-500"
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Built-in tools for team management and performance tracking",
    color: "text-red-500"
  }
];

export const FeaturesGrid = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Scale Your Business
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our comprehensive AI platform provides all the tools you need to automate customer interactions and grow your business.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 h-full hover:shadow-lg transition-all duration-300 group cursor-pointer border-2 hover:border-primary/20">
                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${feature.color}/10 to-${feature.color}/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  
                  <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
