
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBackgroundColor } from '@/contexts/BackgroundColorContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, Globe, LogOut, Trash2, User, Mail, Lock, MessageSquare, Bot } from 'lucide-react';
import { LANGUAGES } from '@/constants/constants';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { backgroundColor, setBackgroundColor } = useBackgroundColor();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [emailSettings, setEmailSettings] = useState({
    currentEmail: user?.email || '',
    newEmail: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [telegramSettings, setTelegramSettings] = useState({
    botToken: '',
    chatId: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleLanguageChange = async (value: string) => {
    await setLanguage(value as any);
    toast({
      title: t('common.success'),
      description: "Language updated successfully."
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
      toast({
        title: "Signed out",
        description: "You have been signed out successfully."
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Could not sign out.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id || !user?.email) return;

    try {
      setIsDeleting(true);

      // Send verification email
      const { data, error } = await supabase.functions.invoke(
        "send-account-deletion-email",
        {
          body: {
            userId: user.id,
            email: user.email
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Email trimis",
        description: "Te rugăm să verifici email-ul pentru a confirma ștergerea contului",
      });
    } catch (error: any) {
      console.error("Error sending deletion email:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut trimite email-ul de verificare",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!emailSettings.newEmail) {
      toast({
        title: "Error",
        description: "Please enter a new email address.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        email: emailSettings.newEmail
      });

      if (error) throw error;

      toast({
        title: "Email updated",
        description: "Email address has been updated. Check your email for confirmation."
      });
      setEmailSettings(prev => ({ ...prev, newEmail: '' }));
    } catch (error) {
      console.error('Error updating email:', error);
      toast({
        title: "Error",
        description: "Could not update email address.",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePassword = async () => {
    if (!emailSettings.newPassword || !emailSettings.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive"
      });
      return;
    }

    if (emailSettings.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (emailSettings.newPassword !== emailSettings.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: emailSettings.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Password has been updated successfully."
      });
      setEmailSettings(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Could not update password.",
        variant: "destructive"
      });
    }
  };

  const handleSaveTelegramSettings = async () => {
    if (!user?.id) return;

    if (!telegramSettings.botToken && !telegramSettings.chatId) {
      toast({
        title: "Error",
        description: "Please fill in at least one Telegram field.",
        variant: "destructive"
      });
      return;
    }

    setIsSavingTelegram(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          telegram_bot_token: telegramSettings.botToken || null,
          telegram_chat_id: telegramSettings.chatId || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: "Telegram settings saved successfully."
      });
    } catch (error) {
      console.error('Error saving Telegram settings:', error);
      toast({
        title: "Error",
        description: "Could not save Telegram settings.",
        variant: "destructive"
      });
    } finally {
      setIsSavingTelegram(false);
    }
  };

  // Theme-aware classes - Enforcing Light Theme as per requirements
  const bgClass = 'bg-white';
  const textClass = 'text-zinc-900';
  const textMutedClass = 'text-zinc-500';
  const borderClass = 'border-zinc-200';
  const inputBgClass = 'bg-zinc-50';
  const inputTextClass = 'text-zinc-900';

  return (
    <DashboardLayout>
      <div className={`min-h-screen ${bgClass}`}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">{t('settings.title')}</h1>
            <p className="text-zinc-500 text-sm">{t('settings.subtitle')}</p>
          </div>

          {/* Settings Sections */}
          <div className="space-y-8">
            {/* Account Section */}
            <div className="border-b border-zinc-200 pb-8">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">{t('settings.account')}</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('settings.email')}</Label>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-zinc-600 text-sm">
                      {user?.email || ''}
                    </div>
                    <Input
                      placeholder={t('settings.newEmail')}
                      value={emailSettings.newEmail}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, newEmail: e.target.value }))}
                      className="flex-1 bg-white border-zinc-200 text-zinc-900"
                    />
                    <Button onClick={handleUpdateEmail} size="sm" className="bg-black text-white hover:bg-zinc-800">
                      {t('common.update')}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('settings.password')}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      type="password"
                      placeholder={t('settings.newPassword')}
                      value={emailSettings.newPassword}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="bg-white border-zinc-200 text-zinc-900"
                    />
                    <Input
                      type="password"
                      placeholder={t('settings.confirmPassword')}
                      value={emailSettings.confirmPassword}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="bg-white border-zinc-200 text-zinc-900"
                    />
                    <Button onClick={handleUpdatePassword} size="sm" className="bg-black text-white hover:bg-zinc-800">
                      {t('settings.updatePassword')}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('settings.plan')}</Label>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    <span className="text-zinc-900 text-sm font-medium">{t('settings.starterPlan')}</span>
                    <Button size="sm" className="bg-black text-white hover:bg-zinc-800">
                      {t('settings.upgrade')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences Section */}
            <div className="border-b border-zinc-200 pb-8">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">{t('settings.preferences')}</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('settings.defaultLanguage')}</Label>
                  <Select
                    value={language}
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger className="bg-white border-zinc-200 text-zinc-900 max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-zinc-200 text-zinc-900 z-[100]">
                      <ScrollArea className="h-[200px]">
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Appearance Section */}
            <div className="border-b border-zinc-200 pb-8">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">Aspect</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-zinc-700 mb-2 block">Culoare de fundal</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="h-10 w-20 rounded-lg border border-zinc-200 cursor-pointer bg-white"
                    />
                    <div className="flex-1 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                      <span className="text-zinc-900 text-sm font-mono">{backgroundColor}</span>
                    </div>
                    <Button
                      onClick={() => setBackgroundColor('#ffffff')}
                      size="sm"
                      variant="outline"
                      className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    >
                      Resetează
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    Alege culoarea de fundal pentru platformă. Schimbarea se aplică imediat.
                  </p>
                </div>
              </div>
            </div>

            {/* Integrations Section */}
            <div className="border-b border-zinc-200 pb-8">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">{t('settings.integrations')}</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('settings.telegramBot')}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      type="password"
                      placeholder={t('settings.botToken')}
                      value={telegramSettings.botToken}
                      onChange={(e) => setTelegramSettings(prev => ({ ...prev, botToken: e.target.value }))}
                      className="bg-white border-zinc-200 text-zinc-900"
                    />
                    <Input
                      placeholder={t('settings.chatId')}
                      value={telegramSettings.chatId}
                      onChange={(e) => setTelegramSettings(prev => ({ ...prev, chatId: e.target.value }))}
                      className="bg-white border-zinc-200 text-zinc-900"
                    />
                  </div>
                  <Button
                    className="mt-2 bg-black text-white hover:bg-zinc-800"
                    size="sm"
                    onClick={handleSaveTelegramSettings}
                    disabled={isSavingTelegram}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    {isSavingTelegram ? 'Saving...' : t('settings.saveTelegramSettings')}
                  </Button>
                </div>

                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{t('settings.gmailIntegration')}</p>
                      <p className="text-xs text-zinc-500">{t('settings.comingSoon')}</p>
                    </div>
                    <Mail className="w-5 h-5 text-zinc-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div>
              <h2 className="text-lg font-bold text-zinc-900 mb-4">{t('settings.actions')}</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="border-orange-500 text-orange-500 hover:bg-orange-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('settings.signOut')}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('settings.deleteAccount')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className={`${isMobile ? 'mx-4 max-w-[calc(100vw-2rem)]' : ''}`}>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-base sm:text-lg">
                        Are you sure you want to delete your account?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-sm sm:text-base">
                        Vei primi un email de confirmare la adresa ta. Te rugăm să dai click pe linkul din email pentru a confirma ștergerea contului.
                        Această acțiune este permanentă și toate datele tale vor fi șterse definitiv.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={`${isMobile ? 'flex-col gap-2' : ''}`}>
                      <AlertDialogCancel className={`${isMobile ? 'w-full' : ''}`}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className={`bg-red-500 hover:bg-red-600 ${isMobile ? 'w-full' : ''}`}
                      >
                        {isDeleting ? 'Se trimite email...' : 'Trimite email de confirmare'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AccountSettings;
