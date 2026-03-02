import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowRight, Mic, Trash2, Sparkles, MousePointer2 } from 'lucide-react';
import { cn } from '@/utils/utils';
import { useAuth } from '@/components/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import TypingIndicatorMinimal from '@/components/TypingIndicatorMinimal';
import { MessageFormatter } from '@/components/chat/MessageFormatter';
import { detectAndPrepareAction, ROUTE_LABELS as AI_ROUTE_LABELS } from '@/lib/ai-assistant';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  action?: FrontendAction;
}

// Multi-step action support
interface ActionStep {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'select' | 'scroll';
  target?: string;
  value?: string;
  path?: string;
  duration?: number;
  label?: string;
}

interface FrontendAction {
  action: string;
  page?: string;
  reason?: string;
  agent_id?: string;
  steps?: ActionStep[];
  agent_name?: string;
  agent_type?: string;
  [key: string]: any;
}

interface CursorState {
  visible: boolean;
  x: number;
  y: number;
  clicking: boolean;
  typing: boolean;
  targetLabel?: string;
  typingText?: string;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = 600;
const MIN_HEIGHT = 400;
const MAX_HEIGHT = 700;

const STORAGE_KEY = 'agentauto_chat_messages';
const SIZE_STORAGE_KEY = 'agentauto_chat_size';
const OPEN_STORAGE_KEY = 'agentauto_chat_open';

const PlatformChatWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Persist isOpen state in localStorage
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // AI Cursor state
  const [cursor, setCursor] = useState<CursorState>({
    visible: false,
    x: window.innerWidth - 100,
    y: window.innerHeight - 100,
    clicking: false,
    typing: false,
    targetLabel: undefined,
    typingText: undefined
  });
  const cursorAnimationRef = useRef<number | null>(null);

