/**
 * Page Context System
 * 
 * Provides comprehensive DOM analysis and page understanding for the AI assistant.
 * Enables the assistant to read, understand, and interact with any page on the platform.
 */

import { useLocation } from 'react-router-dom';

// ============================================================================
// Types
// ============================================================================

export interface InteractiveElement {
    type: 'button' | 'input' | 'link' | 'select' | 'checkbox' | 'textarea' | 'custom';
    selector: string;
    label: string;
    value?: string;
    placeholder?: string;
    dataAttributes: Record<string, string>;
    isVisible: boolean;
    isEnabled: boolean;
    rect?: DOMRect;
}

export interface PageContext {
    path: string;
    pageName: string;
    pageType: 'list' | 'detail' | 'form' | 'dashboard' | 'settings' | 'unknown';
    interactiveElements: InteractiveElement[];
    dataElements: Record<string, any>;
    availableActions: string[];
    currentState: Record<string, any>;
}

export interface AgentData {
    id: string;
    agent_id: string;
    name: string;
    description?: string;
    voice_id?: string;
    voice_name?: string;
    is_active: boolean;
    created_at: string;
}

// ============================================================================
// Page Type Detection
// ============================================================================

const PAGE_PATTERNS: Record<string, { type: PageContext['pageType']; name: string }> = {
    '/account/kalina-agents': { type: 'list', name: 'Agents List' },
    '/account/agent-edit/': { type: 'detail', name: 'Agent Edit' },
    '/account/agent-consultant': { type: 'form', name: 'Agent Creation' },
    '/account/workflow': { type: 'list', name: 'Workflows' },
    '/account/voices': { type: 'list', name: 'Voices' },
    '/account/conversation-analytics': { type: 'list', name: 'Call History' },
    '/account/settings': { type: 'settings', name: 'Settings' },
    '/account': { type: 'dashboard', name: 'Dashboard' },
};

function detectPageType(path: string): { type: PageContext['pageType']; name: string } {
    for (const [pattern, info] of Object.entries(PAGE_PATTERNS)) {
        if (path.startsWith(pattern)) {
            return info;
        }
    }
    return { type: 'unknown', name: 'Unknown Page' };
}

// ============================================================================
// DOM Analysis
// ============================================================================

/**
 * Extract all interactive elements from the current page
 */
export function extractInteractiveElements(): InteractiveElement[] {
    const elements: InteractiveElement[] = [];

    // Buttons
    document.querySelectorAll('button:not([disabled])').forEach((el) => {
        const button = el as HTMLButtonElement;
        const rect = button.getBoundingClientRect();

        // Skip hidden elements
        if (rect.width === 0 || rect.height === 0) return;

        const dataAttrs: Record<string, string> = {};
        Array.from(button.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                dataAttrs[attr.name] = attr.value;
            }
        });

        elements.push({
            type: 'button',
            selector: generateSelector(button),
            label: button.textContent?.trim() || button.getAttribute('aria-label') || 'Button',
            dataAttributes: dataAttrs,
            isVisible: true,
            isEnabled: !button.disabled,
            rect
        });
    });

    // Inputs
    document.querySelectorAll('input:not([type="hidden"]):not([disabled])').forEach((el) => {
        const input = el as HTMLInputElement;
        const rect = input.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) return;

        const dataAttrs: Record<string, string> = {};
        Array.from(input.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                dataAttrs[attr.name] = attr.value;
            }
        });

        const label = input.getAttribute('aria-label') ||
            input.getAttribute('placeholder') ||
            input.name ||
            'Input';

        elements.push({
            type: 'input',
            selector: generateSelector(input),
            label,
            value: input.value,
            placeholder: input.placeholder,
            dataAttributes: dataAttrs,
            isVisible: true,
            isEnabled: !input.disabled,
            rect
        });
    });

    // Textareas
    document.querySelectorAll('textarea:not([disabled])').forEach((el) => {
        const textarea = el as HTMLTextAreaElement;
        const rect = textarea.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) return;

        const dataAttrs: Record<string, string> = {};
        Array.from(textarea.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                dataAttrs[attr.name] = attr.value;
            }
        });

        elements.push({
            type: 'textarea',
            selector: generateSelector(textarea),
            label: textarea.getAttribute('aria-label') || textarea.placeholder || 'Textarea',
            value: textarea.value,
            placeholder: textarea.placeholder,
            dataAttributes: dataAttrs,
            isVisible: true,
            isEnabled: !textarea.disabled,
            rect
        });
    });

    // Links
    document.querySelectorAll('a[href]').forEach((el) => {
        const link = el as HTMLAnchorElement;
        const rect = link.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) return;

        const dataAttrs: Record<string, string> = {};
        Array.from(link.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                dataAttrs[attr.name] = attr.value;
            }
        });

        elements.push({
            type: 'link',
            selector: generateSelector(link),
            label: link.textContent?.trim() || link.getAttribute('aria-label') || 'Link',
            value: link.href,
            dataAttributes: dataAttrs,
            isVisible: true,
            isEnabled: true,
            rect
        });
    });

    // Selects
    document.querySelectorAll('select:not([disabled])').forEach((el) => {
        const select = el as HTMLSelectElement;
        const rect = select.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) return;

        const dataAttrs: Record<string, string> = {};
        Array.from(select.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                dataAttrs[attr.name] = attr.value;
            }
        });

        elements.push({
            type: 'select',
            selector: generateSelector(select),
            label: select.getAttribute('aria-label') || select.name || 'Select',
            value: select.value,
            dataAttributes: dataAttrs,
            isVisible: true,
            isEnabled: !select.disabled,
            rect
        });
    });

    return elements;
}

