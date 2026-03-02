import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/utils';

interface N8NSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nodeIcon?: React.ReactNode;
  nodeTitle: string;
  nodeColor?: string;
  children: React.ReactNode;
  width?: string; // Default: 60% of screen
}

/**
 * n8n-style sidebar drawer that slides in from the right
 * Replaces the centered modal with a fluid sidebar layout
 * Takes 50-60% of screen width, full height
 */
export const N8NSidebarDrawer: React.FC<N8NSidebarDrawerProps> = ({
  isOpen,
  onClose,
  nodeIcon,
  nodeTitle,
  nodeColor = '#FF6D5A',
  children,
  width = '60%',
}) => {
  // Prevent closing when clicking inside the drawer
  const handleDrawerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Overlay - semi-transparent background */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 transition-opacity duration-300 z-40',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer - slides in from right */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full flex flex-col transition-all duration-300 ease-out z-50',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{
          width,
          backgroundColor: '#1e1e1e',
          borderLeft: '1px solid #2a2a2a',
          boxShadow: isOpen ? '-4px 0 24px rgba(0, 0, 0, 0.5)' : 'none',
        }}
        onClick={handleDrawerClick}
      >
        {/* Header - Node info */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            backgroundColor: '#252525',
            borderColor: '#2a2a2a',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Node icon */}
            {nodeIcon && (
              <div
                className="w-8 h-8 rounded flex items-center justify-center"
                style={{ backgroundColor: nodeColor }}
              >
                {nodeIcon}
              </div>
            )}
            
            {/* Node title */}
            <div>
              <h2 className="text-base font-semibold text-white">
                {nodeTitle}
              </h2>
              <p className="text-xs text-gray-400">
                Configure node settings
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Footer hint - optional */}
        <div
          className="px-4 py-2 border-t text-xs text-gray-500 text-center"
          style={{ borderColor: '#2a2a2a' }}
        >
          Press <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">ESC</kbd> to close
        </div>
      </div>
    </>
  );
};
