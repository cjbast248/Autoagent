
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Star, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingUses: number;
}

const GuestLimitModal = ({ isOpen, onClose, remainingUses }: GuestLimitModalProps) => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    onClose();
    navigate('/auth');
  };

  const handleViewPricing = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-black border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white text-center flex items-center justify-center">
            <Lock className="w-5 h-5 mr-2" />
            Limită Atinsă
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              Ai folosit toate cele 10 răspunsuri gratuite disponibile pentru utilizatorii neînregistrați.
            </p>
            
            {remainingUses > 0 && (
              <p className="text-yellow-400 mb-4">
                Îți mai rămân {remainingUses} răspunsuri gratuite.
              </p>
            )}
          </div>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center mb-3">
                <Star className="w-5 h-5 text-yellow-400 mr-2" />
                <h3 className="text-white font-semibold">Înregistrează-te gratuit</h3>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  100.000 credite gratuite
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Acces la toți asistenții AI
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Istoric conversații
                </div>
              </div>
              <Button 
                onClick={handleSignUp}
                className="w-full bg-white text-black hover:bg-gray-200"
              >
                Înregistrează-te Gratuit
              </Button>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">
              Ai deja cont?
            </p>
            <Button
              variant="outline"
              onClick={handleSignUp}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Conectează-te
            </Button>
          </div>

          <div className="text-center pt-2 border-t border-gray-800">
            <p className="text-gray-400 text-sm mb-2">
              Sau vezi planurile noastre premium
            </p>
            <Button
              variant="ghost"
              onClick={handleViewPricing}
              className="text-gray-300 hover:text-white"
            >
              Vezi Prețuri
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestLimitModal;
