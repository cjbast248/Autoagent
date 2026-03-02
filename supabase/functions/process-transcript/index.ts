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
    const { transcriptText } = await req.json();

    if (!transcriptText) {
      throw new Error('Transcript text is required');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        // ADAUGAT: Acest parametru forțează OpenAI să returneze un JSON valid.
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            // MODIFICAT: Am simplificat prompt-ul pentru a fi mai direct și am scos cerința pentru timestamp.
            content: `Ești un asistent AI expert în procesarea transcrierilor. Sarcina ta este să analizezi textul primit și să îl transformi într-un dialog structurat, identificând replicile pentru "User" și "Agent AI". Returnează rezultatul EXCLUSIV în format JSON, conform structurii specificate. Structura trebuie să fie: { "dialogue": [{ "speaker": "NumeVorbitor", "text": "Replica..." }] }. Nu adăuga niciun alt text în afara obiectului JSON.`
          },
          {
            role: 'user',
            content: `Procesează următorul transcript și creează un dialog structurat:

${transcriptText}`
          }
        ],
        temperature: 0.2,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const gptResponseContent = data.choices[0].message.content;

    // Acum, gptResponseContent ar trebui să fie un JSON valid garantat de API.
    // Blocul try-catch este încă o măsură bună de siguranță.
    let structuredDialogue;
    try {
      structuredDialogue = JSON.parse(gptResponseContent);
    } catch (parseError) {
      console.error('Eroare critică: JSON-ul de la OpenAI nu a putut fi parsat, deși s-a folosit response_format.', parseError);
      console.error('Răspuns brut primit:', gptResponseContent);
      
      // Returnează o eroare clară dacă parsarea eșuează
      throw new Error("Nu s-a putut parsa răspunsul de la AI.");
    }

    return new Response(JSON.stringify(structuredDialogue), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-transcript function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});