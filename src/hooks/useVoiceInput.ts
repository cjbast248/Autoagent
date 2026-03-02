import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseVoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
  continuous?: boolean;
}

export const useVoiceInput = ({ 
  onTranscript, 
  language = 'ro-RO',
  continuous = false 
}: UseVoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      console.warn('Speech Recognition API not supported in this browser');
      return;
    }

    setIsSupported(true);

    // Initialize Speech Recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Voice recognition started');
      setIsListening(true);
      setInterimTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final) {
        console.log('Final transcript:', final);
        onTranscript(final.trim());
        setInterimTranscript('');
        
        // For non-continuous mode, stop after getting final result
        if (!continuous) {
          recognition.stop();
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      switch (event.error) {
        case 'no-speech':
          toast.error('Nu s-a detectat nicio vorbire. Încearcă din nou.');
          break;
        case 'audio-capture':
          toast.error('Nu s-a putut accesa microfonul. Verifică permisiunile.');
          break;
        case 'not-allowed':
          toast.error('Acces la microfon refuzat. Activează permisiunile în browser.');
          break;
        case 'network':
          toast.error('Eroare de rețea. Verifică conexiunea la internet.');
          break;
        default:
          toast.error('Eroare la recunoașterea vocii. Încearcă din nou.');
      }
    };

    recognition.onend = () => {
      console.log('Voice recognition ended');
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, onTranscript]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error('Browser-ul tău nu suportă recunoașterea vocală. Încearcă Chrome sau Edge.');
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        toast.success('Ascult... vorbește acum!');
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast.error('Nu s-a putut începe recunoașterea vocală.');
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
  };
};
