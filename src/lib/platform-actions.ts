/**
 * Platform Actions Library
 * 
 * Complete library of all actions the AI assistant can perform on the platform.
 * Each action is a high-level operation that can be executed programmatically.
 */

import { ActionStep } from './ai-assistant';
import { buildPageContext, extractAgentsListData } from './page-context';

// ============================================================================
// Action Result Types
// ============================================================================

export interface ActionResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
}

// ============================================================================
// Agent Management Actions
// ============================================================================

/**
 * Edit agent name
 */
export function createEditAgentNameAction(agentName: string, newName: string): ActionStep[] {
    return [
        { type: 'navigate', path: '/account/kalina-agents', label: 'Agents List' },
        { type: 'wait', duration: 800 },
        // Click on the agent row to open edit page
        { type: 'click', target: `a[href*="agent-edit"]:has-text("${agentName}")`, label: `Open Agent: ${agentName}` },
        { type: 'wait', duration: 1500 },
        // Click on the h1 title to make it editable
        { type: 'click', target: 'h1.page-title', label: 'Click Agent Name' },
        { type: 'wait', duration: 300 },
        // Clear and type new name
        { type: 'type', target: 'input.page-title', value: newName, label: `New Name: ${newName}` },
        { type: 'wait', duration: 500 },
        // Click save button (appears after changes)
        { type: 'click', target: 'button.bg-zinc-900:has-text("Save")', label: 'Save Changes' },
    ];
}

/**
 * Edit agent system prompt
 */
export function createEditAgentPromptAction(agentName: string, newPrompt: string): ActionStep[] {
    return [
        { type: 'navigate', path: '/account/kalina-agents', label: 'Agents List' },
        { type: 'wait', duration: 800 },
        // Click on the agent row to open edit page
        { type: 'click', target: `a[href*="agent-edit"]:has-text("${agentName}")`, label: `Open Agent: ${agentName}` },
        { type: 'wait', duration: 1500 },
        // Click on the system prompt textarea
        { type: 'click', target: 'textarea.font-mono', label: 'System Prompt Field' },
        { type: 'wait', duration: 300 },
        // Clear and type new prompt
        { type: 'type', target: 'textarea.font-mono', value: newPrompt, label: 'New Prompt' },
        { type: 'wait', duration: 500 },
        // Click save button
        { type: 'click', target: 'button.bg-zinc-900:has-text("Save")', label: 'Save Changes' },
    ];
}

/**
 * Change agent voice
 */
export function createChangeAgentVoiceAction(agentId: string, voiceId: string): ActionStep[] {
    return [
        { type: 'navigate', path: `/account/agent-edit/${agentId}`, label: 'Agent Edit' },
        { type: 'wait', duration: 1000 },
        { type: 'click', target: '[data-section="voice"]', label: 'Voice Section' },
        { type: 'wait', duration: 500 },
        { type: 'click', target: `[data-voice-id="${voiceId}"]`, label: 'Select Voice' },
        { type: 'wait', duration: 500 },
        { type: 'click', target: '[data-action="save-agent"]', label: 'Save Changes' },
    ];
}

/**
 * Toggle agent status (activate/deactivate)
 */
export function createToggleAgentStatusAction(agentId: string): ActionStep[] {
    return [
        { type: 'navigate', path: '/account/kalina-agents', label: 'Agents List' },
        { type: 'wait', duration: 800 },
        { type: 'click', target: `[data-agent-id="${agentId}"] [data-action="agent-menu"]`, label: 'Agent Menu' },
        { type: 'wait', duration: 300 },
        { type: 'click', target: '[data-action="toggle-agent-status"]', label: 'Toggle Status' },
    ];
}

/**
 * Delete agent
 */
export function createDeleteAgentAction(agentId: string): ActionStep[] {
    return [
        { type: 'navigate', path: '/account/kalina-agents', label: 'Agents List' },
        { type: 'wait', duration: 800 },
        { type: 'click', target: `[data-agent-id="${agentId}"] [data-action="agent-menu"]`, label: 'Agent Menu' },
        { type: 'wait', duration: 300 },
        { type: 'click', target: '[data-action="delete-agent"]', label: 'Delete Agent' },
        { type: 'wait', duration: 500 },
        { type: 'click', target: '[data-action="confirm-delete"]', label: 'Confirm Delete' },
    ];
}

/**
 * Duplicate agent
 */
