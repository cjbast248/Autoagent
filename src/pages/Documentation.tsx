import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Bot, Phone, BarChart3, Calendar, Globe, Mail, FileText, Settings, 
  Zap, MessageCircle, Users, Headphones, Code, BookOpen, 
  ChevronRight, Play, Eye, Wrench, PieChart, Mic, PhoneCall,
  Database, Workflow, Monitor, Webhook, Bell, Search, Building2,
  CreditCard, Shield, Clock, ArrowRight, Check, AlertCircle
} from 'lucide-react';

const Documentation = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const menuSections = [
    {
      title: 'NOȚIUNI DE BAZĂ',
      items: [
        { id: 'overview', title: 'Prezentare Generală', icon: Eye },
        { id: 'how-it-works', title: 'Cum Funcționează', icon: Workflow },
        { id: 'quickstart', title: 'Ghid Rapid', icon: Play },
        { id: 'architecture', title: 'Arhitectura Sistemului', icon: Building2 }
      ]
    },
    {
      title: 'FUNCȚIONALITĂȚI',
      items: [
        { id: 'voice-agents', title: 'Agenți Vocali AI', icon: Bot },
        { id: 'phone-calls', title: 'Apeluri Telefonice', icon: Phone },
        { id: 'batch-campaigns', title: 'Campanii în Masă', icon: Users },
        { id: 'analytics', title: 'Analiză & Rapoarte', icon: BarChart3 },
        { id: 'scheduling', title: 'Programări Automate', icon: Calendar },
        { id: 'transcriptions', title: 'Transcrieri Audio', icon: FileText },
        { id: 'web-scraping', title: 'Extragere Date Web', icon: Globe }
      ]
    },
    {
      title: 'INTEGRĂRI & DEZVOLTATORI',
      items: [
        { id: 'tutorials', title: 'Tutorials & Ghiduri', icon: BookOpen },
        { id: 'support', title: 'Suport Tehnic', icon: Headphones }
      ]
    },
    {
      title: 'CREDITE & FACTURARE',
      items: [
        { id: 'credits', title: 'Sistem de Credite', icon: CreditCard },
        { id: 'pricing', title: 'Prețuri & Planuri', icon: Building2 },
        { id: 'billing', title: 'Facturare', icon: Settings }
      ]
    }
  ];

  const renderOverview = () => (
    <section id="overview" className="min-h-screen p-12 relative">
      <div className="max-w-5xl mx-auto">
        <div 
          className="mb-16 animate-fade-in"
          style={{
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        >
          <h1 className="text-7xl font-bold text-black mb-8 animate-slide-in-up">
            Agent Automation
          </h1>
          <p className="text-2xl text-gray-600 leading-relaxed animate-fade-in animation-delay-300">
            Platforma de agenți vocali AI pentru automatizarea conversațiilor
          </p>
        </div>

        <div 
          className="grid gap-8 md:grid-cols-3"
          style={{
            transform: `translateY(${scrollY * 0.05}px)`,
          }}
        >
          <div className="liquid-glass p-8 hover-scale animate-fade-in animation-delay-500">
            <Bot className="h-12 w-12 mb-4 text-black" />
            <h3 className="text-xl font-bold mb-3 text-black">Agenți AI</h3>
            <p className="text-gray-700">Conversații naturale inteligente</p>
          </div>
          <div className="liquid-glass p-8 hover-scale animate-fade-in animation-delay-700">
            <Phone className="h-12 w-12 mb-4 text-black" />
            <h3 className="text-xl font-bold mb-3 text-black">Apeluri Automate</h3>
            <p className="text-gray-700">Campanii scalabile</p>
          </div>
          <div className="liquid-glass p-8 hover-scale animate-fade-in animation-delay-1000">
            <BarChart3 className="h-12 w-12 mb-4 text-black" />
            <h3 className="text-xl font-bold mb-3 text-black">Analytics</h3>
            <p className="text-gray-700">Monitorizare performanță</p>
          </div>
        </div>
      </div>
    </section>
  );

  const renderHowItWorks = () => (
    <section id="how-it-works" className="min-h-screen p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-black mb-8">Cum Funcționează</h1>
        <p className="text-xl text-gray-600 mb-12">Procesul simplu în 4 pași</p>
        
        <div className="space-y-8">
          <div className="liquid-glass p-8 hover-scale">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold">1</div>
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Creează Agent</h3>
                <p className="text-gray-600">Configurează personalitatea și vocea agentului AI</p>
              </div>
            </div>
          </div>
          
          <div className="liquid-glass p-8 hover-scale">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold">2</div>
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Configurează Apel</h3>
                <p className="text-gray-600">Selectează contactele și parametrii campaniei</p>
              </div>
            </div>
          </div>
          
          <div className="liquid-glass p-8 hover-scale">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold">3</div>
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Lansează</h3>
                <p className="text-gray-600">Agentul inițiază conversațiile automat</p>
              </div>
            </div>
          </div>
          
          <div className="liquid-glass p-8 hover-scale">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold">4</div>
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Analizează</h3>
                <p className="text-gray-600">Urmărește rezultatele și optimizează</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderQuickstart = () => (
    <section id="quickstart" className="min-h-screen p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-black mb-8">Ghid Rapid</h1>
        <p className="text-xl text-gray-600 mb-12">Începe în 5 minute</p>
        
        <div className="space-y-8">
          <div className="liquid-glass p-8 hover-scale">
            <h3 className="text-2xl font-bold text-black mb-4">Pasul 1: Creează primul agent</h3>
            <p className="text-gray-600 mb-4">Navighează la secțiunea Agenți și creează un nou agent vocal</p>
            <div className="glass-input p-4 rounded-lg">
              <code className="text-black">Dashboard → Agenți → Agent Nou</code>
            </div>
          </div>

          <div className="liquid-glass p-8 hover-scale">
            <h3 className="text-2xl font-bold text-black mb-4">Pasul 2: Configurează agentul</h3>
            <p className="text-gray-600 mb-4">Setează personalitatea și instrucțiunile agentului</p>
            <div className="glass-input p-4 rounded-lg">
              <code className="text-black">Prompt → Voce → Mesaj de început</code>
            </div>
          </div>

          <div className="liquid-glass p-8 hover-scale">
            <h3 className="text-2xl font-bold text-black mb-4">Pasul 3: Lansează primul apel</h3>
            <p className="text-gray-600 mb-4">Testează agentul cu un apel de probă</p>
            <div className="glass-input p-4 rounded-lg">
              <code className="text-black">Outbound → Selectează Agent → Apel Test</code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderArchitecture = () => (
    <section id="architecture" className="min-h-screen p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-black mb-8">Arhitectura Sistemului</h1>
        <p className="text-xl text-gray-600 mb-12">Componentele principale ale platformei</p>
        
        <div className="grid gap-8 md:grid-cols-2">
          <div className="liquid-glass p-8 hover-scale">
            <Database className="h-12 w-12 text-black mb-4" />
            <h3 className="text-2xl font-bold text-black mb-4">Frontend</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Dashboard interactiv</li>
              <li>• Gestionare agenți</li>
              <li>• Monitorizare campanii</li>
              <li>• Analytics în timp real</li>
            </ul>
          </div>
          
          <div className="liquid-glass p-8 hover-scale">
            <Code className="h-12 w-12 text-black mb-4" />
            <h3 className="text-2xl font-bold text-black mb-4">Backend</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Database PostgreSQL</li>
              <li>• Edge Functions</li>
              <li>• Authentication</li>
              <li>• Real-time subscriptions</li>
            </ul>
          </div>
          
          <div className="liquid-glass p-8 hover-scale">
            <Mic className="h-12 w-12 text-black mb-4" />
            <h3 className="text-2xl font-bold text-black mb-4">Voice Engine</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Conversational AI</li>
              <li>• Voice synthesis</li>
              <li>• Phone call management</li>
              <li>• Webhook notifications</li>
            </ul>
          </div>
          
          <div className="liquid-glass p-8 hover-scale">
            <Bot className="h-12 w-12 text-black mb-4" />
            <h3 className="text-2xl font-bold text-black mb-4">AI Services</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Natural language processing</li>
              <li>• Sentiment analysis</li>
              <li>• Intent detection</li>
              <li>• Content processing</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );

  const renderVoiceAgents = () => (
    <section id="voice-agents" className="min-h-screen p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-black mb-8">Agenți Vocali AI</h1>
        <p className="text-xl text-gray-600 mb-12">Crearea și gestionarea agenților inteligenți</p>
        
        <div className="grid gap-8 md:grid-cols-2 mb-12">
          <div className="liquid-glass p-8">
            <h3 className="text-2xl font-bold mb-4 text-black">Ce sunt agenții vocali?</h3>
            <p className="text-gray-600 mb-4">Asistenti AI care pot purta conversații naturale prin telefon și execută sarcini automate.</p>
            <ul className="space-y-2 text-gray-600">
              <li>• Conversații naturale</li>
              <li>• Personalitate configurabilă</li>
              <li>• Integrare cu sisteme externe</li>
              <li>• Învățare din interacțiuni</li>
            </ul>
          </div>
          <div className="liquid-glass p-8">
            <h3 className="text-2xl font-bold text-black mb-4">Cum funcționează?</h3>
            <p className="text-gray-600 mb-4">Agenții folosesc AI pentru înțelegerea și generarea de text, plus sinteza vocii.</p>
            <ul className="space-y-2 text-gray-600">
              <li>• Natural language processing</li>
              <li>• Context awareness</li>
              <li>• Emotional intelligence</li>
              <li>• Multi-language support</li>
            </ul>
          </div>
        </div>

        <div className="space-y-8">
          <div className="liquid-glass p-8">
            <h3 className="text-xl font-bold text-black mb-4">1. Informații Generale</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="glass-input p-4 rounded-lg">
                <strong>Numele Agentului:</strong> Identificarea unică
              </div>
              <div className="glass-input p-4 rounded-lg">
                <strong>Descrierea:</strong> Scopul și funcționalitatea
              </div>
            </div>
          </div>

          <div className="liquid-glass p-8">
            <h3 className="text-xl font-bold text-black mb-4">2. System Prompt</h3>
            <p className="text-gray-600 mb-4">Promptul definește personalitatea și regulile agentului.</p>
            <div className="glass-input p-4 rounded-lg font-mono text-sm text-gray-700">
              Ești un agent prietenos și profesionist...<br/>
              Scopul tău este să califiezi lead-urile...<br/>
              Folosește un ton conversațional dar respectuos...
            </div>
          </div>

          <div className="liquid-glass p-8">
            <h3 className="text-xl font-bold text-black mb-4">3. Configurare Voce</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="glass-input p-4 rounded-lg text-center">
                <strong>Limba:</strong><br/>Română, Engleză, etc.
              </div>
              <div className="glass-input p-4 rounded-lg text-center">
                <strong>Vocea:</strong><br/>Masculină/Feminină
              </div>
              <div className="glass-input p-4 rounded-lg text-center">
                <strong>Stilul:</strong><br/>Calm, energic, profesional
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderPhoneCalls = () => (
    <section id="phone-calls" className="min-h-screen p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-black mb-8">Apeluri Telefonice</h1>
        <p className="text-xl text-gray-600 mb-12">Sistem complet de gestionare a apelurilor</p>
        
        <div className="grid gap-8 md:grid-cols-2 mb-12">
          <div className="liquid-glass p-8">
            <PhoneCall className="h-12 w-12 text-black mb-4" />
            <h3 className="text-2xl font-bold mb-4 text-black">Apeluri Individuale</h3>
            <p className="text-gray-600 mb-4">Apeluri personalizate către contacte specifice cu monitorizare detaliată.</p>
            <ul className="space-y-2 text-gray-600">
              <li>• Configurare rapidă</li>
              <li>• Monitoring în timp real</li>
              <li>• Transcriere automată</li>
              <li>• Analiza conversației</li>
            </ul>
          </div>
          <div className="liquid-glass p-8">
            <Users className="h-12 w-12 text-black mb-4" />
            <h3 className="text-2xl font-bold text-black mb-4">Campanii în Masă</h3>
            <p className="text-gray-600 mb-4">Apeluri simultane către sute de contacte cu raportare centralizată.</p>
            <ul className="space-y-2 text-gray-600">
              <li>• Upload CSV contacte</li>
              <li>• Execuție paralelă</li>
              <li>• Progress tracking</li>
              <li>• Statistici detaliate</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="liquid-glass p-6">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold">1</div>
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Inițiere Apel</h3>
                <p className="text-gray-600">Sistemul trimite cererea cu parametrii agentului și numărul de telefon.</p>
              </div>
            </div>
          </div>
          
          <div className="liquid-glass p-6">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold">2</div>
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Conectare</h3>
                <p className="text-gray-600">Se apelează numărul și începe conversația cu primul mesaj configurat.</p>
              </div>
            </div>
          </div>
          
          <div className="liquid-glass p-6">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold">3</div>
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Conversație</h3>
                <p className="text-gray-600">Agentul AI conduce conversația, adaptându-se la răspunsurile interlocutorului.</p>
              </div>
            </div>
          </div>
          
          <div className="liquid-glass p-6">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold">4</div>
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Finalizare & Analiza</h3>
                <p className="text-gray-600">Conversația este transcrisă și analizată pentru insight-uri.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderCredits = () => (
    <section id="credits" className="min-h-screen p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-black mb-8">Sistem de Credite</h1>
        <p className="text-xl text-gray-600 mb-12">Cum funcționează sistemul de credite și facturare</p>
        
        <div className="grid gap-8 md:grid-cols-2 mb-12">
          <div className="liquid-glass p-8">
            <CreditCard className="h-12 w-12 text-black mb-4" />
            <h3 className="text-2xl font-bold mb-4 text-black">Credite Gratuită</h3>
            <p className="text-gray-600 mb-4">Fiecare utilizator nou primește 100.000 de credite gratuite la înregistrare.</p>
            <div className="text-4xl font-bold text-black">100,000</div>
            <div className="text-gray-500">credite inițiale</div>
          </div>
          
          <div className="liquid-glass p-8">
            <Building2 className="h-12 w-12 text-black mb-4" />
            <h3 className="text-2xl font-bold text-black mb-4">Utilizare Credite</h3>
            <p className="text-gray-600 mb-4">Creditele se consumă în funcție de utilizare:</p>
            <ul className="space-y-2 text-gray-600">
              <li>• 1 credit = 1 secundă de conversație</li>
              <li>• Transcrieri: 10 credite/minut</li>
              <li>• Analize: 5 credite/operațiune</li>
            </ul>
          </div>
        </div>

        <div className="space-y-8">
          <div className="liquid-glass p-8">
            <h3 className="text-xl font-bold text-black mb-4">Tracking Credite</h3>
            <p className="text-gray-600 mb-4">Sistemul urmărește automat utilizarea creditelor:</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="glass-input p-4 rounded-lg">
                <strong>Total Credite:</strong><br/>Credite cumparate + gratuite
              </div>
              <div className="glass-input p-4 rounded-lg">
                <strong>Credite Folosite:</strong><br/>Consumul total
              </div>
              <div className="glass-input p-4 rounded-lg">
                <strong>Credite Rămase:</strong><br/>Disponibile pentru utilizare
              </div>
            </div>
          </div>

          <div className="liquid-glass p-8">
            <h3 className="text-xl font-bold text-black mb-4">Funcții Database</h3>
            <p className="text-gray-600 mb-4">Sistemul folosește funcții pentru gestionarea creditelor:</p>
            <div className="glass-input p-4 rounded-lg font-mono text-sm text-gray-700">
              deduct_credits(user_id, amount, description)<br/>
              add_credits(user_id, amount, stripe_session_id)<br/>
              admin_add_credits(user_email, amount)
            </div>
          </div>

          <div className="liquid-glass p-8">
            <h3 className="text-xl font-bold text-black mb-4">Istoric Tranzacții</h3>
            <p className="text-gray-600 mb-4">Toate operațiunile cu credite sunt înregistrate:</p>
            <ul className="space-y-2 text-gray-600">
              <li>• Tipul tranzacției (usage, purchase, admin_bonus)</li>
              <li>• Suma și descrierea</li>
              <li>• Timestamp și user_id</li>
              <li>• Referințe la conversații (când aplicabil)</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'how-it-works':
        return renderHowItWorks();
      case 'quickstart':
        return renderQuickstart();
      case 'architecture':
        return renderArchitecture();
      case 'voice-agents':
        return renderVoiceAgents();
      case 'phone-calls':
        return renderPhoneCalls();
      case 'credits':
        return renderCredits();
      default:
        return renderOverview();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-screen bg-white">
        {/* Sidebar */}
        <div className="w-80 flex flex-col bg-white animate-slide-in-left liquid-glass">
          <div className="p-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-black animate-pulse">Documentație</h1>
            <p className="text-gray-600 mt-2">Ghid complet Agent Automation</p>
          </div>
          
          <nav className="flex-1 p-6 animate-fade-in animation-delay-500">
            <div className="space-y-8">
              {menuSections.map((section, sectionIndex) => (
                <div key={section.title} className="animate-fade-in liquid-glass p-4 rounded-xl" style={{animationDelay: `${(sectionIndex + 1) * 200}ms`}}>
                  <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-2">
                    {section.items.map((item, itemIndex) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => scrollToSection(item.id)}
                          className={`w-full flex items-center gap-4 px-4 py-3 text-left rounded-xl transition-all duration-300 text-sm font-medium hover-scale animate-slide-in-right liquid-glass ${
                            activeSection === item.id
                              ? 'bg-black text-white transform scale-105'
                              : 'text-gray-700 hover:text-black'
                          }`}
                          style={{animationDelay: `${(sectionIndex * 100) + (itemIndex * 50)}ms`}}
                        >
                          <Icon className="h-5 w-5" />
                          {item.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-white animate-fade-in animation-delay-800 scroll-smooth" style={{scrollBehavior: 'smooth'}}>
          <div ref={contentRef} className="relative">
            <div 
              className="animate-slide-in-up transition-all duration-700"
              style={{
                transform: `translateY(${scrollY * 0.02}px)`,
                filter: `drop-shadow(0 ${Math.min(scrollY * 0.01, 10)}px ${Math.min(scrollY * 0.03, 30)}px rgba(0,0,0,0.15))`
              }}
            >
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Documentation;