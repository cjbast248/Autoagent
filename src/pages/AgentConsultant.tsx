import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { DEFAULT_VALUES } from '../constants/constants';
import { useAgentCreation } from '../hooks/useAgentCreation';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Loader2,
  Globe,
  Briefcase,
  ChevronLeft,
  X,
  ShoppingCart,
  Stethoscope,
  Building2,
  Home,
  GraduationCap,
  Plane,
  Car,
  Wrench,
  Monitor,
  Landmark,
  UtensilsCrossed,
  Factory,
  Dumbbell,
  Scale,
  Heart,
  Tv,
  HelpCircle,
  Headphones,
  TrendingUp,
  BookOpen,
  Calendar,
  Users,
  Phone,
  CreditCard,
  FileText,
  Shield,
  Clock,
  Settings,
  Check,
  ArrowRight,
  Circle,
  Upload
} from 'lucide-react';

// Types
type AgentType = 'blank' | 'website' | 'business' | null;
type WizardStep = 'select-type' | 'select-industry' | 'select-usecase' | 'complete';

interface Industry {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface UseCase {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Industries data
const INDUSTRIES: Industry[] = [
  { id: 'retail', label: 'Retail & E-commerce', icon: <ShoppingCart className="w-5 h-5" /> },
  { id: 'healthcare', label: 'Healthcare & Medical', icon: <Stethoscope className="w-5 h-5" /> },
  { id: 'finance', label: 'Finance & Banking', icon: <Building2 className="w-5 h-5" /> },
  { id: 'realestate', label: 'Real Estate', icon: <Home className="w-5 h-5" /> },
  { id: 'education', label: 'Education & Training', icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'hospitality', label: 'Hospitality & Travel', icon: <Plane className="w-5 h-5" /> },
  { id: 'automotive', label: 'Automotive', icon: <Car className="w-5 h-5" /> },
  { id: 'professional', label: 'Professional Services', icon: <Wrench className="w-5 h-5" /> },
  { id: 'technology', label: 'Technology & Software', icon: <Monitor className="w-5 h-5" /> },
  { id: 'government', label: 'Government & Public', icon: <Landmark className="w-5 h-5" /> },
  { id: 'food', label: 'Food & Beverage', icon: <UtensilsCrossed className="w-5 h-5" /> },
  { id: 'manufacturing', label: 'Manufacturing', icon: <Factory className="w-5 h-5" /> },
  { id: 'fitness', label: 'Fitness & Wellness', icon: <Dumbbell className="w-5 h-5" /> },
  { id: 'legal', label: 'Legal Services', icon: <Scale className="w-5 h-5" /> },
  { id: 'nonprofit', label: 'Non-Profit', icon: <Heart className="w-5 h-5" /> },
  { id: 'media', label: 'Media & Entertainment', icon: <Tv className="w-5 h-5" /> },
  { id: 'other', label: 'Other', icon: <HelpCircle className="w-5 h-5" /> },
];

// Use cases by industry
const USE_CASES: Record<string, UseCase[]> = {
  default: [
    { id: 'support', label: 'Customer Support', icon: <Headphones className="w-5 h-5" /> },
    { id: 'sales', label: 'Outbound Sales', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'learning', label: 'Learning and Development', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'scheduling', label: 'Scheduling', icon: <Calendar className="w-5 h-5" /> },
    { id: 'leads', label: 'Lead Qualification', icon: <Users className="w-5 h-5" /> },
    { id: 'answering', label: 'Answering Service', icon: <Phone className="w-5 h-5" /> },
    { id: 'other', label: 'Other', icon: <HelpCircle className="w-5 h-5" /> },
  ],
  finance: [
    { id: 'support', label: 'Customer Support', icon: <Headphones className="w-5 h-5" /> },
    { id: 'sales', label: 'Outbound Sales', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'learning', label: 'Learning and Development', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'scheduling', label: 'Scheduling', icon: <Calendar className="w-5 h-5" /> },
    { id: 'leads', label: 'Lead Qualification', icon: <Users className="w-5 h-5" /> },
    { id: 'answering', label: 'Answering Service', icon: <Phone className="w-5 h-5" /> },
    { id: 'accounts', label: 'Account Inquiries', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'loans', label: 'Loan Applications', icon: <FileText className="w-5 h-5" /> },
    { id: 'fraud', label: 'Fraud Alerts', icon: <Shield className="w-5 h-5" /> },
    { id: 'investment', label: 'Investment Guidance', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'billing', label: 'Bill Payment Support', icon: <Clock className="w-5 h-5" /> },
    { id: 'planning', label: 'Financial Planning', icon: <Settings className="w-5 h-5" /> },
    { id: 'other', label: 'Other', icon: <HelpCircle className="w-5 h-5" /> },
  ],
};

// Dot pattern style
const dotPatternStyle = {
  backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
  backgroundSize: '24px 24px'
};

const AgentConsultant: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('select-type');
  const [agentType, setAgentType] = useState<AgentType>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [hoveredType, setHoveredType] = useState<AgentType>(null);

