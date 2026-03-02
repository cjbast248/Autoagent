// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Configurații
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Functie pentru a împărți textul în chunks
function splitTextIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
    
    if (start >= text.length) break;
  }
  
  return chunks;
}

// Functie pentru a extrage text din PDF simplu (doar pentru demo)
function extractTextFromFile(content: string, fileType: string): string {
  // Pentru simplitate, returnez conținutul direct
  // În producție, ai putea integra o bibliotecă pentru PDF/DOCX
  return content;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...data } = await req.json();

    switch (action) {
      case 'create_text_document':
        return await createTextDocument(data);
      case 'upload_file_document':
        return await uploadFileDocument(data);
      case 'get_user_documents':
        return await getUserDocuments(data);
      case 'delete_document':
        return await deleteDocument(data);
      case 'create_agent':
        return await createAgent(data);
      case 'update_agent':
        return await updateAgent(data);
      case 'get_user_agents':
        return await getUserAgents(data);
      case 'delete_agent':
        return await deleteAgent(data);
      case 'link_document_to_agent':
        return await linkDocumentToAgent(data);
      case 'unlink_document_from_agent':
        return await unlinkDocumentFromAgent(data);
      case 'get_agent_documents':
        return await getAgentDocuments(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in document-processor function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function createTextDocument(data: any) {
  const { name, content, userId } = data;
  
  // Creează documentul
  const { data: document, error: docError } = await supabase
    .from('knowledge_documents')
    .insert({
      user_id: userId,
      name,
      content,
      file_type: 'text'
    })
    .select()
    .single();

  if (docError) throw docError;

  // Împarte conținutul în chunks
  const chunks = splitTextIntoChunks(content);
  
  // Inserează chunks
  const chunkData = chunks.map((chunk, index) => ({
    document_id: document.id,
    chunk_text: chunk,
    chunk_index: index
  }));

  const { error: chunkError } = await supabase
    .from('document_chunks')
    .insert(chunkData);

  if (chunkError) throw chunkError;

  return new Response(
    JSON.stringify({ 
      success: true,
      document: document
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function uploadFileDocument(data: any) {
  const { name, content, fileType, userId } = data;
  
  // Extract text from file content
  const extractedText = extractTextFromFile(content, fileType);
  
  // Creează documentul
  const { data: document, error: docError } = await supabase
    .from('knowledge_documents')
    .insert({
      user_id: userId,
      name,
      content: extractedText,
      file_type: fileType
    })
    .select()
    .single();

  if (docError) throw docError;

  // Împarte conținutul în chunks
  const chunks = splitTextIntoChunks(extractedText);
  
  // Inserează chunks
  const chunkData = chunks.map((chunk, index) => ({
    document_id: document.id,
    chunk_text: chunk,
    chunk_index: index
  }));

  const { error: chunkError } = await supabase
    .from('document_chunks')
    .insert(chunkData);

  if (chunkError) throw chunkError;

  return new Response(
    JSON.stringify({ 
      success: true,
      document: document
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function getUserDocuments(data: any) {
  const { userId } = data;
  
  const { data: documents, error } = await supabase
    .from('knowledge_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true,
      documents: documents
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function deleteDocument(data: any) {
  const { documentId, userId } = data;
  
  // Verifică că documentul aparține utilizatorului
  const { error } = await supabase
    .from('knowledge_documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function createAgent(data: any) {
  const { name, description, systemPrompt, userId } = data;
  
  const { data: agent, error } = await supabase
    .from('ai_agents')
    .insert({
      user_id: userId,
      name,
      description,
      system_prompt: systemPrompt
    })
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true,
      agent: agent
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function updateAgent(data: any) {
  const { agentId, name, description, systemPrompt, userId } = data;
  
  const { data: agent, error } = await supabase
    .from('ai_agents')
    .update({
      name,
      description,
      system_prompt: systemPrompt,
      updated_at: new Date().toISOString()
    })
    .eq('id', agentId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true,
      agent: agent
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function getUserAgents(data: any) {
  const { userId } = data;
  
  const { data: agents, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true,
      agents: agents
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function deleteAgent(data: any) {
  const { agentId, userId } = data;
  
  const { error } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', agentId)
    .eq('user_id', userId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function linkDocumentToAgent(data: any) {
  const { agentId, documentId } = data;
  
  const { error } = await supabase
    .from('agent_documents')
    .insert({
      agent_id: agentId,
      document_id: documentId
    });

  if (error && !error.message.includes('duplicate')) throw error;

  return new Response(
    JSON.stringify({ 
      success: true
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function unlinkDocumentFromAgent(data: any) {
  const { agentId, documentId } = data;
  
  const { error } = await supabase
    .from('agent_documents')
    .delete()
    .eq('agent_id', agentId)
    .eq('document_id', documentId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function getAgentDocuments(data: any) {
  const { agentId } = data;
  
  const { data: documents, error } = await supabase
    .from('knowledge_documents')
    .select(`
      *,
      agent_documents!inner(agent_id)
    `)
    .eq('agent_documents.agent_id', agentId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true,
      documents: documents
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}