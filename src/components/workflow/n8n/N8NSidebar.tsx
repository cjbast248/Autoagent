import React from 'react';
import { 
  Home, 
  Users, 
  FolderOpen,
  Plus,
  LayoutGrid,
  HelpCircle,
  Sparkles,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/utils/utils';

interface N8NSidebarProps {
  activeItem?: string;
  onNavigate?: (item: string) => void;
  userName?: string;
  userEmail?: string;
}

export const N8NSidebar: React.FC<N8NSidebarProps> = ({
  activeItem = 'personal',
  onNavigate,
  userName = 'kalina Virlan',
  userEmail,
}) => {
  return (
    <div className="w-[180px] bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6d5a] to-[#ea4c89] flex items-center justify-center">
          <span className="text-white font-bold text-sm">K</span>
        </div>
        <span className="text-white font-semibold">Kalina</span>
        <button className="ml-auto w-6 h-6 rounded bg-[#2a2a2a] flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        <NavItem 
          icon={Home} 
          label="Overview" 
          active={activeItem === 'overview'}
          onClick={() => onNavigate?.('overview')}
        />
        <NavItem 
          icon={FolderOpen} 
          label="Personal" 
          active={activeItem === 'personal'}
          onClick={() => onNavigate?.('personal')}
        />
        <NavItem 
          icon={Users} 
          label="Shared with you" 
          active={activeItem === 'shared'}
          onClick={() => onNavigate?.('shared')}
        />

        {/* Projects Section */}
        <div className="pt-4">
          <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Projects
          </div>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-[#2a2a2a] rounded-md transition-colors">
            <Plus className="w-4 h-4" />
            Add project
          </button>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-[#2a2a2a] p-2 space-y-1">
        <NavItem 
          icon={LayoutGrid} 
          label="Templates" 
          onClick={() => onNavigate?.('templates')}
        />
        <NavItem 
          icon={HelpCircle} 
          label="Help" 
          hasSubmenu
          onClick={() => {}}
        />
        <NavItem 
          icon={Sparkles} 
          label="What's New" 
          hasSubmenu
          onClick={() => {}}
        />

        {/* User */}
        <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-md hover:bg-[#2a2a2a] cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-slate-300 flex-1 truncate">{userName}</span>
          <MoreHorizontal className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  hasSubmenu?: boolean;
  onClick?: () => void;
}> = ({ icon: Icon, label, active, hasSubmenu, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
        active 
          ? "bg-[#2a2a2a] text-white" 
          : "text-slate-400 hover:text-white hover:bg-[#2a2a2a]"
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="flex-1 text-left">{label}</span>
      {hasSubmenu && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}
    </button>
  );
};
