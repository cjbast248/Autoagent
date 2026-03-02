import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface DeleteUserRequest {
  admin_user_id: string;
  target_user_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { admin_user_id, target_user_id }: DeleteUserRequest = await req.json();

    // Verify admin user has admin role
    const { data: isAdmin, error: adminCheckError } = await supabaseClient.rpc(
      'is_admin_user',
      { _user_id: admin_user_id }
    );

    if (adminCheckError || !isAdmin) {
      console.error('Admin check failed:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Access denied: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from deleting themselves
    if (admin_user_id === target_user_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Invalidate all user sessions BEFORE deletion
    console.log(`Invalidating all sessions for user ${target_user_id}...`);
    const { error: signOutError } = await supabaseClient.auth.admin.signOut(
      target_user_id,
      'global'  // Invalidates ALL sessions across all devices
    );

    if (signOutError) {
      console.error('Error signing out user:', signOutError);
      // Continue with deletion anyway - user might already be logged out
    } else {
      console.log('✅ User sessions invalidated successfully');
    }

    // Broadcast user deletion event via Realtime for immediate client logout
    console.log(`Broadcasting deletion event for user ${target_user_id}...`);
    try {
      const channel = supabaseClient.channel('user-deletion-broadcast');
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'user_deleted',
        payload: { user_id: target_user_id }
      });
      await supabaseClient.removeChannel(channel);
      console.log('✅ Deletion broadcast sent');
    } catch (broadcastError) {
      console.error('Broadcast error (non-fatal):', broadcastError);
      // Non-fatal - continue with deletion
    }

    console.log(`Starting complete deletion for user ${target_user_id}`);

    // List of all tables with user_id that need to be cleaned
    const tablesToClean = [
      'account_deletion_requests',
      'active_agents',
      'active_campaigns',
      'ai_agents',
      'ai_chat_messages',
      'audio_generations',
      'balance_transactions',
      'call_history',
      'call_history_columns',
      'callback_requests',
      'campaign_sessions',
      'campaigns',
      'chat_conversations',
      'companies',
      'company_contacts',
      'contact_interactions',
      'contact_lists',
      'contacts_database',
      'conversation_analytics_cache',
      'conversations',
      'custom_analysis_results',
      'custom_voices',
      'document_embeddings',
      'google_sheets_contacts',
      'google_sheets_integrations',
      'google_sheets_templates',
      'kalina_agents',
      'knowledge_documents',
      'orders',
      'phone_numbers',
      'prompt_history',
      'scheduled_calls',
      'scraping_history',
      'support_tickets',
      'user_activity_events',
      'user_balance',
      'user_data',
      'user_notifications',
      'user_onboarding_quiz',
      'user_roles',
      'user_statistics',
      'user_transcripts',
      'user_webhook_urls',
      'video_generations',
      'workflow_agents',
      'workflow_campaigns',
      'workflow_columns',
      'zoho_contacts',
      'zoho_crm_connections',
      'profiles',
    ];

    // Delete all user data from all tables
    for (const table of tablesToClean) {
      try {
        // profiles table uses 'id' instead of 'user_id'
        const idColumn = table === 'profiles' ? 'id' : 'user_id';
        
        const { error } = await supabaseClient
          .from(table)
          .delete()
          .eq(idColumn, target_user_id);

        if (error) {
          console.error(`Error deleting from ${table}:`, error);
        } else {
          console.log(`✅ Successfully deleted from ${table}`);
        }
      } catch (err) {
        console.error(`Exception deleting from ${table}:`, err);
      }
    }

    // Special handling for agent_documents (uses agent_id, not user_id)
    console.log('Deleting agent_documents...');
    try {
      const { data: agents } = await supabaseClient
        .from('ai_agents')
        .select('id')
        .eq('user_id', target_user_id);
      
      const agentIds = agents?.map(a => a.id) || [];
      if (agentIds.length > 0) {
        const { error: agentDocsError } = await supabaseClient
          .from('agent_documents')
          .delete()
          .in('agent_id', agentIds);
        
        if (agentDocsError) {
          console.error('Error deleting agent_documents:', agentDocsError);
        } else {
          console.log(`✅ Deleted agent_documents for ${agentIds.length} agents`);
        }
      }
    } catch (err) {
      console.error('Exception deleting agent_documents:', err);
    }

    // Special handling for document_chunks (uses document_id from knowledge_documents)
    console.log('Deleting document_chunks...');
    try {
      const { data: docs } = await supabaseClient
        .from('knowledge_documents')
        .select('id')
        .eq('user_id', target_user_id);
      
      const docIds = docs?.map(d => d.id) || [];
      if (docIds.length > 0) {
        const { error: chunksError } = await supabaseClient
          .from('document_chunks')
          .delete()
          .in('document_id', docIds);
        
        if (chunksError) {
          console.error('Error deleting document_chunks:', chunksError);
        } else {
          console.log(`✅ Deleted document_chunks for ${docIds.length} documents`);
        }
      }
    } catch (err) {
      console.error('Exception deleting document_chunks:', err);
    }

    // Special handling for campaign_contacts (uses campaign_id)
    console.log('Deleting campaign_contacts...');
    try {
      const { data: campaigns } = await supabaseClient
        .from('campaigns')
        .select('id')
        .eq('user_id', target_user_id);
      
      const campaignIds = campaigns?.map(c => c.id) || [];
      if (campaignIds.length > 0) {
        const { error: campaignContactsError } = await supabaseClient
          .from('campaign_contacts')
          .delete()
          .in('campaign_id', campaignIds);
        
        if (campaignContactsError) {
          console.error('Error deleting campaign_contacts:', campaignContactsError);
        } else {
          console.log(`✅ Deleted campaign_contacts for ${campaignIds.length} campaigns`);
        }
      }
    } catch (err) {
      console.error('Exception deleting campaign_contacts:', err);
    }

    // Special handling for chat_messages (uses conversation_id)
    console.log('Deleting chat_messages...');
    try {
      const { data: conversations } = await supabaseClient
        .from('chat_conversations')
        .select('id')
        .eq('user_id', target_user_id);
      
      const conversationIds = conversations?.map(c => c.id) || [];
      if (conversationIds.length > 0) {
        const { error: chatMessagesError } = await supabaseClient
          .from('chat_messages')
          .delete()
          .in('conversation_id', conversationIds);
        
        if (chatMessagesError) {
          console.error('Error deleting chat_messages:', chatMessagesError);
        } else {
          console.log(`✅ Deleted chat_messages for ${conversationIds.length} conversations`);
        }
      }
    } catch (err) {
      console.error('Exception deleting chat_messages:', err);
    }

    // Special handling for order_items (uses order_id)
    console.log('Deleting order_items...');
    try {
      const { data: orders } = await supabaseClient
        .from('orders')
        .select('id')
        .eq('user_id', target_user_id);
      
      const orderIds = orders?.map(o => o.id) || [];
      if (orderIds.length > 0) {
        const { error: orderItemsError } = await supabaseClient
          .from('order_items')
          .delete()
          .in('order_id', orderIds);
        
        if (orderItemsError) {
          console.error('Error deleting order_items:', orderItemsError);
        } else {
          console.log(`✅ Deleted order_items for ${orderIds.length} orders`);
        }
      }
    } catch (err) {
      console.error('Exception deleting order_items:', err);
    }

    // Special handling for workflow_contacts (uses list_id)
    console.log('Deleting workflow_contacts...');
    try {
      const { data: lists } = await supabaseClient
        .from('contact_lists')
        .select('id')
        .eq('user_id', target_user_id);
      
      const listIds = lists?.map(l => l.id) || [];
      if (listIds.length > 0) {
        const { error: workflowContactsError } = await supabaseClient
          .from('workflow_contacts')
          .delete()
          .in('list_id', listIds);
        
        if (workflowContactsError) {
          console.error('Error deleting workflow_contacts:', workflowContactsError);
        } else {
          console.log(`✅ Deleted workflow_contacts for ${listIds.length} lists`);
        }
      }
    } catch (err) {
      console.error('Exception deleting workflow_contacts:', err);
    }

    // Delete admin_audit_log entries referencing this user BEFORE deleting from auth.users
    console.log('Deleting admin_audit_log entries...');
    try {
      const { error: auditLogError } = await supabaseClient
        .from('admin_audit_log')
        .delete()
        .eq('target_user_id', target_user_id);
      
      if (auditLogError) {
        console.error('Error deleting admin_audit_log:', auditLogError);
      } else {
        console.log('✅ Deleted admin_audit_log entries');
      }
    } catch (err) {
      console.error('Exception deleting admin_audit_log:', err);
    }

    // Finally, delete the user from auth.users
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(
      target_user_id
    );

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user from authentication',
          details: deleteError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the admin action
    try {
      await supabaseClient.rpc('log_admin_action', {
        p_admin_user_id: admin_user_id,
        p_action: 'DELETE_USER_PERMANENT',
        p_target_user_id: target_user_id,
        p_details: {
          timestamp: new Date().toISOString(),
          tables_cleaned: tablesToClean.length,
        },
      });
    } catch (logError) {
      console.error('Error logging admin action:', logError);
      // Don't fail the request if logging fails
    }

    console.log(`Successfully deleted user ${target_user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User and all associated data deleted successfully',
        tables_cleaned: tablesToClean.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-delete-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
