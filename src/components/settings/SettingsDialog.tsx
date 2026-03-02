import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SlidersHorizontal, Bell, User, X, LogOut, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/utils/utils';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsSection = 'general' | 'personal' | 'notifications';

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [spokenLanguage, setSpokenLanguage] = useState('ru');
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';
  const userEmail = user?.email || '';
  const googleAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as 'ro' | 'en' | 'ru');
    toast.success(t('messages.languageUpdated'));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/auth';
    }
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'en': return 'English (United States)';
      case 'ru': return 'Русский (Russian)';
      default: return 'English (United States)';
    }
  };

  const settingsSections = [
    { id: 'general' as SettingsSection, label: 'General', icon: SlidersHorizontal },
    { id: 'personal' as SettingsSection, label: 'Personal Data', icon: User },
    { id: 'notifications' as SettingsSection, label: 'Notifications', icon: Bell },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-xl font-bold text-black tracking-tight mb-1">General Settings</h1>
              <p className="text-sm text-zinc-500">Manage your workspace localization and global preferences.</p>
            </div>

            {/* Content */}
            <div className="space-y-8 flex-1">
              {/* Interface Language */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Interface Language</label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full bg-white border border-zinc-200 text-black text-sm rounded-xl py-3 pl-4 pr-10 cursor-pointer hover:border-zinc-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em'
                    }}
                  >
                    <option value="en">English (United States)</option>
                    <option value="ru">Русский</option>
                  </select>
                </div>
                <p className="text-[10px] text-zinc-400">Controls the text language of the dashboard UI.</p>
              </div>

              <div className="w-full h-px bg-zinc-100" />

              {/* Spoken Language Model */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Spoken Language Model</label>
                <div className="relative">
                  <select
                    value={spokenLanguage}
                    onChange={(e) => setSpokenLanguage(e.target.value)}
                    className="w-full bg-white border border-zinc-200 text-black text-sm rounded-xl py-3 pl-4 pr-10 cursor-pointer hover:border-zinc-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em'
                    }}
                  >
                    <option value="ru">Русский (Russian)</option>
                    <option value="en">English (United States)</option>
                  </select>
                </div>
                <p className="text-[10px] text-zinc-400">This sets the default dialect for new AI agents.</p>
              </div>

              {/* Tech Alert */}
              <div
                className="border border-zinc-200 border-dashed rounded-xl p-4 flex items-start gap-3 mt-4"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, #fafafa, #fafafa 10px, #f4f4f5 10px, #f4f4f5 20px)'
                }}
              >
                <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase">System Notice</span>
                  <p className="text-xs text-zinc-500 leading-relaxed font-mono">
                    Changing the spoken language model requires a re-initialization of active agents.
                    Runtime interruption: ~2s.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'personal':
        return (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-xl font-bold text-black tracking-tight mb-1">Personal Data</h1>
              <p className="text-sm text-zinc-500">Update your photo and personal details here.</p>
            </div>

            {/* Content */}
            <div className="space-y-6 flex-1">
              {/* Avatar Section */}
              <div className="flex items-center gap-5 p-5 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="w-16 h-16 rounded-full bg-zinc-200 border-2 border-white shadow-sm overflow-hidden">
                  {googleAvatarUrl ? (
                    <img src={googleAvatarUrl} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-300 flex items-center justify-center text-xl font-bold text-zinc-600">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-zinc-800 text-sm">Your photo</h3>
                  <p className="text-xs text-zinc-500 mb-3">This will be displayed on your profile.</p>
                  <div className="flex gap-2">
                    <button className="text-xs font-medium text-zinc-700 hover:text-black bg-white hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg transition">
                      Change
                    </button>
                    <button className="text-xs font-medium text-red-500 hover:text-red-600 px-2 py-1.5 transition">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  defaultValue={userName}
                  className="w-full bg-white border border-zinc-200 text-black text-sm rounded-xl py-3 px-4 hover:border-zinc-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Email</label>
                <input
                  type="text"
                  value={userEmail}
                  disabled
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-500 text-sm rounded-xl py-3 px-4 cursor-not-allowed"
                />
                <p className="text-[10px] text-zinc-400">Email cannot be changed.</p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Phone</label>
                <input
                  type="text"
                  placeholder="+373 XX XXX XXX"
                  className="w-full bg-white border border-zinc-200 text-black text-sm rounded-xl py-3 px-4 hover:border-zinc-300 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-xl font-bold text-black tracking-tight mb-1">Notifications</h1>
              <p className="text-sm text-zinc-500">Choose how you want to be notified about activity.</p>
            </div>

            {/* Content */}
            <div className="divide-y divide-zinc-100 flex-1">
              <div className="flex items-center justify-between py-5">
                <div>
                  <h3 className="text-sm font-medium text-zinc-800">Email notifications</h3>
                  <p className="text-xs text-zinc-500">Receive email notifications for critical updates.</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-5">
                <div>
                  <h3 className="text-sm font-medium text-zinc-800">Push notifications</h3>
                  <p className="text-xs text-zinc-500">Receive push notifications in browser.</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between py-5">
                <div>
                  <h3 className="text-sm font-medium text-zinc-800">Weekly summary</h3>
                  <p className="text-xs text-zinc-500">Receive a weekly activity summary.</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-5">
                <div>
                  <h3 className="text-sm font-medium text-zinc-800">Call alerts</h3>
                  <p className="text-xs text-zinc-500">Notifications for completed calls.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-w-4xl p-0 gap-0 overflow-hidden bg-white rounded-2xl border border-zinc-200 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] min-h-[700px]">
        <div className="flex h-full min-h-[700px]">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-zinc-100 flex flex-col justify-between p-6 shrink-0">
            <div>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6 px-3">Configuration</h3>

              <nav className="space-y-1">
                {settingsSections.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left relative",
                        isActive
                          ? "bg-zinc-50"
                          : "text-zinc-500 hover:text-black hover:bg-zinc-50"
                      )}
                    >
                      {/* Left border indicator for active state */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-black rounded-r" />
                      )}
                      <section.icon className={cn("w-4 h-4", isActive ? "text-black" : "")} />
                      <span className={cn("text-sm", isActive ? "font-bold text-black" : "font-medium")}>{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sign out button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-red-600 transition uppercase tracking-wide"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8 md:p-10 flex flex-col relative">
            {/* Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-6 right-6 text-zinc-300 hover:text-black transition"
            >
              <X className="w-5 h-5" />
            </button>

            {renderContent()}

            {/* Footer */}
            <div className="mt-10 flex justify-end items-center gap-4 pt-6 border-t border-zinc-50">
              <button
                onClick={() => onOpenChange(false)}
                className="text-xs font-bold text-zinc-400 hover:text-black transition uppercase tracking-wide"
              >
                Cancel
              </button>
              <button className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition shadow-lg shadow-zinc-200">
                Save Changes
              </button>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
