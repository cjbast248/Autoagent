import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Phone, Database, Clock, FileText, CheckCircle, Zap, Search } from 'lucide-react';

interface NodeTemplate {
  label: string;
  type: string;
  icon: string;
  description: string;
  category: string;
}

const nodeTemplates: NodeTemplate[] = [
  {
    label: 'Trigger Manual',
    type: 'trigger',
    icon: 'Play',
    description: 'Pornește manual sau programat',
    category: 'Triggers',
  },
  {
    label: 'Apel Telefonic',
    type: 'call',
    icon: 'Phone',
    description: 'Agent + număr telefon',
    category: 'Actions',
  },
  {
    label: 'Google Sheets',
    type: 'destination',
    icon: 'FileText',
    description: 'Trimite date în Google Sheets',
    category: 'Destinații',
  },
  {
    label: 'Zoho CRM',
    type: 'destination',
    icon: 'Database',
    description: 'Trimite date în Zoho CRM',
    category: 'Destinații',
  },
  {
    label: 'Webhook',
    type: 'destination',
    icon: 'Zap',
    description: 'Trimite date la URL',
    category: 'Destinații',
  },
  {
    label: 'Sfârșit / Loop',
    type: 'end',
    icon: 'CheckCircle',
    description: 'Termină sau reîncepe',
    category: 'Control',
  },
];

const iconMap: Record<string, any> = {
  Play: Zap,
  Phone,
  Database,
  Clock,
  FileText,
  CheckCircle,
  Zap,
};

interface NodesSidebarProps {
  onAddNode: (nodeData: { label: string; type: string; icon: string; description: string }, x: number, y: number) => void;
}

export const NodesSidebar: React.FC<NodesSidebarProps> = ({ onAddNode }) => {
  const [search, setSearch] = useState('');

  const categories = Array.from(new Set(nodeTemplates.map((n) => n.category)));

  const filteredTemplates = nodeTemplates.filter((node) =>
    node.label.toLowerCase().includes(search.toLowerCase()) ||
    node.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleDragStart = (e: React.DragEvent, node: NodeTemplate) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(node));
  };

  return (
    <Card className="w-72 border-r rounded-none h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div>
          <h3 className="font-semibold text-sm">Noduri</h3>
          <p className="text-xs text-muted-foreground mt-1">Drag pe canvas</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Caută noduri..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {categories.map((category) => {
            const categoryNodes = filteredTemplates.filter((node) => node.category === category);
            if (categoryNodes.length === 0) return null;

            return (
              <div key={category}>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  {category}
                </h4>
                <div className="space-y-2">
                  {categoryNodes.map((node, idx) => {
                    const Icon = iconMap[node.icon] || Zap;
                    
                    const gradientMap: Record<string, string> = {
                      trigger: 'from-emerald-400 to-emerald-500',
                      call: 'from-purple-400 to-purple-500',
                      destination: 'from-blue-400 to-blue-500',
                      end: 'from-rose-400 to-rose-500',
                    };

                    return (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node)}
                        className="w-full p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-move group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientMap[node.type] || 'from-gray-400 to-gray-500'} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">{node.label}</div>
                            <div className="text-xs text-gray-500">{node.description}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
};
