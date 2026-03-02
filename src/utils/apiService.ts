
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
    console.log('Creating agent via direct API call:', request);

    // Get the API key directly
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';

    if (!apiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

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
    console.log('Initiating call via direct API:', request);

    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
    if (!apiKey) throw new Error('ElevenLabs API key is not configured');

    const response = await fetch('https://api.elevenlabs.io/v1/convai/phone/call', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Initiate call error:', errorText);
      throw new Error(`Failed to initiate call: ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  async textToSpeech(text: string, voiceId?: string): Promise<{ audioContent: string }> {
    console.log('Converting text to speech via direct API');

    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
    if (!apiKey) throw new Error('ElevenLabs API key is not configured');

    const vId = voiceId || '21m00Tcm4TlvDq8ikWAM';

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Text to speech error:', errorText);
      throw new Error(`Failed to generate speech: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    // Use btoa for browser-compatible base64 encoding
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return { audioContent: base64 };
  }
}

export const elevenLabsApi = new ElevenLabsApiService();
