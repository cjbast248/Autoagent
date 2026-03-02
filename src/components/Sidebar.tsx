import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Settings, Bot, FileText, PhoneCall, X, BarChart3, Calendar, Mail, BookOpen, Phone, TestTube, PhoneForwarded, CreditCard, Shield, Mic, Users, Plug, MessageCircle, Volume2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from './AuthContext';
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
const Sidebar = ({
  isOpen,
  onClose
}: SidebarProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Check if user is the specific admin user
  const isSpecificAdmin = user?.id === 'a698e3c2-f0e6-4f42-8955-971d91e725ce' && 
                         user?.email === 'mariusvirlan109@gmail.com';
  return <>
      {/* Mobile overlay */}
      {isMobile && isOpen && <div className="fixed inset-0 bg-background/40 backdrop-blur-sm z-30 lg:hidden" onClick={onClose} />}
      
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#f5f5f4] border-r border-gray-200 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-6">
          <Link to="/account" className="flex items-center text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors" onClick={isMobile ? onClose : undefined}>
            <Avatar className="mr-3 w-8 h-8">
              <AvatarImage alt="@shadcn" src="/lovable-uploads/f617a44e-5bc3-46cb-8232-3110c0cee83d.png" />
              <AvatarFallback className="bg-gray-100 text-gray-600">KA</AvatarFallback>
            </Avatar>
            <span>Agent Automation</span>
          </Link>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none rounded-lg p-1 transition-colors lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="px-4 pb-6 flex flex-col h-full">
          {/* Dashboard Section */}
          <div className="space-y-1 mb-6">
            <Link to="/account" className={`${location.pathname === '/account' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
              <User className="mr-3 h-4 w-4" />
              <span>Home</span>
            </Link>
          </div>

          {/* AI & Analytics */}
          <div className="mb-6">
            <p className="px-3 font-semibold text-gray-400 uppercase tracking-wider mb-3 text-[10px]">
              AI & Analytics
            </p>
            <div className="space-y-1">
              <Link to="/account/kalina-agents" className={`${location.pathname === '/account/kalina-agents' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <Bot className="mr-3 h-4 w-4" />
                <span>Agents</span>
              </Link>

              <Link to="/account/conversation-analytics" className={`${location.pathname === '/account/conversation-analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <BarChart3 className="mr-3 h-4 w-4" />
                <span>Analytics</span>
              </Link>

              {/* Chat AI / Agent AI removed */}

              <Link to="/account/voices" className={`${location.pathname === '/account/voices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <Volume2 className="mr-3 h-4 w-4" />
                <span>Voices</span>
              </Link>

              <Link to="/account/voice-demo" className={`${location.pathname === '/account/voice-demo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <Mic className="mr-3 h-4 w-4" />
                <span>Voice Demo</span>
              </Link>
            </div>
          </div>

          {/* Communications */}
          <div className="mb-6">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              COMMUNICATIONS
            </p>
            <div className="space-y-1">
              <Link to="/account/outbound" className={`${location.pathname === '/account/outbound' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <PhoneCall className="mr-3 h-4 w-4" />
                <span>Apeluri</span>
              </Link>

              <Link to="/account/calendar" className={`${location.pathname === '/account/calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <Calendar className="mr-3 h-4 w-4" />
                <span>Programări</span>
              </Link>

              <Link to="/account/phone-numbers" className={`${location.pathname === '/account/phone-numbers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <Phone className="mr-3 h-4 w-4" />
                <span>Numere</span>
              </Link>

              <Link to="/account/test-call" className={`${location.pathname === '/account/test-call' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <Phone className="mr-3 h-4 w-4" />
                <span>Test Apel</span>
              </Link>

              <Link to="/account/callback-scheduler" className={`${location.pathname === '/account/callback-scheduler' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <PhoneForwarded className="mr-3 h-4 w-4" />
                <span>Callbacks</span>
              </Link>

            </div>
          </div>

          {/* Data & Tools */}
          <div className="mb-6">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Data & Tools
            </p>
            <div className="space-y-1">
              <Link to="/account/contacts" className={`${location.pathname === '/account/contacts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <Users className="mr-3 h-4 w-4" />
                <span>Contacts</span>
              </Link>

              <Link to="/account/transcript" className={`${location.pathname === '/account/transcript' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <FileText className="mr-3 h-4 w-4" />
                <span>Transcrieri</span>
              </Link>


              <Link to="/account/gmail" className={`${location.pathname === '/account/gmail' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <Mail className="mr-3 h-4 w-4" />
                <span>Gmail</span>
              </Link>
            </div>
          </div>

          {/* Integrations */}
          <div className="mb-6">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              INTEGRATIONS
            </p>
            <div className="space-y-1">
              <Link to="/account/integrations" className={`${location.pathname === '/account/integrations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <Plug className="mr-3 h-4 w-4" />
                <span>Integrări</span>
              </Link>
              <Link to="/account/chat-widget" className={`${location.pathname === '/account/chat-widget' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
                <MessageCircle className="mr-3 h-4 w-4" />
                <span>Chat Widget</span>
              </Link>
            </div>
          </div>

          
          {/* Documentation & Settings in bottom corner */}
          <div className="mt-auto space-y-1">
            {/* Admin Panel - Only for specific user */}
            {isSpecificAdmin && (
              <Link to="/admin" className={`${location.pathname === '/admin' ? 'bg-red-100 text-red-900 border border-red-200' : 'text-red-600 hover:bg-red-50 hover:text-red-900 border border-red-200'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors shadow-sm`} onClick={isMobile ? onClose : undefined}>
                <Shield className="mr-3 h-4 w-4" />
                <span className="font-semibold">Admin Panel</span>
              </Link>
            )}
            
            <Link to="/pricing" className={`${location.pathname === '/pricing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
              <CreditCard className="mr-3 h-4 w-4" />
              <span>Pricing</span>
            </Link>
            <Link to="/account/documentation" className={`${location.pathname === '/account/documentation' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
              <BookOpen className="mr-3 h-4 w-4" />
              <span>Documentation</span>
            </Link>
            <Link to="/account/settings" className={`${location.pathname === '/account/settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'} group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors`} onClick={isMobile ? onClose : undefined}>
              <Settings className="mr-3 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </div>
        </nav>
      </div>
    </>;
};
export default Sidebar;