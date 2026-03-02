import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, MessageSquare, DollarSign, Trash2 } from 'lucide-react';
import { TestCallHistoryItem } from '@/hooks/useTestCallHistory';

interface TestCallHistoryProps {
  history: TestCallHistoryItem[];
  onConversationDoubleClick: (conversationId: string) => void;
  onClearHistory: () => void;
}

const TestCallHistory: React.FC<TestCallHistoryProps> = ({
  history,
  onConversationDoubleClick,
  onClearHistory,
}) => {
  if (history.length === 0) {
    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <History className="w-4 h-4 mr-2" />
            Istoric Test Apeluri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nu există apeluri de test în istoric
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center">
            <History className="w-4 h-4 mr-2" />
            Istoric Test Apeluri
          </span>
          <Button
            onClick={onClearHistory}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            onDoubleClick={() => onConversationDoubleClick(item.conversationId)}
            title="Double-click pentru a deschide conversația"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <MessageSquare className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium">
                  {item.conversationId.slice(0, 8)}...
                </span>
              </div>
              {item.cost && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ${item.cost.toFixed(4)}
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              <div>Agent: {item.agentId}</div>
              <div>Tel: {item.phoneNumber}</div>
              <div>{new Date(item.timestamp).toLocaleString('ro-RO')}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TestCallHistory;