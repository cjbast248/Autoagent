import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Search,
  MessageCircle,
  Bot,
  PhoneOutgoing,
  LayoutDashboard,
  MessageSquare,
  GitBranch,
  History,
  Plug,
  Plus,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Check,
  Info,
  Sparkles,
  Play,
  AlertCircle
} from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path?: string;
  content: {
    overview: string;
    features: string[];
    howToUse: string[];
    tips?: string[];
  };
}

const Help = () => {
  const { user } = useAuth();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const helpSections: HelpSection[] = [
    {
      id: 'home',
      title: 'Pagina Principală',
      description: 'Vizualizează statisticile și informațiile importante.',
      icon: LayoutDashboard,
      path: '/',
      content: {
        overview: 'Dashboard-ul este centrul de comandă al platformei Agent Automation. Aici poți vedea o privire de ansamblu asupra activității tale, statistici despre apeluri, agenți activi și notificări importante.',
        features: [
          'Vizualizare statistici rapide (apeluri efectuate, durata medie, rata de succes)',
          'Acces rapid la funcțiile cele mai utilizate',
          'Notificări și alerte importante',
          'Grafice de performanță',
          'Lista ultimelor conversații'
        ],
        howToUse: [
          'Verifică zilnic dashboard-ul pentru a monitoriza activitatea',
          'Folosește butoanele rapide pentru a accesa funcțiile principale',
          'Urmărește tendințele din grafice pentru a îmbunătăți performanța'
        ],
        tips: [
          'Dashboard-ul se actualizează automat - nu trebuie să dai refresh',
          'Click pe orice statistică pentru a vedea detalii suplimentare'
        ]
      }
    },
    {
      id: 'chat-ai',
      title: 'Chat AI (Jarvis)',
      description: 'Asistentul tău personal AI pentru orice întrebare.',
      icon: MessageSquare,
      path: '/chat',
      content: {
        overview: 'Chat AI este asistentul tău inteligent care te poate ajuta cu orice întrebare despre platformă, poate executa acțiuni în contul tău și îți poate oferi recomandări personalizate.',
        features: [
          'Răspunsuri instant la întrebări despre platformă',
          'Execuție de acțiuni (creează agenți, pornește apeluri)',
          'Sugestii și recomandări personalizate',
          'Istoric conversații salvat',
          'Înțelege limba română și engleză'
        ],
        howToUse: [
          'Scrie întrebarea ta în caseta de chat',
          'Poți cere asistentului să execute acțiuni (ex: "Creează un agent nou")',
          'Întreabă despre funcționalități sau cum să faci ceva specific',
          'Folosește comanda /help pentru a vedea comenzile disponibile'
        ],
        tips: [
          'Fii specific în întrebări pentru răspunsuri mai bune',
          'Asistentul poate accesa datele contului tău pentru răspunsuri personalizate',
          'Poți continua conversația - asistentul ține minte contextul'
        ]
      }
    },
    {
      id: 'agents',
      title: 'Agenți Vocali AI',
      description: 'Creează și gestionează agenții tăi inteligenți.',
      icon: Bot,
      path: '/account/kalina-agents',
      content: {
        overview: 'Agenții vocali sunt asistenți AI care pot purta conversații telefonice naturale. Poți configura personalitatea, vocea, scriptul și comportamentul fiecărui agent.',
        features: [
          'Crearea de agenți personalizați',
          'Selectarea vocii (masculină/feminină, diferite accente)',
          'Configurare prompt/script de conversație',
          'Setare mesaj de început',
          'Testare agent înainte de lansare',
          'Monitorizare performanță agent'
        ],
        howToUse: [
          'Click pe "Agent Nou" pentru a crea un agent',
          'Completează informațiile de bază (nume, descriere)',
          'Scrie promptul/instrucțiunile pentru agent',
          'Selectează vocea preferată',
          'Setează mesajul de început al conversației',
          'Testează agentul cu un apel de probă',
          'Salvează și activează agentul'
        ],
        tips: [
          'Fii cât mai specific în instrucțiunile agentului',
          'Testează întotdeauna înainte de a lansa campanii',
          'Folosește variabile dinamice pentru personalizare (ex: {{nume_client}})',
          'Verifică transcrierile pentru a îmbunătăți promptul'
        ]
      }
    },
    {
      id: 'workflow',
      title: 'Workflow',
      description: 'Automatizează procese complexe vizual.',
      icon: GitBranch,
      path: '/account/workflow',
      content: {
        overview: 'Workflow-urile îți permit să creezi automatizări complexe conectând diferiți pași și acțiuni. Poți defini ce se întâmplă după fiecare apel, cum se procesează răspunsurile și ce acțiuni să se execute automat.',
        features: [
          'Editor vizual drag-and-drop',
          'Conectare acțiuni în secvență',
          'Condiții și ramificări',
          'Integrare cu alte servicii',
          'Triggere automate',
          'Monitorizare execuție'
        ],
        howToUse: [
          'Deschide editorul de workflow',
          'Trage blocuri din bara laterală pe canvas',
          'Conectează blocurile pentru a defini fluxul',
          'Configurează fiecare bloc cu parametrii necesari',
          'Salvează și activează workflow-ul'
        ],
        tips: [
          'Începe cu workflow-uri simple și adaugă complexitate treptat',
          'Testează fiecare pas înainte de a activa tot workflow-ul',
          'Folosește condiții pentru a gestiona diferite scenarii'
        ]
      }
    },
    {
      id: 'call-history',
      title: 'Istoric Apeluri',
      description: 'Vezi toate apelurile efectuate și analizele detaliate.',
      icon: History,
      path: '/account/conversation-analytics',
      content: {
        overview: 'Istoricul de apeluri îți oferă o vedere completă asupra tuturor conversațiilor telefonice, cu statistici, transcrieri și analize de sentiment.',
        features: [
          'Lista completă a apelurilor',
          'Filtrare după dată, agent, status',
          'Statistici de performanță',
          'Analiză sentiment conversații',
          'Export rapoarte',
          'Redare înregistrări audio'
        ],
        howToUse: [
          'Accesează pagina de istoric apeluri',
          'Folosește filtrele pentru a găsi apeluri specifice',
          'Click pe un apel pentru a vedea detalii',
          'Ascultă înregistrarea sau citește transcrierea',
          'Exportă datele pentru raportare'
        ],
        tips: [
          'Verifică zilnic apelurile pentru a identifica probleme',
          'Folosește analiza de sentiment pentru a înțelege satisfacția clienților',
          'Compară performanța între diferiți agenți'
        ]
      }
    },
    {
      id: 'integrations',
      title: 'Integrări',
      description: 'Conectează Agent Automation cu alte aplicații și servicii.',
      icon: Plug,
      path: '/account/integrations',
      content: {
        overview: 'Integrările îți permit să conectezi Agent Automation cu alte servicii pe care le folosești, precum Google Sheets, CRM-uri, calendare și multe altele.',
        features: [
          'Integrare Google Sheets',
          'Integrare Zoho CRM',
          'Webhooks personalizate',
          'Sincronizare automată date',
          'Notificări în timp real'
        ],
        howToUse: [
          'Alege integrarea dorită',
          'Urmează pașii de conectare',
          'Configurează ce date să se sincronizeze',
          'Testează integrarea',
          'Activează sincronizarea automată'
        ],
        tips: [
          'Conectează Google Sheets pentru export automat al lead-urilor',
          'Folosește webhooks pentru integrări personalizate',
          'Verifică periodic că integrările funcționează'
        ]
      }
    }
  ];

  const faqItems = [
    {
      question: 'Cum creez primul meu agent vocal?',
      answer: 'Mergi la secțiunea "Agenți Vocali", apasă pe "New Agent", selectează un șablon sau începe de la zero și configurează personalitatea și vocea.'
    },
    {
      question: 'Cum funcționează sistemul de credite?',
      answer: 'Fiecare minut de conversație consumă un anumit număr de credite în funcție de complexitatea modelului AI folosit.'
    },
    {
      question: 'Cum import contacte pentru o campanie?',
      answer: 'Poți importa fișiere CSV în secțiunea "Leads" sau direct când creezi o campanie de tip "Batch Call".'
    }
  ];

  const selectedSectionData = selectedSection
    ? helpSections.find(s => s.id === selectedSection)
    : null;

  // Dot pattern background style
  const dotPatternStyle = {
    backgroundImage: 'radial-gradient(#f4f4f5 1.5px, transparent 1.5px)',
    backgroundSize: '24px 24px'
  };

  // Render section detail view
  const renderSectionDetail = (section: HelpSection) => (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => setSelectedSection(null)}
        className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-black transition mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Înapoi la toate secțiunile
      </button>

      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
          <section.icon className="w-6 h-6 text-zinc-900" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-black tracking-tight">{section.title}</h1>
          <p className="text-sm text-zinc-500">{section.description}</p>
        </div>
        {section.path && (
          <Link to={section.path}>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:border-black hover:text-black transition">
              <ExternalLink className="w-3.5 h-3.5" />
              Deschide
            </button>
          </Link>
        )}
      </div>

      <div className="space-y-8">
        {/* Overview */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Prezentare Generală</h3>
          </div>
          <p className="text-sm text-zinc-600 leading-relaxed">
            {section.content.overview}
          </p>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Funcționalități</h3>
          </div>
          <ul className="space-y-3">
            {section.content.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-zinc-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How to Use */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Play className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Cum să Folosești</h3>
          </div>
          <ol className="space-y-4">
            {section.content.howToUse.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-sm text-zinc-700 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tips */}
        {section.content.tips && (
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest">Sfaturi Utile</h3>
            </div>
            <ul className="space-y-3">
              {section.content.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-amber-500">💡</span>
                  <span className="text-sm text-amber-800">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  // Render main help center view
  const renderSectionsList = () => (
    <>
      {/* Header */}
      <header className="pt-20 pb-16 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight text-black mb-4">Centru de Ajutor</h1>
        <p className="text-zinc-500 mb-10">Află cum să folosești toate funcționalitățile platformei Agent Automation</p>

        {/* Search */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-2 flex items-center shadow-lg shadow-zinc-100/50 mb-10 transition-all duration-300 max-w-xl mx-auto hover:shadow-xl focus-within:ring-2 focus-within:ring-black focus-within:scale-[1.01]">
          <div className="w-10 h-10 flex items-center justify-center text-zinc-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Caută articole, ghiduri sau întrebări..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 placeholder-zinc-400 h-10 px-2"
          />
          <button className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-800 transition">
            Caută
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/chat">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-zinc-200 hover:border-black text-xs font-bold text-zinc-600 hover:text-black transition shadow-sm hover:shadow-md">
              <MessageCircle className="w-3.5 h-3.5" />
              Întreabă Asistentul AI
            </button>
          </Link>
          <Link to="/account/kalina-agents">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-zinc-200 hover:border-black text-xs font-bold text-zinc-600 hover:text-black transition shadow-sm hover:shadow-md">
              <Bot className="w-3.5 h-3.5" />
              Creează un Agent
            </button>
          </Link>
          <Link to="/account/outbound">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-zinc-200 hover:border-black text-xs font-bold text-zinc-600 hover:text-black transition shadow-sm hover:shadow-md">
              <PhoneOutgoing className="w-3.5 h-3.5" />
              Lansează un Apel
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pb-20">
        {/* Documentation Grid */}
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-8 ml-1">
          Documentație & Ghiduri
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
          {helpSections.map((section) => (
            <div
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className="bg-white p-6 rounded-2xl border border-zinc-100 group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-100/50 hover:border-black"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center mb-4 group-hover:bg-black group-hover:text-white transition-colors">
                <section.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-900 mb-1 group-hover:translate-x-1 transition-transform">
                {section.title}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {section.description}
              </p>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-8 text-center">
            Întrebări Frecvente
          </h2>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details
                key={index}
                className="group bg-white border border-zinc-100 rounded-2xl open:border-zinc-200 transition"
              >
                <summary className="flex justify-between items-center px-6 py-4 cursor-pointer list-none">
                  <span className="text-sm font-bold text-zinc-800">{item.question}</span>
                  <Plus className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-45" />
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-xs text-zinc-500 leading-relaxed">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Link to="/chat">
          <div className="bg-black text-white px-6 py-3 rounded-full shadow-2xl shadow-zinc-400/50 flex items-center gap-4 hover:scale-[1.02] transition cursor-pointer group">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <div className="text-xs font-medium">
              <span className="text-zinc-400 mr-1">Mai ai întrebări?</span>
              <span className="font-bold text-white group-hover:underline">Vorbește cu Jarvis AI</span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition" />
          </div>
        </Link>
      </div>
    </>
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen" style={dotPatternStyle}>
        {selectedSectionData
          ? <div className="py-12 px-6">{renderSectionDetail(selectedSectionData)}</div>
          : renderSectionsList()
        }
      </div>
    </DashboardLayout>
  );
};

export default Help;
