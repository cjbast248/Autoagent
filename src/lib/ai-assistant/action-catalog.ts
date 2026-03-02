/**
 * Action Catalog - Defines all actions the AI assistant can perform
 */

export interface ActionStep {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'select' | 'scroll';
  target?: string;
  value?: string;
  path?: string;
  duration?: number;
  label?: string;
}

export interface ActionDefinition {
  type: 'navigate' | 'multi-step';
  path?: string;
  label?: string;
  steps?: (params: Record<string, any>) => ActionStep[];
  responseMessage?: (params: Record<string, any>) => string;
}

// Route mappings
export const ROUTE_MAP: Record<string, string> = {
  'nav.home': '/',
  'nav.agents': '/account/kalina-agents',
  'nav.workflow': '/account/workflow',
  'nav.voices': '/account/voices',
  'nav.analytics': '/account/conversation-analytics',
  'nav.transcripts': '/account/transcript',
  'nav.agent_analytic': '/account/agent-analytic',
  'nav.leads': '/account/leads',
  'nav.files': '/account/files',
  'nav.integrations': '/account/integrations',
  'nav.chat_widget': '/account/chat-widget',
  'nav.calendar': '/account/calendar',
  'nav.phone_numbers': '/account/phone-numbers',
  'nav.outbound': '/account/outbound',
  'nav.contacts': '/account/contacts',
  'nav.settings': '/account/settings',
  'nav.pricing': '/pricing',
  'nav.help': '/help',
};

// Route labels for cursor display
export const ROUTE_LABELS: Record<string, string> = {
  '/': 'Acasă',
  '/account/kalina-agents': 'Agenți',
  '/account/workflow': 'Workflow',
  '/account/voices': 'Voci',
  '/account/conversation-analytics': 'Istoric Apeluri',
  '/account/transcript': 'Transcrieri',
  '/account/agent-analytic': 'Agent Analitic',
  '/account/leads': 'Leads',
  '/account/files': 'Fișiere',
  '/account/integrations': 'Integrări',
  '/account/chat-widget': 'Chat Widget',
  '/account/calendar': 'Calendar',
  '/account/phone-numbers': 'Numere Telefon',
  '/account/outbound': 'Apeluri Ieșire',
  '/account/contacts': 'Contacte',
  '/account/settings': 'Setări',
  '/pricing': 'Prețuri',
  '/help': 'Ajutor',
};

