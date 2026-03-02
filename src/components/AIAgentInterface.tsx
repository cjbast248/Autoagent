
import React, { useState } from 'react';
import { useConversation } from '@11labs/react';
import { cn } from '@/utils/utils.ts';

const AIAgentInterface = () => {
  const [isActive, setIsActive] = useState(false);
  
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to AI agent');
    },
    onDisconnect: () => {
      console.log('Disconnected from AI agent');
      setIsActive(false);
    },
    onMessage: (message) => {
      console.log('Message received:', message);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
    }
  });

  const handleStartConversation = async () => {
    if (conversation.status === 'connected') {
      await conversation.endSession();
      setIsActive(false);
    } else {
      try {
        setIsActive(true);
        await conversation.startSession({
          agentId: 'agent_01jwv84ep3ev38y3bgrk22n2hw'
        });
      } catch (error) {
        console.error('Failed to start conversation:', error);
        setIsActive(false);
      }
    }
  };

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="flex items-center justify-center min-h-screen">
      {/* Main Circle with Liquid Glass Effect */}
      <div 
        className="relative cursor-pointer group"
        onClick={handleStartConversation}
      >
        {/* Outer Ring with Liquid Glass */}
        <div 
          className={cn(
            "w-64 h-64 rounded-full border transition-all duration-700 flex items-center justify-center relative overflow-hidden",
            "bg-white/20 backdrop-blur-xl border-white/30 shadow-2xl",
            isActive || isConnected
              ? "shadow-gray-400/40 border-gray-300/40" 
              : "hover:shadow-white/30 hover:border-white/40"
          )}
          style={{
            background: isActive || isConnected 
              ? 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(240,240,240,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 100%)'
          }}
        >
          {/* Glass reflection effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-70" />
          
          {/* Inner Circle with Enhanced Glass Effect */}
          <div 
            className={cn(
              "w-44 h-44 rounded-full border transition-all duration-500 flex items-center justify-center relative overflow-hidden",
              "bg-white/25 backdrop-blur-lg border-white/35 shadow-lg",
              isActive || isConnected
                ? "border-gray-200/50 shadow-gray-300/30" 
                : "border-white/35"
            )}
            style={{
              background: isActive || isConnected 
                ? 'linear-gradient(135deg, rgba(255,255,255,0.30) 0%, rgba(245,245,245,0.20) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)'
            }}
          >
            {/* Inner glass reflection */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60" />
            
            {/* Center Content */}
            <div className="text-center relative z-10">
              <div className={cn(
                "text-lg font-semibold transition-colors duration-300 mb-2",
                isActive || isConnected ? "text-gray-800" : "text-gray-700"
              )}>
                {isSpeaking ? "SPEAKING" : (isConnected ? "LISTENING" : "CLICK TO START")}
              </div>
              {!isConnected && (
                <div className="text-sm text-gray-500">
                  Click to disconnect
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Animated glow effects when active */}
        {(isActive || isConnected) && (
          <>
            {/* Outer glow ring */}
            <div className="absolute inset-0 w-64 h-64 rounded-full bg-gradient-to-r from-gray-300/30 to-gray-200/30 blur-xl animate-pulse" />
            
            {/* Speaking pulse effect */}
            {isSpeaking && (
              <div className="absolute inset-0 w-64 h-64 rounded-full border-2 border-gray-400/50 animate-ping" />
            )}
          </>
        )}

        {/* Floating particles when active */}
        {(isActive || isConnected) && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-gray-400/70 rounded-full animate-pulse"
                style={{
                  top: `${50 + 35 * Math.sin((i * Math.PI) / 3)}%`,
                  left: `${50 + 35 * Math.cos((i * Math.PI) / 3)}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAgentInterface;
