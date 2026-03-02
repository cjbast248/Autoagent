import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useConversation } from '@11labs/react';
import { toast } from '@/components/ui/use-toast';
import { useConversationTracking } from '@/hooks/useConversationTracking';
import { useCallSessionTracking } from '@/hooks/useCallSessionTracking';
import { useConversationAnalyticsCache } from '@/hooks/useConversationAnalyticsCache';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface VoiceAIWidgetProps {
  size?: number;
  className?: string;
  agentId: string;
  agentName?: string;
  onConnectionChange?: (connected: boolean) => void;
  onMessage?: (message: Message) => void;
}

const VoiceAIWidget: React.FC<VoiceAIWidgetProps> = ({
  size = 200,
  className = '',
  agentId,
  agentName = 'Kalina Agent',
  onConnectionChange,
  onMessage,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationStart, setConversationStart] = useState<Date | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSpeakingOrListening, setIsSpeakingOrListening] = useState(false);
  const [borderOpacity, setBorderOpacity] = useState(0.15);

  // Refs pentru animația manuală cu tranziție lină
  const orbitRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const rotationsRef = useRef([0, 0, 0]); // Unghiurile curente
  const speedsRef = useRef([0.15, 0.12, 0.13]); // Vitezele curente (grade/frame)
  const targetSpeedsRef = useRef([0.15, 0.12, 0.13]); // Vitezele țintă
  const animationFrameRef = useRef<number | null>(null);

  // Refs pentru detecția volumului audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const volumeLevelRef = useRef(0); // Nivelul curent de volum (0-1)

  const { saveConversation } = useConversationTracking();
  const { saveCallSession } = useCallSessionTracking();
  const { saveToCache } = useConversationAnalyticsCache();

  const messagesRef = useRef<Message[]>([]);
  const conversationStartRef = useRef<Date | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationStartRef.current = conversationStart;
  }, [conversationStart]);

  useEffect(() => {
    conversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  const handleConversationEnd = useCallback(async () => {
    const currentMessages = messagesRef.current;
    const startTime = conversationStartRef.current;
    const convId = conversationIdRef.current;

    if (startTime || convId) {
      const duration = startTime
        ? Math.floor((Date.now() - startTime.getTime()) / 1000)
        : 0;

      const agentMessages = currentMessages.filter(msg => !msg.isUser);
      const totalCharacters = agentMessages.reduce((sum, msg) => sum + (msg.text?.length || 0), 0);
      const calculatedCredits = totalCharacters;
      const calculatedCostUsd = calculatedCredits / 100;

      try {
        const conversationData = {
          agent_id: agentId,
          agent_name: agentName,
          phone_number: 'Voice Chat',
          contact_name: `Test vocal cu ${agentName}`,
          summary: currentMessages.length > 0
            ? `Test vocal cu ${agentName} - ${currentMessages.length} mesaje în ${duration}s`
            : `Test vocal cu ${agentName} - ${duration}s`,
          duration_seconds: duration,
          cost_usd: calculatedCostUsd,
          transcript: currentMessages,
          status: 'success' as const,
          conversation_id: convId,
          elevenlabs_history_id: convId
        };

        await saveConversation.mutateAsync(conversationData);

        if (convId) {
          try {
            await saveToCache.mutateAsync({
              conversation_id: convId,
              agent_id: agentId,
              agent_name: agentName,
              phone_number: 'Voice Chat',
              contact_name: `Test vocal cu ${agentName}`,
              call_status: 'success',
              call_date: new Date().toISOString(),
              duration_seconds: duration,
              cost_credits: calculatedCredits,
              transcript: currentMessages,
            });
          } catch (cacheError) {
            console.warn('Cache save error:', cacheError);
          }
        }

        toast({
          title: "Conversație salvată",
          description: "Testul vocal a fost salvat în Conversation Analytics",
        });
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    }

    setMessages([]);
    setConversationStart(null);
    setCurrentConversationId(null);
  }, [agentId, agentName, saveConversation, saveToCache]);

  const conversation = useConversation({
    onConnect: async (props: { conversationId: string }) => {
      setIsSpeakingOrListening(false);
      setIsConnecting(false);
      setIsActive(true);
      setConversationStart(new Date());
      setCurrentConversationId(props.conversationId);
      conversationStartRef.current = new Date();
      conversationIdRef.current = props.conversationId;
      onConnectionChange?.(true);

      try {
        await saveCallSession.mutateAsync({
          session_id: props.conversationId,
          agent_id: agentId,
          session_type: 'voice_test',
          contact_name: `Test vocal cu ${agentName}`
        });
      } catch (error) {
        console.warn('Session save error:', error);
      }

      toast({
        title: "Conectat!",
        description: "Poți vorbi acum cu agentul",
      });
    },
    onDisconnect: () => {
      handleConversationEnd();
      setIsActive(false);
      setIsConnecting(false);
      onConnectionChange?.(false);
    },
    onMessage: (message) => {
      // Activează animația rapidă când se primește mesaj (agent sau user vorbește)
      setIsSpeakingOrListening(true);

      if (message.message && typeof message.message === 'string') {
        const transcriptionMessage: Message = {
          id: Date.now().toString() + '_' + message.source,
          text: message.message,
          isUser: message.source === 'user',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, transcriptionMessage]);
        onMessage?.(transcriptionMessage);
      }
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      setIsActive(false);
      setIsConnecting(false);

      toast({
        title: "Eroare",
        description: "A apărut o eroare la conectarea cu agentul.",
        variant: "destructive",
      });
    }
  });

  const handleToggleConversation = async () => {
    if (!agentId) {
      toast({
        title: "Eroare",
        description: "ID-ul agentului nu este disponibil",
        variant: "destructive",
      });
      return;
    }

    if (isActive) {
      try {
        await conversation.endSession();
      } catch (error) {
        console.error('Error ending conversation:', error);
      }
    } else {
      setIsConnecting(true);
      try {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
          throw new Error('HTTPS este necesar pentru acces la microfon');
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Browserul nu suportă accesul la microfon');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        stream.getTracks().forEach(track => track.stop());

        if (!agentId.startsWith('agent_')) {
          throw new Error('ID agent invalid: ' + agentId);
        }

        await conversation.startSession({ agentId });
      } catch (error: any) {
        console.error('Error starting conversation:', error);
        setIsConnecting(false);

        let errorMessage = "Pentru a testa agentul vocal, trebuie să permiți accesul la microfon.";

        if (error.name === 'NotAllowedError') {
          errorMessage = "Accesul la microfon a fost refuzat. Te rog permite accesul din setările browserului.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "Nu s-a găsit niciun microfon. Verifică că ai un microfon conectat.";
        }

        toast({
          title: "Eroare acces microfon",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  // Pornește/oprește detecția volumului audio când conversația e activă
  useEffect(() => {
    if (isActive) {
      // Pornește detecția audio
      const startAudioDetection = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          micStreamRef.current = stream;

          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;

          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;

          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);

        } catch (error) {
          console.warn('Nu s-a putut porni detecția audio:', error);
        }
      };

      startAudioDetection();

      return () => {
        // Oprește detecția audio
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        volumeLevelRef.current = 0;
      };
    }
  }, [isActive]);

  // Urmărește când agentul vorbește
  useEffect(() => {
    if (conversation.isSpeaking) {
      setIsSpeakingOrListening(true);
    }
  }, [conversation.isSpeaking]);

  // Animația manuală cu detecție volum și tranziție lină
  useEffect(() => {
    const animate = () => {
      // Detectează volumul din microfon dacă e disponibil
      let currentVolume = 0;
      if (analyserRef.current && isActive) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculează volumul mediu (0-255) și normalizează la 0-1
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        currentVolume = avg / 255;

        // Smooth volumul pentru a evita fluctuații bruște
        volumeLevelRef.current = volumeLevelRef.current * 0.8 + currentVolume * 0.2;
      }

      // Calculează vitezele țintă bazate pe volum și starea agentului
      const baseSpeed = [0.15, -0.12, 0.13]; // Inactiv
      const idleSpeed = [0.2, -0.16, 0.18]; // Activ dar liniște
      const speakingSpeed = [0.5, -0.4, 0.45]; // Vorbește agentul
      const maxVolumeSpeed = [0.7, -0.55, 0.6]; // Volum maxim de la user

      if (!isActive) {
        targetSpeedsRef.current = baseSpeed;
      } else if (conversation.isSpeaking) {
        // Agentul vorbește - viteză medie-rapidă
        targetSpeedsRef.current = speakingSpeed;
      } else if (volumeLevelRef.current > 0.05) {
        // Userul vorbește - viteză bazată pe volum
        const volumeMultiplier = Math.min(volumeLevelRef.current * 3, 1); // Amplificare și limitare
        targetSpeedsRef.current = [
          idleSpeed[0] + (maxVolumeSpeed[0] - idleSpeed[0]) * volumeMultiplier,
          idleSpeed[1] + (maxVolumeSpeed[1] - idleSpeed[1]) * volumeMultiplier,
          idleSpeed[2] + (maxVolumeSpeed[2] - idleSpeed[2]) * volumeMultiplier,
        ];
      } else {
        // Liniște
        targetSpeedsRef.current = idleSpeed;
      }

      // Actualizează opacitatea borderului bazată pe activitate
      const targetOpacity = !isActive ? 0.15 :
        conversation.isSpeaking ? 0.55 :
        volumeLevelRef.current > 0.05 ? 0.35 + volumeLevelRef.current * 0.4 :
        0.35;
      setBorderOpacity(prev => prev + (targetOpacity - prev) * 0.05);

      // Interpolează vitezele gradual către țintă
      const lerpFactor = 0.008; // Factor mic pentru tranziție lină

      for (let i = 0; i < 3; i++) {
        // Interpolează viteza curentă către viteza țintă
        const diff = targetSpeedsRef.current[i] - speedsRef.current[i];
        speedsRef.current[i] += diff * lerpFactor;

        // Actualizează rotația
        rotationsRef.current[i] += speedsRef.current[i];

        // Aplică transformarea
        if (orbitRefs.current[i]) {
          orbitRefs.current[i]!.style.transform = `rotate(${rotationsRef.current[i]}deg)`;
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, conversation.isSpeaking]);

  const buttonSize = size * 0.3;
  const iconSize = size * 0.12;

  const getOrbitSize = (index: number) => {
    if (isActive) {
      const sizes = [size * 0.7, size * 0.85, size];
      return sizes[index];
    }
    const sizes = [size * 0.5, size * 0.65, size * 0.8];
    return sizes[index];
  };

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Orbits - controlate manual cu JavaScript pentru tranziții line */}
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          ref={(el) => { orbitRefs.current[index] = el; }}
          className="absolute pointer-events-none"
          style={{
            width: getOrbitSize(index),
            height: getOrbitSize(index) * (index === 1 ? 0.94 : index === 2 ? 0.95 : 1),
            borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
            border: `1px solid rgba(0, 0, 0, ${borderOpacity})`,
            transition: 'width 1.5s ease-in-out, height 1.5s ease-in-out',
          }}
        />
      ))}

      {/* Central Button */}
      <div
        onClick={handleToggleConversation}
        className={`relative z-10 flex items-center justify-center rounded-full text-white cursor-pointer transition-all duration-200 hover:scale-105 ${
          isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-black hover:bg-gray-800'
        }`}
        style={{
          width: buttonSize,
          height: buttonSize,
          boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
        }}
      >
        {isConnecting ? (
          <div
            className="border-2 border-white border-t-transparent rounded-full animate-spin"
            style={{ width: iconSize, height: iconSize }}
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ width: iconSize, height: iconSize }}
          >
            {isActive ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            )}
          </svg>
        )}
      </div>

    </div>
  );
};

export default VoiceAIWidget;
