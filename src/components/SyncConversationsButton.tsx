import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useSyncConversations } from '@/hooks/useSyncConversations';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SyncConversationsButtonProps {
  agentId?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showStatus?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export const SyncConversationsButton: React.FC<SyncConversationsButtonProps> = ({
  agentId,
  variant = 'outline',
  size = 'sm',
  showStatus = true,
  iconOnly = false,
  className = ''
}) => {
  const { syncStatus, triggerSync, isSyncing, statusLoading, getAgentSyncStatus } = useSyncConversations(agentId);

  const currentStatus = agentId
    ? getAgentSyncStatus(agentId)
    : syncStatus?.[0];

  const iconSize = iconOnly ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const getStatusIcon = () => {
    if (isSyncing) {
      return <RefreshCw className={`${iconSize} animate-spin`} />;
    }
    if (!currentStatus) {
      return <RefreshCw className={iconSize} />;
    }

    switch (currentStatus.last_sync_status) {
      case 'completed':
        return <CheckCircle className={`${iconSize} text-emerald-500`} />;
      case 'failed':
        return <AlertCircle className={`${iconSize} text-red-500`} />;
      case 'in_progress':
        return <RefreshCw className={`${iconSize} animate-spin`} />;
      default:
        return <Clock className={`${iconSize} text-zinc-400`} />;
    }
  };

  const getStatusText = () => {
    if (isSyncing) return 'Se sincronizează...';
    if (!currentStatus?.last_sync_at) return 'Nesincronizat';

    const lastSync = new Date(currentStatus.last_sync_at);
    return formatDistanceToNow(lastSync, { addSuffix: true, locale: ro });
  };

  const getTooltipText = () => {
    if (isSyncing) return 'Sincronizare în curs...';
    if (!currentStatus) return 'Click pentru a sincroniza conversațiile din ElevenLabs';

    const lines = [
      `Status: ${currentStatus.last_sync_status}`,
    ];

    if (currentStatus.last_sync_at) {
      lines.push(`Ultima sincronizare: ${getStatusText()}`);
    }

    if (currentStatus.conversations_synced > 0) {
      lines.push(`Conversații sincronizate: ${currentStatus.conversations_synced}`);
    }

    if (currentStatus.conversations_total > 0) {
      lines.push(`Total conversații: ${currentStatus.conversations_total}`);
    }

    if (currentStatus.error_message) {
      lines.push(`Eroare: ${currentStatus.error_message}`);
    }

    return lines.join('\n');
  };

  const handleSync = () => {
    if (!isSyncing) {
      triggerSync(agentId);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${className}`}>
            <Button
              variant={variant}
              size={iconOnly ? 'icon' : size}
              onClick={handleSync}
              disabled={isSyncing || statusLoading}
              className={iconOnly ? 'h-7 w-7 p-0' : 'gap-2'}
            >
              {getStatusIcon()}
              {!iconOnly && <span>Sincronizează</span>}
            </Button>
            {showStatus && !iconOnly && currentStatus?.last_sync_at && (
              <span className="text-xs text-zinc-400">
                {getStatusText()}
                {currentStatus.conversations_synced > 0 && (
                  <span className="text-emerald-600 ml-1">
                    (+{currentStatus.conversations_synced})
                  </span>
                )}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="whitespace-pre-line text-xs">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SyncConversationsButton;
