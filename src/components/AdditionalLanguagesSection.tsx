
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Info } from 'lucide-react';
import { LANGUAGES } from '@/constants/constants';
import ReactCountryFlag from 'react-country-flag';
import { useLanguage } from '@/contexts/LanguageContext';

interface AdditionalLanguagesSectionProps {
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  currentLanguage?: string;
}

const AdditionalLanguagesSection: React.FC<AdditionalLanguagesSectionProps> = ({
  selectedLanguages,
  onLanguagesChange,
  currentLanguage,
}) => {
  const { t } = useLanguage();
  const [languageDetectionEnabled, setLanguageDetectionEnabled] = useState(true);

  const addLanguage = (languageValue: string) => {
    if (languageValue && !selectedLanguages.includes(languageValue)) {
      onLanguagesChange([...selectedLanguages, languageValue]);
    }
  };

  const removeLanguage = (languageToRemove: string) => {
    onLanguagesChange(selectedLanguages.filter(lang => lang !== languageToRemove));
  };

  const getLanguageData = (value: string) => {
    return LANGUAGES.find(lang => lang.value === value);
  };

  // Filter out already selected languages and the current agent language
  const availableLanguages = LANGUAGES.filter(lang => 
    !selectedLanguages.includes(lang.value) && 
    lang.value !== currentLanguage
  );

  return (
    <Card className="bg-[#FAFAFA] border border-gray-200 rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-900">{t('agentEdit.additionalLanguages')}</CardTitle>
        <p className="text-xs text-gray-500">
          {t('agentEdit.additionalLanguagesDesc')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Languages */}
        <div className="space-y-2">
          {selectedLanguages.map((languageValue) => {
            const languageData = getLanguageData(languageValue);
            return (
              <div
                key={languageValue}
                className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  {languageData?.countryCode && (
                    <ReactCountryFlag
                      countryCode={languageData.countryCode}
                      svg
                      style={{
                        width: '20px',
                        height: '15px',
                      }}
                    />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {languageData?.label || languageValue}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLanguage(languageValue)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Add Language Button */}
        <div className="flex items-center justify-between">
          <Select value="" onValueChange={addLanguage}>
            <SelectTrigger className="border border-gray-300 bg-white text-sm rounded-lg w-48 h-9">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-400" />
                <SelectValue placeholder={t('agentEdit.addLanguage')} />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
              {availableLanguages.map((language) => (
                <SelectItem key={language.value} value={language.value}>
                  <div className="flex items-center gap-2">
                    <ReactCountryFlag
                      countryCode={language.countryCode}
                      svg
                      style={{
                        width: '16px',
                        height: '12px',
                      }}
                    />
                    <span>{language.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info Section */}
        <div className="space-y-3 pt-2">
          <p className="text-xs text-gray-600">
            {t('agentEdit.additionalLanguagesInfo')}
          </p>
          
          {/* Language Detection Toggle */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-900">
                {t('agentEdit.languageDetectionRecommendation')}
              </span>
            </div>
            <Switch
              checked={languageDetectionEnabled}
              onCheckedChange={setLanguageDetectionEnabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdditionalLanguagesSection;
