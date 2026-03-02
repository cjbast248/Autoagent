import { ENV } from '@/config/environment';

// Constants for the Agent Consultant application

export const API_CONFIG = {
  BACKEND_URL: ENV.BACKEND_URL,
  BACKEND_API_KEY: ENV.BACKEND_API_KEY,
  // Note: ElevenLabs API key is now managed through Supabase Secrets
  ELEVENLABS_BASE_URL: 'https://api.elevenlabs.io/v1',
  DEFAULT_MODEL_ID: 'eleven_turbo_v2_5',
} as const;

export const VOICES = [
  { id: 'SF9uvIlY93SJRMdV5jeP', name: 'Andrew Griffin' },
  { id: 'rH7tm6lnSf2VO2mn7ruB', name: 'Xyloth' },
  { id: 'nSy0mRVd6M2pA4tEtNZG', name: 'Vornex' },
  { id: 'm7yTemJqdIqrcNleANfX', name: 'Miralis' },
  { id: 'urzoE6aZYmSRdFQ6215h', name: 'Zeron-5' },
  { id: 'TpRoLEgD7nA9RotK1zIv', name: 'Torquex' },
  { id: 'kzOjSddNpacn5uKPKxDC', name: 'Krazon' },
  { id: '7EzWGsX10sAS4c9m9cPf', name: 'Exalar' },
  { id: 'EnjklPXGBMNldCJ7jqkE', name: 'Plexus' },
  { id: 'UgBBYS2sOqTuMpoF3BR0', name: 'Beryl-X' },
] as const;

