import React, { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  phrase?: string;
  wordDelayMs?: number;
  mode?: 'words' | 'chars';
  charsLength?: number;
}

const CODE_SNIPPET = `function respond(input) {
  // procesare...
  return "Răspuns generat";
}`;

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ phrase = CODE_SNIPPET, wordDelayMs = 60, mode = 'chars', charsLength = 6 }) => {
  const [pos, setPos] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setPos(p => (p + 1) % (phrase.length + 1));
    }, Math.max(20, wordDelayMs));
    return () => clearInterval(t);
  }, [phrase, wordDelayMs]);

  useEffect(() => {
    const b = setInterval(() => setBlink(v => !v), 500);
    return () => clearInterval(b);
  }, []);

  const display = phrase.slice(0, pos);

  return (
    <div className="mr-12 md:mr-24 flex justify-start">
      <div className="flex items-end gap-3">
        <div className="w-8 h-8 rounded-full bg-muted-foreground flex items-center justify-center flex-shrink-0 text-white">
          <Bot className="w-4 h-4" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Agent Automation</span>
          </div>
          <div>
            <div className="inline-block rounded-lg px-3 py-2 prose-sm whitespace-pre-wrap leading-relaxed break-words max-w-[70%] md:max-w-[60ch] bg-muted/10 text-foreground font-mono text-sm">
              <pre className="m-0">{display}<span className={`inline-block w-2 ${blink ? 'opacity-100' : 'opacity-0'}`}>
                |</span></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
