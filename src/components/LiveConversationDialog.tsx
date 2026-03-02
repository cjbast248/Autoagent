import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Clock, DollarSign } from 'lucide-react';

interface ConversationMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationState {
  status: 'idle' | 'calling' | 'active' | 'completed' | 'failed';
  messages: ConversationMessage[];
  duration?: number;
  cost?: number;
}

interface LiveConversationDialogProps {
  conversation: ConversationState;
  isVisible: boolean;
}

export const LiveConversationDialog: React.FC<LiveConversationDialogProps> = ({
  conversation,
  isVisible
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll la mesajele noi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  if (!isVisible) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'calling': return 'bg-yellow-500';
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'calling': return 'Connecting...';
      case 'active': return 'Active Call';
      case 'completed': return 'Call Completed';
      case 'failed': return 'Call Failed';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'calling':
      case 'active':
        return <Phone className="h-3 w-3" />;
      case 'completed':
      case 'failed':
        return <PhoneOff className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`${getStatusColor(conversation.status)} text-white border-0`}
          >
            {getStatusIcon(conversation.status)}
            {getStatusText(conversation.status)}
          </Badge>
        </div>
        
        {(conversation.duration || conversation.cost) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {conversation.duration && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.round(conversation.duration)}s
              </div>
            )}
            {conversation.cost && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${conversation.cost.toFixed(4)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <Card className="p-0 h-[400px] overflow-hidden">
        <div className="h-full overflow-y-auto p-4 space-y-3">
          {conversation.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {conversation.status === 'calling' ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Waiting for conversation to start...
                </div>
              ) : (
                'No messages yet'
              )}
            </div>
          ) : (
            conversation.messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="font-medium text-xs mb-1 opacity-70">
                    {message.type === 'user' ? 'You' : 'Agent'}
                  </div>
                  {message.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card>
    </div>
  );
};