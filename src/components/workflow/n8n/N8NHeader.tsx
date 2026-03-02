import React from 'react';
import { cn } from '@/utils/utils';
import { Share, MoreHorizontal, Star } from 'lucide-react';

interface N8NHeaderProps {
  workflowName: string;
  isActive: boolean;
  onToggleActive: () => void;
  onSave: () => void;
  onShare?: () => void;
  isSaving?: boolean;
}

export const N8NHeader: React.FC<N8NHeaderProps> = ({
  workflowName,
  isActive,
  onToggleActive,
  onSave,
  onShare,
  isSaving,
}) => {
  return (
    <div className="h-14 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center justify-between px-4">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400 flex items-center gap-1">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Personal
        </span>
        <span className="text-slate-500">/</span>
        <span className="text-white font-medium">{workflowName}</span>
        <button className="text-slate-400 hover:text-white transition-colors">
          + Add tag
        </button>
        <button className="text-slate-400 hover:text-white transition-colors ml-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      {/* Center: Tabs */}
      <div className="flex items-center bg-[#2a2a2a] rounded-lg p-1">
        <TabButton active>Editor</TabButton>
        <TabButton>Executions</TabButton>
        <TabButton>Evaluations</TabButton>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Active Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Inactive</span>
          <button
            onClick={onToggleActive}
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors",
              isActive ? "bg-[#ff6d5a]" : "bg-[#3a3a3a]"
            )}
          >
            <span 
              className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                isActive ? "left-5" : "left-0.5"
              )}
            />
          </button>
        </div>

        {/* Share */}
        <button 
          onClick={onShare}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2a2a2a] text-slate-300 hover:text-white hover:bg-[#3a3a3a] transition-colors text-sm"
        >
          <Share className="w-4 h-4" />
          Share
        </button>

        {/* Save */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className={cn(
            "px-4 py-1.5 rounded-md font-medium text-sm transition-colors",
            "bg-[#ff6d5a] hover:bg-[#ff5a45] text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>

        {/* Undo/Redo */}
        <button className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-[#2a2a2a] transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
          </svg>
        </button>

        {/* More */}
        <button className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-[#2a2a2a] transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {/* Star Count */}
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#2a2a2a] text-slate-300 text-sm">
          <Star className="w-4 h-4" />
          160,032
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}> = ({ children, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-md text-sm font-medium transition-colors",
        active 
          ? "bg-[#3a3a3a] text-white" 
          : "text-slate-400 hover:text-white"
      )}
    >
      {children}
    </button>
  );
};
