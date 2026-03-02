//

/**
 * Defines the configuration for Automatic Speech Recognition (ASR).
 */
export interface AsrConfig {
    quality: string;
    provider: string;
    user_input_audio_format: string;
    keywords: string[];
}

/**
 * Defines settings related to conversation turns.
 */
export interface TurnConfig {
    turn_timeout: number;
    silence_end_call_timeout: number;
    mode: string;
}

/**
 * Defines settings for Text-to-Speech (TTS).
 */
export interface TtsConfig {
    model_id: string;
    voice_id: string;
    supported_voices: any[]; // Assuming any, but could be a specific Voice object
    agent_output_audio_format: string;
    optimize_streaming_latency: number;
    stability: number;
    speed: number;
    similarity_boost: number;
    pronunciation_dictionary_locators: any[];
}

/**
 * General conversation behavior settings.
 */
export interface ConversationDetails {
    text_only: boolean;
    max_duration_seconds: number;
    client_events: string[];
}

/**
 * Defines Retrieval-Augmented Generation (RAG) settings for the agent's prompt.
 */
export interface RagConfig {
    enabled: boolean;
    embedding_model: string;
    max_vector_distance: number;
    max_documents_length: number;
    max_retrieved_rag_chunks_count: number;
}

/**
 * Represents a knowledge base document in ElevenLabs format.
 */
export interface KnowledgeBaseDocument {
    type: 'text' | 'file';
    name: string;
    id: string;
    usage_mode: 'auto';
}

/**
 * Defines the LLM prompt configuration for the agent.
 */
export interface PromptConfig {
    prompt: string;
    llm: string;
    temperature: number;
    max_tokens: number;
    tools: any[];
    tool_ids: string[];
    mcp_server_ids: string[];
    native_mcp_server_ids: string[];
    knowledge_base: KnowledgeBaseDocument[];
    custom_llm: any | null;
    ignore_default_personality: boolean;
    rag: RagConfig;
}

/**
 * Defines agent-specific configurations.
 */
export interface AgentDetails {
    first_message: string;
    language: string;
    multilingual_first_messages?: Record<string, string>;
    dynamic_variables: {
        dynamic_variable_placeholders: Record<string, any>;
    };
    prompt: PromptConfig;
}

/**
 * Represents a translated message.
 */
export interface Translation {
    source_hash: string;
    text: string;
}

/**
 * Defines agent-specific overrides for a given language.
 */
export interface LanguageAgentOverride {
    first_message: string | null;
    language: string | null;
    prompt: string | null;
}

/**
 * Defines a full set of overrides for a language preset.
 */
export interface LanguageOverrides {
    tts: any | null;
    conversation: any | null;
    agent: LanguageAgentOverride;
}

/**
 * A single language preset configuration.
 */
export interface LanguagePreset {
    overrides: LanguageOverrides;
    first_message_translation: Translation;
}

/**
 * A map of language codes to their respective preset configurations.
 */
export type LanguagePresets = Record<string, LanguagePreset>;

//
// -------------------------------------------------------------------
// --- PLATFORM SETTINGS SUB-TYPES
// -------------------------------------------------------------------
//

/**
 * Authentication settings for the agent.
 */
export interface AuthSettings {
    enable_auth: boolean;
    allowlist: any[];
    shareable_token: string | null;
}

/**
 * Evaluation criteria for the agent.
 */
export interface EvaluationSettings {
    criteria: any[];
}

/**
 * Avatar settings for the widget.
 */
export interface AvatarSettings {
    type: string;
    color_1: string;
    color_2: string;
}

/**
 * A map of customizable text labels for the widget.
 */
export interface TextContentSettings {
    main_label: string | null;
    start_call: string | null;
    new_call: string | null;
    end_call: string | null;
    mute_microphone: string | null;
    change_language: string | null;
    collapse: string | null;
    expand: string | null;
    copied: string | null;
    accept_terms: string | null;
    dismiss_terms: string | null;
    listening_status: string | null;
    speaking_status: string | null;
    connecting_status: string | null;
    input_label: string | null;
    input_placeholder: string | null;
    user_ended_conversation: string | null;
    agent_ended_conversation: string | null;
    conversation_id: string | null;
    error_occurred: string | null;
    copy_id: string | null;
}

/**
 * A map of customizable CSS style properties for the widget.
 */
