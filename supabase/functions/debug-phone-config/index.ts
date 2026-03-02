const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    // Fetch all phone numbers from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const phoneNumbers = await response.json();

    // Get detailed config for each phone number
    const detailedConfigs = [];

    for (const phone of phoneNumbers) {
      try {
        const detailResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/phone-numbers/${phone.phone_number_id}`,
          {
            headers: {
              'xi-api-key': apiKey,
            },
          }
        );

        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          detailedConfigs.push({
            phone_number: phone.phone_number,
            phone_number_id: phone.phone_number_id,
            label: phone.label,
            agent_id: detail.agent_id || null,
            inbound_trunk_config: detail.inbound_trunk_config || null,
            outbound_trunk_config: detail.outbound_trunk_config || null,
            supports_inbound: detail.supports_inbound,
            supports_outbound: detail.supports_outbound,
          });
        }
      } catch (e) {
        console.error(`Error fetching details for ${phone.phone_number}:`, e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: detailedConfigs.length,
        phone_numbers: detailedConfigs,
      }, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
