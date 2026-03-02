
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, BrainCircuit, Target, Users, TrendingUp, 
  Zap, Network, Globe, MessageSquare,
  Phone, Calendar, Clock, CheckCircle
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface IntelligentCampaignCreatorProps {
  onCampaignCreated: (campaigns: any[]) => void;
  userAgents: any[];
  callHistory: any[];
}

const IntelligentCampaignCreator = ({ 
  onCampaignCreated, 
  userAgents, 
  callHistory 
}: IntelligentCampaignCreatorProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const analysisSteps = [
    { title: 'Analizez istoricul conversațiilor', icon: <MessageSquare className="h-4 w-4" /> },
    { title: 'Identifică patternuri și tendințe', icon: <TrendingUp className="h-4 w-4" /> },
    { title: 'Segmentez contactele', icon: <Users className="h-4 w-4" /> },
    { title: 'Generez campanii personalizate', icon: <Target className="h-4 w-4" /> },
    { title: 'Optimizez timing și mesaje', icon: <Clock className="h-4 w-4" /> }
  ];

  const performIntelligentAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisStep(0);

    // Simulăm procesul de analiză AI
    for (let step = 0; step < analysisSteps.length; step++) {
      setAnalysisStep(step);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Generăm rezultatele analizei
    const results = await generateIntelligentCampaigns();
    setAnalysisResults(results);
    setIsAnalyzing(false);

    toast({
      title: "🧠 Analiza completă!",
      description: `Am generat ${results.campaigns.length} campanii inteligente personalizate.`,
    });

    onCampaignCreated(results.campaigns);
  };

  const generateIntelligentCampaigns = async () => {
    // Simulăm analiză avansată AI
    const insights = {
      totalContacts: callHistory.length,
      engagementRate: 72,
      bestCallTimes: ['10:00-12:00', '14:00-17:00'],
      topPerformingAgents: userAgents.slice(0, 2),
      contactSegments: [
        { name: 'Clienți Fideli', count: 45, engagement: 85 },
        { name: 'Clienți Noi', count: 32, engagement: 65 },
        { name: 'Clienți Inactivi', count: 28, engagement: 45 }
      ]
    };

    const campaigns = [
      {
        id: `campaign_${Date.now()}_1`,
        title: 'Reactivare Clienți Premium',
        description: 'Campanie personalizată pentru clienții cu valoare mare care nu au fost contactați recent',
        type: 'reactivation',
        priority: 'high',
        targetSegment: 'Clienți Fideli',
        estimatedContacts: 45,
        suggestedAgent: userAgents[0]?.agent_id,
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // În 2 ore
        messageTemplate: 'Salut {name}! Îți mulțumim pentru fidelitate. Avem o ofertă specială doar pentru tine...',
        expectedROI: 'Mare',
        confidence: 92
      },
      {
        id: `campaign_${Date.now()}_2`,
        title: 'Welcome Call pentru Clienți Noi',
        description: 'Apeluri de bun venit pentru clienții înregistrați în ultimele 30 de zile',
        type: 'welcome',
        priority: 'medium',
        targetSegment: 'Clienți Noi',
        estimatedContacts: 32,
        suggestedAgent: userAgents[1]?.agent_id,
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mâine
        messageTemplate: 'Bună ziua {name}! Te rugăm să ne spui cum a fost experiența ta cu noi...',
        expectedROI: 'Medie',
        confidence: 87
      },
      {
        id: `campaign_${Date.now()}_3`,
        title: 'Feedback și Recomandări',
        description: 'Colectare feedback de la clienții activi și cerere de recomandări',
        type: 'feedback',
        priority: 'medium',
        targetSegment: 'Clienți Activi',
        estimatedContacts: 60,
        suggestedAgent: userAgents[0]?.agent_id,
        scheduledTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // În 2 zile
        messageTemplate: 'Salut {name}! Ne-ar plăcea să aflăm părerea ta despre serviciile noastre...',
        expectedROI: 'Medie',
        confidence: 78
      }
    ];

    return { insights, campaigns };
  };

  const getCampaignTypeColor = (type: string) => {
    switch (type) {
      case 'reactivation': return 'bg-red-100 text-red-800 border-red-200';
      case 'welcome': return 'bg-green-100 text-green-800 border-green-200';
      case 'feedback': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (isAnalyzing) {
    return (
  <Card className="border-0 shadow-xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BrainCircuit className="h-6 w-6 mr-3 text-black/70 animate-pulse" />
            Analiză AI în progres...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {analysisSteps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
                  index <= analysisStep 
                    ? 'bg-white shadow-md border-l-4 border-black' 
                    : 'bg-gray-50 opacity-60'
                }`}
              >
                <div className={`${index === analysisStep ? 'animate-spin' : ''}`}>
                  {step.icon}
                </div>
                <span className={`${index <= analysisStep ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                  {step.title}
                </span>
                {index < analysisStep && <CheckCircle className="h-4 w-4 text-green-600" />}
              </div>
            ))}
          </div>
          <Progress 
            value={(analysisStep + 1) / analysisSteps.length * 100} 
            className="h-2"
          />
        </CardContent>
      </Card>
    );
  }

  if (analysisResults) {
    return (
      <div className="space-y-6">
        {/* Insights Summary */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-6 w-6 mr-3 text-green-600" />
              Insights Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analysisResults.insights.totalContacts}</div>
                <div className="text-sm text-gray-600">Total Contacte</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analysisResults.insights.engagementRate}%</div>
                <div className="text-sm text-gray-600">Rata de Engagement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{analysisResults.campaigns.length}</div>
                <div className="text-sm text-gray-600">Campanii Generate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generated Campaigns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysisResults.campaigns.map((campaign: any) => (
            <Card key={campaign.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className={getCampaignTypeColor(campaign.type)}>
                    <Target className="h-3 w-3 mr-1" />
                    {campaign.type}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(campaign.priority)}`}></div>
                    <span className="text-xs text-gray-600">{campaign.priority}</span>
                  </div>
                </div>
                <CardTitle className="text-lg">{campaign.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">{campaign.description}</p>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Contacte țintă:</span>
                    <span className="font-medium">{campaign.estimatedContacts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">ROI estimat:</span>
                    <span className="font-medium">{campaign.expectedROI}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Confidence:</span>
                    <span className="font-medium">{campaign.confidence}%</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    {campaign.scheduledTime.toLocaleString('ro-RO')}
                  </div>
                  <p className="text-xs bg-gray-50 p-2 rounded italic">
                    "{campaign.messageTemplate.substring(0, 80)}..."
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center text-2xl">
          <Sparkles className="h-8 w-8 mr-3 text-purple-600" />
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Creator Inteligent de Campanii
          </span>
        </CardTitle>
        <p className="text-gray-600 mt-2">
          Funcția unică care analizează toate datele tale pentru a crea campanii personalizate
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <BrainCircuit className="h-5 w-5 mr-2 text-black/70" />
              <h4 className="font-medium">Analiză AI Avansată</h4>
            </div>
            <p className="text-sm text-gray-600">
              Procesez istoric conversații, patternuri de comportament și preferințe cliente
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <Network className="h-5 w-5 mr-2 text-green-600" />
              <h4 className="font-medium">RAG & MCP Integration</h4>
            </div>
            <p className="text-sm text-gray-600">
              Folosesc toate sursele de date conectate pentru context complet
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <Target className="h-5 w-5 mr-2 text-red-600" />
              <h4 className="font-medium">Segmentare Inteligentă</h4>
            </div>
            <p className="text-sm text-gray-600">
              Împart contactele în segmente pentru campanii ultra-personalizate
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <Zap className="h-5 w-5 mr-2 text-yellow-600" />
              <h4 className="font-medium">Optimizare Automată</h4>
            </div>
            <p className="text-sm text-gray-600">
              Aleg cel mai bun timing, agent și mesaj pentru fiecare contact
            </p>
          </div>
        </div>

        <div className="text-center">
          <Button
            onClick={performIntelligentAnalysis}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Activează Magia AI
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Procesul va dura 10-15 secunde pentru analiză completă
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntelligentCampaignCreator;