  // Form state
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentLanguage, setAgentLanguage] = useState<string>(DEFAULT_VALUES.LANGUAGE);
  const [selectedVoice, setSelectedVoice] = useState<string>(DEFAULT_VALUES.VOICE_ID);

  // Creation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');

  const getSystemPrompt = () => {
    if (agentType === 'blank') {
      return 'You are a friendly and professional virtual assistant. Help users with their questions and provide clear and useful answers.';
    }
    if (agentType === 'website') {
      const urlPart = websiteUrl.trim() ? ` pentru ${websiteUrl.trim()}` : '';
      return `Hello! I am the virtual assistant${urlPart}. How can I help you today? I am here to answer your questions and provide support.`;
    }
    if (agentType === 'business') {
      const industry = INDUSTRIES.find(i => i.id === selectedIndustry)?.label || '';
      const useCase = (USE_CASES[selectedIndustry || ''] || USE_CASES.default).find(u => u.id === selectedUseCase)?.label || '';
      return `You are a ${useCase} assistant for a business in the ${industry} field. Help customers with their questions in a professional and friendly manner.`;
    }
    return 'You are a friendly and professional virtual assistant. Help users with their questions and provide clear and useful answers.';
  };


  const {
    isCreating: isCreatingAgent,
    createdAgentId,
    handleCreateAgent,
  } = useAgentCreation({
    websiteUrl: agentType === 'website' ? websiteUrl : '',
    additionalPrompt: '',
    agentName,
    agentLanguage,
    selectedVoice,
    generatePrompt: () => Promise.resolve(getSystemPrompt())
  });

  // Authentication guard
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Navigate to agent after creation
  React.useEffect(() => {
    if (createdAgentId) {
      navigate(`/account/agent-edit/${createdAgentId}`);
    }
  }, [createdAgentId, navigate]);

  const handleClose = () => {
    navigate('/account/kalina-agents');
  };

  const handleBack = () => {
    if (step === 'complete') {
      if (agentType === 'business') {
        setStep('select-usecase');
      } else {
        setStep('select-type');
        setAgentType(null);
      }
    } else if (step === 'select-usecase') {
      setStep('select-industry');
    } else if (step === 'select-industry') {
      setStep('select-type');
      setAgentType(null);
    }
  };

  const handleSelectAgentType = (type: AgentType) => {
    setAgentType(type);
    if (type === 'blank' || type === 'website') {
      setStep('complete');
    } else if (type === 'business') {
      setStep('select-industry');
    }
  };

  const handleSelectIndustry = (industryId: string) => {
    setSelectedIndustry(industryId);
    setStep('select-usecase');
  };

  const handleSelectUseCase = (useCaseId: string) => {
    setSelectedUseCase(useCaseId);
    setStep('complete');
  };