// ElevenLabs LLM options - Exact match with ElevenLabs UI
export const LLM_MODELS = [
  // ElevenLabs
  { id: 'glm-4.5-air', label: 'GLM-4.5-Air' },
  { id: 'qwen3-30b-a3b', label: 'Qwen3-30B-A3B' },
  { id: 'gpt-oss-120b', label: 'GPT-OSS-120B' },
  // Google
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  // OpenAI
  { id: 'gpt-5', label: 'GPT-5' },
  { id: 'gpt-5.1', label: 'GPT-5.1' },
  { id: 'gpt-5.2', label: 'GPT-5.2' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { id: 'gpt-5-nano', label: 'GPT-5 Nano' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  // Anthropic
  { id: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
  { id: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4.5', label: 'Claude Haiku 4.5' },
  { id: 'claude-3.7-sonnet', label: 'Claude 3.7 Sonnet' },
  { id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  // Custom
  { id: 'custom-llm', label: 'Custom LLM' },
] as const;

// Grouped list for UI rendering - Exact match with ElevenLabs menu
export const LLM_GROUPS = [
  {
    group: 'ElevenLabs',
    models: [
      { id: 'glm-4.5-air', label: 'GLM-4.5-Air', latency: '~873ms', cost: '~$0.0092/min', description: 'Great for agentic use cases' },
      { id: 'qwen3-30b-a3b', label: 'Qwen3-30B-A3B', latency: '~153ms', cost: '~$0.0029/min', description: 'Ultra low latency' },
      { id: 'gpt-oss-120b', label: 'GPT-OSS-120B', latency: '~281ms', cost: '~$0.0028/min', badge: 'Experimental', description: 'OS model from OpenAI' },
    ],
  },
  {
    group: 'Google',
    models: [
      { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', latency: '~4.05s', cost: '~$0.0156/min' },
      { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', latency: '~1.19s', cost: '~$0.0039/min', badge: 'New' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', latency: '~714ms', cost: '~$0.0011/min' },
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', latency: '~493ms', cost: '~$0.0007/min' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', latency: '~561ms', cost: '~$0.0007/min' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', latency: '~463ms', cost: '~$0.0005/min' },
    ],
  },
  {
    group: 'OpenAI',
    models: [
      { id: 'gpt-5', label: 'GPT-5', latency: '~1.19s', cost: '~$0.0105/min' },
      { id: 'gpt-5.1', label: 'GPT-5.1', latency: '~1.15s', cost: '~$0.0105/min' },
      { id: 'gpt-5.2', label: 'GPT-5.2', latency: '~816ms', cost: '~$0.0147/min', badge: 'New' },
      { id: 'gpt-5-mini', label: 'GPT-5 Mini', latency: '~910ms', cost: '~$0.0021/min' },
      { id: 'gpt-5-nano', label: 'GPT-5 Nano', latency: '~806ms', cost: '~$0.0004/min' },
      { id: 'gpt-4.1', label: 'GPT-4.1', latency: '~790ms', cost: '~$0.0144/min' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', latency: '~796ms', cost: '~$0.0029/min' },
      { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', latency: '~426ms', cost: '~$0.0007/min' },
      { id: 'gpt-4o', label: 'GPT-4o', latency: '~633ms', cost: '~$0.0180/min' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', latency: '~743ms', cost: '~$0.0011/min' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', latency: '~1.68s', cost: '~$0.0690/min' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', latency: '~518ms', cost: '~$0.0034/min' },
    ],
  },
  {
    group: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5', latency: '~1.52s', cost: '~$0.0225/min', badge: 'New' },
      { id: 'claude-sonnet-4', label: 'Claude Sonnet 4', latency: '~1.36s', cost: '~$0.0225/min' },
      { id: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', latency: '~719ms', cost: '~$0.0075/min' },
      { id: 'claude-3.7-sonnet', label: 'Claude 3.7 Sonnet', latency: '~1.05s', cost: '~$0.0225/min' },
      { id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', latency: '~1.08s', cost: '~$0.0225/min' },
      { id: 'claude-3-haiku', label: 'Claude 3 Haiku', latency: '~538ms', cost: '~$0.0019/min' },
    ],
  },
  {
    group: 'Custom',
    models: [
      { id: 'custom-llm', label: 'Custom LLM' },
    ],
  },
] as const;

// Turn eagerness options from ElevenLabs API
export const TURN_EAGERNESS_OPTIONS = [
  { id: 'patient', label: 'Patient', description: 'Waits longer before responding' },
  { id: 'normal', label: 'Normal', description: 'Balanced response timing' },
  { id: 'eager', label: 'Eager', description: 'Responds quickly' },
] as const;

// TTS Model options from ElevenLabs API
// English: Flash v2 (default), Turbo v2
// Non-English (32 languages): Flash v2.5 (default), Turbo v2.5
export const TTS_MODELS = [
  { id: 'eleven_flash_v2', label: 'Flash v2', languages: ['en'], description: 'English only, ultra-low latency', default: true },
  { id: 'eleven_turbo_v2', label: 'Turbo v2', languages: ['en'], description: 'English only, higher quality' },
  { id: 'eleven_flash_v2_5', label: 'Flash v2.5', languages: ['non-en'], description: '32 languages, ~75ms latency, 50% cheaper', default: true },
  { id: 'eleven_turbo_v2_5', label: 'Turbo v2.5', languages: ['non-en'], description: '32 languages, ~250ms latency, higher quality' },
] as const;

// ASR Provider options
export const ASR_PROVIDERS = [
  { id: 'elevenlabs', label: 'ElevenLabs' },
  { id: 'scribe_realtime', label: 'Scribe Realtime' },
] as const;

// ASR Quality options
export const ASR_QUALITY_OPTIONS = [
  { id: 'high', label: 'High' },
] as const;

// Complete language map with language IDs as keys
export const LANGUAGE_MAP = {
  'af': 'Afrikaans',
  'ar': 'العربية',
  'bg': 'Български',
  'bn': 'বাংলা',
  'bs': 'Bosanski',
  'ca': 'Català',
  'cs': 'Čeština',
  'da': 'Dansk',
  'de': 'Deutsch',
  'el': 'Ελληνικά',
  'en': 'English',
  'es': 'Español',
  'et': 'Eesti',
  'fi': 'Suomi',
  'fr': 'Français',
  'hi': 'हिन्दी',
  'hr': 'Hrvatski',
  'hu': 'Magyar',
  'id': 'Bahasa Indonesia',
  'it': 'Italiano',
  'ja': '日本語',
  'ko': '한국어',
  'lt': 'Lietuvių',
  'lv': 'Latviešu',
  'ms': 'Bahasa Melayu',
  'nl': 'Nederlands',
  'no': 'Norsk',
  'pl': 'Polski',
  'pt': 'Português',
  'ro': 'Română',
  'ru': 'Русский',
  'sk': 'Slovenčina',
  'sl': 'Slovenščina',
  'sv': 'Svenska',
  'ta': 'தமிழ்',
  'th': 'ไทย',
  'tr': 'Türkçe',
  'uk': 'Українська',
  'ur': 'اردو',
  'vi': 'Tiếng Việt',
  'zh': '中文',
} as const;

// Language Options - Compatible with ElevenLabs
export const LANGUAGES = [
  { value: 'ro', label: 'Română', countryCode: 'RO' },
  { value: 'en', label: 'English', countryCode: 'US' },
  { value: 'es', label: 'Español', countryCode: 'ES' },
  { value: 'fr', label: 'Français', countryCode: 'FR' },
  { value: 'de', label: 'Deutsch', countryCode: 'DE' },
  { value: 'it', label: 'Italiano', countryCode: 'IT' },
  { value: 'pt', label: 'Português', countryCode: 'PT' },
  { value: 'ru', label: 'Русский', countryCode: 'RU' },
  { value: 'ja', label: 'Japanese', countryCode: 'JP' },
  { value: 'ko', label: 'Korean', countryCode: 'KR' },
  { value: 'zh', label: 'Chinese', countryCode: 'CN' },
  { value: 'ar', label: 'Arabic', countryCode: 'SA' },
  { value: 'hi', label: 'Hindi', countryCode: 'IN' },
  { value: 'th', label: 'Thai', countryCode: 'TH' },
  { value: 'vi', label: 'Vietnamese', countryCode: 'VN' },
  { value: 'nl', label: 'Dutch', countryCode: 'NL' },
  { value: 'tr', label: 'Turkish', countryCode: 'TR' },
  { value: 'pl', label: 'Polish', countryCode: 'PL' },
  { value: 'sv', label: 'Swedish', countryCode: 'SE' },
  { value: 'da', label: 'Danish', countryCode: 'DK' },
  { value: 'no', label: 'Norwegian', countryCode: 'NO' },
  { value: 'fi', label: 'Finnish', countryCode: 'FI' },
  { value: 'hu', label: 'Hungarian', countryCode: 'HU' },
  { value: 'cs', label: 'Czech', countryCode: 'CZ' },
  { value: 'sk', label: 'Slovak', countryCode: 'SK' },
  { value: 'bg', label: 'Bulgarian', countryCode: 'BG' },
  { value: 'hr', label: 'Croatian', countryCode: 'HR' },
  { value: 'sl', label: 'Slovenian', countryCode: 'SI' },
  { value: 'et', label: 'Estonian', countryCode: 'EE' },
  { value: 'lv', label: 'Latvian', countryCode: 'LV' },
  { value: 'lt', label: 'Lithuanian', countryCode: 'LT' },
] as const;

export const DEFAULT_VALUES = {
  VOICE_ID: 'rH7tm6lnSf2VO2mn7ruB', // Xyloth
  LANGUAGE: 'ro',
} as const;

export const MESSAGES = {
  ERRORS: {
    INVALID_URL: 'Please enter a valid URL',
    MISSING_AGENT_NAME: 'Please complete the agent name.',
    MISSING_AGENT_ID_OR_PHONE: 'Please enter agent ID and phone number',
    PROMPT_GENERATION_FAILED: 'Could not generate prompt',
    AGENT_CREATION_FAILED: 'Could not create agent',
    CALL_INITIATION_FAILED: 'Could not initiate call',
    CLIPBOARD_COPY_FAILED: 'Could not copy agent ID',
  },
  SUCCESS: {
    PROMPT_GENERATED: 'Prompt generated successfully',
    AGENT_CREATED: 'has been created successfully and copied to clipboard',
    CALL_INITIATED: 'Call initiated successfully',
    CLIPBOARD_COPIED: 'Agent ID copied to clipboard',
  },
  LOADING: {
    GENERATING_PROMPT: 'Generating Prompt...',
    GENERATING_AGENT: 'Generating Agent...',
  },
} as const;
