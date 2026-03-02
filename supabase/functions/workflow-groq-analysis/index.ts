
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
    const { transcript, prompt, temperature = 0.7, model = 'llama-3.3-70b-versatile' } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const groqApiKey = Deno.env.get('GROQ-KEY');
    if (!groqApiKey) {
      throw new Error('GROQ-KEY not configured in Supabase secrets');
    }

    console.log('Analyzing with Groq...');
    console.log('Model:', model);
    console.log('Prompt length:', prompt.length);
    console.log('Transcript provided:', !!transcript);

    // Build final prompt - replace {transcript} if transcript is provided
    let finalPrompt = prompt;
    if (transcript) {
      finalPrompt = prompt.replace('{transcript}', transcript);
      // If prompt doesn't include the input data, add it at the beginning
      // This ensures Groq always has access to the actual data values
      if (!finalPrompt.includes(transcript.substring(0, Math.min(50, transcript.length)))) {
        finalPrompt = `DATE DE INTRARE (folosește aceste valori REALE, nu exemple!):\n${transcript}\n\n---\n\n${finalPrompt}`;
      }
    }

    console.log('Final prompt length:', finalPrompt.length);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'Ești un asistent AI expert. Când ți se cere să returnezi JSON, răspunzi DOAR cu JSON valid, fără text adițional. Fii concis și precis.',
          },
          {
            role: 'user',
            content: finalPrompt,
          },
        ],
        temperature,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    console.log('Groq response received, length:', content.length);

    // Clean up the response - remove markdown code blocks and extra text
    // Remove ```json ... ``` wrappers
    content = content.replace(/^```json\s*/i, '');
    content = content.replace(/^```\s*/i, '');
    content = content.replace(/\s*```$/i, '');
    
    // Remove any "rawAnalysis:" or similar prefixes
    content = content.replace(/^rawAnalysis:\s*/i, '');
    content = content.replace(/^analysis:\s*/i, '');
    content = content.replace(/^result:\s*/i, '');
    content = content.replace(/^output:\s*/i, '');
    
    // Trim whitespace
    content = content.trim();

    // Try to parse as JSON
    let parsedResult: any = null;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.log('Could not parse as JSON, returning raw text');
    }

    // Return ONLY the parsed result if available, otherwise clean content
    return new Response(
      JSON.stringify({
        success: true,
        analysis: parsedResult || content,
        isJson: parsedResult !== null,
        model: model,
        usage: data.usage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in workflow-groq-analysis function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
