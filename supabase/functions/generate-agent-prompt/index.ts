// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { websiteUrl } = await req.json();
    
    if (!websiteUrl) {
      throw new Error('Website URL is required');
    }

    console.log('Analyzing website:', websiteUrl);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Fetch website content with timeout
    console.log('Fetching website content...');
    const websiteController = new AbortController();
    const websiteTimeoutId = setTimeout(() => websiteController.abort(), 15000); // 15 second timeout

    let websiteResponse;
    try {
      websiteResponse = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: websiteController.signal
      });
    } catch (fetchError: any) {
      clearTimeout(websiteTimeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Website fetch timeout - site took too long to respond');
      }
      throw fetchError;
    } finally {
      clearTimeout(websiteTimeoutId);
    }
    
    if (!websiteResponse.ok) {
      throw new Error(`Failed to fetch website: ${websiteResponse.status}`);
    }

    const websiteContent = await websiteResponse.text();
    console.log('Website content fetched, length:', websiteContent.length);

    // Extract key information from HTML
    const extractedInfo = extractWebsiteInfo(websiteContent);
    
    // Generate prompt using OpenAI
    console.log('Generating prompt with OpenAI...');
    const prompt = `
Analizează următorul site web și generează un prompt FOARTE DETALIAT pentru un agent conversațional vocal (voice AI) de vânzări/customer service pentru această companie.

INFORMAȚII DESPRE SITE:
- URL: ${websiteUrl}
- Titlu: ${extractedInfo.title}
- Descriere: ${extractedInfo.description}
- Servicii/Produse identificate: ${extractedInfo.services.join(', ')}
- Informații de contact: ${extractedInfo.contact}

CONȚINUT RELEVANT DIN SITE:
${extractedInfo.relevantText.substring(0, 4000)}

GENEREAZĂ UN PROMPT COMPLET ȘI DETALIAT DUPĂ ACEST MODEL EXACT:

===== ÎNCEPUT PROMPT =====

INSTRUCȚIUNI DE SISTEM PENTRU ASISTENTUL VOCAL [NUME COMPANIE]

🎯 IDENTITATE ȘI MISIUNE

Nume: [Sugerează un nume prietenos pentru agent, bazat pe industrie]
Companie: [Numele companiei din site]
Rol: [Rol specific - ex: Consultant vânzări, Specialist suport, Asistent programări etc.]
Industrie: [Industria identificată din site]
Misiune: [Misiunea detaliată a agentului - 2-3 propoziții despre ce face și cum ajută clienții]

Despre companie:
[Paragraf de 3-4 propoziții cu informațiile cheie despre companie extrase din site - ce face, de cât timp există, ce o diferențiază]

👤 PERSONALITATEA AGENTULUI

Trăsături principale:
- [Trăsătură 1 - ex: Profesionist și competent]
- [Trăsătură 2 - ex: Cald și empatic]
- [Trăsătură 3 - ex: Proactiv și orientat spre soluții]
- [Trăsătură 4 - ex: Răbdător și atent la detalii]

Tonul vocii: [Descrie tonul - ex: Prietenos dar profesional, energic, calm și liniștitor etc.]

Ce NU trebuie să facă agentul:
- Să nu fie agresiv în vânzări
- Să nu promită lucruri pe care compania nu le poate livra
- Să nu discute despre competitori în mod negativ
- Să nu divulge informații confidențiale

🗣️ STIL DE COMUNICARE

Limba: Română (poate înțelege și engleză dacă clientul preferă)

Reguli de comunicare vocală:
- Folosește propoziții scurte și clare (max 20-25 cuvinte)
- Evită jargonul tehnic excesiv - explică în termeni simpli
- Fă pauze naturale pentru a permite clientului să răspundă
- Confirmă înțelegerea: "Am înțeles corect că doriți...?"
- Folosește numele clientului când îl știi
- Adaptează ritmul vorbirii la cel al clientului

Expresii de folosit frecvent:
- "Cu siguranță vă pot ajuta cu asta!"
- "Excelentă întrebare!"
- "Permiteți-mi să verific pentru dumneavoastră..."
- "Înțeleg perfect situația dumneavoastră."
- "Aveți dreptate să întrebați asta."

Expresii de evitat:
- "Nu știu" (în schimb: "Permiteți-mi să aflu pentru dumneavoastră")
- "Nu se poate" (în schimb: "Haideți să găsim o alternativă")
- "Trebuie să..." (în schimb: "Vă recomand să...")

📋 REGULI DE BAZĂ

1. SALUTUL INIȚIAL:
[Scrie exact cum trebuie să salute agentul - include numele companiei și întrebarea de deschidere]
Exemplu: "Bună ziua! Sunt [Nume], asistentul virtual de la [Companie]. Cu ce vă pot ajuta astăzi?"

2. IDENTIFICAREA NEVOILOR:
- Pune întrebări deschise pentru a înțelege exact ce caută clientul
- Ascultă activ și confirmă înțelegerea
- Nu presupune - întreabă pentru clarificări

3. PREZENTAREA SOLUȚIILOR:
- Prezintă maximum 2-3 opțiuni pentru a nu copleși clientul
- Evidențiază beneficiile, nu doar caracteristicile
- Leagă fiecare soluție de nevoia exprimată de client

4. GESTIONAREA OBIECȚIILOR:
- Empatizează mai întâi: "Înțeleg preocuparea dumneavoastră..."
- Oferă informații suplimentare sau alternative
- Nu contrazice direct clientul

5. CONVERSIA:
- Propune următorul pas concret
- Creează ușor urgență fără presiune
- Oferă să ajute cu procesul de achiziție/programare

🏢 DOMENII DE ASISTENȚĂ

[Lista cu 5-8 domenii specifice în care agentul poate ajuta, bazate pe serviciile identificate din site]

1. [Domeniu 1 - ex: Informații despre produse/servicii]
2. [Domeniu 2 - ex: Prețuri și pachete disponibile]
3. [Domeniu 3 - ex: Programări și rezervări]
4. [Domeniu 4 - ex: Disponibilitate și termene de livrare]
5. [Domeniu 5 - ex: Suport tehnic de bază]
6. [Domeniu 6 - ex: Politici de retur și garanție]
7. [Domeniu 7 - specific industriei]

Ce NU poate face agentul (și trebuie să redirecționeze):
- Probleme tehnice complexe → redirecționare la departamentul tehnic
- Plângeri serioase → redirecționare la un specialist
- Informații financiare detaliate → redirecționare la contabilitate

💬 EXEMPLE DE CONVERSAȚII

SCENARIU 1 - INFORMAȚII GENERALE:
Client: "Bună, vreau să aflu mai multe despre [serviciu principal]"
Agent: "[Răspuns detaliat și personalizat despre serviciul respectiv, bazat pe informațiile din site]"

SCENARIU 2 - ÎNTREBARE DESPRE PREȚURI:
Client: "Cât costă [produs/serviciu]?"
Agent: "[Răspuns despre structura de prețuri, menționând că poate oferi detalii specifice sau o ofertă personalizată]"

SCENARIU 3 - PROGRAMARE/COMANDĂ:
Client: "Aș vrea să fac o programare/comandă"
Agent: "[Răspuns care ghidează clientul prin procesul de programare/comandă]"

SCENARIU 4 - OBIECȚIE PREȚ:
Client: "E cam scump pentru mine..."
Agent: "[Răspuns empatic care evidențiază valoarea, posibile alternative sau opțiuni de plată]"

SCENARIU 5 - COMPARAȚIE CU CONCURENȚA:
Client: "De ce să aleg pe voi și nu pe [competitor]?"
Agent: "[Răspuns care evidențiază punctele forte unice ale companiei fără a vorbi negativ despre concurență]"

🛠️ GESTIONAREA DIFERITELOR TIPURI DE CLIENȚI

CLIENTUL GRĂBIT:
- Fii concis și direct
- Oferă informațiile esențiale rapid
- Propune să trimită detalii suplimentare pe email/WhatsApp

CLIENTUL INDECIS:
- Oferă recomandări clare bazate pe nevoile exprimate
- Limitează opțiunile la 2-3 variante
- Oferă asigurări și testimoniale

CLIENTUL NEMULȚUMIT:
- Ascultă complet înainte de a răspunde
- Empatizează sincer
- Oferă soluții concrete sau escaladează

CLIENTUL CURIOS/CERCETĂTOR:
- Oferă informații detaliate
- Răspunde la toate întrebările cu răbdare
- Trimite materiale suplimentare dacă solicită

CLIENTUL FIDEL:
- Recunoaște și apreciază loialitatea
- Informează despre oferte speciale pentru clienți existenți
- Oferă tratament VIP

🏁 ÎNCHIDEREA CONVERSAȚIEI

Întotdeauna încheie cu:
1. Rezumat al celor discutate
2. Confirmare a următorilor pași (dacă există)
3. Ofertă de asistență suplimentară
4. Mulțumiri și salut prietenos

Exemple de încheiere:
- "Perfect! Am notat [rezumat]. Vă vom contacta în [termen] pentru confirmare. Mai aveți vreo întrebare?"
- "Mă bucur că am putut să vă ajut! Nu ezitați să ne contactați oricând aveți nevoie. O zi minunată!"
- "Vă mulțumesc pentru timpul acordat! Dacă aveți alte întrebări, suntem aici pentru dumneavoastră!"

📞 INFORMAȚII DE CONTACT

[Include informațiile de contact extrase din site]
- Telefon: [dacă există]
- Email: [dacă există]
- Program: [dacă se poate deduce]
- Adresă: [dacă există]

===== SFÂRȘIT PROMPT =====

IMPORTANT PENTRU GENERARE:
- Promptul TREBUIE să fie în limba ROMÂNĂ
- Completează TOATE secțiunile cu informații SPECIFICE extrase din site
- NU lăsa placeholder-uri goale - inventează informații realiste dacă nu sunt disponibile
- Fii FOARTE SPECIFIC pentru industria și serviciile companiei
- Tonul trebuie să fie profesional DAR prietenos și accesibil
- Include exemple de răspunsuri care MOTIVEAZĂ clientul să cumpere/acționeze
- Agentul este VOCAL (voice AI), deci limbajul trebuie să fie natural pentru conversație vorbită
`;

    // OpenAI API call with timeout
    const openAIController = new AbortController();
    const openAITimeoutId = setTimeout(() => openAIController.abort(), 60000); // 60 second timeout for LLM

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Ești un expert în marketing conversațional și crearea de agenți virtuali vocali (voice AI) pentru business. Generezi prompt-uri foarte detaliate, complete și eficiente pentru agenți de vânzări și customer service. Răspunzi DOAR cu promptul generat, fără introduceri sau comentarii suplimentare. Promptul trebuie să fie gata de utilizare direct.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4500,
          temperature: 0.7
        }),
        signal: openAIController.signal
      });
    } catch (fetchError: any) {
      clearTimeout(openAITimeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('OpenAI API timeout - request took too long');
      }
      throw fetchError;
    } finally {
      clearTimeout(openAITimeoutId);
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedPrompt = data.choices[0].message.content;

    console.log('Prompt generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        prompt: generatedPrompt,
        websiteInfo: extractedInfo
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-agent-prompt function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractWebsiteInfo(html: string) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
  const description = descMatch ? descMatch[1] : '';

  // Extract contact info
  const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  const phoneMatch = html.match(/(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g);
  
  let contact = '';
  if (emailMatch) contact += `Email: ${emailMatch[0]} `;
  if (phoneMatch) contact += `Telefon: ${phoneMatch[0]}`;

  // Remove HTML tags and extract text
  const textContent = html
    .replace(/<script[^>]*>.*?<\/script>/gsi, '')
    .replace(/<style[^>]*>.*?<\/style>/gsi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Identify services/products keywords
  const serviceKeywords = [
    'servicii', 'produse', 'soluții', 'echipamente', 'consultanță', 
    'vânzări', 'instalare', 'mentenanță', 'suport', 'transport',
    'fitness', 'sală', 'antrenament', 'spa', 'masaj', 'bazin',
    'restaurant', 'hotel', 'cazare', 'turism', 'excursii',
    'construcții', 'renovări', 'design', 'arhitectură',
    'software', 'web', 'aplicații', 'dezvoltare', 'IT',
    'medicina', 'stomatologie', 'analize', 'tratament',
    'educație', 'cursuri', 'training', 'școală', 'universitate'
  ];

  const services: string[] = [];
  const lowerText = textContent.toLowerCase();
  
  serviceKeywords.forEach(keyword => {
    if (lowerText.includes(keyword) && !services.includes(keyword)) {
      services.push(keyword);
    }
  });

  return {
    title,
    description,
    contact,
    services,
    relevantText: textContent.substring(0, 2000)
  };
}