export function createDuplicateAgentAction(agentId: string): ActionStep[] {
    return [
        { type: 'navigate', path: '/account/kalina-agents', label: 'Agents List' },
        { type: 'wait', duration: 800 },
        { type: 'click', target: `[data-agent-id="${agentId}"] [data-action="agent-menu"]`, label: 'Agent Menu' },
        { type: 'wait', duration: 300 },
        { type: 'click', target: '[data-action="duplicate-agent"]', label: 'Duplicate Agent' },
    ];
}

// ============================================================================
// Data Reading Actions
// ============================================================================

/**
 * Get list of all agents
 */
export function getAgentsList(): ActionResult {
    try {
        const context = buildPageContext();

        if (!context.path.includes('/kalina-agents')) {
            return {
                success: false,
                message: 'Not on agents page',
                error: 'Navigate to agents page first'
            };
        }

        const agents = extractAgentsListData();

        return {
            success: true,
            message: `Found ${agents.length} agents`,
            data: agents
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to get agents list',
            error: error.message
        };
    }
}

/**
 * Find agent by name
 */
export function findAgentByName(name: string): ActionResult {
    try {
        const agents = extractAgentsListData();
        const found = agents.find(a =>
            a.name.toLowerCase().includes(name.toLowerCase())
        );

        if (found) {
            return {
                success: true,
                message: `Found agent: ${found.name}`,
                data: found
            };
        }

        return {
            success: false,
            message: `Agent "${name}" not found`,
            error: 'No matching agent'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to search agents',
            error: error.message
        };
    }
}

/**
 * Get current page information
 */
export function getCurrentPageInfo(): ActionResult {
    try {
        const context = buildPageContext();

        return {
            success: true,
            message: `Current page: ${context.pageName}`,
            data: {
                path: context.path,
                name: context.pageName,
                type: context.pageType,
                availableActions: context.availableActions,
                interactiveElementsCount: context.interactiveElements.length
            }
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to get page info',
            error: error.message
        };
    }
}

// ============================================================================
// Form Interaction Actions
// ============================================================================

/**
 * Fill a form field
 */
export function createFillFieldAction(fieldSelector: string, value: string, label?: string): ActionStep[] {
    return [
        { type: 'click', target: fieldSelector, label: label || 'Field' },
        { type: 'wait', duration: 200 },
        { type: 'type', target: fieldSelector, value, label: `Typing: ${value.substring(0, 30)}...` },
        { type: 'wait', duration: 300 },
    ];
}

/**
 * Click a button
 */
export function createClickButtonAction(buttonSelector: string, label?: string): ActionStep[] {
    return [
        { type: 'click', target: buttonSelector, label: label || 'Button' },
        { type: 'wait', duration: 500 },
    ];
}

/**
 * Select from dropdown
 */
export function createSelectOptionAction(selectSelector: string, optionValue: string, label?: string): ActionStep[] {
    return [
        { type: 'click', target: selectSelector, label: label || 'Select' },
        { type: 'wait', duration: 300 },
        { type: 'click', target: `${selectSelector} option[value="${optionValue}"]`, label: `Option: ${optionValue}` },
        { type: 'wait', duration: 300 },
    ];
}

// ============================================================================
// Navigation Actions
// ============================================================================

/**
 * Navigate to a specific page
 */
export function createNavigateAction(path: string, label?: string): ActionStep[] {
    return [
        { type: 'navigate', path, label: label || path },
        { type: 'wait', duration: 800 },
    ];
}

// ============================================================================
// Complex Multi-Step Actions
// ============================================================================

/**
 * Create a new agent with full configuration
 */