export interface StyleSettings {
    base: string | null;
    base_hover: string | null;
    base_active: string | null;
    base_border: string | null;
    base_subtle: string | null;
    base_primary: string | null;
    base_error: string | null;
    accent: string | null;
    accent_hover: string | null;
    accent_active: string | null;
    accent_border: string | null;
    accent_subtle: string | null;
    accent_primary: string | null;
    overlay_padding: string | null;
    button_radius: string | null;
    input_radius: string | null;
    bubble_radius: string | null;
    sheet_radius: string | null;
    compact_sheet_radius: string | null;
    dropdown_sheet_radius: string | null;
}

/**
 * Configuration for the embeddable web widget.
 */
export interface WidgetSettings {
    variant: string;
    placement: string;
    expandable: string;
    avatar: AvatarSettings;
    feedback_mode: string;
    bg_color: string;
    text_color: string;
    btn_color: string;
    btn_text_color: string;
    border_color: string;
    focus_color: string;
    border_radius: number | null;
    btn_radius: number | null;
    action_text: string | null;
    start_call_text: string | null;
    end_call_text: string | null;
    expand_text: string | null;
    listening_text: string | null;
    speaking_text: string | null;
    shareable_page_text: string | null;
    shareable_page_show_terms: boolean;
    terms_text: string;
    terms_html: string;
    terms_key: string | null;
    show_avatar_when_collapsed: boolean;
    disable_banner: boolean;
    override_link: string | null;
    mic_muting_enabled: boolean;
    transcript_enabled: boolean;
    text_input_enabled: boolean;
    text_contents: TextContentSettings;
    styles: StyleSettings;
    language_selector: boolean;
    supports_text_only: boolean;
    custom_avatar_path: string | null;
    language_presets: Record<string, any>; // Empty object in example
}

/**
 * Defines which conversation configuration properties can be overridden.
 */
export interface ConversationConfigOverride {
    tts: {
        voice_id: boolean;
    };
    conversation: {
        text_only: boolean;
    };
    agent: {
        first_message: boolean;
        language: boolean;
        prompt: {
            prompt: boolean;
        };
    };
}

/**
 * Defines platform-level override settings.
 */
export interface OverrideSettings {
    conversation_config_override: ConversationConfigOverride;
    custom_llm_extra_body: boolean;
    enable_conversation_initiation_client_data_from_webhook: boolean;
}

/**
 * Defines call rate limits for the agent.
 */
export interface CallLimitSettings {
    agent_concurrency_limit: number;
    daily_limit: number;
    bursting_enabled: boolean;
}

/**
 * Defines data privacy and retention policies.
 */
export interface PrivacySettings {
    record_voice: boolean;
    retention_days: number;
    delete_transcript_and_pii: boolean;
    delete_audio: boolean;
    apply_to_existing_conversations: boolean;
    zero_retention_mode: boolean;
}

/**
 * Defines workspace-level override settings, like webhooks.
 */
export interface WorkspaceOverrides {
    conversation_initiation_client_data_webhook: string | null;
    webhooks: {
        post_call_webhook_id: string | null;
    };
}

/**
 * Defines safety and content moderation settings.
 */
export interface SafetySettings {
    is_blocked_ivc: boolean;
    is_blocked_non_ivc: boolean;
    ignore_safety_evaluation: boolean;
}


//
// -------------------------------------------------------------------
// --- TOP-LEVEL OBJECTS
// -------------------------------------------------------------------
//

/**
 * The complete conversation configuration for the agent.
 */
export interface ConversationConfig {
    asr: AsrConfig;
    turn: TurnConfig;
    tts: TtsConfig;
    conversation: ConversationDetails;
    language_presets: LanguagePresets;
    agent: AgentDetails;
}

/**
 * Metadata associated with the agent.
 */
export interface Metadata {
    created_at_unix_secs: number;
}

/**
 * Contains all platform-specific settings for the agent.
 */
export interface PlatformSettings {
    auth: AuthSettings;
    evaluation: EvaluationSettings;
    widget: WidgetSettings;
    data_collection: Record<string, any>; // Empty object in example
    overrides: OverrideSettings;
    call_limits: CallLimitSettings;
    ban: any | null;
    privacy: PrivacySettings;
    workspace_overrides: WorkspaceOverrides;
    safety: SafetySettings;
    system_tools?: Record<string, boolean>;
}

/**
 * Information about the creator and access rights.
 */
export interface AccessInfo {
    is_creator: boolean;
    creator_name: string;
    creator_email: string;
    role: string;
}

/**
 * The main response object for the getAgent API call. This is the root of the structure.
 */
export interface AgentResponse {
    agent_id: string;
    name: string;
    conversation_config: ConversationConfig;
    metadata: Metadata;
    platform_settings: PlatformSettings;
    phone_numbers: string[];
    access_info: AccessInfo;
    tags: string[];
}
