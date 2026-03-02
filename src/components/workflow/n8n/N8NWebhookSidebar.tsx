import React, { useState } from 'react';
import { Webhook, Copy, Check, Play, Pin, Globe } from 'lucide-react';
import { N8NSidebarDrawer } from './N8NSidebarDrawer';
import { N8NIntegratedLayout } from './N8NIntegratedLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/utils/utils';

interface WebhookOutputData {
  [key: string]: any;
}

interface N8NWebhookSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  outputData: WebhookOutputData | null;
  onPinData?: () => void;
  isPinned?: boolean;
}

/**
 * n8n-style Webhook configuration with sidebar layout
 * Features:
 * - Sidebar drawer (not modal)
 * - Empty state with prominent CTA
 * - Integrated OUTPUT panel
 * - Copy URL with visual feedback
 */
export const N8NWebhookSidebar: React.FC<N8NWebhookSidebarProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  isListening,
  onStartListening,
  onStopListening,
  outputData,
  onPinData,
  isPinned = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [urlType, setUrlType] = useState<'test' | 'production'>('test');

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Settings Panel Content
  const settingsPanel = (
    <div className="p-6 space-y-6">
      {/* Webhook URLs Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
          Webhook URLs
        </h3>

        {/* URL Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setUrlType('test')}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              urlType === 'test'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            Test URL
          </button>
          <button
            onClick={() => setUrlType('production')}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              urlType === 'production'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            Production URL
          </button>
        </div>

        {/* URL Display with Copy Button */}
        <div
          className="relative rounded-lg overflow-hidden transition-all"
          style={{
            backgroundColor: '#0d0d0d',
            border: `2px solid ${urlType === 'test' ? '#3b82f6' : '#10b981'}`,
          }}
        >
          <div className="flex items-center gap-2 p-3">
            <Globe
              className="w-4 h-4 flex-shrink-0"
              style={{ color: urlType === 'test' ? '#3b82f6' : '#10b981' }}
            />
            <code className="flex-1 text-xs text-gray-300 font-mono truncate">
              {webhookUrl}
            </code>
            <button
              onClick={handleCopyUrl}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Helper text */}
        <p className="text-xs text-gray-500">
          {urlType === 'test'
            ? 'Use this URL for testing. It will only work when listening for events.'
            : 'Use this URL in production. Events will be stored and processed automatically.'}
        </p>
      </div>

      {/* HTTP Method */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">HTTP Method</label>
        <select
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm"
          defaultValue="POST"
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
        </select>
      </div>

      {/* Path */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Path</label>
        <input
          type="text"
          readOnly
          value={webhookUrl.split('/').pop()}
          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 text-sm font-mono"
        />
        <p className="text-xs text-gray-500">
          Webhook path is auto-generated. Cannot be modified.
        </p>
      </div>

      {/* Authentication */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Authentication</label>
        <select
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm"
          defaultValue="None"
        >
          <option>None</option>
          <option>Basic Auth</option>
          <option>Header Auth</option>
        </select>
      </div>

      {/* Respond Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Respond</label>
        <select
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm"
          defaultValue="immediately"
        >
          <option value="immediately">Immediately</option>
          <option value="when-last">When Last Node Finishes</option>
          <option value="using-node">Using 'Respond to Webhook' Node</option>
        </select>
        <p className="text-xs text-gray-500">
          Choose when and how to respond to the webhook request.
        </p>
      </div>
    </div>
  );

  // Output Panel Content with Empty State
  const outputPanel = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ backgroundColor: '#252525', borderColor: '#2a2a2a' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-200">OUTPUT</span>
          {outputData && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-400">1 item</span>
            </div>
          )}
        </div>

        {outputData && onPinData && (
          <button
            onClick={onPinData}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
              isPinned
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            <Pin className="w-3 h-3" />
            {isPinned ? 'Pinned' : 'Pin data'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!outputData ? (
          /* Empty State - n8n style */
          <div className="flex flex-col items-center justify-center h-full px-8 py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-purple-600/20 flex items-center justify-center mb-6">
              <Webhook className="w-10 h-10 text-purple-400" />
            </div>

            <h3 className="text-xl font-semibold text-gray-200 mb-3">
              Pull in events from Webhook
            </h3>

            <p className="text-sm text-gray-400 mb-8 max-w-md">
              Once you've finished building your workflow, run it without having to click this button by using the production webhook URL.
            </p>

            {/* Prominent CTA Button */}
            <Button
              onClick={isListening ? onStopListening : onStartListening}
              size="lg"
              className={cn(
                'gap-2 text-base font-semibold px-6 py-6 rounded-xl shadow-lg transition-all',
                isListening
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              )}
            >
              <Play className="w-5 h-5" />
              {isListening ? 'Stop listening' : 'Listen for test event'}
            </Button>

            {isListening && (
              <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Listening for incoming events...
              </div>
            )}

            {/* Instructions */}
            <div className="mt-12 p-4 rounded-lg bg-gray-900/50 border border-gray-800 text-left max-w-lg">
              <p className="text-xs font-semibold text-gray-300 mb-2">
                How to test:
              </p>
              <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                <li>Click "Listen for test event" above</li>
                <li>Send a request to the webhook URL</li>
                <li>The data will appear here automatically</li>
              </ol>
            </div>
          </div>
        ) : (
          /* JSON Viewer - when data exists */
          <div className="p-4">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap bg-gray-900 rounded-lg p-4 border border-gray-800">
              {JSON.stringify(outputData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <N8NSidebarDrawer
      isOpen={isOpen}
      onClose={onClose}
      nodeIcon={<Webhook className="w-5 h-5 text-white" />}
      nodeTitle="Webhook"
      nodeColor="#9333ea"
      width="65%"
    >
      <N8NIntegratedLayout
        settingsPanel={settingsPanel}
        outputPanel={outputPanel}
        settingsWidth="40%"
      />
    </N8NSidebarDrawer>
  );
};
