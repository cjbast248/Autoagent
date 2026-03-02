import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { ArrowLeft, Phone, Check, Loader2, AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';
import { encryptSipConfig } from '@/utils/encryption';

type ProviderType = 'moldcell' | 'orange' | 'unite' | 'cartel' | '';

interface ProviderConfig {
  name: string;
  description: string;
  domainPattern: string;
  domainPlaceholder: string;
  usernamePlaceholder: string;
  usernameHelp: string;
  transport: 'udp' | 'tcp' | 'tls';
  mediaEncryption: 'disabled' | 'allowed' | 'required';
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  moldcell: {
    name: 'Moldcell PBX',
    description: 'Pentru numere Moldcell cu PBX virtual',
    domainPattern: '.pbx.moldcell.md',
    domainPlaceholder: 'compania.pbx.moldcell.md',
    usernamePlaceholder: 'admin@compania.pbx.moldcell.md',
    usernameHelp: 'Username-ul primit de la Moldcell pentru PBX',
    transport: 'udp',
    mediaEncryption: 'allowed',
  },
  orange: {
    name: 'Orange PBX',
    description: 'Pentru numere Orange cu PBX virtual',
    domainPattern: '.pbx.orange.md',
    domainPlaceholder: 'compania.pbx.orange.md',
    usernamePlaceholder: 'user@compania.pbx.orange.md',
    usernameHelp: 'Username-ul primit de la Orange pentru PBX',
    transport: 'udp',
    mediaEncryption: 'allowed',
  },
  unite: {
    name: 'Moldtelecom Unite',
    description: 'Pentru numere fixe Unite/Moldtelecom',
    domainPattern: 'ims.unite.md',
    domainPlaceholder: 'ims.unite.md',
    usernamePlaceholder: '+37367XXXXXX@ims.unite.md',
    usernameHelp: 'Numărul în format +373 urmat de @ims.unite.md',
    transport: 'tls',
    mediaEncryption: 'required',
  },
  cartel: {
    name: 'Cartel SIP',
    description: 'Pentru numere fixe Cartel',
    domainPattern: 'sip.cartel.md',
    domainPlaceholder: 'sip.cartel.md',
    usernamePlaceholder: '800XXX',
    usernameHelp: 'Numărul de cont Cartel',
    transport: 'udp',
    mediaEncryption: 'disabled',
  },
};

// Our Asterisk server address
const ASTERISK_SERVER = '193.53.40.79';

const ImportPhoneNumber: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Form state - simplified!
  const [label, setLabel] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState<ProviderType>('');
  const [pbxDomain, setPbxDomain] = useState('');
  const [pbxUsername, setPbxUsername] = useState('');
  const [pbxPassword, setPbxPassword] = useState('');
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  // Auto-fill domain when provider changes
  useEffect(() => {
    if (provider && PROVIDER_CONFIGS[provider]) {
      const config = PROVIDER_CONFIGS[provider];
      if (provider === 'unite' || provider === 'cartel') {
        setPbxDomain(config.domainPattern);
      } else if (!pbxDomain || pbxDomain.endsWith('.pbx.moldcell.md') || pbxDomain.endsWith('.pbx.orange.md')) {
        setPbxDomain('');
      }
    }
  }, [provider]);

  // Dotted background pattern
  const dotPatternStyle = {
    backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
    backgroundSize: '24px 24px',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !provider) return;

    const configId = label.toLowerCase().replace(/[^a-z0-9]/g, '') || 'phone';
    const contactUser = phoneNumber.replace(/^\+/, '');

    setLoading(true);
    setStep('processing');
    setErrorMessage('');

    try {
      // Step 1: Preparing configuration
      setProcessingStatus('Pregătire configurație...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Normalize phone number - ensure it has + prefix
      const normalizedPhone = phoneNumber.trim().startsWith('+')
        ? phoneNumber.trim()
        : `+${phoneNumber.trim()}`;

      // Build the full payload for the Edge Function
      // ElevenLabs config points to OUR Asterisk server
      const sipData = {
        provider: 'sip_trunk',
        phone_number: normalizedPhone,
        label: label,
        supports_inbound: true,
        supports_outbound: true,
        inbound_trunk_config: {
          media_encryption: 'allowed',
          allowed_addresses: [ASTERISK_SERVER],
          credentials: {
            username: 'zDRKLvbelFgA', // Auth for Asterisk calling ElevenLabs
            password: 'gjEaPuWKhhJN',
          },
        },
        outbound_trunk_config: {
          address: ASTERISK_SERVER,
          transport: 'tcp', // Our Asterisk uses TCP for ElevenLabs
          media_encryption: 'disabled',
          credentials: {
            username: 'zDRKLvbelFgA', // ElevenLabs auth to our Asterisk
            password: 'gjEaPuWKhhJN',
          },
        },
        // Asterisk config - this is what gets configured on our server
        asterisk_config: {
          asterisk_trunk_type: provider,
          asterisk_pbx_domain: pbxDomain,
          asterisk_username: pbxUsername,
          asterisk_password: pbxPassword,
          asterisk_config_id: configId,
          asterisk_contact_user: contactUser,
        },
      };

      // Step 2: Creating in ElevenLabs
      setProcessingStatus('Creare număr în ElevenLabs...');

      const { data: functionResult, error: functionError } = await supabase.functions.invoke(
        'create-phone-number',
        { body: sipData }
      );

      if (functionError) {
        throw new Error(functionError.message || 'Eroare la crearea numărului');
      }

      if (functionResult?.error) {
        throw new Error(functionResult.error);
      }

      const phoneNumberId = functionResult?.phone_number_id;
      if (!phoneNumberId) {
        throw new Error('Nu s-a putut obține ID-ul numărului de telefon');
      }

      // Step 3: Check Asterisk configuration result
      setProcessingStatus('Configurare Asterisk...');
      await new Promise(resolve => setTimeout(resolve, 500));

      const asteriskConfigured = functionResult?.asterisk_configured === true;
      const asteriskError = functionResult?.asterisk_error;

      if (!asteriskConfigured && asteriskError) {
        console.warn('Asterisk configuration warning:', asteriskError);
        // Don't fail - just warn. The number is created in ElevenLabs.
      }

      // Step 4: Save to database
      setProcessingStatus('Salvare în baza de date...');

      const encryptedSipData = await encryptSipConfig(sipData);

      const insertData = {
        user_id: user.id,
        phone_number: phoneNumber,
        elevenlabs_phone_id: phoneNumberId,
        label: label,
        status: 'active',
        provider_type: 'sip',
        sip_config: encryptedSipData,
        asterisk_trunk_type: provider,
        asterisk_pbx_domain: pbxDomain,
        asterisk_username: pbxUsername,
        asterisk_password: pbxPassword,
        asterisk_config_id: configId,
        asterisk_contact_user: contactUser,
        asterisk_status: asteriskConfigured ? 'configured' : 'pending',
      };

      const { error: insertError } = await supabase
        .from('phone_numbers')
        .insert(insertData);

      if (insertError) {
        throw new Error(`Eroare la salvare: ${insertError.message}`);
      }

      // Success!
      setStep('success');
      setProcessingStatus(asteriskConfigured
        ? 'Numărul a fost configurat complet!'
        : 'Numărul a fost creat. Configurația Asterisk necesită verificare.');

      // Navigate after a short delay
      setTimeout(() => {
        navigate('/account/phone-numbers');
      }, 2000);

    } catch (error: any) {
      console.error('Error importing phone number:', error);
      setStep('error');
      setErrorMessage(error.message || 'A apărut o eroare neașteptată');
    } finally {
      setLoading(false);
    }
  };

  const selectedConfig = provider ? PROVIDER_CONFIGS[provider] : null;

  // Processing/Success/Error screens
  if (step === 'processing' || step === 'success' || step === 'error') {
    return (
      <DashboardLayout>
        <div className="min-h-screen p-10 flex items-center justify-center" style={dotPatternStyle}>
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 max-w-md w-full text-center shadow-lg">
            {step === 'processing' && (
              <>
                <Loader2 className="w-16 h-16 text-emerald-500 mx-auto mb-6 animate-spin" />
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Se configurează...</h2>
                <p className="text-zinc-500">{processingStatus}</p>
              </>
            )}

            {step === 'success' && (
              <>
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Succes!</h2>
                <p className="text-zinc-500 mb-4">{processingStatus}</p>
                <p className="text-sm text-zinc-400">Redirecționare...</p>
              </>
            )}

            {step === 'error' && (
              <>
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Eroare</h2>
                <p className="text-red-600 mb-6">{errorMessage}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setStep('form');
                      setErrorMessage('');
                    }}
                    className="px-6 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200 transition"
                  >
                    Încearcă din nou
                  </button>
                  <button
                    onClick={() => navigate('/account/phone-numbers')}
                    className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-zinc-800 transition"
                  >
                    Înapoi la numere
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen p-10 pb-32" style={dotPatternStyle}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <header className="mb-10">
            <button
              onClick={() => navigate('/account/phone-numbers')}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-black transition mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Înapoi la Numere de Telefon
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shadow-sm">
                <Phone className="w-6 h-6 text-emerald-600" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black tracking-tight">Adaugă Număr de Telefon</h1>
                <p className="text-sm text-zinc-500 mt-1">Conectează un număr de telefon pentru apeluri AI</p>
              </div>
            </div>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Info */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                <h2 className="text-lg font-semibold text-zinc-900">Informații de bază</h2>
              </div>

              {/* Label */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Denumire <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Linie Principală, Suport Clienți"
                  className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Număr de Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+37379123456"
                  className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-mono placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  required
                />
                <p className="text-xs text-zinc-400">Formatul internațional cu prefix țară (ex: +373...)</p>
              </div>
            </div>

            {/* Step 2: Provider Selection */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                <h2 className="text-lg font-semibold text-zinc-900">Alege providerul</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProvider(key as ProviderType)}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      provider === key
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="font-medium text-zinc-900">{config.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">{config.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: PBX Credentials - only show when provider is selected */}
            {provider && selectedConfig && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                  <h2 className="text-lg font-semibold text-zinc-900">Credențiale {selectedConfig.name}</h2>
                </div>

                {/* PBX Domain */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">
                    Domeniu PBX <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pbxDomain}
                    onChange={(e) => setPbxDomain(e.target.value)}
                    placeholder={selectedConfig.domainPlaceholder}
                    className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                    required
                    disabled={provider === 'unite' || provider === 'cartel'}
                  />
                  {(provider === 'moldcell' || provider === 'orange') && (
                    <p className="text-xs text-zinc-400">
                      Domeniul complet al PBX-ului tău (ex: {selectedConfig.domainPlaceholder})
                    </p>
                  )}
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pbxUsername}
                    onChange={(e) => setPbxUsername(e.target.value)}
                    placeholder={selectedConfig.usernamePlaceholder}
                    className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                    required
                  />
                  <p className="text-xs text-zinc-400">{selectedConfig.usernameHelp}</p>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">
                    Parolă <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={pbxPassword}
                    onChange={(e) => setPbxPassword(e.target.value)}
                    placeholder="Parola PBX"
                    className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                    required
                  />
                  <p className="text-xs text-zinc-400">Parola primită de la operator pentru autentificare SIP</p>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-blue-800">
                        <strong>Ce se va întâmpla:</strong>
                      </p>
                      <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
                        <li>Numărul va fi conectat la agentul tău AI</li>
                        <li>Configurarea se face automat în câteva secunde</li>
                        <li>Apelurile primite vor fi preluate de agentul AI</li>
                        <li>Apelurile efectuate vor fi făcute prin {selectedConfig.name}</li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSecurityInfo(!showSecurityInfo)}
                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition"
                      title="Despre securitatea datelor"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {showSecurityInfo && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-blue-800">🔒 Securitatea datelor tale</p>
                        <button
                          type="button"
                          onClick={() => setShowSecurityInfo(false)}
                          className="p-1 text-blue-400 hover:text-blue-600 rounded transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <ul className="text-xs text-blue-700 space-y-1.5">
                        <li>• Credențialele PBX sunt criptate end-to-end înainte de stocare</li>
                        <li>• Noi nu avem acces la parolele tale - doar tu le poți vedea</li>
                        <li>• Datele sunt accesibile doar din dashboard-ul tău personal</li>
                        <li>• Conexiunea folosește protocoale securizate (TLS/HTTPS)</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => navigate('/account/phone-numbers')}
                className="px-6 py-3 rounded-xl text-sm font-medium text-zinc-500 hover:text-black transition"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={loading || !provider || !label || !phoneNumber || !pbxDomain || !pbxUsername || !pbxPassword}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-500 text-white rounded-full text-sm font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Se procesează...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Adaugă Numărul
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ImportPhoneNumber;