  const handleCreateAgentClick = async () => {
    setIsProcessing(true);
    setProcessingStep('Creating agent...');

    try {
      // Skip website analysis - use instant default prompt
      // User can customize the prompt later in agent edit page
      await handleCreateAgent();
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('An error occurred while creating the agent');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const canCreateAgent = agentName.trim().length > 0;
  const isLoading = isProcessing || isCreatingAgent;

  // Archetype cards data
  const archetypes = [
    {
      id: 'blank' as AgentType,
      title: 'Blank Agent',
      description: 'Start from scratch with a completely empty canvas. Full control over every aspect.',
      icon: Circle,
      preview: (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="font-mono text-[10px] text-zinc-400 mb-2">// empty template</div>
            <div className="font-mono text-xs text-zinc-300">
              <span className="text-zinc-400">const</span> agent = <span className="text-zinc-400">{'{}'}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'website' as AgentType,
      title: 'Web Assistant',
      description: 'Auto-generate agent from website content. Perfect for customer support.',
      icon: Globe,
      preview: (
        <div className="h-full flex flex-col justify-end gap-1.5 p-1">
          <div className="bg-zinc-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg rounded-br-sm ml-auto max-w-[85%]">
            Could you check my emails?
          </div>
          <div className="flex items-end gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
            <div className="bg-zinc-100 text-zinc-700 text-[10px] px-2.5 py-1.5 rounded-lg rounded-bl-sm">
              Sure, let me check that for you.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'business' as AgentType,
      title: 'Business Agent',
      description: 'Pre-configured for sales, support and lead qualification workflows.',
      icon: Briefcase,
      preview: (
        <div className="h-full flex flex-col justify-end gap-1.5 p-1">
          <div className="bg-zinc-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg rounded-br-sm ml-auto max-w-[85%]">
            Tell me about pricing
          </div>
          <div className="flex items-end gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex-shrink-0" />
            <div className="bg-zinc-100 text-zinc-700 text-[10px] px-2.5 py-1.5 rounded-lg rounded-bl-sm">
              We have 3 plans: Starter, Pro, Enterprise.
            </div>
          </div>
        </div>
      )
    }
  ];

  // Render agent type selection (zen style)
  const renderAgentTypeSelection = () => (
    <div className="min-h-screen flex flex-col overflow-hidden" style={dotPatternStyle}>
      {/* Close button */}
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black hover:border-black transition-all z-10"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 py-12 md:py-16 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 shrink-0 border-t border-transparent pt-8 md:pt-0">
          <h1 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">
            New Agent
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-black tracking-tight px-4">
            Select Agent Archetype
          </h2>
          <p className="text-zinc-500 mt-3 text-sm px-4">
            Start from a blank canvas or deploy a specialized template.
          </p>
        </div>

        {/* Archetype Cards Container with extra padding for hover effect */}
        <div className="py-4 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full px-4">
            {archetypes.map((archetype) => {
              const isHovered = hoveredType === archetype.id;
              const isSelected = agentType === archetype.id;
              const Icon = archetype.icon;

              return (
                <div
                  key={archetype.id}
                  data-agent-type={archetype.id}
                  onClick={() => setAgentType(archetype.id)}
                  onMouseEnter={() => setHoveredType(archetype.id)}
                  onMouseLeave={() => setHoveredType(null)}
                  className={`
                    relative bg-white rounded-3xl p-6 cursor-pointer
                    border transition-all duration-300
                    ${isHovered || isSelected
                      ? 'border-black shadow-2xl shadow-zinc-300 -translate-y-2'
                      : 'border-zinc-200 shadow-lg shadow-zinc-100'
                    }
                  `}
                  style={{
                    transitionTimingFunction: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
                  }}
                >
                  {/* Selection Checkbox */}
                  <div
                    className={`
                      absolute top-5 right-5 w-6 h-6 rounded-full border-2
                      flex items-center justify-center transition-all duration-200
                      ${isSelected
                        ? 'bg-black border-black'
                        : isHovered
                          ? 'border-black'
                          : 'border-zinc-300'
                      }
                    `}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>

                  {/* Icon */}
                  <div
                    className={`
                      w-12 h-12 rounded-2xl flex items-center justify-center mb-5
                      transition-all duration-300
                      ${isHovered || isSelected
                        ? 'bg-black text-white'
                        : 'bg-zinc-100 text-zinc-600'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-black mb-2">
                    {archetype.title}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-5 min-h-[40px]">
                    {archetype.description}
                  </p>

                  {/* Preview Area */}
                  <div className="bg-zinc-50 rounded-2xl h-24 border border-zinc-100 overflow-hidden">
                    {archetype.preview}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 flex items-center gap-6 shrink-0">
          <button
            onClick={handleClose}
            className="px-6 py-3 text-xs font-bold text-zinc-500 hover:text-black transition hidden md:block"
          >
            Cancel
          </button>
          <button
            data-action="next-step"
            onClick={() => agentType && handleSelectAgentType(agentType)}
            disabled={!agentType}
            className={`
              px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider
              flex items-center gap-2 transition-all duration-200
              ${agentType
                ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-zinc-300'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }
            `}
          >
            Create Agent
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Import JSON Link */}
        <button className="mt-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-black transition flex items-center gap-2 shrink-0">
          <Upload className="w-3 h-3" />
          Import JSON Config
        </button>
      </div>
    </div>
  );

  const renderIndustrySelection = () => (
    <div className="min-h-screen flex flex-col" style={dotPatternStyle}>
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black hover:border-black transition-all z-10"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 pt-20 md:pt-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">
            Business Agent
          </h1>
          <h2 className="text-3xl font-bold text-black tracking-tight">
            What industry is your business in?
          </h2>
          <p className="text-zinc-500 mt-3 text-sm">
            Select the industry that best describes your business
          </p>
        </div>

        {/* Industries Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-4xl w-full">
          {INDUSTRIES.map((industry) => (
            <button
              key={industry.id}
              onClick={() => handleSelectIndustry(industry.id)}
              className="group bg-white p-4 rounded-2xl border border-zinc-200 hover:border-black hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center gap-2"
              style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.8, 0.25, 1)' }}
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-100 group-hover:bg-black text-zinc-500 group-hover:text-white flex items-center justify-center transition-all duration-300">
                {industry.icon}
              </div>
              <span className="text-xs font-medium text-zinc-700 group-hover:text-black transition">
                {industry.label}
              </span>
            </button>
          ))}
        </div>

        {/* Back button */}
        <button
          onClick={handleBack}
          className="mt-10 px-6 py-3 text-xs font-bold text-zinc-500 hover:text-black transition flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    </div>
  );

  const renderUseCaseSelection = () => {
    const useCases = USE_CASES[selectedIndustry || ''] || USE_CASES.default;

    return (
      <div className="min-h-screen flex flex-col" style={dotPatternStyle}>
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black hover:border-black transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 pt-20 md:pt-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">
              Use Case
            </h1>
            <h2 className="text-3xl font-bold text-black tracking-tight">
              What will your agent help with?
            </h2>
            <p className="text-zinc-500 mt-3 text-sm">
              Choose the primary function of your agent
            </p>
          </div>

          {/* Use Cases Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-3xl w-full">
            {useCases.map((useCase) => (
              <button
                key={useCase.id}
                onClick={() => handleSelectUseCase(useCase.id)}
                className="group bg-white p-4 rounded-2xl border border-zinc-200 hover:border-black hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center gap-2"
                style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.8, 0.25, 1)' }}
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 group-hover:bg-black text-zinc-500 group-hover:text-white flex items-center justify-center transition-all duration-300">
                  {useCase.icon}
                </div>
                <span className="text-xs font-medium text-zinc-700 group-hover:text-black transition">
                  {useCase.label}
                </span>
              </button>
            ))}
          </div>

          {/* Back button */}
          <button
            onClick={handleBack}
            className="mt-10 px-6 py-3 text-xs font-bold text-zinc-500 hover:text-black transition flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    );
  };

  const renderCompleteForm = () => (
    <div className="min-h-screen flex flex-col" style={dotPatternStyle}>
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black hover:border-black transition-all z-10"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">
            Final Step
          </h1>
          <h2 className="text-3xl font-bold text-black tracking-tight">
            Complete your agent
          </h2>
          <p className="text-zinc-500 mt-3 text-sm">
            Choose a name that reflects your agent's purpose
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-xl shadow-zinc-200 max-w-md w-full">
          <div className="space-y-6">
            {/* Agent Name */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  data-input="agent-name"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value.slice(0, 50))}
                  placeholder="My Assistant"
                  className="w-full bg-zinc-50 border-transparent rounded-xl py-3 px-4 text-sm font-medium text-black placeholder-zinc-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent pr-14"
                  maxLength={50}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-300">
                  {agentName.length}/50
                </span>
              </div>
            </div>

            {/* Website URL for website type */}
            {agentType === 'website' && (
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">
                  Website URL
                </label>
                <Input
                  data-input="website-url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-zinc-50 border-transparent rounded-xl py-3 px-4 text-sm font-medium text-black placeholder-zinc-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  disabled={isLoading}
                />
                <p className="text-[10px] text-zinc-400 mt-2">
                  You can customize the prompt after creation in the edit page
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-100">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-black transition flex items-center gap-1"
              disabled={isLoading}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              data-action="create-agent"
              onClick={handleCreateAgentClick}
              disabled={!canCreateAgent || isLoading}
              className={`
                px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider
                flex items-center gap-2 transition-all duration-200
                ${canCreateAgent && !isLoading
                  ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-zinc-300'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {processingStep || 'Processing...'}
                </>
              ) : (
                <>
                  Create Agent
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white relative">
        {step === 'select-type' && renderAgentTypeSelection()}
        {step === 'select-industry' && renderIndustrySelection()}
        {step === 'select-usecase' && renderUseCaseSelection()}
        {step === 'complete' && renderCompleteForm()}
      </div>
    </DashboardLayout>
  );
};

export default AgentConsultant;