// Action catalog
export const ACTION_CATALOG: Record<string, ActionDefinition> = {
  // ==================== NAVIGATION ACTIONS ====================
  'nav.home': {
    type: 'navigate',
    path: '/',
    label: 'Acasă',
    responseMessage: () => 'Te duc la pagina principală...'
  },
  'nav.agents': {
    type: 'navigate',
    path: '/account/kalina-agents',
    label: 'Agenți',
    responseMessage: () => 'Deschid lista de agenți...'
  },
  'nav.workflow': {
    type: 'navigate',
    path: '/account/workflow',
    label: 'Workflow',
    responseMessage: () => 'Deschid pagina de workflow-uri...'
  },
  'nav.voices': {
    type: 'navigate',
    path: '/account/voices',
    label: 'Voci',
    responseMessage: () => 'Deschid galeria de voci...'
  },
  'nav.analytics': {
    type: 'navigate',
    path: '/account/conversation-analytics',
    label: 'Istoric Apeluri',
    responseMessage: () => 'Deschid istoricul de apeluri...'
  },
  'nav.transcripts': {
    type: 'navigate',
    path: '/account/transcript',
    label: 'Transcrieri',
    responseMessage: () => 'Deschid transcrierile...'
  },
  'nav.agent_analytic': {
    type: 'navigate',
    path: '/account/agent-analytic',
    label: 'Agent Analitic',
    responseMessage: () => 'Deschid analitica pentru agenți...'
  },
  'nav.leads': {
    type: 'navigate',
    path: '/account/leads',
    label: 'Leads',
    responseMessage: () => 'Deschid pagina de leads...'
  },
  'nav.files': {
    type: 'navigate',
    path: '/account/files',
    label: 'Fișiere',
    responseMessage: () => 'Deschid fișierele...'
  },
  'nav.integrations': {
    type: 'navigate',
    path: '/account/integrations',
    label: 'Integrări',
    responseMessage: () => 'Deschid integrările...'
  },
  'nav.chat_widget': {
    type: 'navigate',
    path: '/account/chat-widget',
    label: 'Chat Widget',
    responseMessage: () => 'Deschid configurarea widget-ului...'
  },
  'nav.calendar': {
    type: 'navigate',
    path: '/account/calendar',
    label: 'Calendar',
    responseMessage: () => 'Deschid calendarul...'
  },
  'nav.phone_numbers': {
    type: 'navigate',
    path: '/account/phone-numbers',
    label: 'Numere Telefon',
    responseMessage: () => 'Deschid numerele de telefon...'
  },
  'nav.outbound': {
    type: 'navigate',
    path: '/account/outbound',
    label: 'Apeluri Ieșire',
    responseMessage: () => 'Deschid campaniile outbound...'
  },
  'nav.contacts': {
    type: 'navigate',
    path: '/account/contacts',
    label: 'Contacte',
    responseMessage: () => 'Deschid contactele...'
  },
  'nav.settings': {
    type: 'navigate',
    path: '/account/settings',
    label: 'Setări',
    responseMessage: () => 'Deschid setările...'
  },
  'nav.pricing': {
    type: 'navigate',
    path: '/pricing',
    label: 'Prețuri',
    responseMessage: () => 'Deschid pagina de prețuri...'
  },
  'nav.help': {
    type: 'navigate',
    path: '/help',
    label: 'Ajutor',
    responseMessage: () => 'Deschid pagina de ajutor...'
  },

  // ==================== AGENT ACTIONS ====================
  'agent.create': {
    type: 'multi-step',
    responseMessage: (params) => `Creez agentul "${params.agent_name || 'Noul Meu Agent'}"... Urmărește cursorul!`,
    steps: (params) => [
      { type: 'navigate', path: '/account/kalina-agents', label: 'Pagina Agenți' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-action="new-agent"]', label: 'Buton Agent Nou' },
      { type: 'wait', duration: 1000 },
      { type: 'click', target: `[data-agent-type="${params.agent_type || 'blank'}"]`, label: `Tip: ${params.agent_type || 'blank'}` },
      { type: 'wait', duration: 400 },
      { type: 'click', target: '[data-action="next-step"]', label: 'Continuă' },
      { type: 'wait', duration: 800 },
      { type: 'type', target: '[data-input="agent-name"]', value: params.agent_name || 'Noul Meu Agent', label: `Nume: ${params.agent_name || 'Noul Meu Agent'}` },
      { type: 'wait', duration: 400 },
      ...(params.website_url ? [
        { type: 'type', target: '[data-input="website-url"]', value: params.website_url, label: `Website: ${params.website_url}` } as ActionStep,
        { type: 'wait', duration: 400 } as ActionStep,
      ] : []),
      { type: 'click', target: '[data-action="create-agent"]', label: 'Creează Agent' },
    ]
  },

  'agent.edit': {
    type: 'multi-step',
    responseMessage: (params) => `Caut agentul "${params.agent_name}"...`,
    steps: (params) => [
      { type: 'navigate', path: '/account/kalina-agents', label: 'Pagina Agenți' },
      { type: 'wait', duration: 800 },
      ...(params.agent_name ? [
        { type: 'click', target: `[data-agent-name="${params.agent_name}"]`, label: `Agent: ${params.agent_name}` } as ActionStep,
      ] : [
        { type: 'click', target: '[data-agent-row]:first-child', label: 'Primul agent' } as ActionStep,
      ]),
    ]
  },

  'agent.delete': {
    type: 'multi-step',
    responseMessage: (params) => `Voi șterge agentul "${params.agent_name}"...`,
    steps: (params) => [
      { type: 'navigate', path: '/account/kalina-agents', label: 'Pagina Agenți' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: `[data-agent-name="${params.agent_name}"] [data-action="agent-menu"]`, label: 'Meniu agent' },
      { type: 'wait', duration: 300 },
      { type: 'click', target: '[data-action="delete-agent"]', label: 'Șterge' },
    ]
  },

  'agent.duplicate': {
    type: 'multi-step',
    responseMessage: () => 'Duplic agentul...',
    steps: (params) => [
      { type: 'navigate', path: '/account/kalina-agents', label: 'Pagina Agenți' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: `[data-agent-name="${params.agent_name}"] [data-action="agent-menu"]`, label: 'Meniu agent' },
      { type: 'wait', duration: 300 },
      { type: 'click', target: '[data-action="duplicate-agent"]', label: 'Duplică' },
    ]
  },

  'agent.test_call': {
    type: 'multi-step',
    responseMessage: () => 'Pornesc apelul de test...',
    steps: () => [
      { type: 'navigate', path: '/account/kalina-agents', label: 'Pagina Agenți' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-action="test-call"]:first-of-type', label: 'Test Apel' },
    ]
  },

  'agent.edit_name': {
    type: 'multi-step',
    responseMessage: (params) => `Schimb numele agentului în "${params.new_name}"... Urmărește cursorul!`,
    steps: (params) => {
      // First, we need to find the agent and get its ID
      // For now, we'll navigate to agents page and search
      const steps: ActionStep[] = [
        { type: 'navigate', path: '/account/kalina-agents', label: 'Pagina Agenți' },
        { type: 'wait', duration: 800 },
      ];

      // If we have agent name, search for it
      if (params.agent_name) {
        steps.push(
          { type: 'click', target: `[data-agent-name="${params.agent_name}"]`, label: `Agent: ${params.agent_name}` },
          { type: 'wait', duration: 1000 },
        );
      }

      // Now edit the name
      if (params.new_name) {
        steps.push(
          { type: 'click', target: '[data-input="agent-name"]', label: 'Câmp Nume' },
          { type: 'wait', duration: 200 },
          { type: 'type', target: '[data-input="agent-name"]', value: params.new_name, label: `Nume nou: ${params.new_name}` },
          { type: 'wait', duration: 500 },
          { type: 'click', target: '[data-action="save-agent"]', label: 'Salvează' },
        );
      }

      return steps;
    }
  },

  'agent.edit_prompt': {
    type: 'multi-step',
    responseMessage: (params) => `Editez promptul${params.agent_name ? ` pentru agentul "${params.agent_name}"` : ''}...`,
    steps: (params) => {
      const steps: ActionStep[] = [
        { type: 'navigate', path: '/account/kalina-agents', label: 'Pagina Agenți' },
        { type: 'wait', duration: 800 },
      ];

      // If we have agent name, search for it
      if (params.agent_name) {
        steps.push(
          { type: 'click', target: `[data-agent-name="${params.agent_name}"]`, label: `Agent: ${params.agent_name}` },
          { type: 'wait', duration: 1000 },
        );
      }

      // Edit the prompt
      if (params.new_prompt) {
        steps.push(
          { type: 'click', target: '[data-input="system-prompt"]', label: 'System Prompt' },
          { type: 'wait', duration: 200 },
          { type: 'type', target: '[data-input="system-prompt"]', value: params.new_prompt, label: 'Editez promptul...' },
          { type: 'wait', duration: 500 },
          { type: 'click', target: '[data-action="save-agent"]', label: 'Salvează' },
        );
      }

      return steps;
    }
  },

  'agent.toggle_status': {
    type: 'multi-step',
    responseMessage: (params) => `${params.activate ? 'Activez' : 'Dezactivez'} agentul${params.agent_name ? ` "${params.agent_name}"` : ''}...`,
    steps: (params) => [
      { type: 'navigate', path: '/account/kalina-agents', label: 'Pagina Agenți' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: `[data-agent-name="${params.agent_name}"] [data-action="agent-menu"]`, label: 'Meniu agent' },
      { type: 'wait', duration: 300 },
      { type: 'click', target: '[data-action="toggle-agent-status"]', label: params.activate ? 'Activează' : 'Dezactivează' },
    ]
  },

  'agent.change_voice': {
    type: 'multi-step',
    responseMessage: (params) => `Schimb vocea${params.voice_criteria ? ` în una ${params.voice_criteria}` : ''}...`,
    steps: (params) => {
      const steps: ActionStep[] = [];

      // If we have an agent name, navigate to that agent first
      if (params.agent_name) {
        steps.push(
          { type: 'navigate', path: '/account/kalina-agents', label: 'Pagina Agenți' },
          { type: 'wait', duration: 800 },
          { type: 'click', target: `[data-agent-name="${params.agent_name}"]`, label: `Agent: ${params.agent_name}` },
          { type: 'wait', duration: 1000 },
        );
      }

      // Navigate to voices section
      steps.push(
        { type: 'click', target: '[data-section="voice"]', label: 'Secțiunea Voce' },
        { type: 'wait', duration: 500 },
      );

      // If we have voice criteria, we could filter, but for now just open voices
      steps.push(
        { type: 'navigate', path: '/account/voices', label: 'Galeria de Voci' },
        { type: 'wait', duration: 800 },
      );

      return steps;
    }
  },

  'agent.change_language': {
    type: 'multi-step',
    responseMessage: (params) => `Schimb limba în ${params.language === 'en' ? 'engleză' : params.language === 'ro' ? 'română' : params.language}...`,
    steps: () => [
      // This would need agent edit page with specific agent
      { type: 'navigate', path: '/account/kalina-agents', label: 'Pagina Agenți' },
    ]
  },

  // ==================== WORKFLOW ACTIONS ====================
  'workflow.create': {
    type: 'multi-step',
    responseMessage: () => 'Creez un workflow nou...',
    steps: () => [
      { type: 'navigate', path: '/account/workflow', label: 'Workflow' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-action="new-workflow"]', label: 'Workflow Nou' },
    ]
  },

  'workflow.delete': {
    type: 'multi-step',
    responseMessage: () => 'Șterg workflow-ul...',
    steps: (params) => [
      { type: 'navigate', path: '/account/workflow', label: 'Workflow' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: `[data-workflow-name="${params.workflow_name}"] [data-action="workflow-menu"]`, label: 'Meniu' },
      { type: 'wait', duration: 300 },
      { type: 'click', target: '[data-action="delete-workflow"]', label: 'Șterge' },
    ]
  },

  // ==================== CONTACT ACTIONS ====================
  'contact.create': {
    type: 'multi-step',
    responseMessage: () => 'Creez un contact nou...',
    steps: () => [
      { type: 'navigate', path: '/account/contacts', label: 'Contacte' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-action="new-contact"]', label: 'Contact Nou' },
    ]
  },

  'contact.import_csv': {
    type: 'multi-step',
    responseMessage: () => 'Deschid importul de CSV...',
    steps: () => [
      { type: 'navigate', path: '/account/contacts', label: 'Contacte' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-action="import-csv"]', label: 'Import CSV' },
    ]
  },

  'lead.create': {
    type: 'multi-step',
    responseMessage: () => 'Creez un lead nou...',
    steps: () => [
      { type: 'navigate', path: '/account/leads', label: 'Leads' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-action="new-lead"]', label: 'Lead Nou' },
    ]
  },

  // ==================== INTEGRATION ACTIONS ====================
  'integration.connect_google_sheets': {
    type: 'multi-step',
    responseMessage: () => 'Conectez Google Sheets...',
    steps: () => [
      { type: 'navigate', path: '/account/integrations', label: 'Integrări' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-integration="google-sheets"]', label: 'Google Sheets' },
      { type: 'wait', duration: 500 },
      { type: 'click', target: '[data-action="connect"]', label: 'Conectează' },
    ]
  },

  'integration.connect_zoho': {
    type: 'multi-step',
    responseMessage: () => 'Conectez Zoho CRM...',
    steps: () => [
      { type: 'navigate', path: '/account/integrations', label: 'Integrări' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-integration="zoho"]', label: 'Zoho CRM' },
      { type: 'wait', duration: 500 },
      { type: 'click', target: '[data-action="connect"]', label: 'Conectează' },
    ]
  },

  'webhook.create': {
    type: 'multi-step',
    responseMessage: () => 'Creez un webhook...',
    steps: () => [
      { type: 'navigate', path: '/account/webhooks', label: 'Webhooks' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-action="new-webhook"]', label: 'Webhook Nou' },
    ]
  },

  // ==================== CALENDAR ACTIONS ====================
  'calendar.create_event': {
    type: 'multi-step',
    responseMessage: () => 'Creez un eveniment...',
    steps: () => [
      { type: 'navigate', path: '/account/calendar', label: 'Calendar' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-action="new-event"]', label: 'Eveniment Nou' },
    ]
  },

  // ==================== OUTBOUND ACTIONS ====================
  'outbound.create_campaign': {
    type: 'multi-step',
    responseMessage: () => 'Creez o campanie de apeluri...',
    steps: () => [
      { type: 'navigate', path: '/account/outbound', label: 'Apeluri Ieșire' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-action="new-campaign"]', label: 'Campanie Nouă' },
    ]
  },

  // ==================== VOICE ACTIONS ====================
  'voice.clone': {
    type: 'multi-step',
    responseMessage: () => 'Deschid clonarea vocii...',
    steps: () => [
      { type: 'navigate', path: '/account/voice-clone', label: 'Clonare Voce' },
    ]
  },

  'voice.play_sample': {
    type: 'multi-step',
    responseMessage: () => 'Deschid galeria de voci...',
    steps: () => [
      { type: 'navigate', path: '/account/voices', label: 'Voci' },
    ]
  },

  // ==================== SETTINGS ACTIONS ====================
  'settings.change_ui_language': {
    type: 'multi-step',
    responseMessage: (params) => `Schimb limba interfeței în ${params.language === 'en' ? 'engleză' : 'română'}...`,
    steps: () => [
      { type: 'navigate', path: '/account/settings', label: 'Setări' },
      { type: 'wait', duration: 800 },
      { type: 'click', target: '[data-setting="language"]', label: 'Limbă' },
    ]
  },
};

/**
 * Get action definition by intent ID
 */
export function getAction(intentId: string): ActionDefinition | null {
  return ACTION_CATALOG[intentId] || null;
}

/**
 * Get response message for an action
 */
export function getResponseMessage(intentId: string, params: Record<string, any>): string {
  const action = ACTION_CATALOG[intentId];
  if (!action) return 'Procesez comanda...';

  if (action.responseMessage) {
    return action.responseMessage(params);
  }

  if (action.type === 'navigate' && action.label) {
    return `Navighez la ${action.label}...`;
  }

  return 'Urmărește cursorul...';
}

/**
 * Get action steps for multi-step actions
 */
export function getActionSteps(intentId: string, params: Record<string, any>): ActionStep[] {
  const action = ACTION_CATALOG[intentId];
  if (!action) return [];

  if (action.type === 'navigate' && action.path) {
    return [
      { type: 'navigate', path: action.path, label: action.label || 'Navigare' }
    ];
  }

  if (action.type === 'multi-step' && action.steps) {
    return action.steps(params);
  }

  return [];
}
