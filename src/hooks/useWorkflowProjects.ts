import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';
import { toast } from 'sonner';
import { WorkflowNode, Connection } from './useWorkflowBuilder';
import { ENV } from '@/config/environment';
import { fetchWithAuth } from '@/utils/sessionManager';

export interface WorkflowProject {
  id: string;
  name: string;
  description: string | null;
  nodes: WorkflowNode[];
  connections: Connection[];
  status: string;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
  isActive: boolean;
}

// Global cache for projects - persists across remounts
let globalProjectsCache: { userId: string; data: WorkflowProject[]; timestamp: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const useWorkflowProjects = () => {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<WorkflowProject[]>(() => {
    // Initialize from cache if valid
    if (globalProjectsCache &&
        user?.id === globalProjectsCache.userId &&
        Date.now() - globalProjectsCache.timestamp < CACHE_TTL) {
      return globalProjectsCache.data;
    }
    return [];
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>('Proiect Nou');
  const [isLoading, setIsLoading] = useState(() => {
    // Don't show loading if we have cached data
    if (globalProjectsCache && user?.id === globalProjectsCache.userId &&
        Date.now() - globalProjectsCache.timestamp < CACHE_TTL) {
      return false;
    }
    return true;
  });
  const [isWorkflowActive, setIsWorkflowActive] = useState(false);

  // Ref for race condition handling
  const fetchIdRef = useRef(0);

  // Save operation lock to prevent concurrent saves
  const saveInProgressRef = useRef(false);
  const saveLockQueueRef = useRef<{
    resolve: (value: string | null) => void;
    args: [string, WorkflowNode[], Connection[], string?];
  } | null>(null);

  // Fetch all projects for user - using direct REST API for reliability
  const fetchProjects = useCallback(async (forceRefetch = false) => {
    if (!user) {
      console.log('[Workflows] No user, skipping fetch');
      setIsLoading(false);
      return;
    }

    // Check valid cache first
    if (!forceRefetch && globalProjectsCache?.userId === user.id &&
        Date.now() - globalProjectsCache.timestamp < CACHE_TTL) {
      console.log('[Workflows] Using cached data');
      setProjects(globalProjectsCache.data);
      setIsLoading(false);
      return;
    }

    // Track this fetch with an ID for race condition handling
    const currentFetchId = ++fetchIdRef.current;

    console.log('[Workflows] Fetching projects for user:', user.id);
    setIsLoading(true);

    try {
      // Direct REST API fetch using fetchWithAuth - handles token refresh automatically
      const url = `${ENV.SUPABASE_URL}/rest/v1/workflows?user_id=eq.${user.id}&order=updated_at.desc`;
      console.log('[Workflows] Starting REST API fetch...');

      const response = await fetchWithAuth(url, {
        method: 'GET',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      }, 15000); // 15s timeout

      // Check if this fetch is still current
      if (currentFetchId !== fetchIdRef.current) {
        console.log('[Workflows] Stale fetch, ignoring results');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[Workflows] Fetch result:', { dataCount: data?.length });

      const mappedProjects: WorkflowProject[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        nodes: (p.nodes as WorkflowNode[]) || [],
        connections: (p.connections as Connection[]) || [],
        status: p.status || 'draft',
        last_run_at: p.last_run_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        isActive: p.status === 'active',
      }));

      // Update global cache
      globalProjectsCache = {
        userId: user.id,
        data: mappedProjects,
        timestamp: Date.now()
      };

      if (currentFetchId === fetchIdRef.current) {
        setProjects(mappedProjects);
        setIsLoading(false);
        console.log('[Workflows] Projects loaded:', mappedProjects.length);
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        console.log('[Workflows] Fetch aborted');
        return;
      }

      console.error('[Workflows] Error fetching projects:', error);

      if (currentFetchId === fetchIdRef.current) {
        toast.error('Nu am putut încărca proiectele');
        setProjects([]);
        setIsLoading(false);
      }
    }
  }, [user]);

  // Save project (create or update) - with mutex lock to prevent race conditions
  const saveProject = useCallback(async (
    name: string,
    nodes: WorkflowNode[],
    connections: Connection[],
    description?: string
  ): Promise<string | null> => {
    if (!user) {
      toast.error('Trebuie să fii autentificat');
      return null;
    }

    // Prevent concurrent save operations - if a save is already in progress,
    // queue this one (replacing any previously queued save with the latest data)
    if (saveInProgressRef.current) {
      console.log('[Workflow Save] Save already in progress, queuing latest save');
      // If there's already a queued save, resolve its promise with null (skipped)
      if (saveLockQueueRef.current) {
        saveLockQueueRef.current.resolve(null);
      }
      return new Promise<string | null>((resolve) => {
        saveLockQueueRef.current = {
          resolve,
          args: [name, nodes, connections, description],
        };
      });
    }

    saveInProgressRef.current = true;
    setIsLoading(true);
    try {
      // Log node configs for debugging
      const cityLookupNodes = nodes.filter(n =>
        n.icon === 'city-lookup' || n.label?.toLowerCase().includes('city lookup')
      );
      if (cityLookupNodes.length > 0) {
        console.log('[SaveProject] City Lookup nodes found:', cityLookupNodes.map(n => ({
          id: n.id,
          label: n.label,
          configEntriesCount: n.config?.databaseEntries?.length || 0,
        })));
      }

      if (currentProjectId) {
        // Update existing project using REST API
        const updateUrl = `${ENV.SUPABASE_URL}/rest/v1/workflows?id=eq.${currentProjectId}&user_id=eq.${user.id}`;
        const updateResponse = await fetchWithAuth(updateUrl, {
          method: 'PATCH',
          headers: {
            'apikey': ENV.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            name,
            description: description || null,
            nodes,
            connections,
            updated_at: new Date().toISOString(),
          }),
        }, 15000);

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(`Update failed: ${errorText}`);
        }

        setCurrentProjectName(name);
        toast.success('Proiect salvat!');
        await fetchProjects(true); // Force refresh
        return currentProjectId;
      } else {
        // Create new project using REST API
        const insertUrl = `${ENV.SUPABASE_URL}/rest/v1/workflows`;
        const insertResponse = await fetchWithAuth(insertUrl, {
          method: 'POST',
          headers: {
            'apikey': ENV.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            user_id: user.id,
            name,
            description: description || null,
            nodes,
            connections,
            status: 'draft',
          }),
        }, 15000);

        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          throw new Error(`Insert failed: ${errorText}`);
        }

        const [data] = await insertResponse.json();

        setCurrentProjectId(data.id);
        setCurrentProjectName(name);
        toast.success('Proiect creat!');
        await fetchProjects(true); // Force refresh
        return data.id;
      }
    } catch (error: any) {
      console.error('[Workflow Save Error]:', error);
      console.error('[Workflow Save Error Details]:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        userId: user?.id,
        currentProjectId,
      });
      const errorMessage = error?.message || error?.code || 'Eroare necunoscută';
      toast.error(`Nu am putut salva: ${errorMessage}`);
      return null;
    } finally {
      saveInProgressRef.current = false;
      setIsLoading(false);

      // Process queued save if one exists (always use latest queued data)
      if (saveLockQueueRef.current) {
        const queued = saveLockQueueRef.current;
        saveLockQueueRef.current = null;
        console.log('[Workflow Save] Processing queued save operation');
        // Execute the queued save and resolve its promise
        saveProject(...queued.args).then(queued.resolve).catch(() => queued.resolve(null));
      }
    }
  }, [user, currentProjectId, fetchProjects]);

  // Load a specific project
  const loadProject = useCallback((project: WorkflowProject) => {
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    setIsWorkflowActive(project.isActive || project.status === 'active');
    return {
      nodes: project.nodes,
      connections: project.connections,
    };
  }, []);

  // Delete a project - using REST API with timeout
  const deleteProject = useCallback(async (projectId: string) => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const deleteUrl = `${ENV.SUPABASE_URL}/rest/v1/workflows?id=eq.${projectId}&user_id=eq.${user.id}`;
      const response = await fetchWithAuth(deleteUrl, {
        method: 'DELETE',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      }, 10000); // 10s timeout

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${errorText}`);
      }

      // If deleted project was current, reset
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
        setCurrentProjectName('Proiect Nou');
        setIsWorkflowActive(false);
      }

      toast.success('Proiect șters!');
      await fetchProjects(true); // Force refresh
      return true;
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error('Nu am putut șterge proiectul');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentProjectId, fetchProjects]);

  // Rename a project - using REST API with timeout
  const renameProject = useCallback(async (projectId: string, newName: string): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const renameUrl = `${ENV.SUPABASE_URL}/rest/v1/workflows?id=eq.${projectId}&user_id=eq.${user.id}`;
      const response = await fetchWithAuth(renameUrl, {
        method: 'PATCH',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          name: newName,
          updated_at: new Date().toISOString(),
        }),
      }, 10000); // 10s timeout

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Rename failed: ${errorText}`);
      }

      // If renamed project is current, update name
      if (currentProjectId === projectId) {
        setCurrentProjectName(newName);
      }

      toast.success('Proiect redenumit!');
      await fetchProjects(true); // Force refresh
      return true;
    } catch (error: any) {
      console.error('Error renaming project:', error);
      toast.error('Nu am putut redenumi proiectul');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentProjectId, fetchProjects]);

  // Duplicate a project - using REST API with timeout
  const duplicateProject = useCallback(async (project: WorkflowProject): Promise<string | null> => {
    if (!user) return null;

    setIsLoading(true);
    try {
      const insertUrl = `${ENV.SUPABASE_URL}/rest/v1/workflows`;
      const response = await fetchWithAuth(insertUrl, {
        method: 'POST',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          user_id: user.id,
          name: `${project.name} (Copie)`,
          description: project.description,
          nodes: project.nodes,
          connections: project.connections,
          status: 'draft',
        }),
      }, 15000); // 15s timeout

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Duplicate failed: ${errorText}`);
      }

      const [data] = await response.json();

      toast.success('Proiect duplicat!');
      await fetchProjects(true); // Force refresh
      return data.id;
    } catch (error: any) {
      console.error('Error duplicating project:', error);
      toast.error('Nu am putut duplica proiectul');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchProjects]);

  // Create new empty project
  const createNewProject = useCallback(() => {
    setCurrentProjectId(null);
    setCurrentProjectName('Proiect Nou');
    setIsWorkflowActive(false);
    return {
      nodes: [] as WorkflowNode[],
      connections: [] as Connection[],
    };
  }, []);

  // Update last run time - using REST API with timeout (fire and forget)
  const updateLastRun = useCallback(async () => {
    if (!currentProjectId || !user) return;

    try {
      const updateUrl = `${ENV.SUPABASE_URL}/rest/v1/workflows?id=eq.${currentProjectId}&user_id=eq.${user.id}`;
      await fetchWithAuth(updateUrl, {
        method: 'PATCH',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          last_run_at: new Date().toISOString(),
          status: 'active',
        }),
      }, 5000); // 5s timeout - non-critical update
    } catch (error) {
      console.error('Error updating last run:', error);
    }
  }, [currentProjectId, user]);

  // Activate workflow - using REST API with timeout
  const activateWorkflow = useCallback(async (
    projectId: string,
    nodes: WorkflowNode[],
    connections: Connection[]
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // First save the latest nodes and connections
      const updateUrl = `${ENV.SUPABASE_URL}/rest/v1/workflows?id=eq.${projectId}&user_id=eq.${user.id}`;
      const response = await fetchWithAuth(updateUrl, {
        method: 'PATCH',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          status: 'active',
          nodes,
          connections,
          updated_at: new Date().toISOString(),
        }),
      }, 15000); // 15s timeout

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Activate failed: ${errorText}`);
      }

      // Find webhook trigger nodes and update their workflow_id
      const webhookNodes = nodes.filter(node =>
        node.icon === 'webhook' ||
        node.icon === 'webhook-trigger' ||
        node.label?.toLowerCase().includes('webhook trigger')
      );

      // Update webhook triggers in parallel - track failures for user feedback
      const webhookResults = await Promise.allSettled(
        webhookNodes.map(async (webhookNode) => {
          const webhookTriggerId = webhookNode.config?.webhookTriggerId;
          const webhookPath = webhookNode.config?.webhookPath;

          if (webhookTriggerId) {
            const webhookUrl = `${ENV.SUPABASE_URL}/rest/v1/workflow_webhook_triggers?id=eq.${webhookTriggerId}`;
            const resp = await fetchWithAuth(webhookUrl, {
              method: 'PATCH',
              headers: {
                'apikey': ENV.SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                workflow_id: projectId,
                is_active: true
              }),
            }, 8000);
            if (!resp.ok) {
              const errText = await resp.text();
              throw new Error(`Webhook trigger ${webhookTriggerId} sync failed: ${errText}`);
            }
            console.log('[activateWorkflow] Updated webhook trigger:', webhookTriggerId);
          } else if (webhookPath) {
            const webhookUrl = `${ENV.SUPABASE_URL}/rest/v1/workflow_webhook_triggers?webhook_path=eq.${encodeURIComponent(webhookPath)}&user_id=eq.${user.id}`;
            const resp = await fetchWithAuth(webhookUrl, {
              method: 'PATCH',
              headers: {
                'apikey': ENV.SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                workflow_id: projectId,
                is_active: true
              }),
            }, 8000);
            if (!resp.ok) {
              const errText = await resp.text();
              throw new Error(`Webhook path ${webhookPath} sync failed: ${errText}`);
            }
            console.log('[activateWorkflow] Updated webhook trigger by path:', webhookPath);
          }
        })
      );

      // Report webhook sync failures to the user instead of silently swallowing them
      const webhookFailures = webhookResults.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      );
      if (webhookFailures.length > 0) {
        const failCount = webhookFailures.length;
        const totalCount = webhookNodes.length;
        console.error('[activateWorkflow] Webhook sync failures:', webhookFailures.map(f => f.reason));
        toast.warning(
          `Workflow activat, dar ${failCount} din ${totalCount} webhook-uri nu au fost sincronizate. Verifică configurația webhook-urilor.`
        );
      }

      setIsWorkflowActive(true);
      await fetchProjects(true); // Force refresh
      return true;
    } catch (error: any) {
      console.error('Error activating workflow:', error);
      toast.error('Nu am putut activa workflow-ul');
      return false;
    }
  }, [user, fetchProjects]);

  // Deactivate workflow - using REST API with timeout
  const deactivateWorkflow = useCallback(async (projectId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const updateUrl = `${ENV.SUPABASE_URL}/rest/v1/workflows?id=eq.${projectId}&user_id=eq.${user.id}`;
      const response = await fetchWithAuth(updateUrl, {
        method: 'PATCH',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          status: 'draft',
          updated_at: new Date().toISOString(),
        }),
      }, 10000); // 10s timeout

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deactivate failed: ${errorText}`);
      }

      setIsWorkflowActive(false);
      await fetchProjects(true); // Force refresh
      return true;
    } catch (error: any) {
      console.error('Error deactivating workflow:', error);
      toast.error('Nu am putut dezactiva workflow-ul');
      return false;
    }
  }, [user, fetchProjects]);

  // Initial fetch
  useEffect(() => {
    console.log('[Workflows] Initial useEffect - user:', !!user, 'authLoading:', authLoading);

    if (authLoading) {
      return;
    }

    // If we have valid cache, don't fetch
    if (projects.length > 0 && globalProjectsCache?.userId === user?.id &&
        Date.now() - globalProjectsCache.timestamp < CACHE_TTL) {
      setIsLoading(false);
      return;
    }

    if (user) {
      fetchProjects();
    } else {
      console.log('[Workflows] No user, setting loading to false');
      setIsLoading(false);
    }

    // Cleanup: increment fetchId to invalidate any pending results
    return () => {
      fetchIdRef.current++;
    };
  }, [user?.id, authLoading, fetchProjects]);

  // Load project by ID (for URL-based navigation) - using REST API with timeout
  const loadProjectById = useCallback(async (projectId: string) => {
    if (!user) return null;

    try {
      const url = `${ENV.SUPABASE_URL}/rest/v1/workflows?id=eq.${projectId}&user_id=eq.${user.id}&select=*`;
      const response = await fetchWithAuth(url, {
        method: 'GET',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      }, 10000); // 10s timeout

      if (!response.ok) {
        console.error('Project not found:', projectId);
        return null;
      }

      const dataArray = await response.json();
      const data = dataArray?.[0];

      if (!data) {
        console.error('Project not found:', projectId);
        return null;
      }

      const project: WorkflowProject = {
        id: data.id,
        name: data.name,
        description: data.description,
        nodes: (data.nodes as unknown as WorkflowNode[]) || [],
        connections: (data.connections as unknown as Connection[]) || [],
        status: data.status || 'draft',
        last_run_at: data.last_run_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
        isActive: data.status === 'active',
      };

      setCurrentProjectId(project.id);
      setCurrentProjectName(project.name);
      setIsWorkflowActive(project.isActive);

      return {
        nodes: project.nodes,
        connections: project.connections,
      };
    } catch (error) {
      console.error('Error loading project by ID:', error);
      return null;
    }
  }, [user]);

  return {
    projects,
    currentProjectId,
    currentProjectName,
    isLoading,
    isWorkflowActive,
    fetchProjects,
    saveProject,
    loadProject,
    loadProjectById,
    deleteProject,
    duplicateProject,
    renameProject,
    createNewProject,
    updateLastRun,
    setCurrentProjectName,
    setCurrentProjectId,
    activateWorkflow,
    deactivateWorkflow,
    setIsWorkflowActive,
  };
};
