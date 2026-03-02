// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface CreateTextDocumentRequest {
  name: string
  text: string
}

interface CreateUrlDocumentRequest {
  name: string
  url: string
}

interface KnowledgeBaseDocument {
  id: string
  name: string
  type: string
  created_at?: string
}

interface CreateDocumentResponse {
  id: string
  name: string
}

interface KnowledgeBaseResponse {
  documents: KnowledgeBaseDocument[]
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    // Get Authorization header for user identification
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: authHeader ? { Authorization: authHeader } : {} 
        } 
      }
    )

    // Get user from JWT token
    if (authHeader) {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user && !error) {
        userId = user.id
      }
    }

    // Require authentication for all operations
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get ElevenLabs API key
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!elevenLabsApiKey) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle POST requests
    if (method === 'POST') {
      const contentType = req.headers.get('content-type')
      
      // Handle text document creation (JSON request)
      if (contentType?.includes('application/json')) {
        const body = await req.json()
        
        // Check if it's a URL document
        if (body.url) {
          const urlBody: CreateUrlDocumentRequest = body
          console.log('Creating URL document:', urlBody)
          
          const response = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base/url', {
            method: 'POST',
            headers: {
              'xi-api-key': elevenLabsApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: urlBody.url,
              name: urlBody.name || '',
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('ElevenLabs URL API error:', errorText)
            return new Response(
              JSON.stringify({ error: 'Failed to create URL document in ElevenLabs' }), 
              { 
                status: response.status, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }

          const result = await response.json()
          console.log('ElevenLabs URL response:', result)
          
          // Store document ownership in database
          const documentId = result.document_id || result.id
          const { error: dbError } = await supabase
            .from('user_knowledge_documents')
            .insert({
              user_id: userId,
              elevenlabs_document_id: documentId,
              document_name: urlBody.name || result.name,
              document_type: 'url'
            })
          
          if (dbError) {
            console.error('Error storing document ownership:', dbError)
          }
          
          const responseData: CreateDocumentResponse = {
            id: documentId,
            name: urlBody.name || result.name,
          }

          return new Response(
            JSON.stringify(responseData), 
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        } else {
          // Handle text document
          const textBody: CreateTextDocumentRequest = body
          console.log('Creating text document:', textBody)
          
          const response = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base/text', {
            method: 'POST',
            headers: {
              'xi-api-key': elevenLabsApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: textBody.text,
              name: textBody.name || '',
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('ElevenLabs text API error:', errorText)
            return new Response(
              JSON.stringify({ error: 'Failed to create text document in ElevenLabs' }), 
              { 
                status: response.status, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }

          const result = await response.json()
          console.log('ElevenLabs text response:', result)
          
          // Store document ownership in database
          const documentId = result.document_id || result.id
          const { error: dbError } = await supabase
            .from('user_knowledge_documents')
            .insert({
              user_id: userId,
              elevenlabs_document_id: documentId,
              document_name: textBody.name || result.name,
              document_type: 'text'
            })
          
          if (dbError) {
            console.error('Error storing document ownership:', dbError)
          }
          
          const responseData: CreateDocumentResponse = {
            id: documentId,
            name: textBody.name || result.name,
          }

          return new Response(
            JSON.stringify(responseData), 
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      // Handle file document upload (multipart/form-data request)
      if (contentType?.includes('multipart/form-data')) {
        const formData = await req.formData()
        const file = formData.get('file') as File
        const name = (formData.get('name') as string) || file.name

        console.log('Uploading file document:', { name, fileSize: file.size, fileType: file.type })

        if (!file) {
          return new Response(
            JSON.stringify({ error: 'No file provided' }), 
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Validate file type (same as ElevenLabs)
        const allowedTypes = [
          'text/plain',                    // .txt
          'application/pdf',               // .pdf
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'text/html',                     // .html
          'application/epub+zip',          // .epub
          'text/markdown'                  // .md
        ];

        const fileName = file.name?.toLowerCase() || '';
        const allowedExtensions = ['.epub', '.pdf', '.docx', '.txt', '.html', '.md'];
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

        if (!allowedTypes.includes(file.type) && !hasValidExtension) {
          return new Response(
            JSON.stringify({
              error: 'Unsupported file type. Supported formats: EPUB, PDF, DOCX, TXT, HTML, MD',
              supportedTypes: allowedExtensions
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Validate file size (max 21MB, same as ElevenLabs)
        if (file.size > 21 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: 'File too large. Maximum size is 21MB' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Create form data for ElevenLabs using the exact format from your example
        const elevenLabsFormData = new FormData()
        elevenLabsFormData.append('file', file)

        const response = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base/file', {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsApiKey,
          },
          body: elevenLabsFormData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('ElevenLabs file upload error:', errorText)
          return new Response(
            JSON.stringify({ error: 'Failed to upload file to ElevenLabs' }), 
            { 
              status: response.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const result = await response.json()
        console.log('ElevenLabs file response:', result)
        
        // Store document ownership in database
        const documentId = result.document_id || result.id
        const { error: dbError } = await supabase
          .from('user_knowledge_documents')
          .insert({
            user_id: userId,
            elevenlabs_document_id: documentId,
            document_name: name || result.name,
            document_type: file.type || 'file'
          })
        
        if (dbError) {
          console.error('Error storing document ownership:', dbError)
        }
        
        const responseData: CreateDocumentResponse = {
          id: documentId,
          name: name || result.name,
        }

        return new Response(
          JSON.stringify(responseData), 
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Handle getting existing documents
    if (method === 'GET') {
      console.log('Getting user documents from database')
      
      // Get documents owned by this user from database
      const { data: userDocs, error: dbError } = await supabase
        .from('user_knowledge_documents')
        .select('elevenlabs_document_id, document_name, document_type, created_at')
        .eq('user_id', userId)
      
      if (dbError) {
        console.error('Database error getting user documents:', dbError)
        return new Response(
          JSON.stringify({ error: 'Failed to get user documents from database' }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const documents: KnowledgeBaseDocument[] = userDocs?.map((doc: any) => ({
        id: doc.elevenlabs_document_id,
        name: doc.document_name,
        type: doc.document_type || 'file',
        created_at: doc.created_at,
      })) || []

      const responseData: KnowledgeBaseResponse = {
        documents,
      }

      return new Response(
        JSON.stringify(responseData), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Route not found
    return new Response(
      JSON.stringify({ error: 'Route not found' }), 
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Knowledge base operation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})