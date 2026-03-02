import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Loader2 } from 'lucide-react';
interface SingleCallTabProps {
  contactName: string;
  setContactName: (name: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  handleSingleCall: () => void;
  agentId: string;
  isInitiating: boolean;
}
export const SingleCallTab: React.FC<SingleCallTabProps> = ({
  contactName,
  setContactName,
  phoneNumber,
  setPhoneNumber,
  handleSingleCall,
  agentId,
  isInitiating
}) => {
  return <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label htmlFor="contact-name" className="text-gray-900 font-medium">
            Nume Contact (opțional)
          </Label>
          <Input 
            id="contact-name" 
            value={contactName} 
            onChange={e => setContactName(e.target.value)} 
            placeholder="Ex: John Doe" 
            className="bg-white border-gray-300 text-gray-900" 
          />
          <p className="text-xs text-gray-500">Numele va apărea în istoric pentru identificare</p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="phone-number" className="text-gray-900 font-medium">
            Număr de Telefon *
          </Label>
          <Input 
            id="phone-number" 
            value={phoneNumber} 
            onChange={e => setPhoneNumber(e.target.value)} 
            placeholder="+40712345678" 
            className="bg-white border-gray-300 text-gray-900 font-mono" 
          />
          <p className="text-xs text-gray-500">Formatul internațional cu prefix țară</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <Button 
          onClick={handleSingleCall} 
          disabled={!agentId.trim() || !phoneNumber.trim() || isInitiating} 
          className="w-full md:w-auto bg-gray-900 hover:bg-gray-800 text-white px-8 py-3"
          size="lg"
        >
          {isInitiating ? <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Se Inițiază Apel...
            </> : <>
              <Phone className="w-4 h-4 mr-2" />
              Inițiază Apel Individual
            </>}
        </Button>
      </div>
    </div>;
};