import React, { useRef, useState } from 'react';
import { Phone, Clock, Trophy } from 'lucide-react';

interface Agent {
  agent_id: string;
  agent_name: string;
  call_count: number;
  total_duration_seconds: number;
}

export interface TopAgentsTableProps {
  agents: Agent[];
  title?: string;
  onViewAll?: () => void;
}

// Generate Open Peeps avatar URL based on agent name (black and white)
function getAgentAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent&skinColor=f5f5f5&clothingColor=000000,333333,666666&hairColor=000000,333333`;
}

// Avatar background - simple gray for black and white look
function getAvatarBackground(): string {
  return 'bg-gray-100';
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toLocaleString();
}

const rankColors = [
  'bg-yellow-400 text-yellow-900', // #1 Gold
  'bg-gray-300 text-gray-800',     // #2 Silver
  'bg-amber-600 text-white',       // #3 Bronze
];

export default function TopAgentsTable({ agents, title = 'Top Agenți', onViewAll }: TopAgentsTableProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glowPosition, setGlowPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setGlowPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  if (!agents || agents.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Border glow - DOAR pe bordură */}
      <div
        className="pointer-events-none absolute inset-[-2px] rounded-2xl transition-opacity duration-300 z-10"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(350px circle at ${glowPosition.x}px ${glowPosition.y}px, rgba(220, 38, 38, 1), transparent 50%)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'xor',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          padding: '2px',
        }}
      />
      <div
        ref={cardRef}
        className="relative bg-white rounded-2xl overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ border: '2px solid #9CA3AF' }}
      >
      
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between relative z-20">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 ml-7">După numărul de apeluri (total)</p>
          </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Vezi toți →
          </button>
        )}
      </div>

      {/* Table */}
      <div className="divide-y divide-gray-50">
        {agents.map((agent, index) => (
          <div
            key={agent.agent_id}
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
          >
            {/* Left: Avatar + Name */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Agent Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${getAvatarBackground()}`}>
                <img 
                  src={getAgentAvatarUrl(agent.agent_name || agent.agent_id)} 
                  alt={agent.agent_name || 'Agent'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 truncate group-hover:text-black transition-colors">
                  {agent.agent_name || 'Agent'}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {agent.agent_id.slice(0, 12)}...
                </div>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-gray-700">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="text-sm font-semibold">{formatNumber(agent.call_count)}</span>
                </div>
                <div className="text-xs text-gray-400">apeluri</div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-gray-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-sm font-semibold">{formatTime(agent.total_duration_seconds || 0)}</span>
                </div>
                <div className="text-xs text-gray-400">timp vorbire</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
