import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { Search, Bot, Plus, Edit, Trash2, Power, Users, BarChart3, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  voice_id?: string;
  is_active: boolean;
  provider?: string;
  elevenlabs_agent_id?: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
}

interface AgentStats {
  totalAgents: number;
  activeAgents: number;
  totalCalls: number;
  avgSuccessRate: number;
}

const AgentManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const fetchAgents = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get all agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('kalina_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;

      setAgents(agentsData || []);

      // Calculate stats
      const totalAgents = agentsData?.length || 0;
      const activeAgents = agentsData?.filter(agent => agent.is_active).length || 0;
      
      // Get call stats (simulated for demo)
      const totalCalls = Math.floor(totalAgents * 23.5);
      const avgSuccessRate = 87.2;

      setStats({
        totalAgents,
        activeAgents,
        totalCalls,
        avgSuccessRate
      });

    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut încărca agenții.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.rpc('admin_update_agent', {
        p_admin_user_id: user?.id,
        p_agent_row_id: agentId,
        p_is_active: !currentStatus
      });

      if (error) throw error;

      toast({
        title: "Succes",
        description: `Agentul a fost ${!currentStatus ? 'activat' : 'dezactivat'}.`,
      });

      fetchAgents();
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut modifica statusul agentului.",
        variant: "destructive"
      });
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Sigur vrei să ștergi acest agent?')) return;

    try {
      const { error } = await supabase.rpc('admin_delete_agent', {
        p_admin_user_id: user?.id,
        p_agent_row_id: agentId
      });

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Agentul a fost șters cu succes.",
      });

      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut șterge agentul.",
        variant: "destructive"
      });
    }
  };

  const bulkToggleStatus = async (activate: boolean) => {
    if (selectedAgents.length === 0) {
      toast({
        title: "Avertisment",
        description: "Selectează cel puțin un agent.",
        variant: "destructive"
      });
      return;
    }

    try {
      for (const agentId of selectedAgents) {
        await supabase.rpc('admin_update_agent', {
          p_admin_user_id: user?.id,
          p_agent_row_id: agentId,
          p_is_active: activate
        });
      }

      toast({
        title: "Succes",
        description: `${selectedAgents.length} agenți au fost ${activate ? 'activați' : 'dezactivați'}.`,
      });

      setSelectedAgents([]);
      fetchAgents();
    } catch (error) {
      console.error('Error bulk updating agents:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut actualiza agenții.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [user]);

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.agent_id.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && agent.is_active) ||
                         (statusFilter === 'inactive' && !agent.is_active);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestionare Agenți</h2>
          <p className="text-muted-foreground">
            Administrează toți agenții AI din platformă
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Agent Nou
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Agenți</p>
                  <h2 className="text-2xl font-bold">{stats.totalAgents}</h2>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Power className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Agenți Activi</p>
                  <h2 className="text-2xl font-bold">{stats.activeAgents}</h2>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Apeluri</p>
                  <h2 className="text-2xl font-bold">{stats.totalCalls}</h2>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Rata Succes</p>
                  <h2 className="text-2xl font-bold">{stats.avgSuccessRate}%</h2>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Bulk Actions */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută agenți..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toți</SelectItem>
              <SelectItem value="active">Activi</SelectItem>
              <SelectItem value="inactive">Inactivi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedAgents.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {selectedAgents.length} selectați
            </span>
            <Button variant="outline" size="sm" onClick={() => bulkToggleStatus(true)}>
              Activează
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkToggleStatus(false)}>
              Dezactivează
            </Button>
          </div>
        )}
      </div>

      {/* Agents List */}
      <div className="space-y-2">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className={!agent.is_active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left: Checkbox + Agent Info */}
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedAgents.includes(agent.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAgents([...selectedAgents, agent.id]);
                      } else {
                        setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                      }
                    }}
                    className="rounded"
                  />
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{agent.name}</h3>
                      <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                        {agent.is_active ? 'Activ' : 'Inactiv'}
                      </Badge>
                      <Badge variant="outline">
                        {agent.provider || 'custom'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{agent.description || 'Fără descriere'}</p>
                      <p>ID: {agent.agent_id} • Creat: {new Date(agent.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`toggle-${agent.id}`} className="text-sm">Activ</Label>
                    <Switch
                      id={`toggle-${agent.id}`}
                      checked={agent.is_active}
                      onCheckedChange={() => toggleAgentStatus(agent.id, agent.is_active)}
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Editează
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    Config
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteAgent(agent.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Șterge
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nu s-au găsit agenți.
        </div>
      )}
    </div>
  );
};

export default AgentManagement;