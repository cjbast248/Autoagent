import React, { useRef, useState } from 'react';

// Generate Open Peeps avatar URL based on agent name (black and white)
function getAgentAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent&skinColor=f5f5f5&clothingColor=000000,333333,666666&hairColor=000000,333333`;
}

interface MostOrderedListProps {
  title: string;
  subtitle: string;
  items: {
    id: string;
    name: string;
    value: string;
    image?: string;
  }[];
  isLoading?: boolean;
}

const MostOrderedList: React.FC<MostOrderedListProps> = ({
  title,
  subtitle,
  items,
  isLoading = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glowPosition, setGlowPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setGlowPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative h-full">
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
        className="bg-white rounded-2xl p-6 h-full"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ border: '2px solid #9CA3AF' }}
      >
        {/* Header */}
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{subtitle}</p>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              </div>
            ))
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={item.image || getAgentAvatarUrl(item.name)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">{item.value}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MostOrderedList;