/**
 * Generate a unique CSS selector for an element
 */
function generateSelector(element: Element): string {
    // Prefer data-* attributes for stability
    const dataAction = element.getAttribute('data-action');
    if (dataAction) return `[data-action="${dataAction}"]`;

    const dataInput = element.getAttribute('data-input');
    if (dataInput) return `[data-input="${dataInput}"]`;

    const dataAgentId = element.getAttribute('data-agent-id');
    if (dataAgentId) return `[data-agent-id="${dataAgentId}"]`;

    const dataNavPath = element.getAttribute('data-nav-path');
    if (dataNavPath) return `[data-nav-path="${dataNavPath}"]`;

    // Fallback to ID
    if (element.id) return `#${element.id}`;

    // Fallback to class + nth-child
    const classes = Array.from(element.classList).filter(c => !c.startsWith('hover:') && !c.startsWith('focus:'));
    if (classes.length > 0) {
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter(el =>
                el.tagName === element.tagName &&
                Array.from(el.classList).some(c => classes.includes(c))
            );
            const index = siblings.indexOf(element);
            if (index >= 0) {
                return `.${classes[0]}:nth-of-type(${index + 1})`;
            }
        }
        return `.${classes[0]}`;
    }

    // Last resort: tag name + nth-child
    const parent = element.parentElement;
    if (parent) {
        const index = Array.from(parent.children).indexOf(element);
        return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
    }

    return element.tagName.toLowerCase();
}

// ============================================================================
// Page-Specific Data Extraction
// ============================================================================

/**
 * Extract agent data from the Agents List page
 */
export function extractAgentsListData(): AgentData[] {
    const agents: AgentData[] = [];

    document.querySelectorAll('[data-agent-row]').forEach((row) => {
        const agentId = row.getAttribute('data-agent-id');
        const agentName = row.getAttribute('data-agent-name');

        if (agentId && agentName) {
            agents.push({
                id: agentId,
                agent_id: agentId,
                name: agentName,
                is_active: true, // We can enhance this by reading the actual status
                created_at: new Date().toISOString()
            });
        }
    });

    return agents;
}

/**
 * Extract current agent data from Agent Edit page
 */
export function extractAgentEditData(): Partial<AgentData> | null {
    const path = window.location.pathname;
    const match = path.match(/\/agent-edit\/([^/]+)/);

    if (!match) return null;

    const agentId = match[1];
    const data: Partial<AgentData> = {
        agent_id: agentId
    };

    // Try to extract agent name from input
    const nameInput = document.querySelector('[data-input="agent-name"]') as HTMLInputElement;
    if (nameInput) {
        data.name = nameInput.value;
    }

    // Try to extract system prompt
    const promptTextarea = document.querySelector('[data-input="system-prompt"]') as HTMLTextAreaElement;
    if (promptTextarea) {
        (data as any).system_prompt = promptTextarea.value;
    }

    return data;
}

