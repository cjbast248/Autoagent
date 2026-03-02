import React, { useState, useEffect } from 'react';
import { X, Bot, Sparkles } from 'lucide-react';

interface N8NGroqAnalysisConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: any;
  };
  onClose: () => void;
  onSave: (config: any) => void;
}

const PROMPT_TEMPLATES = [
  {
    id: 'zoho-ready',
    name: '🔗 Pregătire pentru Zoho CRM',
    prompt: `Analizează transcrierea conversației și returnează un JSON cu câmpuri compatibile Zoho CRM:

- Description: rezumat detaliat al conversației în 2-3 paragrafe (ce s-a discutat, ce a cerut clientul, ce s-a oferit)
- Lead_Status: EXACT una din valorile: "Attempted to Contact" / "Contact in Future" / "Contacted" / "Junk Lead" / "Lost Lead" / "Not Contacted" / "Pre-Qualified" / "Not Qualified"
- Rating: un număr întreg de la 1 la 5 bazat pe interesul clientului (1=dezinteresat, 5=foarte interesat)

Reguli:
- Lead_Status trebuie să fie EXACT una din valorile de mai sus, nu traduceri
- Rating trebuie să fie doar un număr (1, 2, 3, 4 sau 5)
- Description trebuie să fie text detaliat, nu JSON

Returnează DOAR JSON valid, fără text adițional.

Conversație:
{transcript}`,
  },
  {
    id: 'extract-data',
    name: 'Extrage date de contact',
    prompt: `Analizează transcrierea conversației de mai jos și extrage următoarele informații în format JSON:
- nume: numele clientului (dacă a fost menționat)
- email: adresa de email (dacă a fost menționată)
- telefon: număr de telefon alternativ (dacă a fost menționat)
- interesat: true/false - dacă clientul pare interesat de produs/serviciu
- motiv: motivul principal al apelului

Returnează DOAR JSON valid, fără text adițional.

Conversație:
{transcript}`,
  },
  {
    id: 'sentiment',
    name: 'Analiză sentiment',
    prompt: `Analizează sentimentul conversației de mai jos și returnează în format JSON:
- sentiment: "pozitiv" / "neutru" / "negativ"
- scor: număr de la 1 la 10 (1=foarte negativ, 10=foarte pozitiv)
- motiv: explicație scurtă de max 2 propoziții

Returnează DOAR JSON valid, fără text adițional.

Conversație:
{transcript}`,
  },
  {
    id: 'summary',
    name: 'Rezumat conversație',
    prompt: `Fă un rezumat concis al conversației de mai jos în format JSON:
- rezumat: rezumat în maximum 3 propoziții
- puncte_cheie: array cu cele mai importante 3-5 puncte discutate
- actiuni_urmatoare: ce ar trebui să facă agentul/compania în continuare
- concluzie: "vanzare" / "interesat" / "neinteresat" / "reapelare" / "altele"

Returnează DOAR JSON valid, fără text adițional.

Conversație:
{transcript}`,
  },
  {
    id: 'custom',
    name: 'Prompt personalizat',
    prompt: '',
  },
];

export const N8NGroqAnalysisConfig: React.FC<N8NGroqAnalysisConfigProps> = ({
  node,
  onClose,
  onSave,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('extract-data');
  const [customPrompt, setCustomPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  useEffect(() => {
    if (node.config) {
      setSelectedTemplate(node.config.templateId || 'extract-data');
      setCustomPrompt(node.config.customPrompt || '');
      setTemperature(node.config.temperature || 0.7);
    }
  }, [node.config]);

  const handleSave = () => {
    const template = PROMPT_TEMPLATES.find((t) => t.id === selectedTemplate);
    const finalPrompt = selectedTemplate === 'custom' ? customPrompt : template?.prompt || '';

    onSave({
      templateId: selectedTemplate,
      customPrompt: selectedTemplate === 'custom' ? customPrompt : '',
      prompt: finalPrompt,
      temperature,
    });
  };

  const currentTemplate = PROMPT_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
      style={{
        right: '20px',
        top: '100px',
        width: '480px',
        maxHeight: '600px',
        backgroundColor: '#1e1e1e',
        border: '1px solid #444',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: '#252525', borderBottom: '1px solid #333' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: '36px', height: '36px', backgroundColor: '#F97316' }}
          >
            <Bot style={{ width: '20px', height: '20px', color: '#fff' }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>Groq Analysis</div>
            <div style={{ color: '#888', fontSize: '12px' }}>
              Analizează conversația cu AI
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded hover:bg-[#333] transition-colors">
          <X style={{ width: '16px', height: '16px', color: '#888' }} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Template Selector */}
        <div>
          <label
            style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '8px' }}
          >
            Tip analiză
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg outline-none"
            style={{
              backgroundColor: '#2d2d2d',
              border: '1px solid #444',
              color: '#fff',
              fontSize: '14px',
            }}
          >
            {PROMPT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {/* Prompt Preview/Editor */}
        <div>
          <label
            style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '8px' }}
          >
            {selectedTemplate === 'custom' ? 'Prompt personalizat' : 'Previzualizare prompt'}
          </label>
          <textarea
            value={selectedTemplate === 'custom' ? customPrompt : currentTemplate?.prompt || ''}
            onChange={(e) => {
              if (selectedTemplate === 'custom') {
                setCustomPrompt(e.target.value);
              }
            }}
            readOnly={selectedTemplate !== 'custom'}
            rows={10}
            className="w-full px-3 py-2 rounded-lg outline-none resize-none"
            style={{
              backgroundColor: selectedTemplate === 'custom' ? '#2d2d2d' : '#252525',
              border: '1px solid #444',
              color: selectedTemplate === 'custom' ? '#fff' : '#888',
              fontSize: '12px',
              fontFamily: 'monospace',
              lineHeight: '1.5',
            }}
            placeholder={
              selectedTemplate === 'custom'
                ? 'Scrie promptul tău aici. Folosește {transcript} pentru a insera transcrierea conversației.'
                : ''
            }
          />
          {selectedTemplate !== 'custom' && (
            <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
              Selectează "Prompt personalizat" pentru a edita.
            </div>
          )}
        </div>

        {/* Temperature */}
        <div>
          <label
            style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '8px' }}
          >
            Creativitate (temperature): {temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between" style={{ color: '#666', fontSize: '10px', marginTop: '4px' }}>
            <span>Precis (0)</span>
            <span>Creativ (1)</span>
          </div>
        </div>

        {/* Info Box */}
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: '#3a2d1a', border: '1px solid #5a4d3d' }}
        >
          <div className="flex items-start gap-2">
            <Sparkles style={{ width: '16px', height: '16px', color: '#F97316', marginTop: '2px' }} />
            <div style={{ color: '#fbbf24', fontSize: '12px', lineHeight: '1.5' }}>
              <strong>Model:</strong> Groq llama-3.3-70b-versatile<br />
              <strong>Input:</strong> Transcrierea de la nodul anterior<br />
              <strong>Output:</strong> JSON cu analiza structurată
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-end gap-2 px-4 py-3"
        style={{ backgroundColor: '#252525', borderTop: '1px solid #333' }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: '#333', color: '#fff', fontSize: '13px' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: '#F97316', color: '#fff', fontSize: '13px' }}
        >
          Save
        </button>
      </div>
    </div>
  );
};
