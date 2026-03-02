import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, MessageCircle, Loader2 } from 'lucide-react';
import { WidgetSettings } from './WidgetCustomizer';
import { cn } from '@/utils/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FloatingWidgetPreviewProps {
  settings: WidgetSettings;
  messages?: Message[];
  inputMessage?: string;
  isLoading?: boolean;
  onInputChange?: (value: string) => void;
  onSendMessage?: () => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
}

const FloatingWidgetPreview: React.FC<FloatingWidgetPreviewProps> = ({
  settings,
  messages = [],
  inputMessage = '',
  isLoading = false,
  onInputChange,
  onSendMessage,
  onKeyPress
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const getAnimationClass = () => {
    switch (settings.animationType) {
      case 'fade':
        return 'animate-fade-in';
      case 'slide':
        return 'animate-slide-in-right';
      case 'scale':
        return 'animate-scale-in';
      case 'bounce':
        return 'animate-bounce';
      default:
        return '';
    }
  };

  const getButtonAnimationClass = () => {
    switch (settings.buttonAnimation) {
      case 'pulse':
        return 'animate-pulse';
      case 'shake':
        return 'hover:animate-shake';
      default:
        return '';
    }
  };

  const isFunctional = onInputChange && onSendMessage;

  return (
    <div className="fixed z-50" style={{
      bottom: settings.offsetY,
      right: settings.offsetX
    }}>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            getButtonAnimationClass(),
            'flex items-center justify-center shadow-lg transition-all hover:scale-105'
          )}
          style={{
            width: settings.buttonSize,
            height: settings.buttonSize,
            borderRadius: settings.borderRadius,
            backgroundColor: settings.primaryColor,
            color: '#ffffff',
          }}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            getAnimationClass(),
            'shadow-2xl flex flex-col overflow-hidden border'
          )}
          style={{
            width: settings.windowWidth,
            height: settings.windowHeight,
            borderRadius: settings.borderRadius,
            backgroundColor: settings.chatBgColor,
            transitionDuration: `${settings.animationDuration}s`,
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between shrink-0"
            style={{ backgroundColor: settings.primaryColor }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20"
              >
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div className="text-white">
                <div className="font-medium text-sm">Asistent</div>
                <div className="text-xs opacity-70">
                  {isLoading ? 'scrie...' : 'online'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div
                  className="max-w-[85%] px-3 py-2 text-sm"
                  style={{
                    backgroundColor: settings.secondaryColor,
                    color: settings.textColor,
                    borderRadius: settings.borderRadius / 2,
                  }}
                >
                  {settings.welcomeMessage}
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[85%] px-3 py-2 text-sm whitespace-pre-wrap"
                    style={{
                      backgroundColor: msg.role === 'user' ? settings.primaryColor : settings.secondaryColor,
                      color: msg.role === 'user' ? '#ffffff' : settings.textColor,
                      borderRadius: settings.borderRadius / 2,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div
                    className="px-3 py-2"
                    style={{
                      backgroundColor: settings.secondaryColor,
                      borderRadius: settings.borderRadius / 2,
                    }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: settings.textColor }} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t shrink-0" style={{ backgroundColor: settings.chatBgColor }}>
            <div className="flex gap-2">
              <Input
                placeholder={settings.placeholder}
                className="flex-1 text-sm border-0 bg-muted/50 focus-visible:ring-1"
                style={{ borderRadius: settings.borderRadius / 2 }}
                value={inputMessage}
                onChange={(e) => onInputChange?.(e.target.value)}
                onKeyPress={onKeyPress}
                disabled={!isFunctional || isLoading}
              />
              <Button
                size="icon"
                className="shrink-0"
                style={{
                  backgroundColor: settings.primaryColor,
                  borderRadius: settings.borderRadius / 2,
                }}
                onClick={onSendMessage}
                disabled={!isFunctional || isLoading || !inputMessage?.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {settings.showPoweredBy && (
              <p className="text-center text-[10px] text-muted-foreground mt-2 opacity-60">
                Powered by Agentauto
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingWidgetPreview;
