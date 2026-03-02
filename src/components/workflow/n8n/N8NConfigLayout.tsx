import React from 'react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';

interface IOData {
  [key: string]: any;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: IOData | IOData[];
  itemCount?: number;
}

interface N8NConfigLayoutProps {
  children: React.ReactNode;
  inputData?: IOData | IOData[] | null;
  outputData?: IOData | IOData[] | null;
  inputItemCount?: number;
  outputItemCount?: number;
  isExecuting?: boolean;
  executionError?: string | null;
  showInput?: boolean;
  showOutput?: boolean;
  // For showing multiple node sources in INPUT panel
  nodeSources?: NodeData[];
}

export const N8NConfigLayout: React.FC<N8NConfigLayoutProps> = ({
  children,
  inputData = null,
  outputData = null,
  inputItemCount,
  outputItemCount,
  isExecuting = false,
  executionError = null,
  showInput = true,
  showOutput = true,
  nodeSources,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
      }}
    >
      <div className="flex items-stretch gap-3 max-h-[90vh]" style={{ width: '95vw', maxWidth: '1800px' }}>
        {/* INPUT Panel */}
        {showInput && (
          <div
            className="hidden lg:flex flex-col flex-1"
            style={{
              minWidth: '350px',
              backgroundColor: 'rgba(19, 20, 25, 0.95)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <N8NNodeIOPanel
              title="INPUT"
              data={inputData}
              itemCount={inputItemCount}
              enableDrag
              nodeSources={nodeSources}
            />
          </div>
        )}

        {/* Center Panel */}
        <div className="flex-shrink-0">
          {children}
        </div>

        {/* OUTPUT Panel */}
        {showOutput && (
          <div
            className="hidden lg:flex flex-col flex-1"
            style={{
              minWidth: '350px',
              backgroundColor: 'rgba(19, 20, 25, 0.95)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <N8NNodeIOPanel
              title="OUTPUT"
              data={outputData}
              itemCount={outputItemCount}
              isLoading={isExecuting}
              error={executionError}
              enableDrag
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default N8NConfigLayout;