// ============================================================================
// Available Actions Detection
// ============================================================================

/**
 * Detect available actions based on current page and interactive elements
 */
export function detectAvailableActions(elements: InteractiveElement[], path: string): string[] {
    const actions: string[] = [];

    // Navigation actions (always available)
    actions.push('navigate_to_page');

    // Page-specific actions
    if (path.includes('/kalina-agents')) {
        actions.push('create_agent', 'list_agents', 'search_agents');

        // Check if we can edit/delete agents
        const hasAgentRows = elements.some(el => el.dataAttributes['data-agent-row'] !== undefined);
        if (hasAgentRows) {
            actions.push('edit_agent', 'delete_agent', 'duplicate_agent', 'toggle_agent_status');
        }
    }

    if (path.includes('/agent-edit/')) {
        actions.push(
            'edit_agent_name',
            'edit_agent_prompt',
            'change_agent_voice',
            'save_agent_changes',
            'test_agent'
        );
    }

    if (path.includes('/workflow')) {
        actions.push('create_workflow', 'edit_workflow', 'delete_workflow');
    }

    if (path.includes('/voices')) {
        actions.push('upload_voice', 'clone_voice', 'delete_voice');
    }

    // Generic actions based on available elements
    const hasInputs = elements.some(el => el.type === 'input' || el.type === 'textarea');
    if (hasInputs) {
        actions.push('fill_form');
    }

    const hasButtons = elements.some(el => el.type === 'button');
    if (hasButtons) {
        actions.push('click_button');
    }

    return [...new Set(actions)]; // Remove duplicates
}

// ============================================================================
// Main Context Builder
// ============================================================================

/**
 * Build complete page context
 */
export function buildPageContext(): PageContext {
    const path = window.location.pathname;
    const { type, name } = detectPageType(path);
    const elements = extractInteractiveElements();
    const availableActions = detectAvailableActions(elements, path);

    // Extract page-specific data
    const dataElements: Record<string, any> = {};

    if (path.includes('/kalina-agents') && !path.includes('/agent-edit/')) {
        dataElements.agents = extractAgentsListData();
    }

    if (path.includes('/agent-edit/')) {
        dataElements.currentAgent = extractAgentEditData();
    }

    return {
        path,
        pageName: name,
        pageType: type,
        interactiveElements: elements,
        dataElements,
        availableActions,
        currentState: {
            scrollPosition: window.scrollY,
            timestamp: Date.now()
        }
    };
}

/**
 * Get human-readable description of current page context
 */
export function getPageContextDescription(context: PageContext): string {
    const parts: string[] = [];

    parts.push(`You are on the "${context.pageName}" page (${context.path}).`);
    parts.push(`Page type: ${context.pageType}.`);

    if (context.interactiveElements.length > 0) {
        parts.push(`\nAvailable interactive elements (${context.interactiveElements.length}):`);

        // Group by type
        const byType: Record<string, InteractiveElement[]> = {};
        context.interactiveElements.forEach(el => {
            if (!byType[el.type]) byType[el.type] = [];
            byType[el.type].push(el);
        });

        Object.entries(byType).forEach(([type, els]) => {
            parts.push(`  - ${els.length} ${type}(s): ${els.slice(0, 5).map(e => e.label).join(', ')}${els.length > 5 ? '...' : ''}`);
        });
    }

    if (context.dataElements.agents && context.dataElements.agents.length > 0) {
        parts.push(`\nAgents on this page: ${context.dataElements.agents.map((a: AgentData) => a.name).join(', ')}`);
    }

    if (context.dataElements.currentAgent) {
        const agent = context.dataElements.currentAgent;
        parts.push(`\nCurrently editing agent: ${agent.name || agent.agent_id}`);
    }

    parts.push(`\nAvailable actions: ${context.availableActions.join(', ')}`);

    return parts.join('\n');
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook to get current page context
 */
export function usePageContext(): PageContext {
    const location = useLocation();
    return buildPageContext();
}
