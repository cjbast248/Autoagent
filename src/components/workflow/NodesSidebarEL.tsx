import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Flag, 
  Phone, 
  Database, 
  MessageSquare, 
  FileText, 
  Webhook,
  Wrench,
  X,
  Search,
  Sparkles
} from 'lucide-react';
import { cn } from '@/utils/utils';

interface NodeTemplate {
  label: string;
  type: string;
  icon: string;
  description: string;
  category: string;
  hasBranches?: boolean;
}

const nodeTemplates: NodeTemplate[] = [
  // TRIGGERS
  {
    label: 'Trigger Manual',
    type: 'trigger',
    icon: 'Flag',
    description: 'Pornește manual sau programat',
    category: 'TRIGGERS',
  },
  // ACTIONS
  {
    label: 'Apel Telefonic',
    type: 'call',
    icon: 'Phone',
    description: 'Agent + număr telefon',
    category: 'ACTIONS',
  },
  {
    label: 'Collect Information',
    type: 'prompt',
    icon: 'MessageSquare',
    description: 'Adaugă un prompt pentru colectare date',
    category: 'ACTIONS',
  },
  {
    label: 'Dispatch tool',
    type: 'tool',
    icon: 'Wrench',
    description: 'Execută un tool cu ramificații',
    category: 'ACTIONS',
    hasBranches: true,
  },
  // DESTINATIONS
  {
    label: 'Google Sheets',
    type: 'destination',
    icon: 'FileText',
    description: 'Trimite date în Google Sheets',
    category: 'DESTINAȚII',
  },
  {
    label: 'Zoho CRM',
    type: 'destination',
    icon: 'Database',
    description: 'Trimite date în Zoho CRM',
    category: 'DESTINAȚII',
  },
  {
    label: 'Webhook',
    type: 'destination',
    icon: 'Webhook',
    description: 'Trimite date la URL',
    category: 'DESTINAȚII',
  },
  // CONTROL
  {
    label: 'Success',
    type: 'success',
    icon: 'Sparkles',
    description: 'Branch pentru succes',
    category: 'CONTROL',
  },
  {
    label: 'Failure',
    type: 'failure',
    icon: 'X',
    description: 'Branch pentru erori',
    category: 'CONTROL',
  },
  {
    label: 'End call condition',
    type: 'condition',
    icon: 'Sparkles',
    description: 'Condiție pentru terminare apel',
    category: 'CONTROL',
  },
  {
    label: 'Sfârșit / Loop',
    type: 'end',
    icon: 'X',
    description: 'Termină sau reîncepe',
    category: 'CONTROL',
  },
];

const iconMap: Record<string, any> = {
  Flag,
  Phone,
  Database,
  MessageSquare,
  FileText,
  Webhook,
  Wrench,
  X,
  Sparkles,
};

const iconBgColors: Record<string, string> = {
  trigger: 'bg-emerald-100',
  start: 'bg-emerald-100',
  call: 'bg-purple-100',
  prompt: 'bg-blue-100',
  tool: 'bg-amber-100',
  destination: 'bg-blue-100',
  success: 'bg-emerald-100',
  failure: 'bg-rose-100',
  condition: 'bg-violet-100',
  end: 'bg-rose-100',
};

const iconColors: Record<string, string> = {
  trigger: 'text-emerald-600',
  start: 'text-emerald-600',
  call: 'text-purple-600',
  prompt: 'text-blue-600',
  tool: 'text-amber-600',
  destination: 'text-blue-600',
  success: 'text-emerald-600',
  failure: 'text-rose-600',
  condition: 'text-violet-600',
  end: 'text-rose-600',
};

interface NodesSidebarELProps {
  onAddNode: (nodeData: any, x: number, y: number) => void;
}

export const NodesSidebarEL: React.FC<NodesSidebarELProps> = ({ onAddNode }) => {
  const [search, setSearch] = useState('');

  const categories = ['TRIGGERS', 'ACTIONS', 'DESTINAȚII', 'CONTROL'];

  const filteredTemplates = nodeTemplates.filter((node) =>
    node.label.toLowerCase().includes(search.toLowerCase()) ||
    node.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleDragStart = (e: React.DragEvent, node: NodeTemplate) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(node));
  };

  return (
    <Card className="w-80 border-r border-slate-200 rounded-none h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-900">Noduri</h3>
          <p className="text-xs text-slate-500 mt-0.5">Drag pe canvas</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Caută noduri..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
          />
        </div>
      </div>

      {/* Node List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {categories.map((category) => {
            const categoryNodes = filteredTemplates.filter((node) => node.category === category);
            if (categoryNodes.length === 0) return null;

            return (
              <div key={category}>
                <h4 className="text-[11px] font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                  {category}
                </h4>
                <div className="space-y-2">
                  {categoryNodes.map((node, idx) => {
                    const Icon = iconMap[node.icon] || Flag;
                    const bgColor = iconBgColors[node.type] || 'bg-slate-100';
                    const iconColor = iconColors[node.type] || 'text-slate-600';

                    return (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node)}
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing group"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
                          bgColor
                        )}>
                          <Icon className={cn("w-5 h-5", iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900">{node.label}</div>
                          <div className="text-xs text-slate-500 truncate">{node.description}</div>
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

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-500 text-center">
          Trage noduri pe canvas
        </p>
      </div>
    </Card>
  );
};
