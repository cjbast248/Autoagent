
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus } from 'lucide-react';

const faqs = [
  {
    id: 1,
    question: "How quickly can I set up my AI agent?",
    answer: "You can have your AI agent up and running in under 3 minutes. Our intuitive builder guides you through the process, and no technical skills are required."
  },
  {
    id: 2,
    question: "What languages does the AI support?",
    answer: "We support 29+ languages with native-level pronunciation and cultural understanding. The AI can seamlessly switch between languages during conversations."
  },
  {
    id: 3,
    question: "Is my data secure and private?",
    answer: "Absolutely. We use bank-grade encryption and comply with GDPR, CCPA, and other privacy regulations. Your data never leaves our secure infrastructure."
  },
  {
    id: 4,
    question: "Can the AI integrate with my existing systems?",
    answer: "Yes! We offer robust APIs and pre-built integrations for popular CRMs, scheduling tools, and business applications. Our team can help with custom integrations."
  },
  {
    id: 5,
    question: "What's the pricing structure?",
    answer: "We offer flexible pricing based on usage. Start with our free trial, then choose from plans starting at $29/month. Enterprise solutions are available for larger organizations."
  },
  {
    id: 6,
    question: "How natural do the conversations sound?",
    answer: "Our AI uses advanced language models trained on millions of conversations. Customers often can't tell they're speaking with an AI rather than a human agent."
  }
];

export const ModernFAQ = () => {
  const [openId, setOpenId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFaq = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Everything you need to know about Agent Automation
          </p>
          
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-3 rounded-xl border-2 focus:border-primary"
            />
          </div>
        </motion.div>

        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="border-2 hover:border-primary/50 transition-colors duration-300">
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-muted/30 transition-colors duration-200"
                >
                  <h3 className="text-lg font-semibold pr-4">
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0">
                    {openId === faq.id ? (
                      <Minus className="w-5 h-5 text-primary" />
                    ) : (
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>
                
                <AnimatePresence>
                  {openId === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredFaqs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No questions found matching your search.</p>
          </div>
        )}
      </div>
    </section>
  );
};
