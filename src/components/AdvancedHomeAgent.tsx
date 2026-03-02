import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AdvancedHomeAgent: React.FC = () => {
  const { user } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('advanced-home-agent', {
        body: {
          message: inputMessage,
          userId: user.id,
          conversationHistory: []
        }
      });

      if (error) throw error;
      
      toast.success('Mesaj processat cu succes!');
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Eroare la trimiterea mesajului');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-white">
      
      <section className="mb-[20px] flex w-full flex-col items-center justify-center py-[15vh] md:mb-0 2xl:py-32 bg-white">
        <div className="mb-8 flex flex-col items-center px-4 text-center md:mb-12">
          <h1 className="mb-6 text-3xl font-medium leading-none text-foreground sm:text-4xl md:text-6xl">
            <span className="tracking-tight">Bună! Sunt Agent Automation, gata să începem?</span>
          </h1>
        </div>

        {/* Suggestion buttons */}
        <div className="mb-8 flex flex-wrap justify-center gap-3 px-4">
          <Button 
            variant="outline" 
            className="rounded-full border-gray-200 bg-white hover:bg-white"
            onClick={() => handleSuggestionClick('Rezumă ultimul apel')}
          >
            Rezumă ultimul apel
          </Button>
          <Button 
            variant="outline" 
            className="rounded-full border-gray-200 bg-white hover:bg-white"
            onClick={() => handleSuggestionClick('Programează o întâlnire mâine la 10')}
          >
            Programează o întâlnire mâine la 10
          </Button>
          <Button 
            variant="outline" 
            className="rounded-full border-gray-200 bg-white hover:bg-white"
            onClick={() => handleSuggestionClick('Generează un email de follow-up')}
          >
            Generează un email de follow-up
          </Button>
        </div>

        {/* Chat input */}
        <div className="w-full max-w-3xl px-3 sm:px-0">
          <div className="group rounded-[28px] border border-gray-200 bg-white p-3 text-base shadow-sm transition-all duration-150 ease-in-out">
            {/* Input area */}
            <div className="relative flex flex-1 items-center mb-3">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Întreabă orice"
                className="flex-1 resize-none rounded-md bg-transparent px-2 py-2 text-[16px] leading-snug text-foreground placeholder:text-muted-foreground placeholder-shown:truncate placeholder-shown:whitespace-nowrap focus:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
                rows={1}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
              />
              <div className="ml-auto flex items-center gap-1 md:gap-2">
                <button 
                  type="button"
                  onClick={handleSubmit}
                  disabled={!inputMessage.trim() || isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground transition-opacity duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowUp className="h-6 w-6 shrink-0 text-background" />
                </button>
              </div>
            </div>
            
            {/* Action buttons exactly like ChatGPT */}
            <div className="flex items-center justify-start gap-2 px-2">
              <Button 
                type="button"
                variant="ghost" 
                className="h-6 px-2 text-xs bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-md border-0 font-normal"
              >
                Atașează
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                className="h-6 px-2 text-xs bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-md border-0 font-normal"
              >
                Caută
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                className="h-6 px-2 text-xs bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-md border-0 font-normal"
              >
                Studiu
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                className="h-6 px-2 text-xs bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-800 rounded-md border-0 font-normal"
              >
                Voce
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};