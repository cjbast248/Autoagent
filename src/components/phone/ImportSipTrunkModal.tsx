import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { Server, ArrowDownLeft, ArrowUpRight, Plus, Trash2, Check } from 'lucide-react';
import { encryptSipConfig } from '@/utils/encryption';

interface ImportSipTrunkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ImportSipTrunkModal: React.FC<ImportSipTrunkModalProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [label, setLabel] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [providerType, setProviderType] = useState<'sip' | 'twilio'>('sip');

  // Inbound Configuration
  const [inboundMediaEncryption, setInboundMediaEncryption] = useState<'disabled' | 'allowed' | 'required'>('allowed');
  const [allowedNumbers, setAllowedNumbers] = useState<string[]>([]);
  const [remoteDomains, setRemoteDomains] = useState<string[]>(['example.com']);
  const [inboundUsername, setInboundUsername] = useState('');
  const [inboundPassword, setInboundPassword] = useState('');

  // Outbound Configuration
  const [outboundAddress, setOutboundAddress] = useState('');
  const [transportType, setTransportType] = useState<'TLS' | 'TCP' | 'UDP'>('TLS');
  const [outboundMediaEncryption, setOutboundMediaEncryption] = useState<'disabled' | 'allowed' | 'required'>('allowed');
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([{ key: 'X-Custom-Header', value: '' }]);
  const [outboundUsername, setOutboundUsername] = useState('');
  const [outboundPassword, setOutboundPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const sipData = {
        provider: 'sip_trunk',
        phone_number: phoneNumber,
        label: label,
        supports_inbound: true,
        supports_outbound: true,
        outbound_trunk_config: {
          address: outboundAddress,
          transport: transportType.toLowerCase(),
          media_encryption: outboundMediaEncryption,
          credentials: {
            username: outboundUsername,
            password: outboundPassword
          },
          headers: customHeaders.reduce((acc, header) => {
            if (header.key && header.value) {
              acc[header.key] = header.value;
            }
            return acc;
          }, {} as Record<string, string>)
        },
        inbound_trunk_config: {
          remote_domains: remoteDomains.filter(d => d.trim()),
          allowed_addresses: [],
          allowed_numbers: allowedNumbers.filter(n => n.trim()),
          media_encryption: inboundMediaEncryption,
          credentials: {
            username: inboundUsername,
            password: inboundPassword
          }
        }
      };

      console.log('Import payload:', JSON.stringify(sipData, null, 2));

      const { data: functionResult, error: functionError } = await supabase.functions.invoke(
        'create-phone-number',
        { body: sipData }
      );

      if (functionError) throw functionError;

      const phoneNumberId = functionResult?.phone_number_id;

      if (phoneNumberId) {
        // Encrypt SIP credentials before storing in database
        const encryptedSipData = await encryptSipConfig(sipData);

        const { error: insertError } = await supabase
          .from('phone_numbers')
          .insert({
            user_id: user.id,
            phone_number: phoneNumber,
            elevenlabs_phone_id: phoneNumberId,
            label: label,
            status: 'active',
            provider_type: providerType,
            sip_config: encryptedSipData
          });

        if (insertError) throw insertError;

        toast({
          title: 'Success',
          description: 'SIP trunk imported successfully!',
        });

        onSuccess();
        onOpenChange(false);

        // Reset form
        setLabel('');
        setPhoneNumber('');
        setProviderType('sip');
        setInboundMediaEncryption('allowed');
        setAllowedNumbers([]);
        setRemoteDomains(['example.com']);
        setInboundUsername('');
        setInboundPassword('');
        setOutboundAddress('');
        setTransportType('TLS');
        setOutboundMediaEncryption('allowed');
        setCustomHeaders([{ key: 'X-Custom-Header', value: '' }]);
        setOutboundUsername('');
        setOutboundPassword('');
      }
    } catch (error: any) {
      console.error('Error importing SIP trunk:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to import SIP trunk',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addAllowedNumber = () => {
    setAllowedNumbers([...allowedNumbers, '']);
  };

  const removeAllowedNumber = (index: number) => {
    setAllowedNumbers(allowedNumbers.filter((_, i) => i !== index));
  };

  const updateAllowedNumber = (index: number, value: string) => {
    const updated = [...allowedNumbers];
    updated[index] = value;
    setAllowedNumbers(updated);
  };

  const addRemoteDomain = () => {
    setRemoteDomains([...remoteDomains, '']);
  };

  const removeRemoteDomain = (index: number) => {
    setRemoteDomains(remoteDomains.filter((_, i) => i !== index));
  };

  const updateRemoteDomain = (index: number, value: string) => {
    const updated = [...remoteDomains];
    updated[index] = value;
    setRemoteDomains(updated);
  };

  const addCustomHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeCustomHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateCustomHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="bg-white w-full max-w-2xl p-0 rounded-2xl shadow-2xl border-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 px-8 pt-8 pb-6 flex justify-between items-start border-b border-zinc-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
              <Server className="w-5 h-5 text-zinc-600" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Import SIP Trunk</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Configure your telephony provider</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-black transition p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-8 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Basic Information */}
          <div className="space-y-5">
            {/* Provider Type */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Provider Type
              </label>
              <div className="relative">
                <select
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value as 'sip' | 'twilio')}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 appearance-none cursor-pointer focus:outline-none focus:border-black transition"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px'
                  }}
                >
                  <option value="sip">SIP Trunk</option>
                  <option value="twilio">Twilio</option>
                </select>
              </div>
              <p className="text-[11px] text-zinc-400">
                Select "Twilio" if using Twilio phone numbers, or "SIP Trunk" for other providers
              </p>
            </div>

            {/* Label */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Name of the phone number"
                className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                required
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Phone Number
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+12025550123 or SIP extension"
                className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                required
              />
            </div>
          </div>

          {/* Inbound Configuration */}
          <div className="bg-zinc-50 rounded-2xl p-6 space-y-5 border border-zinc-100">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-200">
              <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4 text-zinc-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Inbound Configuration</h3>
                <p className="text-[11px] text-zinc-400">Forward calls to the ElevenLabs SIP server</p>
              </div>
            </div>

            {/* Media Encryption */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Media Encryption
              </label>
              <div className="relative">
                <select
                  value={inboundMediaEncryption}
                  onChange={(e) => setInboundMediaEncryption(e.target.value as 'disabled' | 'allowed' | 'required')}
                  className="w-full h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 appearance-none cursor-pointer focus:outline-none focus:border-black transition"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px'
                  }}
                >
                  <option value="disabled">Disabled</option>
                  <option value="allowed">Allowed</option>
                  <option value="required">Required</option>
                </select>
              </div>
            </div>

            {/* Allowed Numbers */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Allowed Numbers <span className="font-normal text-zinc-400">(Optional)</span>
              </label>
              <p className="text-[11px] text-zinc-400">
                Phone numbers allowed to use this trunk. Leave empty to allow all.
              </p>
              {allowedNumbers.map((number, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => updateAllowedNumber(index, e.target.value)}
                    placeholder="+12025550123"
                    className="flex-1 h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                  />
                  <button
                    type="button"
                    onClick={() => removeAllowedNumber(index)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAllowedNumber}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-500 border border-dashed border-zinc-300 rounded-lg hover:border-black hover:text-black transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Number
              </button>
            </div>

            {/* Remote Domains */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Remote Domains <span className="font-normal text-zinc-400">(Optional)</span>
              </label>
              <p className="text-[11px] text-zinc-400">
                FQDN domains of your SIP servers for TLS certificate validation.
              </p>
              {remoteDomains.map((domain, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => updateRemoteDomain(index, e.target.value)}
                    placeholder="example.com"
                    className="flex-1 h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                  />
                  <button
                    type="button"
                    onClick={() => removeRemoteDomain(index)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRemoteDomain}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-500 border border-dashed border-zinc-300 rounded-lg hover:border-black hover:text-black transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Domain
              </button>
            </div>

            {/* Inbound Authentication */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Authentication <span className="font-normal text-zinc-400">(Optional)</span>
              </label>
              <p className="text-[11px] text-zinc-400">
                Digest authentication credentials for inbound calls.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400">Username</label>
                  <input
                    type="text"
                    value={inboundUsername}
                    onChange={(e) => setInboundUsername(e.target.value)}
                    placeholder="SIP username"
                    className="w-full h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400">Password</label>
                  <input
                    type="password"
                    value={inboundPassword}
                    onChange={(e) => setInboundPassword(e.target.value)}
                    placeholder="SIP password"
                    className="w-full h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Outbound Configuration */}
          <div className="bg-zinc-50 rounded-2xl p-6 space-y-5 border border-zinc-100">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-200">
              <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-zinc-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Outbound Configuration</h3>
                <p className="text-[11px] text-zinc-400">Where ElevenLabs should send calls</p>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Address
              </label>
              <input
                type="text"
                value={outboundAddress}
                onChange={(e) => setOutboundAddress(e.target.value)}
                placeholder="example.pstn.twilio.com"
                className="w-full h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                required
              />
              <p className="text-[11px] text-zinc-400">
                Hostname or IP for SIP INVITE. Use hostname with valid certificate for TLS.
              </p>
            </div>

            {/* Transport Type */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Transport Type
              </label>
              <div className="relative">
                <select
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value as 'TLS' | 'TCP' | 'UDP')}
                  className="w-full h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 appearance-none cursor-pointer focus:outline-none focus:border-black transition"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px'
                  }}
                >
                  <option value="TLS">TLS</option>
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                </select>
              </div>
            </div>

            {/* Media Encryption */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Media Encryption
              </label>
              <div className="relative">
                <select
                  value={outboundMediaEncryption}
                  onChange={(e) => setOutboundMediaEncryption(e.target.value as 'disabled' | 'allowed' | 'required')}
                  className="w-full h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 appearance-none cursor-pointer focus:outline-none focus:border-black transition"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px'
                  }}
                >
                  <option value="disabled">Disabled</option>
                  <option value="allowed">Allowed</option>
                  <option value="required">Required</option>
                </select>
              </div>
            </div>

            {/* Custom Headers */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Custom Headers <span className="font-normal text-zinc-400">(Optional)</span>
              </label>
              <p className="text-[11px] text-zinc-400">
                Add custom SIP headers for outbound calls.
              </p>
              {customHeaders.map((header, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => updateCustomHeader(index, 'key', e.target.value)}
                    placeholder="Header Key"
                    className="flex-1 h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => updateCustomHeader(index, 'value', e.target.value)}
                    placeholder="Header Value"
                    className="flex-1 h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomHeader(index)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCustomHeader}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-500 border border-dashed border-zinc-300 rounded-lg hover:border-black hover:text-black transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Header
              </button>
            </div>

            {/* Outbound Authentication */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Authentication <span className="font-normal text-zinc-400">(Optional)</span>
              </label>
              <p className="text-[11px] text-zinc-400">
                Digest authentication credentials if required by your provider.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400">Username</label>
                  <input
                    type="text"
                    value={outboundUsername}
                    onChange={(e) => setOutboundUsername(e.target.value)}
                    placeholder="SIP username"
                    className="w-full h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400">Password</label>
                  <input
                    type="password"
                    value={outboundPassword}
                    onChange={(e) => setOutboundPassword(e.target.value)}
                    placeholder="SIP password"
                    className="w-full h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex-shrink-0 px-8 py-5 flex justify-end gap-3 border-t border-zinc-100 bg-white">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-5 py-2.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-black transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-black text-white hover:bg-zinc-800 shadow-lg shadow-zinc-200 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Importing...'
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Import Trunk
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