  // Load messages from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch (e) {
      console.error('Failed to load chat messages:', e);
    }
    return [];
  });

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
      } catch (e) {
        console.error('Failed to save chat messages:', e);
      }
    }
  }, [messages]);

  // Save isOpen state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(OPEN_STORAGE_KEY, isOpen ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to save chat open state:', e);
    }
  }, [isOpen]);

  // Resize state
  const [size, setSize] = useState(() => {
    try {
      const saved = localStorage.getItem(SIZE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { }
    return { width: 400, height: 550 };
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size));
  }, [size]);

  // Voice input
  const { isListening, isSupported, interimTranscript, toggleListening } = useVoiceInput({
    onTranscript: (text) => {
      setInputValue(prev => prev ? `${prev} ${text}` : text);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    language: 'ro-RO',
    continuous: false
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    };
  }, [size]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = resizeStartRef.current.x - e.clientX;
      const deltaY = resizeStartRef.current.y - e.clientY;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartRef.current.width + deltaX));
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStartRef.current.height + deltaY));
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Valid routes map
  const VALID_ROUTES: Record<string, string> = {
    'acasa': '/', 'home': '/', 'dashboard': '/account', 'account': '/account',
    'agenti': '/account/kalina-agents', 'agenți': '/account/kalina-agents', 'agents': '/account/kalina-agents', 'kalina-agents': '/account/kalina-agents',
    'workflow': '/account/workflow', 'workflows': '/account/workflow',
    'voci': '/account/voices', 'voices': '/account/voices', 'voice-clone': '/account/voice-clone',
    'istoric': '/account/conversation-analytics', 'istoricul': '/account/conversation-analytics', 'istoric-apeluri': '/account/conversation-analytics',
    'conversation-analytics': '/account/conversation-analytics', 'analytics': '/account/conversation-analytics', 'analiza': '/account/conversation-analytics', 'apeluri': '/account/conversation-analytics',
    'transcrieri': '/account/transcript', 'transcript': '/account/transcript', 'transcripts': '/account/transcript',
    'agent-analitic': '/account/agent-analytic', 'agent-analytic': '/account/agent-analytic',
    'outbound': '/account/outbound', 'apeluri-iesire': '/account/outbound',
    'contacte': '/account/contacts', 'contacts': '/account/contacts', 'leads': '/account/leads',
    'fisiere': '/account/files', 'fișiere': '/account/files', 'files': '/account/files',
    'data': '/account/data', 'date': '/account/data',
    'telefon': '/account/phone-numbers', 'numere-telefon': '/account/phone-numbers', 'phone-numbers': '/account/phone-numbers', 'phone': '/account/phone-numbers', 'test-call': '/account/test-call',
    'integrari': '/account/integrations', 'integrări': '/account/integrations', 'integrations': '/account/integrations',
    'google-sheets': '/account/integrations/google-sheets', 'zoho': '/account/integrations/zoho',
    'webhooks': '/account/webhooks',
    'chat-widget': '/account/chat-widget', 'widget': '/account/chat-widget',
    'calendar': '/account/calendar',
    'setari': '/account/settings', 'setări': '/account/settings', 'settings': '/account/settings',
    'pricing': '/pricing', 'preturi': '/pricing', 'prețuri': '/pricing',
    'help': '/help', 'ajutor': '/help',
  };

  // Route to label map for cursor display
  const ROUTE_LABELS: Record<string, string> = {
    '/': 'Acasă',
    '/account': 'Dashboard',
    '/account/kalina-agents': 'Agenți',
    '/account/workflow': 'Workflow',
    '/account/voices': 'Voci',
    '/account/conversation-analytics': 'Istoric Apeluri',
    '/account/transcript': 'Transcrieri',
    '/account/agent-analytic': 'Agent Analitic',
    '/account/outbound': 'Apeluri Ieșire',
    '/account/contacts': 'Contacte',
    '/account/leads': 'Leads',
    '/account/files': 'Fișiere',
    '/account/phone-numbers': 'Numere Telefon',
    '/account/integrations': 'Integrări',
    '/account/chat-widget': 'Chat Widget',
    '/account/calendar': 'Calendar',
    '/account/settings': 'Setări',
    '/pricing': 'Prețuri',
    '/help': 'Ajutor',
    '/account/agent-consultant': 'Creare Agent',
  };

  // Wait for element to appear in DOM
  const waitForElement = useCallback((selector: string, timeout = 5000): Promise<HTMLElement | null> => {
    return new Promise((resolve) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        resolve(element);
        return;
      }
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector) as HTMLElement;
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }, []);

  // Animate cursor to any position
  const animateCursorToPosition = useCallback((targetX: number, targetY: number, label: string): Promise<void> => {
    return new Promise((resolve) => {
      const startX = cursor.visible ? cursor.x : window.innerWidth - 80;
      const startY = cursor.visible ? cursor.y : window.innerHeight - 80;

      setCursor(prev => ({
        ...prev,
        visible: true,
        clicking: false,
        typing: false,
        targetLabel: label
      }));

      const duration = 500;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        setCursor(prev => ({
          ...prev,
          x: startX + (targetX - startX) * eased,
          y: startY + (targetY - startY) * eased
        }));

        if (progress < 1) {
          cursorAnimationRef.current = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      cursorAnimationRef.current = requestAnimationFrame(animate);
    });
  }, [cursor.visible, cursor.x, cursor.y]);

  // Animate cursor to element and return it
  const animateCursorToElement = useCallback(async (selector: string, label: string): Promise<HTMLElement | null> => {
    const element = await waitForElement(selector, 3000);
    if (!element) {
      console.log('Element not found:', selector);
      return null;
    }
    const rect = element.getBoundingClientRect();
    await animateCursorToPosition(rect.left + rect.width / 2, rect.top + rect.height / 2, label);
    return element;
  }, [waitForElement, animateCursorToPosition]);

  // Perform click with visual feedback
  const performClick = useCallback(async (element: HTMLElement): Promise<void> => {
    setCursor(prev => ({ ...prev, clicking: true }));

    // Visual feedback
    const originalTransform = element.style.transform;
    const originalBoxShadow = element.style.boxShadow;
    element.style.transition = 'all 0.15s';
    element.style.transform = 'scale(0.97)';
    element.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';

    await new Promise(r => setTimeout(r, 150));

    element.style.transform = originalTransform || '';
    element.style.boxShadow = originalBoxShadow || '';
    element.click();

    setCursor(prev => ({ ...prev, clicking: false }));
    await new Promise(r => setTimeout(r, 300));
  }, []);

  // Type into element with typewriter effect
  const typeIntoElement = useCallback(async (element: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> => {
    element.focus();
    setCursor(prev => ({ ...prev, typing: true, typingText: '' }));

    // Get the native value setter to properly trigger React's event system
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      element instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    // Helper to set value and trigger React's onChange
    const setValueAndTrigger = (value: string) => {
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, value);
      } else {
        element.value = value;
      }
      // Dispatch both input and change events for maximum compatibility
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };

    // Clear first
    setValueAndTrigger('');

    for (let i = 0; i < text.length; i++) {
      await new Promise(r => setTimeout(r, 25 + Math.random() * 25));
      const newValue = text.substring(0, i + 1);
      setValueAndTrigger(newValue);
      setCursor(prev => ({ ...prev, typingText: newValue }));
    }

    setCursor(prev => ({ ...prev, typing: false, typingText: undefined }));
    await new Promise(r => setTimeout(r, 200));
  }, []);

  // Execute a single action step
  const executeStep = useCallback(async (step: ActionStep): Promise<boolean> => {
    console.log('Executing step:', step);

    switch (step.type) {
      case 'navigate': {
        if (!step.path) return false;
        const navElement = await animateCursorToElement(`[data-nav-path="${step.path}"]`, step.label || ROUTE_LABELS[step.path] || 'Pagină');
        if (navElement) {
          await performClick(navElement);
          await new Promise(r => setTimeout(r, 600));
        } else {
          navigate(step.path);
          await new Promise(r => setTimeout(r, 600));
        }
        return true;
      }

      case 'click': {
        if (!step.target) return false;
        const element = await animateCursorToElement(step.target, step.label || 'Click');
        if (element) {
          await performClick(element);
          return true;
        }
        return false;
      }

      case 'type': {
        if (!step.target || !step.value) return false;
        const element = await animateCursorToElement(step.target, step.label || 'Scriu...');
        if (element && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
          await typeIntoElement(element, step.value);
          return true;
        }
        return false;
      }

      case 'select': {
        if (!step.target) return false;
        const element = await animateCursorToElement(step.target, step.label || 'Selectez');
        if (element) {
          await performClick(element);
          await new Promise(r => setTimeout(r, 400));
          return true;
        }
        return false;
      }

      case 'wait': {
        await new Promise(r => setTimeout(r, step.duration || 500));
        return true;
      }

      default:
        return false;
    }
  }, [animateCursorToElement, performClick, typeIntoElement, navigate]);

  // Execute sequence of action steps
  const executeActionSequence = useCallback(async (steps: ActionStep[]): Promise<void> => {
    setIsExecutingAction(true);

    for (const step of steps) {
      await executeStep(step);
    }

    setCursor(prev => ({ ...prev, visible: false }));
    setIsExecutingAction(false);
  }, [executeStep]);

  // Animate cursor to target element
  const animateCursorTo = useCallback((targetPath: string): Promise<void> => {
    return new Promise((resolve) => {
      // Find the sidebar element with this path
      const targetElement = document.querySelector(`[data-nav-path="${targetPath}"]`) as HTMLElement;

      if (!targetElement) {
        console.log('Target element not found for path:', targetPath);
        resolve();
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;

      // Start position (from chat widget area)
      const startX = window.innerWidth - 80;
      const startY = window.innerHeight - 80;

      const label = ROUTE_LABELS[targetPath] || targetPath.split('/').pop() || 'Pagină';

      // Show cursor at start position
      setCursor({
        visible: true,
        x: startX,
        y: startY,
        clicking: false,
        targetLabel: label
      });

      // Animation duration
      const duration = 800;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out-cubic)
        const eased = 1 - Math.pow(1 - progress, 3);

        const currentX = startX + (targetX - startX) * eased;
        const currentY = startY + (targetY - startY) * eased;

        setCursor(prev => ({
          ...prev,
          x: currentX,
          y: currentY
        }));

        if (progress < 1) {
          cursorAnimationRef.current = requestAnimationFrame(animate);
        } else {
          // Click animation
          setCursor(prev => ({ ...prev, clicking: true }));

          // Highlight target element
          targetElement.style.transition = 'all 0.2s';
          targetElement.style.transform = 'scale(1.05)';
          targetElement.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';

          setTimeout(() => {
            targetElement.style.transform = '';
            targetElement.style.boxShadow = '';

            setCursor(prev => ({ ...prev, clicking: false }));

            // Hide cursor after click
            setTimeout(() => {
              setCursor(prev => ({ ...prev, visible: false }));
              resolve();
            }, 300);
          }, 400);
        }
      };

      cursorAnimationRef.current = requestAnimationFrame(animate);
    });
  }, []);

  // Execute frontend action with cursor animation
  const executeFrontendAction = useCallback(async (action: FrontendAction) => {
    console.log('Executing frontend action:', action);

    // If action has explicit steps, execute them
    if (action.steps && action.steps.length > 0) {
      await executeActionSequence(action.steps);
      return;
    }

    switch (action.action) {
      case 'navigate':
        if (action.page) {
          let targetPage = action.page;
          const pageName = action.page.replace(/^\/account\//, '').replace(/^\//, '').toLowerCase();

          if (VALID_ROUTES[pageName]) {
            targetPage = VALID_ROUTES[pageName];
          } else if (!action.page.startsWith('/account/') && !action.page.startsWith('/')) {
            const matchedRoute = VALID_ROUTES[pageName];
            if (matchedRoute) {
              targetPage = matchedRoute;
            }
          }

          // Animate cursor to target, then navigate
          await animateCursorTo(targetPage);
          navigate(targetPage);
        }
        break;

      case 'show_agent':
        if (action.agent_id) {
          const agentPath = `/account/agent-edit/${action.agent_id}`;
          await animateCursorTo('/account/kalina-agents');
          navigate(agentPath);
        }
        break;

      case 'create_agent': {
        // Multi-step agent creation with visual feedback
        const steps: ActionStep[] = [
          { type: 'navigate', path: '/account/kalina-agents', label: 'Agenți' },
          { type: 'wait', duration: 800 },
          { type: 'click', target: '[data-action="new-agent"]', label: 'New Agent' },
          { type: 'wait', duration: 1000 },
        ];

        // Select agent type
        const agentTypeToSelect = action.agent_type || 'blank';
        steps.push({
          type: 'click',
          target: `[data-agent-type="${agentTypeToSelect}"]`,
          label: agentTypeToSelect === 'blank' ? 'Blank Agent' : agentTypeToSelect === 'website' ? 'Web Assistant' : 'Business Agent'
        });
        steps.push({ type: 'wait', duration: 400 });

        // Click next step button
        steps.push({ type: 'click', target: '[data-action="next-step"]', label: 'Continuă' });
        steps.push({ type: 'wait', duration: 800 });

        // Type agent name if provided
        if (action.agent_name) {
          steps.push({
            type: 'type',
            target: '[data-input="agent-name"]',
            value: action.agent_name,
            label: 'Nume: ' + action.agent_name
          });
          steps.push({ type: 'wait', duration: 400 });
        }

        // Type website URL if provided and type is website
        if (action.website_url && agentTypeToSelect === 'website') {
          steps.push({
            type: 'type',
            target: '[data-input="website-url"]',
            value: action.website_url,
            label: 'Website: ' + action.website_url
          });
          steps.push({ type: 'wait', duration: 400 });
        }

        // Click create button
        steps.push({ type: 'click', target: '[data-action="create-agent"]', label: 'Creează Agent' });

        await executeActionSequence(steps);
        break;
      }

      case 'edit_agent_name': {
        // Import and use platform actions
        const { createActionSteps } = await import('@/lib/platform-actions');
        const steps = createActionSteps('edit_agent_name', {
          agentName: action.agent_name,
          newName: action.new_name
        });

        if (steps) {
          await executeActionSequence(steps);
        }
        break;
      }

      case 'edit_agent_prompt': {
        const { createActionSteps } = await import('@/lib/platform-actions');
        const steps = createActionSteps('edit_agent_prompt', {
          agentName: action.agent_name,
          newPrompt: action.new_prompt
        });

        if (steps) {
          await executeActionSequence(steps);
        }
        break;
      }

      case 'change_agent_voice': {
        const { createActionSteps } = await import('@/lib/platform-actions');
        const steps = createActionSteps('change_agent_voice', {
          agent_name: action.agent_name,
          voice_criteria: action.voice_criteria
        });

        if (steps) {
          await executeActionSequence(steps);
        }
        break;
      }

      case 'toggle_agent_status': {
        const { createActionSteps } = await import('@/lib/platform-actions');
        const steps = createActionSteps('toggle_agent_status', {
          agentName: action.agent_name,
          activate: action.activate
        });

        if (steps) {
          await executeActionSequence(steps);
        }
        break;
      }

      default:
        console.log('Unknown action:', action.action);
    }
  }, [navigate, animateCursorTo, executeActionSequence]);

  // Parse response for frontend actions
  const parseResponseForActions = (responseText: string): { text: string; action?: FrontendAction } => {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*"__frontend_action__"[\s\S]*\}/);
      if (jsonMatch) {
        const actionData = JSON.parse(jsonMatch[0]);
        if (actionData.__frontend_action__) {
          const cleanText = responseText.replace(jsonMatch[0], '').trim();
          return {
            text: cleanText || actionData.message || 'Acțiune executată.',
            action: actionData
          };
        }
      }
    } catch (e) { }

    const navigationPatterns = [
      /Te duc la\s+(.+?)(?:\.|!|$)/i,
      /navighez la\s+(.+?)(?:\.|!|$)/i,
      /deschid\s+(.+?)(?:\.|!|$)/i,
      /mergi la\s+(.+?)(?:\.|!|$)/i,
      /te redirecționez la\s+(.+?)(?:\.|!|$)/i,
      /gata/i,
    ];

    for (const pattern of navigationPatterns) {
      const match = responseText.match(pattern);
      if (match) {
        let pageName = (match[1] || '').trim().toLowerCase();
        pageName = pageName.replace(/pagina\s+/i, '').replace(/secțiunea\s+/i, '').trim();

        const routeMap: Record<string, string> = {
          'acasa': '/', 'home': '/', 'dashboard': '/account',
          'agenti': '/account/kalina-agents', 'agenți': '/account/kalina-agents', 'agents': '/account/kalina-agents',
          'workflow': '/account/workflow', 'workflows': '/account/workflow',
          'voci': '/account/voices', 'voices': '/account/voices',
          'istoric': '/account/conversation-analytics', 'istoricul': '/account/conversation-analytics',
          'istoric apeluri': '/account/conversation-analytics', 'istoricul apelurilor': '/account/conversation-analytics',
          'conversation-analytics': '/account/conversation-analytics', 'analytics': '/account/conversation-analytics',
          'analiza': '/account/conversation-analytics', 'apeluri': '/account/conversation-analytics',
          'transcrieri': '/account/transcript', 'transcript': '/account/transcript',
          'outbound': '/account/outbound', 'apeluri iesire': '/account/outbound',
          'contacte': '/account/contacts', 'contacts': '/account/contacts',
          'leads': '/account/leads',
          'fisiere': '/account/files', 'fișiere': '/account/files', 'files': '/account/files',
          'telefon': '/account/phone-numbers', 'numere telefon': '/account/phone-numbers', 'phone': '/account/phone-numbers',
          'integrari': '/account/integrations', 'integrări': '/account/integrations', 'integrations': '/account/integrations',
          'webhooks': '/account/webhooks',
          'chat-widget': '/account/chat-widget', 'widget': '/account/chat-widget',
          'calendar': '/account/calendar',
          'setari': '/account/settings', 'setări': '/account/settings', 'settings': '/account/settings',
          'pricing': '/pricing', 'preturi': '/pricing', 'prețuri': '/pricing',
          'help': '/help', 'ajutor': '/help',
        };

        let page = routeMap[pageName];
        if (!page) {
          for (const [key, route] of Object.entries(routeMap)) {
            if (pageName.includes(key) || key.includes(pageName)) {
              page = route;
              break;
            }
          }
        }

        if (page) {
          return {
            text: responseText,
            action: {
              __frontend_action__: true,
              action: 'navigate',
              page: page
            }
          };
        }
      }
    }

    const agentPattern = /agent-edit\/([a-zA-Z0-9_\-]+)/;
    const agentMatch = responseText.match(agentPattern);
    if (agentMatch) {
      return {
        text: responseText,
        action: {
          __frontend_action__: true,
          action: 'show_agent',
          agent_id: agentMatch[1],
          page: `/account/agent-edit/${agentMatch[1]}`
        }
      };
    }

    return { text: responseText };
  };

  // Client-side detection for ALL platform actions using AI Assistant library
  const detectLocalAction = (text: string): FrontendAction | null => {
    const detected = detectAndPrepareAction(text);
    if (!detected) return null;

    const { intentId, params, steps, isNavigation, path } = detected;

    // Handle simple navigation actions
    if (isNavigation && path) {
      return {
        __frontend_action__: true,
        action: 'navigate',
        page: path,
        reason: AI_ROUTE_LABELS[path] || 'Navigare'
      };
    }

    // Handle multi-step actions
    if (steps.length > 0) {
      // Map intent IDs to action names
      const actionName = intentId.split('.').pop() || intentId;

      return {
        __frontend_action__: true,
        action: actionName,
        steps: steps,
        ...params
      };
    }

    return null;
  };

  // Get response message for detected action
  const getLocalActionMessage = (text: string): string => {
    const detected = detectAndPrepareAction(text);
    if (!detected) return 'Urmărește cursorul...';
    return detected.responseMessage;
  };

  const sendMessage = async (userMessageText: string) => {
    if (!userMessageText.trim() || isLoading || !user) return;

    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: userMessageText,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Check for local actions first (all platform actions via AI Assistant)
    const localAction = detectLocalAction(userMessageText);
    if (localAction) {
      const responseMessage = getLocalActionMessage(userMessageText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseMessage,
        isUser: false,
        timestamp: new Date(),
        action: localAction
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      setTimeout(() => executeFrontendAction(localAction), 500);
      return;
    }

    try {
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));

      const { data, error } = await supabase.functions.invoke('intelligent-agent-chat', {
        body: { message: userMessageText, userId: user.id, conversationHistory }
      });

      if (error) throw error;

      const rawResponse: string = (data?.response ?? data?.text) || "Ne pare rău, nu am putut procesa cererea.";
      const { text: cleanText, action } = parseResponseForActions(rawResponse);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: cleanText,
        isUser: false,
        timestamp: new Date(),
        action
      };
      setMessages(prev => [...prev, aiMessage]);

      if (action) {
        setTimeout(() => executeFrontendAction(action), 500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Eroare la trimiterea mesajului');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Ne pare rău, a apărut o eroare. Încercați din nou.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const text = inputValue.trim();
    setInputValue('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      sendMessage(suggestion);
    });
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('Chat șters');
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (cursorAnimationRef.current) {
        cancelAnimationFrame(cursorAnimationRef.current);
      }
    };
  }, []);

  if (!user) return null;

  return (
    <>
      {/* AI Cursor - rendered outside the chat container for full screen movement */}
      {cursor.visible && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Cursor with glow effect */}
          <div className={cn(
            "relative transition-transform duration-100",
            cursor.clicking && "scale-90"
          )}>
            {/* Glow */}
            <div className={cn(
              "absolute inset-0 rounded-full blur-xl scale-[2]",
              cursor.typing ? "bg-green-500/30" : cursor.clicking ? "bg-blue-500/30" : "bg-black/20"
            )} />

            {/* Cursor icon */}
            <div className={cn(
              "relative rounded-full p-2 shadow-2xl transition-all duration-100",
              cursor.typing ? "bg-green-600 text-white" : cursor.clicking ? "bg-blue-600 text-white" : "bg-black text-white"
            )}>
              <MousePointer2 className="w-5 h-5" style={{ transform: 'rotate(-15deg)' }} />
            </div>

            {/* Label badge */}
            {cursor.targetLabel && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className={cn(
                  "text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg max-w-[200px] truncate",
                  cursor.typing ? "bg-green-600" : cursor.clicking ? "bg-blue-600" : "bg-black"
                )}>
                  {cursor.clicking ? '✓ Click!' : cursor.typing ? `✏️ ${cursor.typingText || '...'}` : cursor.targetLabel}
                </div>
              </div>
            )}

            {/* Click ripple effect */}
            {cursor.clicking && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-blue-400 animate-ping" />
              </div>
            )}

            {/* Typing indicator dot */}
            {cursor.typing && (
              <div className="absolute -right-1 -bottom-1">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status bar when AI is working */}
      {isExecutingAction && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998]">
          <div className="bg-black text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Agent Automation lucrează...
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Panel */}
        <div
          ref={panelRef}
          className={cn(
            "absolute bottom-20 right-0 bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col transition-all overflow-hidden",
            isResizing ? "transition-none select-none" : "duration-300",
            isOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
          style={{ width: `${size.width}px`, height: `${size.height}px` }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute -top-1 -left-1 w-6 h-6 cursor-nw-resize z-10 group"
          >
            <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-zinc-300 group-hover:bg-zinc-500 transition opacity-0 group-hover:opacity-100" />
          </div>

          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-gradient-to-r from-zinc-50 to-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-black to-zinc-700 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Agent Automation</h3>
                <p className="text-[11px] text-zinc-500">
                  {isExecutingAction ? '⚡ Lucrez pe pagină...' : 'Asistent vizual'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-zinc-400 hover:text-red-500 transition"
                  title="Șterge chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" style={{ scrollbarWidth: 'thin' }}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center mb-4 shadow-inner">
                  <MousePointer2 className="w-8 h-8 text-zinc-400" />
                </div>
                <h4 className="text-base font-bold text-zinc-900 mb-2">Cu ce te pot ajuta?</h4>
                <p className="text-xs text-zinc-500 mb-6 max-w-[250px]">
                  Spune-mi ce vrei și vei vedea cum lucrez - navighez, dau click, completez formulare.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    'Creează un agent nou',
                    'Deschide agenții',
                    'Arată istoricul',
                    'Du-mă la setări'
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.isUser ? "justify-end" : "justify-start")}
                  >
                    {message.isUser ? (
                      <div className="max-w-[85%] bg-black text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm">
                        {message.text}
                      </div>
                    ) : (
                      <div className="max-w-[85%] flex gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center shrink-0 shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
                        </div>
                        <div className="bg-zinc-100 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm text-zinc-800">
                          <MessageFormatter text={message.text} onSuggestionClick={handleSuggestionClick} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center shrink-0 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
                      </div>
                      <div className="bg-zinc-100 px-4 py-3 rounded-2xl rounded-bl-md">
                        <TypingIndicatorMinimal />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-100 bg-white shrink-0">
            <form onSubmit={handleSendMessage} className="w-full">
              <div
                className={cn(
                  "flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 transition-all w-full",
                  inputFocused && "border-zinc-400 bg-white shadow-sm",
                  isListening && "border-red-400 bg-red-50/50"
                )}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={interimTranscript || inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder={isExecutingAction ? "Lucrez..." : isListening ? "Ascult..." : "Spune ce vrei să fac..."}
                  disabled={isLoading || isExecutingAction}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 placeholder-zinc-400 min-w-0"
                />
                <div className="flex items-center gap-1 shrink-0">
                  {isSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={isExecutingAction}
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition",
                        isListening && "text-red-500 bg-red-100 hover:bg-red-100"
                      )}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading || isExecutingAction}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition",
                      inputValue.trim() && !isLoading && !isExecutingAction
                        ? "bg-black text-white hover:bg-zinc-800"
                        : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                    )}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Resize indicator */}
          {isResizing && (
            <div className="absolute inset-0 bg-black/5 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="bg-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium text-zinc-600">
                {size.width} × {size.height}
              </div>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
            isOpen
              ? "bg-zinc-800 text-white"
              : "bg-gradient-to-br from-black to-zinc-700 text-white hover:scale-105"
          )}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Sparkles className="w-6 h-6" />
          )}
        </button>

        {/* Unread indicator */}
        {!isOpen && messages.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-pulse">
            {messages.filter(m => !m.isUser).length}
          </div>
        )}
      </div>
    </>
  );
};

export default PlatformChatWidget;
