import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, UploadCloud, Mic, Waves, Layers, ShieldCheck, Square, Play, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

// Dot pattern style
const dotPatternStyle = {
  backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
  backgroundSize: '24px 24px',
};

export default function VoiceClone() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [currentStep, setCurrentStep] = useState(1);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [voiceName, setVoiceName] = useState('');
  const [voiceDescription, setVoiceDescription] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('ro');
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Available languages
  const languages = [
    { code: 'ro', name: 'Romanian' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'pl', name: 'Polish' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'tr', name: 'Turkish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'cs', name: 'Czech' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'uk', name: 'Ukrainian' },
  ];

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && isValidAudioFile(file)) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
    } else {
      toast.error('Invalid file type. Please upload MP3, WAV, or M4A.');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Validate audio file
  const isValidAudioFile = (file: File) => {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/mp3'];
    return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB max
  };

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidAudioFile(file)) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
    } else if (file) {
      toast.error('Invalid file. Max 10MB, MP3/WAV/M4A only.');
    }
  };

  // Start recording
  const startRecording = async () => {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(blob));
        stream?.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = () => {
        stream?.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      // Stop all tracks if stream was acquired but something else failed
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Remove audio
  const removeAudio = () => {
    setAudioFile(null);
    setAudioUrl(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlaying(false);
  };

  // Clone voice using Supabase Edge Function
  const cloneVoice = async () => {
    if (!audioFile || !hasConsent || !voiceName.trim()) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(audioFile);

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('smart-worker', {
        body: {
          audioBase64: base64,
          fileName: audioFile.name,
          voiceName: voiceName.trim(),
          description: voiceDescription.trim(),
          userId: user?.id,
          language: voiceLanguage,
        },
      });

      if (error) throw error;

      if (data?.voice_id) {
        toast.success('Voice cloned successfully!');
        navigate('/account/voices');
      } else {
        throw new Error('Failed to clone voice');
      }
    } catch (error: any) {
      console.error('Error cloning voice:', error);
      toast.error(error.message || 'Failed to clone voice. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Go to next step
  const goToNextStep = () => {
    if (currentStep === 1 && audioFile) {
      setCurrentStep(2);
    } else if (currentStep === 2 && voiceName.trim()) {
      cloneVoice();
    }
  };

  // Check if can proceed
  const canProceed = () => {
    if (currentStep === 1) {
      return audioFile && hasConsent;
    }
    if (currentStep === 2) {
      return voiceName.trim().length > 0;
    }
    return false;
  };

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-auto min-h-screen flex items-center justify-center p-6" style={dotPatternStyle}>
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel - Info */}
          <div className="lg:col-span-4 flex flex-col justify-between h-full py-4">
            <div>
              {/* Back Button */}
              <button
                onClick={() => navigate('/account/voices')}
                className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-black uppercase tracking-widest mb-8 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Voice Library
              </button>

              {/* Title */}
              <h1 className="text-4xl font-bold tracking-tight text-black mb-4">Voice Clone Protocol</h1>
              <p className="text-zinc-500 text-sm leading-relaxed mb-10">
                Ingest biological audio data to synthesize a digital twin. Ensure high fidelity for optimal results.
              </p>

              {/* Steps */}
              <div className="space-y-0 relative pl-4 border-l border-zinc-200">
                {/* Step 1 */}
                <div className="relative pb-10">
                  <div className={cn(
                    "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white",
                    currentStep >= 1 ? "bg-black" : "bg-zinc-200"
                  )} />
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest block mb-1",
                    currentStep >= 1 ? "text-black" : "text-zinc-300"
                  )}>01. Ingestion</span>
                  <span className={cn(
                    "text-[10px] font-mono",
                    currentStep >= 1 ? "text-zinc-500" : "text-zinc-300"
                  )}>Upload or record samples</span>
                </div>

                {/* Step 2 */}
                <div className="relative pb-10">
                  <div className={cn(
                    "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white",
                    currentStep >= 2 ? "bg-black" : "bg-zinc-200"
                  )} />
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest block mb-1",
                    currentStep >= 2 ? "text-black" : "text-zinc-300"
                  )}>02. Calibration</span>
                  <span className={cn(
                    "text-[10px] font-mono",
                    currentStep >= 2 ? "text-zinc-500" : "text-zinc-300"
                  )}>Define voice parameters</span>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className={cn(
                    "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white",
                    currentStep >= 3 ? "bg-black" : "bg-zinc-200"
                  )} />
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest block mb-1",
                    currentStep >= 3 ? "text-black" : "text-zinc-300"
                  )}>03. Synthesis</span>
                  <span className={cn(
                    "text-[10px] font-mono",
                    currentStep >= 3 ? "text-zinc-500" : "text-zinc-300"
                  )}>Compile model</span>
                </div>
              </div>
            </div>

            {/* Quality Control Box */}
            <div className="hidden lg:block">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-bold text-black uppercase">Quality Control</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                  {'>'} Noise floor: <span className="text-zinc-300">-60dB (Required)</span><br />
                  {'>'} Format: <span className="text-zinc-300">WAV/MP3</span><br />
                  {'>'} Min Duration: <span className="text-black font-bold">10s</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Main Content */}
          <div className="lg:col-span-8 bg-white rounded-[2rem] shadow-2xl shadow-zinc-200 p-8 border border-white flex flex-col relative overflow-hidden">

            {currentStep === 1 ? (
              <>
                {/* Step 1: Upload/Record */}
                {!audioFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="flex-1 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center p-12 text-center group cursor-pointer relative min-h-[400px] transition-all duration-300 hover:border-black hover:shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, #fafafa 25%, transparent 25%, transparent 75%, #fafafa 75%, #fafafa), linear-gradient(45deg, #fafafa 25%, transparent 25%, transparent 75%, #fafafa 75%, #fafafa)',
                      backgroundSize: '40px 40px',
                      backgroundPosition: '0 0, 20px 20px',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="w-20 h-20 rounded-2xl bg-white border border-zinc-100 shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300 z-10">
                      <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-black transition" />
                    </div>

                    <h3 className="text-xl font-bold text-black mb-2 z-10">Drag & Drop Audio File</h3>
                    <p className="text-zinc-400 text-sm mb-8 z-10">Supports MP3, WAV, M4A up to 10MB</p>

                    <div className="flex items-center gap-4 w-full max-w-xs z-10">
                      <div className="h-px bg-zinc-200 flex-1" />
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">OR</span>
                      <div className="h-px bg-zinc-200 flex-1" />
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        isRecording ? stopRecording() : startRecording();
                      }}
                      className={cn(
                        "mt-8 flex items-center gap-3 px-6 py-3 rounded-full bg-white border shadow-sm transition z-10",
                        isRecording
                          ? "border-red-500 text-red-600"
                          : "border-zinc-200 hover:border-red-200 hover:text-red-600"
                      )}
                    >
                      <div className="relative w-3 h-3">
                        {isRecording && (
                          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                        )}
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide">
                        {isRecording ? 'Stop Recording' : 'Record Mic'}
                      </span>
                    </button>
                  </div>
                ) : (
                  /* Audio Preview */
                  <div className="flex-1 rounded-3xl border border-zinc-100 bg-zinc-50 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                    <audio
                      ref={audioPlayerRef}
                      src={audioUrl || undefined}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />

                    <div className="w-24 h-24 rounded-full bg-black text-white flex items-center justify-center mb-6 cursor-pointer hover:scale-105 transition" onClick={togglePlay}>
                      {isPlaying ? (
                        <Square className="w-8 h-8 fill-current" />
                      ) : (
                        <Play className="w-8 h-8 fill-current ml-1" />
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-black mb-1">{audioFile.name}</h3>
                    <p className="text-zinc-400 text-sm mb-6">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>

                    <button
                      onClick={removeAudio}
                      className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 text-zinc-500 hover:text-red-600 hover:border-red-200 transition text-xs font-bold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                )}

                {/* Tips */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:border-zinc-200 hover:-translate-y-0.5 transition">
                    <Waves className="w-5 h-5 text-zinc-400 mb-2" />
                    <h4 className="text-[10px] font-bold text-black uppercase tracking-wide mb-1">Silence</h4>
                    <p className="text-[10px] text-zinc-400 leading-tight">Avoid background noise & echo.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:border-zinc-200 hover:-translate-y-0.5 transition">
                    <Mic className="w-5 h-5 text-zinc-400 mb-2" />
                    <h4 className="text-[10px] font-bold text-black uppercase tracking-wide mb-1">Distance</h4>
                    <p className="text-[10px] text-zinc-400 leading-tight">Keep 15-20cm from mic.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:border-zinc-200 hover:-translate-y-0.5 transition">
                    <Layers className="w-5 h-5 text-zinc-400 mb-2" />
                    <h4 className="text-[10px] font-bold text-black uppercase tracking-wide mb-1">Consistency</h4>
                    <p className="text-[10px] text-zinc-400 leading-tight">One session, one room.</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      onClick={() => setHasConsent(!hasConsent)}
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition",
                        hasConsent ? "bg-black border-black" : "border-zinc-300 hover:border-black"
                      )}
                    >
                      {hasConsent && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <label
                      onClick={() => setHasConsent(!hasConsent)}
                      className="text-xs text-zinc-500 font-medium select-none cursor-pointer hover:text-black"
                    >
                      I confirm I have rights to this voice.
                    </label>
                  </div>

                  <button
                    onClick={goToNextStep}
                    disabled={!canProceed()}
                    className={cn(
                      "px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition",
                      canProceed()
                        ? "bg-black text-white hover:bg-zinc-800"
                        : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                    )}
                  >
                    Next Step
                  </button>
                </div>
              </>
            ) : (
              /* Step 2: Voice Details */
              <>
                <div className="flex-1 flex flex-col min-h-[400px]">
                  <h2 className="text-2xl font-bold text-black mb-2">Voice Parameters</h2>
                  <p className="text-zinc-500 text-sm mb-8">Configure your cloned voice identity.</p>

                  <div className="space-y-6 flex-1">
                    {/* Voice Name */}
                    <div>
                      <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">
                        Voice Name *
                      </label>
                      <input
                        type="text"
                        value={voiceName}
                        onChange={(e) => setVoiceName(e.target.value)}
                        placeholder="e.g., My Custom Voice"
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:border-black focus:outline-none transition placeholder-zinc-400"
                      />
                    </div>

                    {/* Language Select */}
                    <div>
                      <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">
                        Language *
                      </label>
                      <select
                        value={voiceLanguage}
                        onChange={(e) => setVoiceLanguage(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:border-black focus:outline-none transition appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 1rem center',
                        }}
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Voice Description */}
                    <div>
                      <label className="block text-xs font-bold text-black uppercase tracking-widest mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        value={voiceDescription}
                        onChange={(e) => setVoiceDescription(e.target.value)}
                        placeholder="Describe the voice characteristics..."
                        rows={3}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:border-black focus:outline-none transition placeholder-zinc-400 resize-none"
                      />
                    </div>

                    {/* Audio Sample */}
                    {audioUrl && (
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center gap-4">
                        <button
                          onClick={togglePlay}
                          className="w-12 h-12 rounded-full bg-zinc-200 text-black flex items-center justify-center hover:bg-zinc-300 transition"
                        >
                          {isPlaying ? (
                            <Square className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-black">{audioFile?.name}</p>
                          <p className="text-xs text-zinc-400">Original audio sample</p>
                        </div>
                        <audio
                          ref={audioPlayerRef}
                          src={audioUrl}
                          onEnded={() => setIsPlaying(false)}
                          className="hidden"
                        />
                      </div>
                    )}

                    {/* Info box */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Mic className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Cloning takes a few seconds</p>
                        <p className="text-xs text-blue-600 mt-1">After cloning, you can listen to your voice in the Voice Library and use it in workflows.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-between items-center">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-bold text-zinc-500 hover:text-black transition uppercase tracking-widest"
                  >
                    ← Back
                  </button>

                  <button
                    onClick={goToNextStep}
                    disabled={!canProceed() || isUploading}
                    className={cn(
                      "px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition flex items-center gap-2",
                      canProceed() && !isUploading
                        ? "bg-black text-white hover:bg-zinc-800"
                        : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                    )}
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Cloning...
                      </>
                    ) : (
                      'Clone Voice'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
