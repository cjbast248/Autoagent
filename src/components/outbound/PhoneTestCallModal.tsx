import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Phone, Loader2, Bot, ChevronDown } from 'lucide-react';
import { useUserAgents } from '@/hooks/useUserAgents';
import { useCallInitiation } from '@/hooks/useCallInitiation';
import { toast } from '@/hooks/use-toast';

interface PhoneTestCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  phoneLabel: string;
}

export const PhoneTestCallModal: React.FC<PhoneTestCallModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  phoneLabel
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [targetPhoneNumber, setTargetPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');

  const { data: agents = [] } = useUserAgents();
  const { initiateCall, isInitiating } = useCallInitiation({
    agentId: selectedAgentId,
    phoneId: undefined
  });

  const handleTestCall = async () => {
    if (!selectedAgentId || !targetPhoneNumber.trim()) {
      toast({
        title: "Eroare",
        description: "Trebuie să selectezi un agent și să introduci un număr de telefon",
        variant: "destructive"
      });
      return;
    }

    try {
      // Ensure the phone number includes the country code
      const fullPhoneNumber = targetPhoneNumber.startsWith('+')
        ? targetPhoneNumber
        : `+373${targetPhoneNumber.replace(/\s/g, '')}`;

      const contact = {
        id: Date.now().toString(),
        name: contactName || 'Test Call',
        phone: fullPhoneNumber,
        language: 'ro',
        location: ''
      };

      await initiateCall(contact, selectedAgentId);

      // Reset form first
      setContactName('');
      setTargetPhoneNumber('');
      setSelectedAgentId('');
      // Then close modal after a small delay to prevent race condition
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      console.error('Error initiating call:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut iniția apelul",
        variant: "destructive"
      });
    }
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setContactName('');
      setTargetPhoneNumber('');
      setSelectedAgentId('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="!bg-white w-full !max-w-[460px] !p-0 !rounded-3xl !shadow-2xl !border border-zinc-100 overflow-hidden" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Test Call</DialogTitle>
        </VisuallyHidden>
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-base font-bold text-zinc-900">Test Call</h2>
            <span className="text-xs text-zinc-400 font-medium">
              {phoneLabel || phoneNumber}
            </span>
          </div>

          {/* Agent Selection */}
          <div className="mb-6">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
              Agent
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-500 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-white border border-zinc-200 text-zinc-900 text-sm font-medium rounded-2xl h-14 pl-14 pr-12 cursor-pointer hover:border-zinc-300 transition outline-none focus:border-black appearance-none"
              >
                <option value="">Alege un agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.elevenlabs_agent_id || agent.agent_id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="mb-6">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
              Numar de apelat
            </label>
            <div className="bg-white border border-zinc-200 rounded-2xl h-14 flex items-center px-1 transition-all focus-within:border-black">
              {/* Country Code */}
              <div className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 h-11 border border-zinc-100 shrink-0">
                <span className="text-base">🇲🇩</span>
                <span className="text-sm font-mono font-medium text-zinc-600">+373</span>
              </div>

              {/* Phone Input */}
              <input
                type="tel"
                value={targetPhoneNumber}
                onChange={(e) => setTargetPhoneNumber(e.target.value)}
                placeholder="00 000 000"
                className="flex-1 text-lg font-mono font-medium text-zinc-900 placeholder-zinc-300 px-3 focus:outline-none bg-transparent tracking-wider"
              />
            </div>
          </div>

          {/* Contact Name */}
          <div className="mb-10">
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nume Contact (optional)"
              className="w-full text-center text-sm text-zinc-900 placeholder-zinc-300 border-b border-zinc-200 pb-3 focus:border-black focus:outline-none transition bg-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onClose}
              className="h-12 rounded-2xl text-sm font-medium text-zinc-500 hover:text-black hover:bg-zinc-50 transition"
            >
              Anuleaza
            </button>
            <button
              onClick={handleTestCall}
              disabled={!selectedAgentId || !targetPhoneNumber.trim() || isInitiating}
              className="h-12 rounded-2xl bg-zinc-700 text-white hover:bg-zinc-800 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitiating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Se suna...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Apeleaza</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
