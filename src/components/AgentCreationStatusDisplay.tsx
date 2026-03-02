import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Copy } from 'lucide-react';

interface AgentCreationStatusDisplayProps {
  agentId: string;
  onCopyAgentId: () => void;
}

export const AgentCreationStatusDisplay: React.FC<AgentCreationStatusDisplayProps> = ({
  agentId,
  onCopyAgentId,
}) => {
  if (!agentId) return null;

  return (
    <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-accent font-medium">
            ✅ Agent creat cu succes!
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ID Agent: {agentId}
          </p>
        </div>
        <Button
          onClick={onCopyAgentId}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-accent/30 text-accent hover:bg-accent/10"
        >
          <Copy className="w-4 h-4" />
          Copiază ID
        </Button>
      </div>
    </div>
  );
};

