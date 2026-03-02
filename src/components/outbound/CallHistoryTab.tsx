
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, CheckCircle, AlertCircle, Clock, Phone, Download } from 'lucide-react';
import { ConversationDetailModal } from './ConversationDetailModal';

import { CallHistoryRecord } from '@/hooks/useCallHistory';

interface CallHistoryTabProps {
  callHistory: CallHistoryRecord[];
  isLoading: boolean;
}

export const CallHistoryTab: React.FC<CallHistoryTabProps> = ({
  callHistory,
  isLoading,
}) => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Build transcript text from stored dialog_json; gracefully fallback to summary/raw
  const extractTranscript = (dialogJson?: string, summary?: string): string => {
    if (!dialogJson) return summary || '';
    try {
      const data = JSON.parse(dialogJson);
      // Common shapes we might encounter
      // 1) clean_conversations.turns: [{speaker, text}]
      const turns = data?.clean_conversations?.turns || data?.turns || data?.dialog || data?.messages;
      if (Array.isArray(turns)) {
        const lines = turns
          .map((t: any) => {
            const speaker = t.speaker || t.role || t.from || 'Speaker';
            const text = t.text || t.content || t.message || '';
            return `${speaker}: ${String(text).replace(/\s+/g, ' ').trim()}`;
          })
          .filter(Boolean);
        if (lines.length) return lines.join(' | ');
      }
      // 2) clean_conversations.dialog as string
      const dialogStr = data?.clean_conversations?.dialog || data?.dialog || data?.transcript;
      if (typeof dialogStr === 'string' && dialogStr.trim()) {
        return dialogStr.replace(/\s+/g, ' ').trim();
      }
    } catch (e) {
      // ignore parse errors
    }
    // Fallbacks
    if (summary && summary.trim()) return summary.replace(/\s+/g, ' ').trim();
    // last resort: return raw JSON (single line) to keep info
    return String(dialogJson).replace(/\s+/g, ' ').trim();
  };

  const csvEscape = (value: any): string => {
    const s = value == null ? '' : String(value);
    // Keep it one line for better CSV rendering
    const oneLine = s.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    // Escape quotes and wrap in quotes
    const escaped = oneLine.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const handleExportCSV = () => {
    const headers = [
      'id',
      'contact_name',
      'phone_number',
      'caller_number',
      'call_status',
      'call_date',
      'duration_seconds',
      'credits',
      'agent_name',
      'language',
      'summary',
      'conversation'
    ];

    const lines = [headers.map(csvEscape).join(',')];
    for (const call of callHistory) {
      const conversation = extractTranscript(call.dialog_json, call.summary);
      const creditsUsed = Math.round((call.cost_usd || 0) * 100);
      const row = [
        call.id,
        call.contact_name,
        call.phone_number,
        call.caller_number,
        call.call_status,
        call.call_date,
        call.duration_seconds ?? '',
        creditsUsed,
        call.agent_name ?? '',
        call.language ?? '',
        call.summary ?? '',
        conversation
      ].map(csvEscape);
      lines.push(row.join(','));
    }

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.setAttribute('download', `call_history_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCallClick = (conversationId: string | null) => {
    if (conversationId) {
      setSelectedConversationId(conversationId);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedConversationId(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Istoric Apeluri
          </CardTitle>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md text-sm hover:bg-gray-50"
            title="Export CSV (include conversatia)"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Se încarcă istoricul...</p>
          </div>
        ) : callHistory.length > 0 ? (
          <div className="space-y-3">
            {callHistory.map((call) => (
              <div 
                key={call.id} 
                className="p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{call.contact_name}</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 truncate">
                        <span className="font-medium">Sunat: </span>{call.phone_number}
                      </p>
                      {call.caller_number && (
                        <p className="text-sm text-blue-600 truncate">
                          <span className="font-medium">De pe: </span>{call.caller_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {call.call_status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : call.call_status === 'busy' ? (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    ) : call.call_status === 'initiated' ? (
                      <Phone className="w-4 h-4 text-blue-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      call.call_status === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : call.call_status === 'initiated'
                        ? 'bg-blue-100 text-blue-800'
                        : call.call_status === 'busy'
                        ? 'bg-yellow-100 text-yellow-800'
                        : call.call_status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {call.call_status === 'success' ? 'Successful' : 
                       call.call_status === 'initiated' ? 'Initiated' : 
                       call.call_status === 'busy' ? 'Busy' :
                       call.call_status === 'failed' ? 'Error' : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun apel încă</h3>
            <p className="text-gray-600">Apelurile vor apărea aici după ce sunt efectuate.</p>
          </div>
        )}
      </CardContent>

      <ConversationDetailModal
        conversationId={selectedConversationId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </Card>
  );
};
