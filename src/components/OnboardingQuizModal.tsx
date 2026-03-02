import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingQuiz, QuizResponse } from '@/hooks/useOnboardingQuiz';
import { useAuth } from '@/components/AuthContext';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronLeft, ChevronRight, Check, Users, Briefcase, Newspaper, Radio, Youtube, Instagram, Search, Music2, Linkedin, Facebook, HelpCircle, MoreHorizontal, ShoppingCart, Heart, Landmark, GraduationCap, Home, Truck, Utensils, Wrench, Plane, Factory } from 'lucide-react';
import { useLocation } from 'react-router-dom';

// Custom Twitter/X icon
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface SourceOption {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface BudgetOption {
  id: string;
  label: string;
}

interface EmployeesOption {
  id: string;
  label: string;
}

interface IndustryOption {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const OnboardingQuizModal = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isCompleted, loading: quizLoading, saveQuizResponse } = useOnboardingQuiz();
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactPhone: '',
    preferredLanguage: 'en',
    howHeard: [] as string[],
    monthlyBudget: '',
    employeesCount: '',
    industry: ''
  });

  // Pages where quiz should NOT appear
  const excludedPaths = ['/auth', '/reset-password', '/onboarding-quiz', '/email-verification-pending', '/google-oauth-callback', '/confirm-account-deletion'];

  // Source options
  const sourceOptions: SourceOption[] = [
    { id: 'friends', label: 'Friends or School', icon: <Users className="w-6 h-6" /> },
    { id: 'work', label: 'From work', icon: <Briefcase className="w-6 h-6" /> },
    { id: 'podcast', label: 'Podcast', icon: <Radio className="w-6 h-6" /> },
    { id: 'newsletter', label: 'Newsletter or Blog', icon: <Newspaper className="w-6 h-6" /> },
    { id: 'twitter', label: 'X (Twitter)', icon: <TwitterIcon /> },
    { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-6 h-6" /> },
    { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-6 h-6" /> },
    { id: 'google', label: 'Google', icon: <Search className="w-6 h-6" /> },
    { id: 'tiktok', label: 'TikTok', icon: <Music2 className="w-6 h-6" /> },
    { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-6 h-6" /> },
    { id: 'facebook', label: 'Facebook', icon: <Facebook className="w-6 h-6" /> },
    { id: 'dontRemember', label: "Don't remember", icon: <HelpCircle className="w-6 h-6" /> },
    { id: 'other', label: 'Other', icon: <MoreHorizontal className="w-6 h-6" /> },
  ];

  // Budget options
  const budgetOptions: BudgetOption[] = [
    { id: '0-100', label: '0 - 100€' },
    { id: '100-500', label: '100 - 500€' },
    { id: '500-1000', label: '500 - 1,000€' },
    { id: '1000-5000', label: '1,000 - 5,000€' },
    { id: '5000+', label: '5,000€+' },
  ];

  // Employees options
  const employeesOptions: EmployeesOption[] = [
    { id: '1-5', label: '1 - 5' },
    { id: '6-20', label: '6 - 20' },
    { id: '21-50', label: '21 - 50' },
    { id: '51-200', label: '51 - 200' },
    { id: '200+', label: '200+' },
  ];

  // Industry options
  const industryOptions: IndustryOption[] = [
    { id: 'retail', label: 'Retail / E-commerce', icon: <ShoppingCart className="w-6 h-6" /> },
    { id: 'healthcare', label: 'Healthcare', icon: <Heart className="w-6 h-6" /> },
    { id: 'finance', label: 'Finance / Banking', icon: <Landmark className="w-6 h-6" /> },
    { id: 'education', label: 'Education', icon: <GraduationCap className="w-6 h-6" /> },
    { id: 'realestate', label: 'Real Estate', icon: <Home className="w-6 h-6" /> },
    { id: 'logistics', label: 'Logistics / Transport', icon: <Truck className="w-6 h-6" /> },
    { id: 'hospitality', label: 'Hospitality', icon: <Utensils className="w-6 h-6" /> },
    { id: 'services', label: 'Services', icon: <Wrench className="w-6 h-6" /> },
    { id: 'travel', label: 'Travel', icon: <Plane className="w-6 h-6" /> },
    { id: 'manufacturing', label: 'Manufacturing', icon: <Factory className="w-6 h-6" /> },
    { id: 'other', label: 'Other', icon: <MoreHorizontal className="w-6 h-6" /> },
  ];

  // Language options
  const languageOptions = [
    { id: 'ro', label: 'Română', flag: '🇷🇴' },
    { id: 'en', label: 'English', flag: '🇬🇧' },
    { id: 'ru', label: 'Русский', flag: '🇷🇺' },
  ];

  // Show modal if quiz not completed
  useEffect(() => {
    // Don't show on excluded pages
    if (excludedPaths.some(path => location.pathname.startsWith(path))) {
      setShowModal(false);
      return;
    }

    // Don't show if not authenticated or still loading
    if (authLoading || quizLoading || !user) {
      return;
    }

    // Don't show if quiz already completed (true) or still unknown (null)
    // Only show when we've confirmed isCompleted === false
    if (isCompleted !== false) {
      setShowModal(false);
      return;
    }

    // Show modal immediately for users who haven't completed the quiz
    console.log('[OnboardingModal] Showing quiz modal - isCompleted:', isCompleted);
    setShowModal(true);
  }, [authLoading, quizLoading, user, isCompleted, location.pathname]);

  const totalSteps = 5;

  const toggleSource = (sourceId: string) => {
    setFormData(prev => ({
      ...prev,
      howHeard: prev.howHeard.includes(sourceId)
        ? prev.howHeard.filter(id => id !== sourceId)
        : [...prev.howHeard, sourceId]
    }));
  };

  const canProceedStep1 = () => {
    return formData.firstName.trim().length >= 2;
  };

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSkip = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const howHeardLabels = formData.howHeard.map(id => {
        const option = sourceOptions.find(o => o.id === id);
        return option ? option.label : id;
      });

      const industryLabel = industryOptions.find(o => o.id === formData.industry)?.label || formData.industry;

      const quizResponse: QuizResponse = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        contact_phone: formData.contactPhone || undefined,
        preferred_language: formData.preferredLanguage,
        how_heard: howHeardLabels.join(', ') || undefined,
        telephony_budget: formData.monthlyBudget || undefined,
        employees_count: formData.employeesCount || undefined,
        industry: industryLabel || undefined,
      };

      const saved = await saveQuizResponse(quizResponse);

      if (saved) {
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        >
          {/* Main content */}
          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Name, Phone, Language */}
              {currentStep === 0 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
                      Help us personalize your experience
                    </h1>
                    <p className="text-gray-500 text-sm">
                      Please complete this short questionnaire
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        What's your name?
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="First Name"
                          className="h-12 text-base border-2 border-gray-200 rounded-xl px-4 focus-visible:ring-0 focus-visible:border-gray-900 transition-colors bg-white"
                          autoFocus
                        />
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Last Name"
                          className="h-12 text-base border-2 border-gray-200 rounded-xl px-4 focus-visible:ring-0 focus-visible:border-gray-900 transition-colors bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Contact phone number
                      </label>
                      <Input
                        value={formData.contactPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="+373 XX XXX XXX"
                        className="h-12 text-base border-2 border-gray-200 rounded-xl px-4 focus-visible:ring-0 focus-visible:border-gray-900 transition-colors bg-white"
                        type="tel"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        What's your preferred language?
                      </label>
                      <div className="flex gap-3">
                        {languageOptions.map((lang) => (
                          <button
                            key={lang.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, preferredLanguage: lang.id }))}
                            className={`flex-1 h-12 flex items-center justify-center gap-2 rounded-xl border-2 transition-all ${
                              formData.preferredLanguage === lang.id
                                ? 'border-gray-900 bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-xl">{lang.flag}</span>
                            <span className="text-sm font-medium text-gray-700">{lang.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: How did you hear about us */}
              {currentStep === 1 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
                      How did you hear about Agentauto?
                    </h1>
                    <p className="text-gray-500 text-sm">
                      Select one or more options
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {sourceOptions.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => toggleSource(source.id)}
                        className={`group relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[80px] ${
                          formData.howHeard.includes(source.id)
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {formData.howHeard.includes(source.id) && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}

                        <div className={`transition-colors ${
                          formData.howHeard.includes(source.id) ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {React.cloneElement(source.icon as React.ReactElement, { className: 'w-5 h-5' })}
                        </div>
                        <span className={`text-xs font-medium text-center leading-tight ${
                          formData.howHeard.includes(source.id) ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {source.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Monthly Budget */}
              {currentStep === 2 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
                      What's your monthly telephony budget?
                    </h1>
                    <p className="text-gray-500 text-sm">
                      Select the range that fits best
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {budgetOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, monthlyBudget: option.id }))}
                        className={`group relative p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-3 ${
                          formData.monthlyBudget === option.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {formData.monthlyBudget === option.id && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <span className={`text-base font-medium ${
                          formData.monthlyBudget === option.id ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Number of Employees */}
              {currentStep === 3 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
                      How many employees work at your company?
                    </h1>
                    <p className="text-gray-500 text-sm">
                      Select the range that fits best
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {employeesOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, employeesCount: option.id }))}
                        className={`group relative p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-3 ${
                          formData.employeesCount === option.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {formData.employeesCount === option.id && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <span className={`text-base font-medium ${
                          formData.employeesCount === option.id ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {option.label} employees
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 5: Industry */}
              {currentStep === 4 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
                      What industry are you in?
                    </h1>
                    <p className="text-gray-500 text-sm">
                      This helps us personalize your experience
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {industryOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, industry: option.id }))}
                        className={`group relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[80px] ${
                          formData.industry === option.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {formData.industry === option.id && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}

                        <div className={`transition-colors ${
                          formData.industry === option.id ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {React.cloneElement(option.icon as React.ReactElement, { className: 'w-5 h-5' })}
                        </div>
                        <span className={`text-xs font-medium text-center leading-tight ${
                          formData.industry === option.id ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 sm:p-6 rounded-b-2xl">
            <div className="flex items-center justify-between">
              {/* Back button */}
              <div>
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm">Back</span>
                  </button>
                )}
              </div>

              {/* Step indicators */}
              <div className="flex gap-1.5">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentStep ? 'bg-gray-900' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {/* Next/Skip buttons */}
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-gray-500 hover:text-gray-700 transition-colors px-3 py-2 text-sm"
                    disabled={isSubmitting}
                  >
                    skip
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={(currentStep === 0 && !canProceedStep1()) || isSubmitting}
                  className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>{currentStep === totalSteps - 1 ? 'finish' : 'continue'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingQuizModal;
