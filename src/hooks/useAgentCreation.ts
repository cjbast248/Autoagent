
import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { elevenLabsApi, CreateAgentRequest, ConversationConfig } from '../utils/apiService';
import { API_CONFIG, MESSAGES, VOICES } from '../constants/constants';
import { ENV } from '@/config/environment';
import { fetchWithAuth } from '@/utils/sessionManager';

interface UseAgentCreationProps {
  websiteUrl: string;
  additionalPrompt: string;
  agentName: string;
  agentLanguage: string;
  selectedVoice: string;
  generatePrompt: () => Promise<string>;
}

export const useAgentCreation = ({
  websiteUrl,
  additionalPrompt,
  agentName,
  agentLanguage,
  selectedVoice,
  generatePrompt,
}: UseAgentCreationProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [createdAgentId, setCreatedAgentId] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Handler for copying agent ID to clipboard
  const handleCopyAgentId = useCallback(async () => {
    if (!createdAgentId) return;

    try {
      await navigator.clipboard.writeText(createdAgentId);
      toast({
        title: "Copied!",
        description: MESSAGES.SUCCESS.CLIPBOARD_COPIED,
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: MESSAGES.ERRORS.CLIPBOARD_COPY_FAILED,
        variant: "destructive",
      });
    }
  }, [createdAgentId]);

  // Handler for creating agent
  const handleCreateAgent = useCallback(async () => {
    if (!agentName.trim()) {
      toast({
        title: "Error",
        description: MESSAGES.ERRORS.MISSING_AGENT_NAME,
        variant: "destructive",
      });
      return;
    }

    if (agentName.trim().length > 255) {
      toast({
        title: "Error",
        description: "Agent name cannot exceed 255 characters",
        variant: "destructive",
      });
      return;
    }

    if (!user || !user.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create an agent",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const promptText = await generatePrompt();
      if (!promptText) {
        throw new Error(MESSAGES.ERRORS.PROMPT_GENERATION_FAILED);
      }

      const conversationConfig: ConversationConfig = {
        agent: {
          language: agentLanguage,
          prompt: {
            prompt: promptText,
          },
        },
        tts: {
          voice_id: selectedVoice,
          model_id: API_CONFIG.DEFAULT_MODEL_ID,
        },
      };

      const createAgentRequest: CreateAgentRequest = {
        conversation_config: conversationConfig,
        name: agentName,
      };

      console.log('Creating agent with request:', createAgentRequest);

      // Add timeout protection for ElevenLabs API call - 90 seconds (ElevenLabs can be slow)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 90000)
      );
      const response = await Promise.race([
        elevenLabsApi.createAgent(createAgentRequest),
        timeoutPromise
      ]);

      // Get voice name - check static VOICES first, otherwise it's a cloned voice
      const staticVoice = VOICES.find(v => v.id === selectedVoice);
      const voiceName = staticVoice?.name || 'Cloned Voice';

      // Salvez agentul în baza de date using REST API
      try {
        const insertUrl = `${ENV.SUPABASE_URL}/rest/v1/kalina_agents`;
        const insertResponse = await fetchWithAuth(insertUrl, {
          method: 'POST',
          headers: {
            'apikey': ENV.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            agent_id: response.agent_id,
            user_id: user.id,
            name: agentName,
            description: `Auto-generated consultant agent for ${websiteUrl}`,
            system_prompt: promptText,
            voice_id: selectedVoice,
            voice_name: voiceName,
            provider: 'elevenlabs',
            elevenlabs_agent_id: response.agent_id,
            is_active: true
          }),
        }, 15000);

        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          throw new Error(errorText);
        }
      } catch (dbError: any) {
        console.error('Error saving agent to database:', dbError);
        toast({
          title: "Attention",
          description: `Agent was created in ElevenLabs but not saved to the database: ${dbError.message}`,
          variant: "destructive",
        });
      }

      setCreatedAgentId(response.agent_id);

      // Copy to clipboard automatically (non-blocking)
      try {
        await navigator.clipboard.writeText(response.agent_id);
      } catch (clipboardError) {
        console.warn('Could not copy agent ID to clipboard:', clipboardError);
        // Don't fail the whole operation just because clipboard failed
      }

      toast({
        title: "Success",
        description: `${agentName} ${MESSAGES.SUCCESS.AGENT_CREATED}`,
      });

      // Redirect to agent edit page after successful creation
      setTimeout(() => {
        navigate(`/account/agent-edit/${response.agent_id}`);
      }, 1500);
    } catch (error: any) {
      console.error('Error creating agent:', error);

      // Show specific message for timeout vs other errors
      const isTimeout = error?.message === 'TIMEOUT';
      toast({
        title: isTimeout ? "Timeout" : "Error",
        description: isTimeout
          ? "Agent creation took too long. Please try again."
          : MESSAGES.ERRORS.AGENT_CREATION_FAILED,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }, [agentName, agentLanguage, selectedVoice, generatePrompt, user, websiteUrl, navigate]);

  return {
    isCreating,
    createdAgentId,
    handleCreateAgent,
    handleCopyAgentId,
  };
};
