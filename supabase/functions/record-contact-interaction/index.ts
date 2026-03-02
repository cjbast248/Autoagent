// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      user_id, 
      phone_number, 
      contact_name,
      conversation_id, 
      agent_id, 
      call_status, 
      duration_seconds, 
      summary,
      interaction_type = 'call'
    } = await req.json()

    console.log('Recording contact interaction:', { 
      user_id, phone_number, contact_name, conversation_id, agent_id, call_status 
    })

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find or create contact
    let contactId = null
    const { data: existingContact, error: contactFindError } = await supabase
      .from('contacts_database')
      .select('id')
      .eq('user_id', user_id)
      .eq('telefon', phone_number)
      .single()

    if (contactFindError && contactFindError.code !== 'PGRST116') {
      console.error('Error finding contact:', contactFindError)
      throw new Error('Error finding contact')
    }

    if (existingContact) {
      contactId = existingContact.id
      
      // Update last_contact_date
      await supabase
        .from('contacts_database')
        .update({ 
          last_contact_date: new Date().toISOString(),
          ...(contact_name && contact_name !== phone_number && { nume: contact_name })
        })
        .eq('id', contactId)

      console.log('Updated existing contact:', contactId)
    } else {
      // Create new contact
      const { data: newContact, error: contactCreateError } = await supabase
        .from('contacts_database')
        .insert({
          user_id: user_id,
          nume: contact_name || 'Contact Nou',
          telefon: phone_number,
          status: 'active',
          last_contact_date: new Date().toISOString()
        })
        .select('id')
        .single()

      if (contactCreateError) {
        console.error('Error creating contact:', contactCreateError)
        throw new Error('Error creating contact')
      }

      contactId = newContact.id
      console.log('Created new contact:', contactId)
    }

    // Record the interaction
    const interactionData = {
      user_id: user_id,
      contact_id: contactId,
      interaction_type: interaction_type,
      interaction_date: new Date().toISOString(),
      duration_seconds: duration_seconds || 0,
      summary: summary || null,
      agent_id: agent_id || null,
      conversation_id: conversation_id || null,
      call_status: call_status || 'unknown',
      notes: null
    }

    const { data: interactionResult, error: interactionError } = await supabase
      .from('contact_interactions')
      .insert(interactionData)
      .select()
      .single()

    if (interactionError) {
      console.error('Error creating interaction:', interactionError)
      throw new Error('Error recording interaction')
    }

    console.log('Interaction recorded successfully:', interactionResult.id)

    return new Response(
      JSON.stringify({
        success: true,
        contact_id: contactId,
        interaction_id: interactionResult.id,
        message: 'Contact interaction recorded successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in record-contact-interaction:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})