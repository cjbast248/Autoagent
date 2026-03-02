import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import VoiceAIWidget, { Message } from './VoiceAIWidget';

interface AgentTestModalProps {
  agent: any;
  isOpen: boolean;
  onClose: () => void;
}

const AgentTestModal: React.FC<AgentTestModalProps> = ({ agent, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear messages when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
    }
  }, [isOpen]);

  const handleMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  if (!agent || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      {/* Messages and Agent name - fixed bottom right of screen */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end max-w-md">
        {/* Chat messages - appear above agent name, with gradient fade at top */}
        {messages.length > 0 && (
          <div className="relative mb-4 w-full">
            {/* Top gradient fade - creates the fade to transparent effect */}
            <div
              className="absolute top-0 left-0 right-0 h-24 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 30%, rgba(255,255,255,0) 100%)'
              }}
            />

            <div
              className="max-h-[60vh] overflow-y-auto flex flex-col gap-2 pt-20"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`
                .messages-container::-webkit-scrollbar { display: none; }
              `}</style>
              <div className="messages-container flex flex-col gap-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[280px] px-4 py-2.5 rounded-2xl shadow-sm ${
                        msg.isUser
                          ? 'bg-gray-200 text-gray-900 rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* Agent name */}
        <h2 className="text-3xl font-bold text-gray-900 whitespace-nowrap">
          {agent.name}
        </h2>
      </div>

      {/* Close button - fixed top right */}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="fixed top-8 right-8 h-8 w-8 p-0 rounded-full bg-white/80 hover:bg-white shadow-md z-10"
      >
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </Button>

      {/* Voice test area with orbital animation - centered */}
      <div onClick={(e) => e.stopPropagation()}>
        <VoiceAIWidget
          size={200}
          agentId={agent.agent_id || agent.id}
          agentName={agent.name}
          onMessage={handleMessage}
        />
      </div>
    </div>
  );
};

export default AgentTestModal;
