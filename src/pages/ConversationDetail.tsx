import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Phone, MessageSquare, Volume2, Download, CheckCircle, ArrowLeft, Play, Languages } from 'lucide-react';
import { useConversationById } from '@/hooks/useConversationById';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ConversationDetail = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();
  
  const {
    data: conversation,
    isLoading,
    error
  } = useConversationById(conversationId || undefined);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (unixSeconds: number) => {
    return new Date(unixSeconds * 1000).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to get audio URL from ElevenLabs
  const getAudioUrl = async (conversationId: string) => {
    if (!conversationId) {
      console.error('No conversation ID provided to getAudioUrl');
      return null;
    }
    
    console.log('Getting audio for conversation ID:', conversationId);
    console.log('Full conversation object:', conversation);
    
    try {
      setIsLoadingAudio(true);
      
      // Get the audio data from our edge function
      const { data, error } = await supabase.functions.invoke('get-conversation-audio', {
        body: { conversationId },
      });

      if (error) {
        console.error('Error fetching audio:', error);
        toast({
          title: "Eroare la încărcare",
          description: "Nu s-a putut încărca audio-ul",
          variant: "destructive"
        });
        return null;
      }

      if (data?.audioData) {
        // Convert base64 audio data to blob URL
        const binaryString = atob(data.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        return audioUrl;
      }

      return null;
    } catch (error) {
      console.error('Error fetching audio:', error);
      toast({
        title: "Eroare la încărcare",
        description: "Nu s-a putut încărca audio-ul",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Function to auto-translate summary using GPT
  const translateSummary = async (text: string) => {
    if (!text) return text;

    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          text: text,
          targetLanguage: 'ro', // Translate to Romanian
          sourceLanguage: 'auto'
        }
      });

      if (error) {
        console.error('Translation error:', error);
        return text;
      }

      return data?.translatedText || text;
    } catch (error) {
      console.error('Error translating summary:', error);
      return text;
    }
  };


  // Function to download audio
  const downloadAudio = async () => {
    if (!conversationId) return;

    let objectUrl: string | null = null;
    try {
      setIsLoadingAudio(true);

      const { data, error } = await supabase.functions.invoke('get-conversation-audio', {
        body: { conversationId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.audioData) {
        // Convert base64 audio data to blob
        const binaryString = atob(data.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        objectUrl = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `conversation-${conversationId}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast({
          title: "Audio descărcat",
          description: "Fișierul audio a fost descărcat cu succes"
        });
      }
    } catch (error) {
      console.error('Error downloading audio:', error);
      toast({
        title: "Eroare la descărcare",
        description: "Nu s-a putut descărca audio-ul",
        variant: "destructive"
      });
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setIsLoadingAudio(false);
    }
  };

  // Extract data from conversation object
  const getConversationData = () => {
    if (!conversation) return null;
    
    return {
      startTime: conversation.metadata?.start_time_unix_secs ? formatDate(conversation.metadata.start_time_unix_secs) : 'Nu este disponibil',
      duration: conversation.metadata?.call_duration_secs ? formatDuration(conversation.metadata.call_duration_secs) : '0:00',
      cost: conversation.metadata?.cost || 0,
      status: conversation.status || 'unknown',
      phoneNumber: conversation.metadata?.phone_call?.external_number || 'Nedisponibil',
      agentNumber: conversation.metadata?.phone_call?.agent_number || 'Nedisponibil',
      language: conversation.metadata?.main_language || 'Nedisponibil',
      terminationReason: conversation.metadata?.termination_reason || 'Nedisponibil',
      summary: conversation.analysis?.transcript_summary || 'Nu există rezumat disponibil pentru această conversație.',
      callSuccessful: conversation.analysis?.call_successful || 'unknown',
      transcript: conversation.transcript || []
    };
  };

  const conversationData = getConversationData();

  // Auto-translate summary when conversation loads
  React.useEffect(() => {
    const autoTranslate = async () => {
      if (conversationData?.summary && !translatedSummary) {
        setIsTranslating(true);
        const translated = await translateSummary(conversationData.summary);
        setTranslatedSummary(translated);
        setIsTranslating(false);
      }
    };
    
    autoTranslate();
  }, [conversationData?.summary]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/account/conversation-analytics')}
            className="elevenlabs-button-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Înapoi la Conversații
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Detalii Conversație
          </h1>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span className="text-lg">Se încarcă conversația...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="text-red-600 text-lg">Eroare la încărcarea conversației</div>
          </div>
        )}

        {conversation && (
          <div className="space-y-6">
            {/* Tabs Section */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-gray-50 p-1 rounded-xl no-border">
                <TabsTrigger value="overview" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm elevenlabs-button-secondary">
                  <MessageSquare className="w-4 h-4" />
                  Overview & Detalii
                </TabsTrigger>
                <TabsTrigger value="transcription" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm elevenlabs-button-secondary">
                  <Volume2 className="w-4 h-4" />
                  Transcription
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Rezumat Conversație */}
                <Card className="elevenlabs-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                      <MessageSquare className="w-5 h-5" />
                      Rezumat Conversație (tradus automat)
                      {isTranslating && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-gray-700 leading-relaxed">
                        {translatedSummary || conversationData?.summary}
                      </p>
                      {translatedSummary && translatedSummary !== conversationData?.summary && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-500 mb-2">Text original:</p>
                          <p className="text-gray-600 text-sm italic">
                            {conversationData?.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Status & Rezultat */}
                  <Card className="elevenlabs-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                        <CheckCircle className="w-5 h-5" />
                        Status & Rezultat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="font-medium text-sm">Status apel:</span>
                        <Badge className="status-badge bg-gray-900 text-white px-2 py-1 text-xs">
                          {conversationData?.status === 'done' ? 'Finalizat' : 
                           conversationData?.status === 'failed' ? 'Eșuat' : 
                           conversationData?.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="font-medium text-sm">Cost total:</span>
                        <span className="text-lg font-bold text-gray-900">{conversationData?.cost} credite</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="font-medium text-sm">Durată:</span>
                        <span className="text-lg font-bold text-gray-900">{conversationData?.duration}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="font-medium text-sm">Dată & Oră:</span>
                        <span className="text-sm text-gray-600">{conversationData?.startTime}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <span className="font-medium text-sm">Succes apel:</span>
                        <Badge className={`status-badge ${conversationData?.callSuccessful === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white text-xs`}>
                          {conversationData?.callSuccessful === 'success' ? 'Succes' : 'Eșuat'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Informații Client */}
                  <Card className="elevenlabs-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                        <Phone className="w-5 h-5" />
                        Informații Client
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Număr telefon:</span>
                          <span className="text-sm font-bold text-red-600">{conversationData?.phoneNumber}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Număr agent:</span>
                          <span className="text-sm font-medium text-gray-800">{conversationData?.agentNumber}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Limbă:</span>
                          <span className="text-sm font-medium text-gray-800">{conversationData?.language}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Motiv încheiere:</span>
                          <span className="text-sm font-medium text-gray-800">{conversationData?.terminationReason}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detalii Apel */}
                  <Card className="elevenlabs-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                        <Phone className="w-5 h-5" />
                        Detalii Apel
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-white p-3 rounded-lg border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Tip apel:</span>
                          <Badge className="status-badge bg-gray-900 text-white text-xs">
                            {conversation.metadata?.phone_call?.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Tip interacțiune:</span>
                          <Badge className="status-badge bg-gray-900 text-white text-xs">Apel vocal</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Canal:</span>
                          <span className="text-sm font-medium">
                            {conversation.metadata?.phone_call?.direction === 'outbound' ? 'Outbound Call' : 'Inbound Call'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Audio Player */}
                {conversation.has_audio && (
                  <Card className="elevenlabs-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                        <Volume2 className="w-5 h-5" />
                        Înregistrare Audio
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-white p-6 rounded-lg border">
                        <div className="flex flex-col space-y-4">
                          {isLoadingAudio && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              <span className="text-sm text-gray-600">Se încarcă audio...</span>
                            </div>
                          )}
                          
                          {audioUrl && (
                            <audio controls className="w-full" style={{ height: '40px' }}>
                              <source src={audioUrl} type="audio/mpeg" />
                              Browser-ul tău nu suportă elementul audio.
                            </audio>
                          )}
                          
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => getAudioUrl(conversation.conversation_id)}
                              disabled={isLoadingAudio}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Încarcă Audio
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={downloadAudio}
                              disabled={isLoadingAudio}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Descarcă Audio
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="transcription" className="space-y-6 mt-6">
                {/* Audio Player Section */}
                {conversation.has_audio && (
                  <Card className="elevenlabs-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                        <Volume2 className="w-5 h-5" />
                        Audio Conversație
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="flex flex-col space-y-4">
                          {isLoadingAudio && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              <span className="text-sm text-gray-600">Se încarcă audio...</span>
                            </div>
                          )}
                          
                          {audioUrl && (
                            <audio controls className="w-full" style={{ height: '40px' }}>
                              <source src={audioUrl} type="audio/mpeg" />
                              Browser-ul tău nu suportă elementul audio.
                            </audio>
                          )}
                          
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => getAudioUrl(conversation.conversation_id)}
                              disabled={isLoadingAudio}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Încarcă Audio
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={downloadAudio}
                              disabled={isLoadingAudio}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Descarcă Audio
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="elevenlabs-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                      <MessageSquare className="w-5 h-5" />
                      Transcript Complet al Conversației
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white rounded-lg border p-4">
                      <div className="max-h-[600px] overflow-y-auto">
                        {conversationData?.transcript && conversationData.transcript.length > 0 ? (
                          <div className="space-y-4">
                            {conversationData.transcript.map((entry: any, index: number) => {
                              const role = entry.role || 'unknown';
                              const content = entry.message || entry.content || entry.text || '';
                              const timeInCall = entry.time_in_call_secs || 0;
                              const timeDisplay = formatDuration(timeInCall);
                              const speakerName = role === 'agent' ? 'Agent AI' : 'User';
                              
                              return (
                                <div key={index} className="py-3 border-b border-gray-100 last:border-b-0">
                                  <div className="flex gap-4">
                                    <div className="text-sm text-gray-500 font-mono w-16 flex-shrink-0 mt-1">
                                      {timeDisplay}
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900 mb-2">
                                        {speakerName}
                                      </div>
                                      <div className="text-sm text-gray-700 leading-relaxed">
                                        {content || 'Mesaj fără conținut'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">Nu există transcript disponibil pentru această conversație.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConversationDetail;