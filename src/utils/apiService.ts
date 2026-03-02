
// IMPORTANT: This file now uses Supabase Edge Functions for secure API calls
// All ElevenLabs API interactions should go through Supabase Edge Functions
// where the API key is securely stored in Supabase Secrets

import { fetchWithAuth } from '@/utils/sessionManager';
import { ENV } from '@/config/environment';

// Types for API requests and responses
export interface TTSConfig {
  voice_id: string;
  model_id?: string;
}

export interface AgentConfig {
  language: string;
  prompt: {
    prompt: string;
  };
}

export interface ConversationConfig {
  agent: AgentConfig;
  tts: TTSConfig;
}

export interface CreateAgentRequest {
  conversation_config: ConversationConfig;
  name: string;
}

export interface CreateAgentResponse {
  agent_id: string;
  [key: string]: unknown;
}

export interface InitiateCallRequest {
  agent_id: string;
  phone_number: string;
}

class ElevenLabsApiService {
  // All API calls now go through Supabase Edge Functions for security
  // Using direct fetch instead of SDK to avoid blocking issues

  async createAgent(request: CreateAgentRequest): Promise<CreateAgentResponse> {
    console.log('Creating agent via Supabase Edge Function:', request);

    const url = `${ENV.SUPABASE_URL}/functions/v1/create-elevenlabs-agent`;
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }, 90000); // 90s timeout for ElevenLabs (can be slow)

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create agent error:', errorText);
      throw new Error(`Failed to create agent: ${errorText}`);
    }

    const data = await response.json();
    console.log('Agent created successfully:', data);
    return data;
  }

  async initiateCall(request: InitiateCallRequest): Promise<{ success: boolean; conversationId?: string }> {
    console.log('Initiating call via Supabase Edge Function:', request);

    const url = `${ENV.SUPABASE_URL}/functions/v1/initiate-scheduled-call`;
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }, 30000); // 30s timeout

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Initiate call error:', errorText);
      throw new Error(`Failed to initiate call: ${errorText}`);
    }

    const data = await response.json();
    console.log('Call initiated successfully:', data);
    return data;
  }

  async textToSpeech(text: string, voiceId?: string): Promise<{ audioContent: string }> {
    console.log('Converting text to speech via Supabase Edge Function');

    const url = `${ENV.SUPABASE_URL}/functions/v1/text-to-speech`;
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: voiceId || '21m00Tcm4TlvDq8ikWAM'
      }),
    }, 30000); // 30s timeout

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Text to speech error:', errorText);
      throw new Error(`Failed to generate speech: ${errorText}`);
    }

    return response.json();
  }
}

export const elevenLabsApi = new ElevenLabsApiService();
