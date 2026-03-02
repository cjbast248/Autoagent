import React from 'react';

interface N8NIntegratedLayoutProps {
  settingsPanel: React.ReactNode;
  outputPanel: React.ReactNode;
  settingsWidth?: string; // Default: 45%
}

/**
 * Integrated layout for node configuration
 * Left: Settings/Parameters (40-45%)
 * Right: Output/Preview (55-60%)
 * No gaps between panels - unified experience
 */
export const N8NIntegratedLayout: React.FC<N8NIntegratedLayoutProps> = ({
  settingsPanel,
  outputPanel,
  settingsWidth = '45%',
}) => {
  return (
    <div className="flex h-full w-full">
      {/* Settings Panel - Left */}
      <div
        className="flex-shrink-0 overflow-y-auto border-r"
        style={{
          width: settingsWidth,
          backgroundColor: '#1a1a1a',
          borderColor: '#2a2a2a',
        }}
      >
        {settingsPanel}
      </div>

      {/* Output Panel - Right */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          backgroundColor: '#1e1e1e',
        }}
      >
        {outputPanel}
      </div>
    </div>
  );
};
