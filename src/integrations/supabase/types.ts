export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          status: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          status?: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          status?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      active_agents: {
        Row: {
          agent_id: string
          agent_name: string
          call_started_at: string | null
          conversation_id: string | null
          created_at: string
          current_contact_name: string | null
          current_phone_number: string | null
          id: string
          last_activity_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          agent_name: string
          call_started_at?: string | null
          conversation_id?: string | null
          created_at?: string
          current_contact_name?: string | null
          current_phone_number?: string | null
          id?: string
          last_activity_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          agent_name?: string
          call_started_at?: string | null
          conversation_id?: string | null
          created_at?: string
          current_contact_name?: string | null
          current_phone_number?: string | null
          id?: string
          last_activity_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      active_campaigns: {
        Row: {
          agent_id: string
          call_interval: number
          campaign_name: string | null
          company_id: string | null
          company_name: string | null
          completed_at: string | null
          failed_calls: number
          id: string
          last_call_at: string | null
          phone_id: string | null
          processed_contacts: number
          retry_max: number
          scheduled_start_time: string | null
          started_at: string
          status: string
          successful_calls: number
          time_slots: Json | null
          total_contacts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          call_interval?: number
          campaign_name?: string | null
          company_id?: string | null
          company_name?: string | null
          completed_at?: string | null
          failed_calls?: number
          id?: string
          last_call_at?: string | null
          phone_id?: string | null
          processed_contacts?: number
          retry_max?: number
          scheduled_start_time?: string | null
          started_at?: string
          status?: string
          successful_calls?: number
          time_slots?: Json | null
          total_contacts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          call_interval?: number
          campaign_name?: string | null
          company_id?: string | null
          company_name?: string | null
          completed_at?: string | null
          failed_calls?: number
          id?: string
          last_call_at?: string | null
          phone_id?: string | null
          processed_contacts?: number
          retry_max?: number
          scheduled_start_time?: string | null
          started_at?: string
          status?: string
          successful_calls?: number
          time_slots?: Json | null
          total_contacts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_user_id?: string | null
        }
        Relationships: []
      }
      agent_documents: {
        Row: {
          agent_id: string
          created_at: string
          document_id: string
          id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          document_id: string
          id?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          system_prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          system_prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          system_prompt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          conversation_session_id: string
          cost_usd: number
          created_at: string | null
          id: string
          message_content: string
          processed: boolean | null
          user_id: string
        }
        Insert: {
          conversation_session_id: string
          cost_usd?: number
          created_at?: string | null
          id?: string
          message_content: string
          processed?: boolean | null
          user_id: string
        }
        Update: {
          conversation_session_id?: string
          cost_usd?: number
          created_at?: string | null
          id?: string
          message_content?: string
          processed?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      altegio_installations: {
        Row: {
          application_id: number | null
          created_at: string | null
          agentauto_user_id: string | null
          raw_user_data: string | null
          salon_id: number
          signature_valid: boolean | null
          state: string | null
          status: string | null
          updated_at: string | null
          user_data: Json | null
          user_data_sign: string | null
        }
        Insert: {
          application_id?: number | null
          created_at?: string | null
          agentauto_user_id?: string | null
          raw_user_data?: string | null
          salon_id: number
          signature_valid?: boolean | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_data?: Json | null
          user_data_sign?: string | null
        }
        Update: {
          application_id?: number | null
          created_at?: string | null
          agentauto_user_id?: string | null
          raw_user_data?: string | null
          salon_id?: number
          signature_valid?: boolean | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_data?: Json | null
          user_data_sign?: string | null
        }
        Relationships: []
      }
      amocrm_connections: {
        Row: {
          access_token: string | null
          account_id: number | null
          account_name: string | null
          base_domain: string | null
          client_id: string | null
          client_secret: string | null
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          state: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: number | null
          account_name?: string | null
          base_domain?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: number | null
          account_name?: string | null
          base_domain?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_generations: {
        Row: {
          audio_url: string | null
          character_count: number
          created_at: string
          credits_used: number
          id: string
          text: string
          user_id: string | null
          voice_id: string
          voice_name: string
        }
        Insert: {
          audio_url?: string | null
          character_count: number
          created_at?: string
          credits_used: number
          id?: string
          text: string
          user_id?: string | null
          voice_id: string
          voice_name: string
        }
        Update: {
          audio_url?: string | null
          character_count?: number
          created_at?: string
          credits_used?: number
          id?: string
          text?: string
          user_id?: string | null
          voice_id?: string
          voice_name?: string
        }
        Relationships: []
      }
      auth_logs: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          session_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      balance_transactions: {
        Row: {
          amount: number
          conversation_id: string | null
          created_at: string
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      bitrix24_connections: {
        Row: {
          access_token: string | null
          client_endpoint: string | null
          client_id: string | null
          client_secret: string | null
          created_at: string
          expires_at: string | null
          id: string
          member_id: string | null
          portal_domain: string | null
          refresh_token: string | null
          state: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          client_endpoint?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          member_id?: string | null
          portal_domain?: string | null
          refresh_token?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          client_endpoint?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          member_id?: string | null
          portal_domain?: string | null
          refresh_token?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_attempts: {
        Row: {
          agent_id: string
          attempt_no: number
          contact_id: string
          conversation_id: string | null
          cost_total: number | null
          created_at: string
          duration_sec: number | null
          ended_at: string | null
          id: string
          metadata_json: Json | null
          started_at: string
          status: string | null
          termination_reason: string | null
        }
        Insert: {
          agent_id: string
          attempt_no: number
          contact_id: string
          conversation_id?: string | null
          cost_total?: number | null
          created_at?: string
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          metadata_json?: Json | null
          started_at?: string
          status?: string | null
          termination_reason?: string | null
        }
        Update: {
          agent_id?: string
          attempt_no?: number
          contact_id?: string
          conversation_id?: string | null
          cost_total?: number | null
          created_at?: string
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          metadata_json?: Json | null
          started_at?: string
          status?: string | null
          termination_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_attempts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "workflow_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "workflow_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      call_history: {
        Row: {
          agent_id: string | null
          ai_chat_cost_usd: number | null
          analysis_agent_evaluation: string | null
          analysis_client_status: string | null
          analysis_conclusion: string | null
          analysis_processed_at: string | null
          analysis_status: string | null
          auto_analysis_enabled: boolean | null
          call_date: string
          call_direction: string | null
          call_status: string
          callback_analyzed: boolean | null
          caller_number: string | null
          contact_name: string | null
          conversation_id: string | null
          cost_processed: boolean | null
          cost_usd: number | null
          created_at: string
          custom_analysis_data: Json | null
          dialog_json: string | null
          duration_seconds: number | null
          elevenlabs_history_id: string | null
          id: string
          language: string | null
          last_status_check: string | null
          phone_number: string
          processing_started_at: string | null
          summary: string | null
          timestamps: string | null
          trigger_processed: boolean | null
          trigger_processed_at: string | null
          updated_at: string
          user_id: string
          zoho_activity_id: string | null
        }
        Insert: {
          agent_id?: string | null
          ai_chat_cost_usd?: number | null
          analysis_agent_evaluation?: string | null
          analysis_client_status?: string | null
          analysis_conclusion?: string | null
          analysis_processed_at?: string | null
          analysis_status?: string | null
          auto_analysis_enabled?: boolean | null
          call_date?: string
          call_direction?: string | null
          call_status?: string
          callback_analyzed?: boolean | null
          caller_number?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          cost_processed?: boolean | null
          cost_usd?: number | null
          created_at?: string
          custom_analysis_data?: Json | null
          dialog_json?: string | null
          duration_seconds?: number | null
          elevenlabs_history_id?: string | null
          id?: string
          language?: string | null
          last_status_check?: string | null
          phone_number: string
          processing_started_at?: string | null
          summary?: string | null
          timestamps?: string | null
          trigger_processed?: boolean | null
          trigger_processed_at?: string | null
          updated_at?: string
          user_id: string
          zoho_activity_id?: string | null
        }
        Update: {
          agent_id?: string | null
          ai_chat_cost_usd?: number | null
          analysis_agent_evaluation?: string | null
          analysis_client_status?: string | null
          analysis_conclusion?: string | null
          analysis_processed_at?: string | null
          analysis_status?: string | null
          auto_analysis_enabled?: boolean | null
          call_date?: string
          call_direction?: string | null
          call_status?: string
          callback_analyzed?: boolean | null
          caller_number?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          cost_processed?: boolean | null
          cost_usd?: number | null
          created_at?: string
          custom_analysis_data?: Json | null
          dialog_json?: string | null
          duration_seconds?: number | null
          elevenlabs_history_id?: string | null
          id?: string
          language?: string | null
          last_status_check?: string | null
          phone_number?: string
          processing_started_at?: string | null
          summary?: string | null
          timestamps?: string | null
          trigger_processed?: boolean | null
          trigger_processed_at?: string | null
          updated_at?: string
          user_id?: string
          zoho_activity_id?: string | null
        }
        Relationships: []
      }
      call_history_columns: {
        Row: {
          column_key: string
          column_name: string
          column_order: number
          created_at: string | null
          id: string
          is_visible: boolean | null
          prompt_template: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          column_key: string
          column_name: string
          column_order: number
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          prompt_template?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          column_key?: string
          column_name?: string
          column_order?: number
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          prompt_template?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      call_history_triggers: {
        Row: {
          created_at: string | null
          filter_config: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string | null
          output_config: Json | null
          total_triggers: number | null
          updated_at: string | null
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          filter_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string | null
          output_config?: Json | null
          total_triggers?: number | null
          updated_at?: string | null
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          filter_config?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string | null
          output_config?: Json | null
          total_triggers?: number | null
          updated_at?: string | null
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_history_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          agent_id: string
          agent_owner_user_id: string
          contact_name: string | null
          created_at: string
          id: string
          phone_number: string | null
          session_id: string
          session_type: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          agent_owner_user_id: string
          contact_name?: string | null
          created_at?: string
          id?: string
          phone_number?: string | null
          session_id: string
          session_type?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          agent_owner_user_id?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          phone_number?: string | null
          session_id?: string
          session_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      callback_requests: {
        Row: {
          agent_id: string | null
          client_name: string
          created_at: string
          description: string | null
          id: string
          notes: string | null
          phone_number: string
          priority: string
          reason: string | null
          scheduled_time: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          client_name: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          phone_number: string
          priority?: string
          reason?: string | null
          scheduled_time: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          client_name?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          phone_number?: string
          priority?: string
          reason?: string | null
          scheduled_time?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_contacts: {
        Row: {
          call_attempts: number | null
          call_status: string | null
          campaign_id: string
          contact_name: string | null
          conversation_id: string | null
          created_at: string
          id: string
          last_call_attempt: string | null
          notes: string | null
          phone_number: string
          updated_at: string
        }
        Insert: {
          call_attempts?: number | null
          call_status?: string | null
          campaign_id: string
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          last_call_attempt?: string | null
          notes?: string | null
          phone_number: string
          updated_at?: string
        }
        Update: {
          call_attempts?: number | null
          call_status?: string | null
          campaign_id?: string
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          last_call_attempt?: string | null
          notes?: string | null
          phone_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_active_campaign_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "active_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sessions: {
        Row: {
          agent_id: string
          call_statuses: Json
          completed_at: string | null
          current_contact_name: string | null
          current_progress: number
          id: string
          phone_id: string | null
          session_id: string
          started_at: string
          status: string
          total_contacts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          call_statuses?: Json
          completed_at?: string | null
          current_contact_name?: string | null
          current_progress?: number
          id?: string
          phone_id?: string | null
          session_id: string
          started_at?: string
          status?: string
          total_contacts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          call_statuses?: Json
          completed_at?: string | null
          current_contact_name?: string | null
          current_progress?: number
          id?: string
          phone_id?: string | null
          session_id?: string
          started_at?: string
          status?: string
          total_contacts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          agent_id: string | null
          called_contacts: number | null
          created_at: string
          description: string | null
          failed_calls: number | null
          id: string
          name: string
          sms_enabled: boolean | null
          sms_message: string | null
          status: string | null
          successful_calls: number | null
          total_contacts: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          called_contacts?: number | null
          created_at?: string
          description?: string | null
          failed_calls?: number | null
          id?: string
          name: string
          sms_enabled?: boolean | null
          sms_message?: string | null
          status?: string | null
          successful_calls?: number | null
          total_contacts?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          called_contacts?: number | null
          created_at?: string
          description?: string | null
          failed_calls?: number | null
          id?: string
          name?: string
          sms_enabled?: boolean | null
          sms_message?: string | null
          status?: string | null
          successful_calls?: number | null
          total_contacts?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_user: boolean
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_user: boolean
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_user?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_widget_configs: {
        Row: {
          animation_duration: number | null
          animation_type: string | null
          assistant_name: string | null
          border_radius: number | null
          bubble_style: string | null
          button_animation: string | null
          button_size: number | null
          cart_enabled: boolean | null
          chat_bg_color: string | null
          checkout_button_text: string | null
          checkout_fields: Json | null
          checkout_success_message: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          offset_x: number | null
          offset_y: number | null
          placeholder: string | null
          position: string | null
          primary_color: string | null
          scrape_enabled: boolean | null
          scrape_website_url: string | null
          secondary_color: string | null
          show_powered_by: boolean | null
          sound_enabled: boolean | null
          system_prompt: string | null
          text_color: string | null
          updated_at: string
          user_id: string
          voice_agent_id: string | null
          voice_enabled: boolean | null
          voice_first_message: string | null
          voice_id: string | null
          voice_language: string | null
          welcome_message: string | null
          widget_id: string
          window_height: number | null
          window_width: number | null
        }
        Insert: {
          animation_duration?: number | null
          animation_type?: string | null
          assistant_name?: string | null
          border_radius?: number | null
          bubble_style?: string | null
          button_animation?: string | null
          button_size?: number | null
          cart_enabled?: boolean | null
          chat_bg_color?: string | null
          checkout_button_text?: string | null
          checkout_fields?: Json | null
          checkout_success_message?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          offset_x?: number | null
          offset_y?: number | null
          placeholder?: string | null
          position?: string | null
          primary_color?: string | null
          scrape_enabled?: boolean | null
          scrape_website_url?: string | null
          secondary_color?: string | null
          show_powered_by?: boolean | null
          sound_enabled?: boolean | null
          system_prompt?: string | null
          text_color?: string | null
          updated_at?: string
          user_id: string
          voice_agent_id?: string | null
          voice_enabled?: boolean | null
          voice_first_message?: string | null
          voice_id?: string | null
          voice_language?: string | null
          welcome_message?: string | null
          widget_id?: string
          window_height?: number | null
          window_width?: number | null
        }
        Update: {
          animation_duration?: number | null
          animation_type?: string | null
          assistant_name?: string | null
          border_radius?: number | null
          bubble_style?: string | null
          button_animation?: string | null
          button_size?: number | null
          cart_enabled?: boolean | null
          chat_bg_color?: string | null
          checkout_button_text?: string | null
          checkout_fields?: Json | null
          checkout_success_message?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          offset_x?: number | null
          offset_y?: number | null
          placeholder?: string | null
          position?: string | null
          primary_color?: string | null
          scrape_enabled?: boolean | null
          scrape_website_url?: string | null
          secondary_color?: string | null
          show_powered_by?: boolean | null
          sound_enabled?: boolean | null
          system_prompt?: string | null
          text_color?: string | null
          updated_at?: string
          user_id?: string
          voice_agent_id?: string | null
          voice_enabled?: boolean | null
          voice_first_message?: string | null
          voice_id?: string | null
          voice_language?: string | null
          welcome_message?: string | null
          widget_id?: string
          window_height?: number | null
          window_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_widget_configs_voice_agent_id_fkey"
            columns: ["voice_agent_id"]
            isOneToOne: false
            referencedRelation: "kalina_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_widget_conversations: {
        Row: {
          created_at: string | null
          id: string
          messages: Json | null
          metadata: Json | null
          session_id: string
          updated_at: string | null
          widget_config_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          metadata?: Json | null
          session_id: string
          updated_at?: string | null
          widget_config_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          metadata?: Json | null
          session_id?: string
          updated_at?: string | null
          widget_config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_widget_conversations_widget_config_id_fkey"
            columns: ["widget_config_id"]
            isOneToOne: false
            referencedRelation: "chat_widget_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      company_contacts: {
        Row: {
          company_id: string
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          language: string | null
          location: string | null
          metadata: Json | null
          name: string
          notes: string | null
          phone: string
          position: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          language?: string | null
          location?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          phone: string
          position?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          language?: string | null
          location?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string
          position?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_interactions: {
        Row: {
          agent_id: string | null
          call_status: string | null
          contact_id: string
          conversation_id: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          interaction_date: string
          interaction_type: string
          notes: string | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          call_status?: string | null
          contact_id: string
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          notes?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          call_status?: string | null
          contact_id?: string
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          notes?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_database"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts_database: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          info: string | null
          last_contact_date: string | null
          locatie: string | null
          notes: string | null
          nume: string
          status: string | null
          tags: string[] | null
          tara: string | null
          telefon: string
          updated_at: string | null
          user_id: string
          zoho_id: string | null
          zoho_module: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          info?: string | null
          last_contact_date?: string | null
          locatie?: string | null
          notes?: string | null
          nume: string
          status?: string | null
          tags?: string[] | null
          tara?: string | null
          telefon: string
          updated_at?: string | null
          user_id: string
          zoho_id?: string | null
          zoho_module?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          info?: string | null
          last_contact_date?: string | null
          locatie?: string | null
          notes?: string | null
          nume?: string
          status?: string | null
          tags?: string[] | null
          tara?: string | null
          telefon?: string
          updated_at?: string | null
          user_id?: string
          zoho_id?: string | null
          zoho_module?: string | null
        }
        Relationships: []
      }
      conversation_analytics_cache: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          analysis: Json | null
          audio_url: string | null
          call_date: string | null
          call_status: string | null
          contact_name: string | null
          conversation_id: string
          cost_credits: number | null
          created_at: string
          duration_seconds: number | null
          id: string
          metadata: Json | null
          phone_number: string | null
          transcript: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          analysis?: Json | null
          audio_url?: string | null
          call_date?: string | null
          call_status?: string | null
          contact_name?: string | null
          conversation_id: string
          cost_credits?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          phone_number?: string | null
          transcript?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          analysis?: Json | null
          audio_url?: string | null
          call_date?: string | null
          call_status?: string | null
          contact_name?: string | null
          conversation_id?: string
          cost_credits?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          phone_number?: string | null
          transcript?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_logs: {
        Row: {
          agent_transcript: string | null
          conversation_id: string
          created_at: string
          generated_offer: string | null
          id: string
          phone_number: string | null
          sms_response: Json | null
          sms_status: string | null
          updated_at: string
          user_transcript: string | null
          webhook_config_id: string | null
        }
        Insert: {
          agent_transcript?: string | null
          conversation_id: string
          created_at?: string
          generated_offer?: string | null
          id?: string
          phone_number?: string | null
          sms_response?: Json | null
          sms_status?: string | null
          updated_at?: string
          user_transcript?: string | null
          webhook_config_id?: string | null
        }
        Update: {
          agent_transcript?: string | null
          conversation_id?: string
          created_at?: string
          generated_offer?: string | null
          id?: string
          phone_number?: string | null
          sms_response?: Json | null
          sms_status?: string | null
          updated_at?: string
          user_transcript?: string | null
          webhook_config_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_id: string
          agent_name: string
          audio_url: string | null
          cached_at: string | null
          conversation_id: string | null
          cost_usd: number | null
          created_at: string
          credits_used: number
          duration_minutes: number | null
          elevenlabs_data: Json | null
          elevenlabs_id: string | null
          id: string
          ip_address: unknown
          is_cached: boolean | null
          message_count: number
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          agent_name: string
          audio_url?: string | null
          cached_at?: string | null
          conversation_id?: string | null
          cost_usd?: number | null
          created_at?: string
          credits_used?: number
          duration_minutes?: number | null
          elevenlabs_data?: Json | null
          elevenlabs_id?: string | null
          id?: string
          ip_address?: unknown
          is_cached?: boolean | null
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          agent_name?: string
          audio_url?: string | null
          cached_at?: string | null
          conversation_id?: string | null
          cost_usd?: number | null
          created_at?: string
          credits_used?: number
          duration_minutes?: number | null
          elevenlabs_data?: Json | null
          elevenlabs_id?: string | null
          id?: string
          ip_address?: unknown
          is_cached?: boolean | null
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          created_at: string
          credits: number
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price_monthly: number
          price_usd: number
          price_yearly: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price_monthly: number
          price_usd: number
          price_yearly: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price_monthly?: number
          price_usd?: number
          price_yearly?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_analysis_results: {
        Row: {
          analysis_result: Json | null
          call_history_id: string
          column_key: string
          created_at: string | null
          error_message: string | null
          id: string
          processing_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          call_history_id: string
          column_key: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          processing_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          call_history_id?: string
          column_key?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          processing_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_analysis_results_call_history_id_fkey"
            columns: ["call_history_id"]
            isOneToOne: false
            referencedRelation: "call_history"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_voices: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          user_id: string | null
          voice_id: string
          voice_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          user_id?: string | null
          voice_id: string
          voice_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          user_id?: string | null
          voice_id?: string
          voice_name?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          document_id: string
          id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string
          document_id: string
          id?: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_embeddings: {
        Row: {
          agent_id: string | null
          chunk_index: number
          chunk_text: string
          created_at: string
          document_id: string
          document_name: string
          embedding: Json
          id: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          chunk_index: number
          chunk_text: string
          created_at?: string
          document_id: string
          document_name: string
          embedding: Json
          id?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id?: string
          document_name?: string
          embedding?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      google_sheets_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_sheets_connections: {
        Row: {
          access_token: string
          created_at: string
          google_email: string | null
          id: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_sheets_contacts: {
        Row: {
          call_result: Json | null
          call_status: string | null
          conversation_id: string | null
          created_at: string
          email: string | null
          id: string
          integration_id: string
          language: string | null
          last_call_at: string | null
          location: string | null
          metadata: Json | null
          name: string
          phone: string
          row_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          call_result?: Json | null
          call_status?: string | null
          conversation_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          integration_id: string
          language?: string | null
          last_call_at?: string | null
          location?: string | null
          metadata?: Json | null
          name: string
          phone: string
          row_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          call_result?: Json | null
          call_status?: string | null
          conversation_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          integration_id?: string
          language?: string | null
          last_call_at?: string | null
          location?: string | null
          metadata?: Json | null
          name?: string
          phone?: string
          row_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_sheets_contacts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "google_sheets_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_sheets_integrations: {
        Row: {
          auto_export_conversations: boolean | null
          auto_export_leads: boolean | null
          auto_update_on_call: boolean | null
          column_mapping: Json | null
          created_at: string | null
          credentials: Json
          id: string
          is_active: boolean | null
          last_import_at: string | null
          last_sync_at: string | null
          oauth_access_token: string | null
          oauth_refresh_token: string | null
          oauth_token_expiry: string | null
          sheet_name: string | null
          spreadsheet_id: string
          spreadsheet_name: string
          sync_frequency: string | null
          total_contacts: number | null
          update_strategy: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_export_conversations?: boolean | null
          auto_export_leads?: boolean | null
          auto_update_on_call?: boolean | null
          column_mapping?: Json | null
          created_at?: string | null
          credentials: Json
          id?: string
          is_active?: boolean | null
          last_import_at?: string | null
          last_sync_at?: string | null
          oauth_access_token?: string | null
          oauth_refresh_token?: string | null
          oauth_token_expiry?: string | null
          sheet_name?: string | null
          spreadsheet_id: string
          spreadsheet_name: string
          sync_frequency?: string | null
          total_contacts?: number | null
          update_strategy?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_export_conversations?: boolean | null
          auto_export_leads?: boolean | null
          auto_update_on_call?: boolean | null
          column_mapping?: Json | null
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean | null
          last_import_at?: string | null
          last_sync_at?: string | null
          oauth_access_token?: string | null
          oauth_refresh_token?: string | null
          oauth_token_expiry?: string | null
          sheet_name?: string | null
          spreadsheet_id?: string
          spreadsheet_name?: string
          sync_frequency?: string | null
          total_contacts?: number | null
          update_strategy?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_sheets_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      google_sheets_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      google_sheets_templates: {
        Row: {
          column_mapping: Json
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          column_mapping: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          column_mapping?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kalina_agents: {
        Row: {
          agent_id: string
          created_at: string
          description: string | null
          elevenlabs_agent_id: string | null
          id: string
          is_active: boolean
          name: string
          provider: string | null
          system_prompt: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          voice_id: string | null
          voice_name: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          description?: string | null
          elevenlabs_agent_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          provider?: string | null
          system_prompt?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          voice_id?: string | null
          voice_name?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          description?: string | null
          elevenlabs_agent_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          provider?: string | null
          system_prompt?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          voice_id?: string | null
          voice_name?: string | null
        }
        Relationships: []
      }
      knowledge_documents: {
        Row: {
          content: string
          created_at: string
          file_type: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_type?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_type?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loading_videos: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          file_size_mb: number | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
          video_path: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size_mb?: number | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          video_path: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size_mb?: number | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          video_path?: string
          video_url?: string
        }
        Relationships: []
      }
      marketing_announcements: {
        Row: {
          admin_user_id: string
          announcement_type: string
          created_at: string
          email_type: string
          emails_failed: number | null
          emails_sent: number | null
          id: string
          is_active: boolean
          message: string
          send_status: string | null
          sent_at: string | null
          target_users: string
          title: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          announcement_type: string
          created_at?: string
          email_type: string
          emails_failed?: number | null
          emails_sent?: number | null
          id?: string
          is_active?: boolean
          message: string
          send_status?: string | null
          sent_at?: string | null
          target_users?: string
          title: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          announcement_type?: string
          created_at?: string
          email_type?: string
          emails_failed?: number | null
          emails_sent?: number | null
          id?: string
          is_active?: boolean
          message?: string
          send_status?: string | null
          sent_at?: string | null
          target_users?: string
          title?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
          total_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
          total_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          quantity?: number
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_city: string
          delivery_cost: number
          id: string
          notes: string | null
          order_number: string
          order_status: string
          payment_method: string
          payment_status: string
          stripe_session_id: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_city: string
          delivery_cost?: number
          id?: string
          notes?: string | null
          order_number?: string
          order_status?: string
          payment_method: string
          payment_status?: string
          stripe_session_id?: string | null
          subtotal: number
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_address?: string
          delivery_city?: string
          delivery_cost?: number
          id?: string
          notes?: string | null
          order_number?: string
          order_status?: string
          payment_method?: string
          payment_status?: string
          stripe_session_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          asterisk_config_id: string | null
          asterisk_contact_user: string | null
          asterisk_password: string | null
          asterisk_pbx_domain: string | null
          asterisk_status: string | null
          asterisk_trunk_type: string | null
          asterisk_username: string | null
          connected_agent_id: string | null
          country_code: string | null
          created_at: string
          elevenlabs_phone_id: string | null
          id: string
          inbound_allowed_addresses: string[] | null
          inbound_allowed_numbers: string[] | null
          inbound_media_encryption: string | null
          inbound_password: string | null
          inbound_username: string | null
          is_primary: boolean | null
          is_shared: boolean | null
          label: string
          outbound_address: string | null
          outbound_headers: Json | null
          outbound_media_encryption: string | null
          outbound_password: string | null
          outbound_transport: string | null
          outbound_username: string | null
          owner_user_id: string | null
          phone_number: string
          provider_type: string | null
          shared_with_user_id: string | null
          sip_config: Json | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asterisk_config_id?: string | null
          asterisk_contact_user?: string | null
          asterisk_password?: string | null
          asterisk_pbx_domain?: string | null
          asterisk_status?: string | null
          asterisk_trunk_type?: string | null
          asterisk_username?: string | null
          connected_agent_id?: string | null
          country_code?: string | null
          created_at?: string
          elevenlabs_phone_id?: string | null
          id?: string
          inbound_allowed_addresses?: string[] | null
          inbound_allowed_numbers?: string[] | null
          inbound_media_encryption?: string | null
          inbound_password?: string | null
          inbound_username?: string | null
          is_primary?: boolean | null
          is_shared?: boolean | null
          label: string
          outbound_address?: string | null
          outbound_headers?: Json | null
          outbound_media_encryption?: string | null
          outbound_password?: string | null
          outbound_transport?: string | null
          outbound_username?: string | null
          owner_user_id?: string | null
          phone_number: string
          provider_type?: string | null
          shared_with_user_id?: string | null
          sip_config?: Json | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asterisk_config_id?: string | null
          asterisk_contact_user?: string | null
          asterisk_password?: string | null
          asterisk_pbx_domain?: string | null
          asterisk_status?: string | null
          asterisk_trunk_type?: string | null
          asterisk_username?: string | null
          connected_agent_id?: string | null
          country_code?: string | null
          created_at?: string
          elevenlabs_phone_id?: string | null
          id?: string
          inbound_allowed_addresses?: string[] | null
          inbound_allowed_numbers?: string[] | null
          inbound_media_encryption?: string | null
          inbound_password?: string | null
          inbound_username?: string | null
          is_primary?: boolean | null
          is_shared?: boolean | null
          label?: string
          outbound_address?: string | null
          outbound_headers?: Json | null
          outbound_media_encryption?: string | null
          outbound_password?: string | null
          outbound_transport?: string | null
          outbound_username?: string | null
          owner_user_id?: string | null
          phone_number?: string
          provider_type?: string | null
          shared_with_user_id?: string | null
          sip_config?: Json | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          created_at: string | null
          expires_at: string
          id: number
          otp: string
          phone: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: number
          otp: string
          phone: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: number
          otp?: string
          phone?: string
          used?: boolean | null
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          otp_code: string
          phone_number: string
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          otp_code: string
          phone_number: string
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          phone_number?: string
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          image_url: string | null
          is_featured: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          avatar_url: string | null
          can_import_esushi: boolean | null
          created_at: string
          custom_email_verified_at: string | null
          default_language: string | null
          email: string | null
          email_verification_token: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          plan: string | null
          telegram_bot_token: string | null
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          avatar_url?: string | null
          can_import_esushi?: boolean | null
          created_at?: string
          custom_email_verified_at?: string | null
          default_language?: string | null
          email?: string | null
          email_verification_token?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          plan?: string | null
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          avatar_url?: string | null
          can_import_esushi?: boolean | null
          created_at?: string
          custom_email_verified_at?: string | null
          default_language?: string | null
          email?: string | null
          email_verification_token?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          plan?: string | null
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prompt_history: {
        Row: {
          additional_info: string | null
          agent_name: string
          agent_type: string
          company_name: string | null
          contact_number: string | null
          created_at: string
          domain: string | null
          generated_prompt: string
          id: string
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          additional_info?: string | null
          agent_name: string
          agent_type: string
          company_name?: string | null
          contact_number?: string | null
          created_at?: string
          domain?: string | null
          generated_prompt: string
          id?: string
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          additional_info?: string | null
          agent_name?: string
          agent_type?: string
          company_name?: string | null
          contact_number?: string | null
          created_at?: string
          domain?: string | null
          generated_prompt?: string
          id?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      scheduled_calls: {
        Row: {
          agent_id: string | null
          batch_sequence: number | null
          call_duration_minutes: number | null
          caller_number: string | null
          campaign_id: string | null
          client_name: string
          created_at: string
          created_via_webhook: boolean | null
          description: string | null
          id: string
          max_retries: number | null
          notes: string | null
          original_contact_info: Json | null
          original_conversation_id: string | null
          phone_number: string
          priority: string | null
          retry_attempt: number | null
          retry_scheduled_at: string | null
          scheduled_datetime: string
          scheduled_time: string | null
          sms_response: Json | null
          sms_sent: boolean | null
          status: string | null
          task_type: string | null
          updated_at: string
          user_id: string
          webhook_payload: Json | null
        }
        Insert: {
          agent_id?: string | null
          batch_sequence?: number | null
          call_duration_minutes?: number | null
          caller_number?: string | null
          campaign_id?: string | null
          client_name: string
          created_at?: string
          created_via_webhook?: boolean | null
          description?: string | null
          id?: string
          max_retries?: number | null
          notes?: string | null
          original_contact_info?: Json | null
          original_conversation_id?: string | null
          phone_number: string
          priority?: string | null
          retry_attempt?: number | null
          retry_scheduled_at?: string | null
          scheduled_datetime: string
          scheduled_time?: string | null
          sms_response?: Json | null
          sms_sent?: boolean | null
          status?: string | null
          task_type?: string | null
          updated_at?: string
          user_id: string
          webhook_payload?: Json | null
        }
        Update: {
          agent_id?: string | null
          batch_sequence?: number | null
          call_duration_minutes?: number | null
          caller_number?: string | null
          campaign_id?: string | null
          client_name?: string
          created_at?: string
          created_via_webhook?: boolean | null
          description?: string | null
          id?: string
          max_retries?: number | null
          notes?: string | null
          original_contact_info?: Json | null
          original_conversation_id?: string | null
          phone_number?: string
          priority?: string | null
          retry_attempt?: number | null
          retry_scheduled_at?: string | null
          scheduled_datetime?: string
          scheduled_time?: string | null
          sms_response?: Json | null
          sms_sent?: boolean | null
          status?: string | null
          task_type?: string | null
          updated_at?: string
          user_id?: string
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_calls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "active_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      scraping_history: {
        Row: {
          created_at: string | null
          data: Json | null
          error_message: string | null
          id: string
          status: string | null
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          priority: string
          status: string
          title: string
          updated_at: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          priority?: string
          status?: string
          title: string
          updated_at?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      telegram_analyses: {
        Row: {
          analysis_full: string | null
          analysis_summary: string | null
          analyzed_at: string | null
          chat_id: string
          chat_title: string | null
          id: string
          key_topics: string[] | null
          messages_count: number | null
        }
        Insert: {
          analysis_full?: string | null
          analysis_summary?: string | null
          analyzed_at?: string | null
          chat_id: string
          chat_title?: string | null
          id?: string
          key_topics?: string[] | null
          messages_count?: number | null
        }
        Update: {
          analysis_full?: string | null
          analysis_summary?: string | null
          analyzed_at?: string | null
          chat_id?: string
          chat_title?: string | null
          id?: string
          key_topics?: string[] | null
          messages_count?: number | null
        }
        Relationships: []
      }
      telegram_group_messages: {
        Row: {
          chat_id: string
          chat_title: string | null
          created_at: string | null
          from_id: number | null
          from_username: string
          has_photo: boolean | null
          id: string
          message_id: number | null
          message_text: string | null
          photo_file_id: string | null
          timestamp: string | null
        }
        Insert: {
          chat_id: string
          chat_title?: string | null
          created_at?: string | null
          from_id?: number | null
          from_username: string
          has_photo?: boolean | null
          id?: string
          message_id?: number | null
          message_text?: string | null
          photo_file_id?: string | null
          timestamp?: string | null
        }
        Update: {
          chat_id?: string
          chat_title?: string | null
          created_at?: string | null
          from_id?: number | null
          from_username?: string
          has_photo?: boolean | null
          id?: string
          message_id?: number | null
          message_text?: string | null
          photo_file_id?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      user_activity_events: {
        Row: {
          action: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_balance: {
        Row: {
          balance_usd: number
          created_at: string
          id: string
          month_start_date: string
          monthly_credits_used: number
          monthly_free_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          created_at?: string
          id?: string
          month_start_date?: string
          monthly_credits_used?: number
          monthly_free_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          created_at?: string
          id?: string
          month_start_date?: string
          monthly_credits_used?: number
          monthly_free_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_data: {
        Row: {
          created_at: string
          custom_fields: Json | null
          database_id: string | null
          date_user: string
          id: string
          info: string | null
          location: string | null
          name: string
          number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          database_id?: string | null
          date_user?: string
          id?: string
          info?: string | null
          location?: string | null
          name: string
          number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          database_id?: string | null
          date_user?: string
          id?: string
          info?: string | null
          location?: string | null
          name?: string
          number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_monitored_agents: {
        Row: {
          agent_id: string
          agent_name: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          agent_id: string
          agent_name: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          agent_name?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          announcement_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          announcement_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "marketing_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_quiz: {
        Row: {
          company_name: string
          completed_at: string
          contact_phone: string | null
          created_at: string
          employees_count: string
          expected_calls_per_month: string
          how_heard: string | null
          id: string
          industry: string | null
          telephony_budget: string
          user_id: string
        }
        Insert: {
          company_name: string
          completed_at?: string
          contact_phone?: string | null
          created_at?: string
          employees_count: string
          expected_calls_per_month: string
          how_heard?: string | null
          id?: string
          industry?: string | null
          telephony_budget: string
          user_id: string
        }
        Update: {
          company_name?: string
          completed_at?: string
          contact_phone?: string | null
          created_at?: string
          employees_count?: string
          expected_calls_per_month?: string
          how_heard?: string | null
          id?: string
          industry?: string | null
          telephony_budget?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_statistics: {
        Row: {
          agents_used: number
          created_at: string
          current_spent_usd: number | null
          id: string
          max_spending_reached_at: string | null
          total_conversations: number
          total_messages: number
          total_minutes_talked: number
          total_spent_usd: number | null
          total_voice_calls: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agents_used?: number
          created_at?: string
          current_spent_usd?: number | null
          id?: string
          max_spending_reached_at?: string | null
          total_conversations?: number
          total_messages?: number
          total_minutes_talked?: number
          total_spent_usd?: number | null
          total_voice_calls?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agents_used?: number
          created_at?: string
          current_spent_usd?: number | null
          id?: string
          max_spending_reached_at?: string | null
          total_conversations?: number
          total_messages?: number
          total_minutes_talked?: number
          total_spent_usd?: number | null
          total_voice_calls?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_transcripts: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_size_mb: number | null
          id: string
          original_filename: string | null
          raw_text: string | null
          title: string
          transcript_entries: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_size_mb?: number | null
          id?: string
          original_filename?: string | null
          raw_text?: string | null
          title: string
          transcript_entries: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_size_mb?: number | null
          id?: string
          original_filename?: string | null
          raw_text?: string | null
          title?: string
          transcript_entries?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_voices: {
        Row: {
          accent: string | null
          age: string | null
          category: string | null
          created_at: string
          description: string | null
          gender: string | null
          id: string
          labels: Json | null
          language: string | null
          preview_url: string | null
          updated_at: string
          user_id: string
          voice_id: string
          voice_name: string
        }
        Insert: {
          accent?: string | null
          age?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: string
          labels?: Json | null
          language?: string | null
          preview_url?: string | null
          updated_at?: string
          user_id: string
          voice_id: string
          voice_name: string
        }
        Update: {
          accent?: string | null
          age?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: string
          labels?: Json | null
          language?: string | null
          preview_url?: string | null
          updated_at?: string
          user_id?: string
          voice_id?: string
          voice_name?: string
        }
        Relationships: []
      }
      user_webhook_urls: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_received_at: string | null
          total_requests: number | null
          updated_at: string | null
          user_id: string
          webhook_name: string
          webhook_token: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_received_at?: string | null
          total_requests?: number | null
          updated_at?: string | null
          user_id: string
          webhook_name: string
          webhook_token: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_received_at?: string | null
          total_requests?: number | null
          updated_at?: string | null
          user_id?: string
          webhook_name?: string
          webhook_token?: string
        }
        Relationships: []
      }
      video_generations: {
        Row: {
          created_at: string
          duration: number | null
          error_message: string | null
          estimated_completion: string | null
          id: string
          progress: number
          prompt: string
          resolution: string | null
          status: string
          style: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string | null
          video_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          error_message?: string | null
          estimated_completion?: string | null
          id?: string
          progress?: number
          prompt: string
          resolution?: string | null
          status?: string
          style: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
          video_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          error_message?: string | null
          estimated_completion?: string | null
          id?: string
          progress?: number
          prompt?: string
          resolution?: string | null
          status?: string
          style?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
          video_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      webhook_received_data: {
        Row: {
          id: string
          received_at: string | null
          received_data: Json
          source_ip: unknown
          user_id: string
          webhook_url_id: string
        }
        Insert: {
          id?: string
          received_at?: string | null
          received_data: Json
          source_ip?: unknown
          user_id: string
          webhook_url_id: string
        }
        Update: {
          id?: string
          received_at?: string | null
          received_data?: Json
          source_ip?: unknown
          user_id?: string
          webhook_url_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_received_data_webhook_url_id_fkey"
            columns: ["webhook_url_id"]
            isOneToOne: false
            referencedRelation: "user_webhook_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_leads: {
        Row: {
          cart_items: Json | null
          created_at: string | null
          customer_address: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          id: string
          session_id: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
          widget_config_id: string
        }
        Insert: {
          cart_items?: Json | null
          created_at?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          id?: string
          session_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          widget_config_id: string
        }
        Update: {
          cart_items?: Json | null
          created_at?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          id?: string
          session_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          widget_config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_leads_widget_config_id_fkey"
            columns: ["widget_config_id"]
            isOneToOne: false
            referencedRelation: "chat_widget_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_products: {
        Row: {
          attributes: Json | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          name: string
          price: number | null
          sort_order: number | null
          updated_at: string | null
          user_id: string
          widget_config_id: string
        }
        Insert: {
          attributes?: Json | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          name: string
          price?: number | null
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
          widget_config_id: string
        }
        Update: {
          attributes?: Json | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
          widget_config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_products_widget_config_id_fkey"
            columns: ["widget_config_id"]
            isOneToOne: false
            referencedRelation: "chat_widget_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_agents: {
        Row: {
          agent_phone_number_id: string
          created_at: string
          eleven_agent_id: string
          id: string
          name: string
          outbound_caller_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_phone_number_id: string
          created_at?: string
          eleven_agent_id: string
          id?: string
          name: string
          outbound_caller_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_phone_number_id?: string
          created_at?: string
          eleven_agent_id?: string
          id?: string
          name?: string
          outbound_caller_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_campaigns: {
        Row: {
          agent_id: string
          completed_at: string | null
          contacts_calling: number | null
          contacts_done: number | null
          contacts_failed: number | null
          contacts_pending: number | null
          contacts_total: number | null
          created_at: string
          description: string | null
          id: string
          list_id: string
          max_attempts: number
          name: string
          retry_delay_minutes: number
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          contacts_calling?: number | null
          contacts_done?: number | null
          contacts_failed?: number | null
          contacts_pending?: number | null
          contacts_total?: number | null
          created_at?: string
          description?: string | null
          id?: string
          list_id: string
          max_attempts?: number
          name: string
          retry_delay_minutes?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          contacts_calling?: number | null
          contacts_done?: number | null
          contacts_failed?: number | null
          contacts_pending?: number | null
          contacts_total?: number | null
          created_at?: string
          description?: string | null
          id?: string
          list_id?: string
          max_attempts?: number
          name?: string
          retry_delay_minutes?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "workflow_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_columns: {
        Row: {
          created_at: string
          id: string
          prompt: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_contacts: {
        Row: {
          attempts_count: number
          conversation_id: string | null
          cost_total: number | null
          created_at: string
          external_id: string | null
          full_name: string
          id: string
          info_json: Json | null
          last_attempt_at: string | null
          last_status: string | null
          list_id: string
          next_attempt_at: string | null
          phone_e164: string
          status: string
          summary_text: string | null
          transcript_json: Json | null
          updated_at: string
        }
        Insert: {
          attempts_count?: number
          conversation_id?: string | null
          cost_total?: number | null
          created_at?: string
          external_id?: string | null
          full_name: string
          id?: string
          info_json?: Json | null
          last_attempt_at?: string | null
          last_status?: string | null
          list_id: string
          next_attempt_at?: string | null
          phone_e164: string
          status?: string
          summary_text?: string | null
          transcript_json?: Json | null
          updated_at?: string
        }
        Update: {
          attempts_count?: number
          conversation_id?: string | null
          cost_total?: number | null
          created_at?: string
          external_id?: string | null
          full_name?: string
          id?: string
          info_json?: Json | null
          last_attempt_at?: string | null
          last_status?: string | null
          list_id?: string
          next_attempt_at?: string | null
          phone_e164?: string
          status?: string
          summary_text?: string | null
          transcript_json?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          nodes_executed: Json | null
          source: string
          started_at: string
          status: string
          trigger_data: Json | null
          user_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          nodes_executed?: Json | null
          source?: string
          started_at?: string
          status?: string
          trigger_data?: Json | null
          user_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          nodes_executed?: Json | null
          source?: string
          started_at?: string
          status?: string
          trigger_data?: Json | null
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          nodes_executed: Json | null
          results: Json | null
          started_at: string
          status: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          nodes_executed?: Json | null
          results?: Json | null
          started_at?: string
          status?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          nodes_executed?: Json | null
          results?: Json | null
          started_at?: string
          status?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_trigger_logs: {
        Row: {
          execution_time_ms: number | null
          id: string
          is_test: boolean | null
          request_body: Json | null
          request_headers: Json | null
          request_method: string | null
          request_query: Json | null
          response_body: Json | null
          response_status: number | null
          source_ip: unknown
          triggered_at: string | null
          user_id: string | null
          webhook_trigger_id: string | null
          workflow_id: string | null
        }
        Insert: {
          execution_time_ms?: number | null
          id?: string
          is_test?: boolean | null
          request_body?: Json | null
          request_headers?: Json | null
          request_method?: string | null
          request_query?: Json | null
          response_body?: Json | null
          response_status?: number | null
          source_ip?: unknown
          triggered_at?: string | null
          user_id?: string | null
          webhook_trigger_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          execution_time_ms?: number | null
          id?: string
          is_test?: boolean | null
          request_body?: Json | null
          request_headers?: Json | null
          request_method?: string | null
          request_query?: Json | null
          response_body?: Json | null
          response_status?: number | null
          source_ip?: unknown
          triggered_at?: string | null
          user_id?: string | null
          webhook_trigger_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_trigger_logs_webhook_trigger_id_fkey"
            columns: ["webhook_trigger_id"]
            isOneToOne: false
            referencedRelation: "workflow_webhook_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_webhook_triggers: {
        Row: {
          allowed_origins: string[] | null
          auth_config: Json | null
          auth_type: string | null
          callback_url: string | null
          created_at: string | null
          custom_headers: Json | null
          http_method: string | null
          id: string
          is_active: boolean | null
          is_listening: boolean | null
          last_triggered_at: string | null
          minute_window_start: string | null
          rate_limit_per_minute: number | null
          requests_this_minute: number | null
          respond_mode: string | null
          response_mode: string | null
          signature_secret: string | null
          sync_timeout_seconds: number | null
          timeout_seconds: number | null
          total_triggers: number | null
          updated_at: string | null
          user_id: string
          webhook_path: string
          workflow_id: string | null
        }
        Insert: {
          allowed_origins?: string[] | null
          auth_config?: Json | null
          auth_type?: string | null
          callback_url?: string | null
          created_at?: string | null
          custom_headers?: Json | null
          http_method?: string | null
          id?: string
          is_active?: boolean | null
          is_listening?: boolean | null
          last_triggered_at?: string | null
          minute_window_start?: string | null
          rate_limit_per_minute?: number | null
          requests_this_minute?: number | null
          respond_mode?: string | null
          response_mode?: string | null
          signature_secret?: string | null
          sync_timeout_seconds?: number | null
          timeout_seconds?: number | null
          total_triggers?: number | null
          updated_at?: string | null
          user_id: string
          webhook_path: string
          workflow_id?: string | null
        }
        Update: {
          allowed_origins?: string[] | null
          auth_config?: Json | null
          auth_type?: string | null
          callback_url?: string | null
          created_at?: string | null
          custom_headers?: Json | null
          http_method?: string | null
          id?: string
          is_active?: boolean | null
          is_listening?: boolean | null
          last_triggered_at?: string | null
          minute_window_start?: string | null
          rate_limit_per_minute?: number | null
          requests_this_minute?: number | null
          respond_mode?: string | null
          response_mode?: string | null
          signature_secret?: string | null
          sync_timeout_seconds?: number | null
          timeout_seconds?: number | null
          total_triggers?: number | null
          updated_at?: string | null
          user_id?: string
          webhook_path?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_webhook_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          connections: Json
          created_at: string
          description: string | null
          id: string
          last_run_at: string | null
          name: string
          nodes: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connections?: Json
          created_at?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          nodes?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connections?: Json
          created_at?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          nodes?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zoho_contacts: {
        Row: {
          account_name: string | null
          account_type: string | null
          annual_revenue: number | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          deal_amount: number | null
          deal_probability: number | null
          deal_stage: string | null
          description: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          industry: string | null
          last_name: string | null
          last_synced_at: string | null
          lead_source: string | null
          lead_status: string | null
          mobile: string | null
          number_of_employees: number | null
          owner_email: string | null
          owner_name: string | null
          phone: string | null
          rating: string | null
          raw_data: Json | null
          state: string | null
          street: string | null
          task_due_date: string | null
          task_priority: string | null
          task_status: string | null
          task_subject: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          zip_code: string | null
          zoho_id: string
          zoho_module: string
        }
        Insert: {
          account_name?: string | null
          account_type?: string | null
          annual_revenue?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          deal_amount?: number | null
          deal_probability?: number | null
          deal_stage?: string | null
          description?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          last_synced_at?: string | null
          lead_source?: string | null
          lead_status?: string | null
          mobile?: string | null
          number_of_employees?: number | null
          owner_email?: string | null
          owner_name?: string | null
          phone?: string | null
          rating?: string | null
          raw_data?: Json | null
          state?: string | null
          street?: string | null
          task_due_date?: string | null
          task_priority?: string | null
          task_status?: string | null
          task_subject?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          zip_code?: string | null
          zoho_id: string
          zoho_module?: string
        }
        Update: {
          account_name?: string | null
          account_type?: string | null
          annual_revenue?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          deal_amount?: number | null
          deal_probability?: number | null
          deal_stage?: string | null
          description?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          last_synced_at?: string | null
          lead_source?: string | null
          lead_status?: string | null
          mobile?: string | null
          number_of_employees?: number | null
          owner_email?: string | null
          owner_name?: string | null
          phone?: string | null
          rating?: string | null
          raw_data?: Json | null
          state?: string | null
          street?: string | null
          task_due_date?: string | null
          task_priority?: string | null
          task_status?: string | null
          task_subject?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          zip_code?: string | null
          zoho_id?: string
          zoho_module?: string
        }
        Relationships: []
      }
      zoho_crm_connections: {
        Row: {
          access_token: string | null
          client_id: string | null
          client_secret: string | null
          created_at: string
          field_mappings: Json | null
          id: string
          oauth_state: string | null
          refresh_token: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          zoho_email: string | null
          zoho_org_id: string | null
          zoho_org_name: string | null
          zoho_region: string | null
        }
        Insert: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          field_mappings?: Json | null
          id?: string
          oauth_state?: string | null
          refresh_token?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          zoho_email?: string | null
          zoho_org_id?: string | null
          zoho_org_name?: string | null
          zoho_region?: string | null
        }
        Update: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          field_mappings?: Json | null
          id?: string
          oauth_state?: string | null
          refresh_token?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          zoho_email?: string | null
          zoho_org_id?: string | null
          zoho_org_name?: string | null
          zoho_region?: string | null
        }
        Relationships: []
      }
      zoho_sync_history: {
        Row: {
          accounts_synced: number | null
          contacts_synced: number | null
          created_at: string | null
          deals_synced: number | null
          error_details: Json | null
          errors_count: number | null
          id: string
          leads_synced: number | null
          modules_synced: string[]
          sync_completed_at: string | null
          sync_started_at: string
          sync_status: string
          tasks_synced: number | null
          total_records_synced: number | null
          user_id: string
        }
        Insert: {
          accounts_synced?: number | null
          contacts_synced?: number | null
          created_at?: string | null
          deals_synced?: number | null
          error_details?: Json | null
          errors_count?: number | null
          id?: string
          leads_synced?: number | null
          modules_synced?: string[]
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_status?: string
          tasks_synced?: number | null
          total_records_synced?: number | null
          user_id: string
        }
        Update: {
          accounts_synced?: number | null
          contacts_synced?: number | null
          created_at?: string | null
          deals_synced?: number | null
          error_details?: Json | null
          errors_count?: number | null
          id?: string
          leads_synced?: number | null
          modules_synced?: string[]
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_status?: string
          tasks_synced?: number | null
          total_records_synced?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: {
          p_amount: number
          p_stripe_session_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      admin_ban_user: {
        Args: {
          p_admin_user_id: string
          p_ban_status: boolean
          p_target_user_id: string
        }
        Returns: boolean
      }
      admin_change_role: {
        Args: {
          p_admin_user_id: string
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: boolean
      }
      admin_change_user_plan: {
        Args: {
          p_admin_user_id: string
          p_new_plan: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_create_agent: {
        Args: {
          p_admin_user_id: string
          p_agent_id?: string
          p_description?: string
          p_elevenlabs_agent_id?: string
          p_is_active?: boolean
          p_name: string
          p_provider?: string
          p_system_prompt?: string
          p_target_user_id: string
          p_voice_id: string
        }
        Returns: {
          agent_id: string
          created_at: string
          description: string | null
          elevenlabs_agent_id: string | null
          id: string
          is_active: boolean
          name: string
          provider: string | null
          system_prompt: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          voice_id: string | null
          voice_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "kalina_agents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_delete_agent: {
        Args: { p_admin_user_id: string; p_agent_row_id: string }
        Returns: boolean
      }
      admin_get_all_users: {
        Args: { p_admin_user_id: string }
        Returns: {
          account_type: string
          balance_usd: number
          can_import_esushi: boolean
          created_at: string
          email: string
          first_name: string
          last_name: string
          last_sign_in: string
          plan: string
          total_calls: number
          total_minutes: number
          total_spent_usd: number
          user_id: string
          user_role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      admin_get_top_active_users: {
        Args: { limit_count?: number; period_hours?: number }
        Returns: {
          event_count: number
          last_event_at: string
          user_id: string
        }[]
      }
      admin_get_user_activity: {
        Args: { _user_id: string; limit_count?: number; since_hours?: number }
        Returns: {
          action: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_activity_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_user_agents: {
        Args: { p_admin_user_id: string; p_target_user_id: string }
        Returns: {
          agent_id: string
          created_at: string
          description: string
          elevenlabs_agent_id: string
          id: string
          is_active: boolean
          name: string
          provider: string
          system_prompt: string
          updated_at: string
          user_id: string
          voice_id: string
        }[]
      }
      admin_get_user_by_id: {
        Args: { p_admin_user_id: string; p_target_user_id: string }
        Returns: {
          account_type: string
          balance_usd: number
          created_at: string
          email: string
          first_name: string
          last_name: string
          last_sign_in: string
          plan: string
          total_calls: number
          total_minutes: number
          total_spent_usd: number
          user_id: string
          user_role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      admin_modify_balance: {
        Args: {
          p_admin_user_id: string
          p_balance_amount: number
          p_operation: string
          p_target_user_id: string
        }
        Returns: boolean
      }
      admin_share_phone_number: {
        Args: {
          p_admin_user_id: string
          p_phone_id: string
          p_target_user_id: string
        }
        Returns: string
      }
      admin_unshare_phone_number: {
        Args: { p_admin_user_id: string; p_shared_phone_id: string }
        Returns: boolean
      }
      admin_update_agent: {
        Args: {
          p_admin_user_id: string
          p_agent_id?: string
          p_agent_row_id: string
          p_description?: string
          p_elevenlabs_agent_id?: string
          p_is_active?: boolean
          p_name?: string
          p_provider?: string
          p_system_prompt?: string
          p_voice_id?: string
        }
        Returns: boolean
      }
      check_and_reset_monthly_credits: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests: number
          p_user_id: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      cleanup_expired_oauth_states: { Args: never; Returns: number }
      cleanup_old_auth_logs: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      cleanup_old_trigger_logs: { Args: never; Returns: undefined }
      cosine_similarity: { Args: { vec1: Json; vec2: Json }; Returns: number }
      deduct_balance: {
        Args: {
          p_amount: number
          p_conversation_id?: string
          p_description?: string
          p_user_id: string
        }
        Returns: boolean
      }
      execute_atomic_call_transaction: {
        Args: {
          p_amount: number
          p_conversation_id: string
          p_description: string
          p_duration_seconds: number
          p_user_id: string
        }
        Returns: boolean
      }
      get_call_history_schema: {
        Args: never
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      get_google_sheets_connection_decrypted: {
        Args: { p_encryption_key: string; p_user_id: string }
        Returns: {
          access_token: string
          google_email: string
          refresh_token: string
          status: string
          token_expires_at: string
        }[]
      }
      get_public_widget_config: { Args: { p_widget_id: string }; Returns: Json }
      get_user_call_stats: {
        Args: { p_user_id: string }
        Returns: {
          calls_last_30_days: number
          cost_last_30_days: number
          seconds_last_30_days: number
          total_calls: number
          total_cost: number
          total_seconds: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_top_agents: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          agent_id: string
          agent_name: string
          call_count: number
          total_duration_seconds: number
        }[]
      }
      handle_failed_call_retry: {
        Args: {
          p_agent_id: string
          p_contact_name: string
          p_conversation_id: string
          p_max_retries?: number
          p_phone_number: string
          p_retry_minutes?: number
          p_user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_campaign_counter: {
        Args: { p_campaign_id: string; p_counter: string }
        Returns: undefined
      }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_user_id: string
          p_details?: Json
          p_ip_address?: unknown
          p_target_user_id?: string
        }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_ip_address?: unknown
          p_severity?: string
          p_user_id: string
        }
        Returns: boolean
      }
      log_suspicious_activity: {
        Args: {
          p_activity_type: string
          p_details?: Json
          p_severity?: string
          p_user_id: string
        }
        Returns: boolean
      }
      match_document_embeddings: {
        Args: {
          agent_id_param: string
          match_count?: number
          match_threshold?: number
          query_embedding: Json
        }
        Returns: {
          chunk_text: string
          document_name: string
          similarity: number
        }[]
      }
      search_relevant_chunks: {
        Args: {
          agent_id_param: string
          match_count?: number
          query_text: string
        }
        Returns: {
          chunk_text: string
          document_name: string
          rank: number
        }[]
      }
      table_has_column_user_id: { Args: { p_table: unknown }; Returns: boolean }
      track_user_activity: {
        Args: { p_activity_type: string; p_metadata?: Json; p_user_id: string }
        Returns: boolean
      }
      update_google_sheets_access_token_encrypted: {
        Args: {
          p_access_token: string
          p_encryption_key: string
          p_token_expires_at: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_statistics_with_spending: {
        Args: {
          p_cost_usd: number
          p_duration_seconds: number
          p_user_id: string
        }
        Returns: boolean
      }
      upsert_google_sheets_connection_encrypted: {
        Args: {
          p_access_token: string
          p_encryption_key: string
          p_google_email: string
          p_refresh_token: string
          p_token_expires_at: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