export function createCompleteAgentCreationAction(params: {
    name: string;
    type?: 'blank' | 'website' | 'business';
    prompt?: string;
    websiteUrl?: string;
    voiceId?: string;
}): ActionStep[] {
    const steps: ActionStep[] = [
        { type: 'navigate', path: '/account/kalina-agents', label: 'Agents List' },
        { type: 'wait', duration: 800 },
        { type: 'click', target: '[data-action="new-agent"]', label: 'New Agent' },
        { type: 'wait', duration: 1000 },
    ];

    // Select agent type
    const agentType = params.type || 'blank';
    steps.push({
        type: 'click',
        target: `[data-agent-type="${agentType}"]`,
        label: agentType === 'blank' ? 'Blank Agent' : agentType === 'website' ? 'Web Assistant' : 'Business Agent'
    });
    steps.push({ type: 'wait', duration: 400 });

    // Next step
    steps.push({ type: 'click', target: '[data-action="next-step"]', label: 'Continue' });
    steps.push({ type: 'wait', duration: 800 });

    // Agent name
    steps.push({
        type: 'type',
        target: '[data-input="agent-name"]',
        value: params.name,
        label: `Name: ${params.name}`
    });
    steps.push({ type: 'wait', duration: 400 });

    // Website URL if applicable
    if (params.websiteUrl && agentType === 'website') {
        steps.push({
            type: 'type',
            target: '[data-input="website-url"]',
            value: params.websiteUrl,
            label: `Website: ${params.websiteUrl}`
        });
        steps.push({ type: 'wait', duration: 400 });
    }

    // System prompt if provided
    if (params.prompt) {
        steps.push({
            type: 'type',
            target: '[data-input="system-prompt"]',
            value: params.prompt,
            label: 'System Prompt'
        });
        steps.push({ type: 'wait', duration: 400 });
    }

    // Voice selection if provided
    if (params.voiceId) {
        steps.push({
            type: 'click',
            target: `[data-voice-id="${params.voiceId}"]`,
            label: 'Select Voice'
        });
        steps.push({ type: 'wait', duration: 400 });
    }

    // Create agent
    steps.push({ type: 'click', target: '[data-action="create-agent"]', label: 'Create Agent' });

    return steps;
}

/**
 * Search for an agent and open it for editing
 */
export function createSearchAndEditAgentAction(searchQuery: string): ActionStep[] {
    return [
        { type: 'navigate', path: '/account/kalina-agents', label: 'Agents List' },
        { type: 'wait', duration: 800 },
        { type: 'click', target: 'input[placeholder*="Search"]', label: 'Search Field' },
        { type: 'wait', duration: 200 },
        { type: 'type', target: 'input[placeholder*="Search"]', value: searchQuery, label: `Search: ${searchQuery}` },
        { type: 'wait', duration: 1000 }, // Wait for search results
        { type: 'click', target: '[data-agent-row]:first-child', label: 'First Result' },
    ];
}

// ============================================================================
// Action Factory
// ============================================================================

/**
 * Create action steps based on intent and parameters
 */
export function createActionSteps(
    intent: string,
    params: Record<string, any>
): ActionStep[] | null {
    switch (intent) {
        case 'edit_agent_name':
            if (params.agentId && params.newName) {
                return createEditAgentNameAction(params.agentId, params.newName);
            }
            break;

        case 'edit_agent_prompt':
            if (params.agentId && params.newPrompt) {
                return createEditAgentPromptAction(params.agentId, params.newPrompt);
            }
            break;

        case 'change_agent_voice':
            if (params.agentId && params.voiceId) {
                return createChangeAgentVoiceAction(params.agentId, params.voiceId);
            }
            break;

        case 'toggle_agent_status':
            if (params.agentId) {
                return createToggleAgentStatusAction(params.agentId);
            }
            break;

        case 'delete_agent':
            if (params.agentId) {
                return createDeleteAgentAction(params.agentId);
            }
            break;

        case 'duplicate_agent':
            if (params.agentId) {
                return createDuplicateAgentAction(params.agentId);
            }
            break;

        case 'create_agent':
            if (params.name) {
                return createCompleteAgentCreationAction({
                    name: params.name,
                    type: params.type,
                    prompt: params.prompt,
                    websiteUrl: params.websiteUrl,
                    voiceId: params.voiceId
                });
            }
            break;

        case 'search_and_edit_agent':
            if (params.searchQuery) {
                return createSearchAndEditAgentAction(params.searchQuery);
            }
            break;

        case 'navigate':
            if (params.path) {
                return createNavigateAction(params.path, params.label);
            }
            break;

        case 'fill_field':
            if (params.selector && params.value) {
                return createFillFieldAction(params.selector, params.value, params.label);
            }
            break;

        case 'click_button':
            if (params.selector) {
                return createClickButtonAction(params.selector, params.label);
            }
            break;
    }

    return null;
}

export default {
    createEditAgentNameAction,
    createEditAgentPromptAction,
    createChangeAgentVoiceAction,
    createToggleAgentStatusAction,
    createDeleteAgentAction,
    createDuplicateAgentAction,
    createCompleteAgentCreationAction,
    createSearchAndEditAgentAction,
    createNavigateAction,
    createFillFieldAction,
    createClickButtonAction,
    createSelectOptionAction,
    createActionSteps,
    getAgentsList,
    findAgentByName,
    getCurrentPageInfo,
};
