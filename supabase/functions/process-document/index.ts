// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Funcție pentru fragmentarea textului
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
    
    // Dacă am ajuns la sfârșitul textului, ieșim din bucla
    if (end >= text.length) break;
    
    // Mutăm start-ul cu overlap pentru a păstra contextul
    start = end - overlap;
  }

  return chunks;
}

// Funcție pentru crearea embedding-urilor
async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName, userId, agentId } = await req.json();

    if (!fileUrl || !fileName || !userId || !agentId) {
      throw new Error("Lipsesc parametrii: fileUrl, fileName, userId, agentId");
    }

    console.log('Processing document:', { fileUrl, fileName, userId, agentId });

    // Descarcă fișierul din Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('document-uploads')
      .download(fileUrl);
      
    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Eroare la descărcarea fișierului: ${downloadError.message}`);
    }

    const fileContent = await fileData.text();
    console.log('File content loaded, length:', fileContent.length);

    // Fragmentează textul în bucăți
    const chunks = chunkText(fileContent);
    console.log('Created chunks:', chunks.length);

    // Generează un ID unic pentru document
    const documentId = crypto.randomUUID();

    // Procesează fiecare bucată și creează embedding-uri
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      const embedding = await createEmbedding(chunks[i]);
      
      embeddings.push({
        user_id: userId,
        document_id: documentId,
        agent_id: agentId,
        chunk_text: chunks[i],
        embedding: JSON.stringify(embedding), // Convertim array-ul în JSON string
        chunk_index: i,
        document_name: fileName,
      });
    }

    // Salvează toate embedding-urile în baza de date
    const { error: insertError } = await supabase
      .from('document_embeddings')
      .insert(embeddings);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Eroare la salvarea vectorilor: ${insertError.message}`);
    }

    // Salvează și în tabela knowledge_documents pentru compatibilitate
    const { error: docError } = await supabase
      .from('knowledge_documents')
      .insert({
        user_id: userId,
        name: fileName,
        content: fileContent,
        file_type: fileName.split('.').pop() || 'txt'
      });

    if (docError) {
      console.log('Warning: Could not save to knowledge_documents:', docError.message);
    }

    console.log('Document processed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      documentId: documentId,
      chunksCreated: chunks.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-document function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});