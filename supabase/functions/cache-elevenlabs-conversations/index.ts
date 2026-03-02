// @ts-nocheck
// Supabase Edge Function: cache-elevenlabs-conversations
// Runs automatically every 10 minutes to cache conversation audio from ElevenLabs
// Processes uncached conversations older than 10 minutes
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/convai/conversations';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const MINUTES_DELAY = 10;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting conversation caching process...');
    
    // 1. Find uncached conversations older than 10 minutes that have conversation_id
    const since = new Date(Date.now() - MINUTES_DELAY * 60 * 1000).toISOString();
    
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('is_cached', false)
      .lt('created_at', since)
      .not('conversation_id', 'is', null);

    if (fetchError) {
      console.error('Error fetching conversations:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch conversations' }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    if (!conversations || conversations.length === 0) {
      console.log('No conversations to cache');
      return new Response(JSON.stringify({ message: 'No conversations to cache.' }), { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    console.log(`Found ${conversations.length} conversations to cache`);

    let updated = 0;
    const errors = [];

    for (const conv of conversations) {
      try {
        console.log(`Processing conversation: ${conv.conversation_id}`);
        
        // 2. Fetch conversation data from ElevenLabs
        const conversationRes = await fetch(`${ELEVENLABS_API_URL}/${conv.conversation_id}`, {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY!,
            'Content-Type': 'application/json'
          }
        });

        if (!conversationRes.ok) {
          console.error(`Failed to fetch conversation data for ${conv.conversation_id}: ${conversationRes.status}`);
          errors.push(`Failed to fetch conversation data for ${conv.conversation_id}`);
          continue;
        }

        const elevenData = await conversationRes.json();
        console.log(`Fetched conversation data for ${conv.conversation_id}`);

        // 3. Fetch audio file from ElevenLabs
        const audioRes = await fetch(`${ELEVENLABS_API_URL}/${conv.conversation_id}/audio`, {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY!
          }
        });

        if (!audioRes.ok) {
          console.error(`Failed to fetch audio for ${conv.conversation_id}: ${audioRes.status}`);
          errors.push(`Failed to fetch audio for ${conv.conversation_id}`);
          continue;
        }

        const audioBuffer = await audioRes.arrayBuffer();
        const audioFileName = `${conv.id}.mp3`;
        console.log(`Fetched audio for ${conv.conversation_id}, size: ${audioBuffer.byteLength} bytes`);

        // 4. Upload audio to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('conversations-audio')
          .upload(audioFileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (uploadError) {
          console.error(`Failed to upload audio for ${conv.conversation_id}:`, uploadError);
          errors.push(`Failed to upload audio for ${conv.conversation_id}: ${uploadError.message}`);
          continue;
        }

        // 5. Get public URL for the uploaded audio
        const { data: urlData } = supabase.storage
          .from('conversations-audio')
          .getPublicUrl(audioFileName);

        const audio_url = urlData.publicUrl;
        console.log(`Uploaded audio for ${conv.conversation_id} to: ${audio_url}`);

        // 6. Update conversation in DB with audio URL and cache info
        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            elevenlabs_data: elevenData,
            audio_url: audio_url,
            is_cached: true,
            cached_at: new Date().toISOString(),
            elevenlabs_id: conv.conversation_id
          })
          .eq('id', conv.id);

        if (updateError) {
          console.error(`Failed to update conversation ${conv.id}:`, updateError);
          errors.push(`Failed to update conversation ${conv.id}: ${updateError.message}`);
          continue;
        }

        console.log(`Successfully cached conversation: ${conv.conversation_id}`);
        updated++;

      } catch (error) {
        console.error(`Error processing conversation ${conv.conversation_id}:`, error);
        errors.push(`Error processing conversation ${conv.conversation_id}: ${error.message}`);
        continue;
      }
    }

    const result = {
      message: `Processed ${conversations.length} conversations`,
      updated,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Caching process completed:', result);
    return new Response(JSON.stringify(result), { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Fatal error in caching process:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
