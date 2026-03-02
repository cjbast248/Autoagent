import {
    AgentCreateRequest,
    AgentCreateResponse,
    AgentUpdateRequest,
    AgentResponse,
    ConversationConfigUpdate,
    LanguagePresetUpdate
} from '../types/dtos';
import { ENV } from '@/config/environment';
import { fetchWithAuth } from '@/utils/sessionManager';

// Helper pentru Edge Function calls cu timeout și automatic token refresh
const invokeEdgeFunction = async (functionName: string, body: any, timeoutMs = 15000): Promise<any> => {
  const url = `${ENV.SUPABASE_URL}/functions/v1/${functionName}`;

  try {
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ENV.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    }, timeoutMs);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (err: any) {
    if (err.message?.includes('timeout')) {
      throw new Error(`Edge function ${functionName} timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
};

export class VoiceController {
  // All ElevenLabs API calls now go through Supabase Edge Functions
  // to use the API key stored securely in Supabase Secrets

  static async createAgent(request: AgentCreateRequest): Promise<AgentCreateResponse> {
    console.log('Creating agent via Supabase Edge Function:', request);

    const data = await invokeEdgeFunction('create-elevenlabs-agent', request);
    console.log('Agent created successfully:', data);
    return data;
  }

  static async getAgent(agentId: string): Promise<AgentResponse> {
    console.log('Getting agent via Supabase Edge Function:', agentId);

    const data = await invokeEdgeFunction('get-elevenlabs-agent', { agentId });
    console.log('Agent retrieved successfully');
    return data;
  }

  static async updateAgent(agentId: string, request: AgentUpdateRequest): Promise<AgentResponse> {
    console.log('Updating agent via Supabase Edge Function:', agentId, request);

    const data = await invokeEdgeFunction('update-elevenlabs-agent', { agentId, ...request });
    console.log('Agent updated successfully');
    return data;
  }

    static prepareUpdatePayload(
                agentData: AgentResponse,
                multilingualMessages: Record<string, string>
        ): AgentUpdateRequest {
        const defaultLanguage = agentData.conversation_config?.agent?.language || 'en';

        const languagePresets: Record<string, LanguagePresetUpdate> = {};

        if (agentData.conversation_config?.language_presets) {
            Object.entries(agentData.conversation_config.language_presets).forEach(([language, preset]) => {
                languagePresets[language] = { ...preset };
            });
        }

        const sourceHash = JSON.stringify({
            firstMessage: multilingualMessages[defaultLanguage] || '',
            language: defaultLanguage
        });

        Object.entries(multilingualMessages).forEach(([language, message]) => {
            if (language !== defaultLanguage) {
                const languageAlreadyExists = languagePresets[language] !== undefined;

                if (languageAlreadyExists) {
                    const existingOverrides = languagePresets[language].overrides || {};
                    const existingAgent = existingOverrides.agent || {};

                    // Build agent overrides - only include defined fields
                    const agentOverrides: Record<string, any> = {
                        first_message: message || ''
                    };
                    if (existingAgent.language) agentOverrides.language = existingAgent.language;
                    if (existingAgent.prompt) agentOverrides.prompt = existingAgent.prompt;

                    // Build overrides - only include defined fields
                    const overrides: Record<string, any> = { agent: agentOverrides };
                    if (existingOverrides.tts) overrides.tts = existingOverrides.tts;
                    if (existingOverrides.conversation) overrides.conversation = existingOverrides.conversation;

                    languagePresets[language] = {
                        ...languagePresets[language],
                        overrides: overrides,
                        first_message_translation: {
                            source_hash: sourceHash,
                            text: message || ''
                        }
                    };
                } else {
                    languagePresets[language] = {
                        overrides: {
                            agent: {
                                first_message: message || ''
                            }
                        },
                        first_message_translation: {
                            source_hash: sourceHash,
                            text: message || ''
                        }
                    };
                }
            }
        });

        Object.keys(languagePresets).forEach(language => {
            if (language !== defaultLanguage && !Object.prototype.hasOwnProperty.call(multilingualMessages, language)) {
                delete languagePresets[language];
            }
        });

        // Build prompt config - only include fields with values
        const currentPrompt = agentData.conversation_config?.agent?.prompt || {} as any;

        const promptConfig: Record<string, any> = {
            prompt: currentPrompt.prompt || '',
            llm: currentPrompt.llm || 'gemini-2.5-flash',
            temperature: currentPrompt.temperature ?? 0
        };

        // Only add optional arrays if they have content
        // IMPORTANT: ElevenLabs doesn't allow both tools and tool_ids - pick one
        // Prefer tool_ids (references to existing tools) over inline tools definitions
        if (currentPrompt.tool_ids?.length) {
            promptConfig.tool_ids = currentPrompt.tool_ids;
            // Don't add tools if tool_ids is present
        } else if (currentPrompt.tools?.length) {
            // Only add inline tools if no tool_ids
            promptConfig.tools = currentPrompt.tools;
        }
        if (currentPrompt.built_in_tools && Object.keys(currentPrompt.built_in_tools).length > 0) {
            promptConfig.built_in_tools = currentPrompt.built_in_tools;
        }
        if (currentPrompt.mcp_server_ids?.length) {
            promptConfig.mcp_server_ids = currentPrompt.mcp_server_ids;
        }
        if (currentPrompt.native_mcp_server_ids?.length) {
            promptConfig.native_mcp_server_ids = currentPrompt.native_mcp_server_ids;
        }
        if (currentPrompt.knowledge_base?.length) {
            promptConfig.knowledge_base = currentPrompt.knowledge_base;
        }
        if (currentPrompt.ignore_default_personality) {
            promptConfig.ignore_default_personality = currentPrompt.ignore_default_personality;
        }
        if (currentPrompt.max_tokens && currentPrompt.max_tokens !== -1) {
            promptConfig.max_tokens = currentPrompt.max_tokens;
        }
        if (currentPrompt.custom_llm) {
            promptConfig.custom_llm = currentPrompt.custom_llm;
        }
        if (currentPrompt.rag) {
            promptConfig.rag = currentPrompt.rag;
        }
        if (currentPrompt.reasoning_effort) {
            promptConfig.reasoning_effort = currentPrompt.reasoning_effort;
        }
        if (currentPrompt.thinking_budget) {
            promptConfig.thinking_budget = currentPrompt.thinking_budget;
        }
        if (currentPrompt.backup_llm_config) {
            promptConfig.backup_llm_config = currentPrompt.backup_llm_config;
        }
        if (currentPrompt.timezone) {
            promptConfig.timezone = currentPrompt.timezone;
        }

        // Build ASR config - ElevenLabs API spec
        const asrConfig: Record<string, any> = {
            quality: agentData.conversation_config?.asr?.quality || 'high',
            provider: agentData.conversation_config?.asr?.provider || 'elevenlabs'
        };
        if (agentData.conversation_config?.asr?.user_input_audio_format) {
            asrConfig.user_input_audio_format = agentData.conversation_config.asr.user_input_audio_format;
        }
        if (agentData.conversation_config?.asr?.keywords?.length) {
            asrConfig.keywords = agentData.conversation_config.asr.keywords;
        }

        // Build turn config - exclude undefined fields
        const turnConfig: Record<string, any> = {
            turn_timeout: agentData.conversation_config?.turn?.turn_timeout ?? 7,
            silence_end_call_timeout: agentData.conversation_config?.turn?.silence_end_call_timeout ?? -1
        };
        // Use turn_eagerness instead of deprecated mode field
        if ((agentData.conversation_config?.turn as any)?.turn_eagerness) {
            turnConfig.turn_eagerness = (agentData.conversation_config?.turn as any).turn_eagerness;
        }
        if ((agentData.conversation_config?.turn as any)?.initial_wait_time) {
            turnConfig.initial_wait_time = (agentData.conversation_config?.turn as any).initial_wait_time;
        }
        if ((agentData.conversation_config?.turn as any)?.soft_timeout_config) {
            turnConfig.soft_timeout_config = (agentData.conversation_config?.turn as any).soft_timeout_config;
        }

        // Build agent config - ElevenLabs API spec
        const agentConfig: Record<string, any> = {
            first_message: multilingualMessages[defaultLanguage] || '',
            language: defaultLanguage,
            prompt: promptConfig
        };
        // Only add dynamic_variables if it has content
        if (agentData.conversation_config?.agent?.dynamic_variables &&
            Object.keys(agentData.conversation_config.agent.dynamic_variables).length > 0) {
            agentConfig.dynamic_variables = agentData.conversation_config.agent.dynamic_variables;
        }
        // Optional fields
        if (agentData.conversation_config?.agent?.timezone) {
            agentConfig.timezone = agentData.conversation_config.agent.timezone;
        }
        if ((agentData.conversation_config?.agent as any)?.hinglish_mode) {
            agentConfig.hinglish_mode = (agentData.conversation_config?.agent as any).hinglish_mode;
        }
        if ((agentData.conversation_config?.agent as any)?.disable_first_message_interruptions) {
            agentConfig.disable_first_message_interruptions = (agentData.conversation_config?.agent as any).disable_first_message_interruptions;
        }

        // Build conversation details config
        const conversationDetails: Record<string, any> = {
            text_only: agentData.conversation_config?.conversation?.text_only ?? false,
            max_duration_seconds: agentData.conversation_config?.conversation?.max_duration_seconds ?? 600
        };
        // Only add arrays if they have content
        if (agentData.conversation_config?.conversation?.client_events?.length) {
            conversationDetails.client_events = agentData.conversation_config.conversation.client_events;
        }
        if ((agentData.conversation_config?.conversation as any)?.monitoring_enabled) {
            conversationDetails.monitoring_enabled = (agentData.conversation_config?.conversation as any).monitoring_enabled;
        }
        if ((agentData.conversation_config?.conversation as any)?.monitoring_events?.length) {
            conversationDetails.monitoring_events = (agentData.conversation_config?.conversation as any).monitoring_events;
        }

        // Build TTS config - ElevenLabs API spec
        // Default model based on language if not explicitly set
        const defaultModelId = defaultLanguage === 'en' ? 'eleven_flash_v2' : 'eleven_flash_v2_5';
        const ttsConfig: Record<string, any> = {
            voice_id: agentData.conversation_config?.tts?.voice_id || 'cjVigY5qzO86Huf0OWal', // Default ElevenLabs voice
            model_id: agentData.conversation_config?.tts?.model_id || defaultModelId,
            agent_output_audio_format: agentData.conversation_config?.tts?.agent_output_audio_format || 'pcm_16000',
            stability: agentData.conversation_config?.tts?.stability ?? 0.5,
            similarity_boost: agentData.conversation_config?.tts?.similarity_boost ?? 0.8,
            speed: agentData.conversation_config?.tts?.speed ?? 1.0,
            optimize_streaming_latency: String(agentData.conversation_config?.tts?.optimize_streaming_latency ?? 0), // Must be string "0"-"4"
        };
        // Only add arrays if they have content
        if (agentData.conversation_config?.tts?.supported_voices?.length) {
            ttsConfig.supported_voices = agentData.conversation_config.tts.supported_voices;
        }
        if (agentData.conversation_config?.tts?.pronunciation_dictionary_locators?.length) {
            ttsConfig.pronunciation_dictionary_locators = agentData.conversation_config.tts.pronunciation_dictionary_locators;
        }
        // Add new TTS fields if present
        if ((agentData.conversation_config?.tts as any)?.text_normalisation_type) {
            ttsConfig.text_normalisation_type = (agentData.conversation_config?.tts as any).text_normalisation_type;
        }

        // Build complete conversation_config with ALL required sections
        const conversationConfig: ConversationConfigUpdate = {
            asr: asrConfig,
            turn: turnConfig,
            tts: ttsConfig,
            conversation: conversationDetails,
            language_presets: languagePresets,
            agent: agentConfig
        } as ConversationConfigUpdate;

        // Add VAD config if present
        if ((agentData.conversation_config as any)?.vad) {
            (conversationConfig as any).vad = (agentData.conversation_config as any).vad;
        }

        // Build platform settings - always include, even if empty {}
        const platformSettings: Record<string, any> = {};
        if (agentData.platform_settings) {
            if (agentData.platform_settings.auth) platformSettings.auth = agentData.platform_settings.auth;
            if (agentData.platform_settings.evaluation) platformSettings.evaluation = agentData.platform_settings.evaluation;
            if (agentData.platform_settings.widget) platformSettings.widget = agentData.platform_settings.widget;
            if (agentData.platform_settings.data_collection) platformSettings.data_collection = agentData.platform_settings.data_collection;
            if (agentData.platform_settings.overrides) platformSettings.overrides = agentData.platform_settings.overrides;
            if (agentData.platform_settings.call_limits) platformSettings.call_limits = agentData.platform_settings.call_limits;
            if (agentData.platform_settings.privacy) platformSettings.privacy = agentData.platform_settings.privacy;
            if (agentData.platform_settings.workspace_overrides) platformSettings.workspace_overrides = agentData.platform_settings.workspace_overrides;
            if (agentData.platform_settings.safety) platformSettings.safety = agentData.platform_settings.safety;
        }

        // Build payload matching ElevenLabs exact structure
        const updatePayload: AgentUpdateRequest = {
            conversation_config: conversationConfig,
            platform_settings: platformSettings,
            name: agentData.name,
            tags: agentData.tags || []
        }

        console.log('Prepared update payload:', JSON.stringify(updatePayload, null, 2));
        return updatePayload;
    }
}
