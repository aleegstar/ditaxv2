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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_deletion_feedback: {
        Row: {
          additional_feedback: string | null
          created_at: string | null
          deleted_user_id: string | null
          id: string
          reason: string
          user_email: string
        }
        Insert: {
          additional_feedback?: string | null
          created_at?: string | null
          deleted_user_id?: string | null
          id?: string
          reason: string
          user_email: string
        }
        Update: {
          additional_feedback?: string | null
          created_at?: string | null
          deleted_user_id?: string | null
          id?: string
          reason?: string
          user_email?: string
        }
        Relationships: []
      }
      admin_access_logs: {
        Row: {
          accessed_user_id: string
          action: string
          admin_user_id: string
          document_id: string | null
          id: string
          timestamp: string
        }
        Insert: {
          accessed_user_id: string
          action: string
          admin_user_id: string
          document_id?: string | null
          id?: string
          timestamp?: string
        }
        Update: {
          accessed_user_id?: string
          action?: string
          admin_user_id?: string
          document_id?: string | null
          id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_action_requests: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          executed_at: string | null
          execution_result: Json | null
          id: string
          justification: string
          metadata: Json | null
          rejection_reason: string | null
          requested_by: string
          status: string
          target_resource: string
          updated_at: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          executed_at?: string | null
          execution_result?: Json | null
          id?: string
          justification: string
          metadata?: Json | null
          rejection_reason?: string | null
          requested_by: string
          status?: string
          target_resource: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          executed_at?: string | null
          execution_result?: Json | null
          id?: string
          justification?: string
          metadata?: Json | null
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          target_resource?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_data: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          year: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          year: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_attachments: {
        Row: {
          encrypted: boolean | null
          encrypted_metadata: string | null
          encryption_version: number | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          integrity_hash: string | null
          iv: string | null
          message_id: string | null
          metadata_iv: string | null
          original_size: number | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          encrypted?: boolean | null
          encrypted_metadata?: string | null
          encryption_version?: number | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          integrity_hash?: string | null
          iv?: string | null
          message_id?: string | null
          metadata_iv?: string | null
          original_size?: number | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          encrypted?: boolean | null
          encrypted_metadata?: string | null
          encryption_version?: number | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          integrity_hash?: string | null
          iv?: string | null
          message_id?: string | null
          metadata_iv?: string | null
          original_size?: number | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_id: string | null
          bot_handover_requested: boolean | null
          bot_session_id: string | null
          chat_type: string | null
          content: string | null
          created_at: string
          escalation_requested: boolean | null
          handled_by_admin: string | null
          id: string
          read: boolean | null
          recipient_id: string | null
          sender_id: string | null
        }
        Insert: {
          attachment_id?: string | null
          bot_handover_requested?: boolean | null
          bot_session_id?: string | null
          chat_type?: string | null
          content?: string | null
          created_at?: string
          escalation_requested?: boolean | null
          handled_by_admin?: string | null
          id?: string
          read?: boolean | null
          recipient_id?: string | null
          sender_id?: string | null
        }
        Update: {
          attachment_id?: string | null
          bot_handover_requested?: boolean | null
          bot_session_id?: string | null
          chat_type?: string | null
          content?: string | null
          created_at?: string
          escalation_requested?: boolean | null
          handled_by_admin?: string | null
          id?: string
          read?: boolean | null
          recipient_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_quick_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          trigger: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          trigger: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_quick_replies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_tax_returns: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          signature_status: string | null
          signed_at: string | null
          signed_pdf_path: string | null
          status: string
          tax_filer_id: string | null
          tax_year: string
          updated_at: string
          upload_date: string
          uploaded_by_admin_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string
          id?: string
          signature_status?: string | null
          signed_at?: string | null
          signed_pdf_path?: string | null
          status?: string
          tax_filer_id?: string | null
          tax_year: string
          updated_at?: string
          upload_date?: string
          uploaded_by_admin_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          signature_status?: string | null
          signed_at?: string | null
          signed_pdf_path?: string | null
          status?: string
          tax_filer_id?: string | null
          tax_year?: string
          updated_at?: string
          upload_date?: string
          uploaded_by_admin_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_tax_returns_tax_filer_id_fkey"
            columns: ["tax_filer_id"]
            isOneToOne: false
            referencedRelation: "tax_filers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_tax_returns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deduction_data: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          year: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          year: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "deduction_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      definitive_tax_bills: {
        Row: {
          admin_notes: string | null
          admin_review_date: string | null
          admin_reviewed_by: string | null
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          status: string
          tax_year: string
          updated_at: string
          upload_date: string
          uploaded_by_admin_id: string | null
          uploaded_by_user_id: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          admin_review_date?: string | null
          admin_reviewed_by?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string
          id?: string
          status?: string
          tax_year: string
          updated_at?: string
          upload_date?: string
          uploaded_by_admin_id?: string | null
          uploaded_by_user_id?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          admin_review_date?: string | null
          admin_reviewed_by?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          status?: string
          tax_year?: string
          updated_at?: string
          upload_date?: string
          uploaded_by_admin_id?: string | null
          uploaded_by_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_processing_status: {
        Row: {
          auto_delete: boolean | null
          created_at: string | null
          document_id: string
          id: string
          processed_at: string | null
          processing_stage: string
          retention_until: string | null
          updated_at: string | null
          user_id: string
          user_opted_out: boolean | null
        }
        Insert: {
          auto_delete?: boolean | null
          created_at?: string | null
          document_id: string
          id?: string
          processed_at?: string | null
          processing_stage: string
          retention_until?: string | null
          updated_at?: string | null
          user_id: string
          user_opted_out?: boolean | null
        }
        Update: {
          auto_delete?: boolean | null
          created_at?: string | null
          document_id?: string
          id?: string
          processed_at?: string | null
          processing_stage?: string
          retention_until?: string | null
          updated_at?: string | null
          user_id?: string
          user_opted_out?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_status_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          created_at: string
          file_path: string
          file_type: string
          id: string
          is_active: boolean
          name: string
          template_type: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_type: string
          id?: string
          is_active?: boolean
          name: string
          template_type?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_type?: string
          id?: string
          is_active?: boolean
          name?: string
          template_type?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          created_at: string
          id: string
          notification_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_type?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      form_chat_history: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_type: string
          step_id: string
          step_index: number
          tax_filer_id: string | null
          tax_year: string
          timestamp: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_type: string
          step_id: string
          step_index: number
          tax_filer_id?: string | null
          tax_year: string
          timestamp: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string
          step_id?: string
          step_index?: number
          tax_filer_id?: string | null
          tax_year?: string
          timestamp?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_chat_history_tax_filer_id_fkey"
            columns: ["tax_filer_id"]
            isOneToOne: false
            referencedRelation: "tax_filers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_chat_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_data: {
        Row: {
          bank_details_encrypted: string | null
          bank_details_iv: string | null
          data: Json
          form_type: string
          id: string
          ssn_encrypted: string | null
          ssn_iv: string | null
          tax_filer_id: string | null
          tax_id_encrypted: string | null
          tax_id_iv: string | null
          tax_year: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_details_encrypted?: string | null
          bank_details_iv?: string | null
          data: Json
          form_type: string
          id?: string
          ssn_encrypted?: string | null
          ssn_iv?: string | null
          tax_filer_id?: string | null
          tax_id_encrypted?: string | null
          tax_id_iv?: string | null
          tax_year: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_details_encrypted?: string | null
          bank_details_iv?: string | null
          data?: Json
          form_type?: string
          id?: string
          ssn_encrypted?: string | null
          ssn_iv?: string | null
          tax_filer_id?: string | null
          tax_id_encrypted?: string | null
          tax_id_iv?: string | null
          tax_year?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_data_tax_filer_id_fkey"
            columns: ["tax_filer_id"]
            isOneToOne: false
            referencedRelation: "tax_filers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_progress: {
        Row: {
          created_at: string | null
          current_step: number | null
          form_sections: Json | null
          id: string
          tax_filer_id: string | null
          tax_year: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_step?: number | null
          form_sections?: Json | null
          id?: string
          tax_filer_id?: string | null
          tax_year: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_step?: number | null
          form_sections?: Json | null
          id?: string
          tax_filer_id?: string | null
          tax_year?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_progress_tax_filer_id_fkey"
            columns: ["tax_filer_id"]
            isOneToOne: false
            referencedRelation: "tax_filers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      income_data: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          year: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          year: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_item_requests: {
        Row: {
          admin_id: string
          created_at: string
          description: string | null
          id: string
          last_reminder_at: string | null
          reminder_count: number
          request_type: string
          status: string
          tax_return_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          description?: string | null
          id?: string
          last_reminder_at?: string | null
          reminder_count?: number
          request_type: string
          status?: string
          tax_return_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          description?: string | null
          id?: string
          last_reminder_at?: string | null
          reminder_count?: number
          request_type?: string
          status?: string
          tax_return_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missing_item_requests_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missing_item_requests_tax_return_id_fkey"
            columns: ["tax_return_id"]
            isOneToOne: false
            referencedRelation: "tax_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missing_item_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_item_responses: {
        Row: {
          created_at: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          request_id: string
          response_type: string
          text_content: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          request_id: string
          response_type: string
          text_content?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          request_id?: string
          response_type?: string
          text_content?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missing_item_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "missing_item_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missing_item_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          customer_id: string | null
          event_id: string
          event_type: string
          failure_code: string | null
          failure_message: string | null
          id: string
          payment_intent_id: string | null
          payment_method: string | null
          payment_method_type: string | null
          processed: boolean | null
          raw_event: Json | null
          session_id: string | null
          status: string | null
          tax_return_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          event_id: string
          event_type: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_method_type?: string | null
          processed?: boolean | null
          raw_event?: Json | null
          session_id?: string | null
          status?: string | null
          tax_return_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          event_id?: string
          event_type?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_method_type?: string | null
          processed?: boolean | null
          raw_event?: Json | null
          session_id?: string | null
          status?: string | null
          tax_return_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_tax_return_id_fkey"
            columns: ["tax_return_id"]
            isOneToOne: false
            referencedRelation: "tax_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_access_logs: {
        Row: {
          access_type: string
          accessed_by_user_id: string
          accessed_fields: string[] | null
          accessed_profile_id: string
          created_at: string
          id: string
          ip_address: unknown
        }
        Insert: {
          access_type: string
          accessed_by_user_id: string
          accessed_fields?: string[] | null
          accessed_profile_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
        }
        Update: {
          access_type?: string
          accessed_by_user_id?: string
          accessed_fields?: string[] | null
          accessed_profile_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          admin_notes: string | null
          avatar_url: string | null
          date_of_birth: string | null
          disable_otp_fallback: boolean | null
          documents_tour_completed: boolean | null
          email: string | null
          feedback_prompt_shown_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          marketing_consent_at: string | null
          mfa_enabled: boolean | null
          mfa_setup_dismissed_at: string | null
          mfa_setup_offered_at: string | null
          mfa_setup_reminder_count: number | null
          onboarding_tour_completed: boolean | null
          onboarding_tour_completed_at: string | null
          phone: string | null
          privacy_preferences: Json | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          disable_otp_fallback?: boolean | null
          documents_tour_completed?: boolean | null
          email?: string | null
          feedback_prompt_shown_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          marketing_consent_at?: string | null
          mfa_enabled?: boolean | null
          mfa_setup_dismissed_at?: string | null
          mfa_setup_offered_at?: string | null
          mfa_setup_reminder_count?: number | null
          onboarding_tour_completed?: boolean | null
          onboarding_tour_completed_at?: string | null
          phone?: string | null
          privacy_preferences?: Json | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          disable_otp_fallback?: boolean | null
          documents_tour_completed?: boolean | null
          email?: string | null
          feedback_prompt_shown_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          marketing_consent_at?: string | null
          mfa_enabled?: boolean | null
          mfa_setup_dismissed_at?: string | null
          mfa_setup_offered_at?: string | null
          mfa_setup_reminder_count?: number | null
          onboarding_tour_completed?: boolean | null
          onboarding_tour_completed_at?: string | null
          phone?: string | null
          privacy_preferences?: Json | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          attempts: number | null
          blocked_until: string | null
          id: string
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          action: string
          attempts?: number | null
          blocked_until?: string | null
          id?: string
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          action?: string
          attempts?: number | null
          blocked_until?: string | null
          id?: string
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          max_referrals: number | null
          successful_referrals: number | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_referrals?: number | null
          successful_referrals?: number | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_referrals?: number | null
          successful_referrals?: number | null
          user_id?: string
        }
        Relationships: []
      }
      referral_redemptions: {
        Row: {
          id: string
          referral_code_id: string
          referred_at: string | null
          referred_promo_used: boolean | null
          referred_stripe_promo_id: string
          referred_user_id: string
          referrer_promo_used: boolean | null
          referrer_stripe_promo_id: string
          referrer_user_id: string
        }
        Insert: {
          id?: string
          referral_code_id: string
          referred_at?: string | null
          referred_promo_used?: boolean | null
          referred_stripe_promo_id: string
          referred_user_id: string
          referrer_promo_used?: boolean | null
          referrer_stripe_promo_id: string
          referrer_user_id: string
        }
        Update: {
          id?: string
          referral_code_id?: string
          referred_at?: string | null
          referred_promo_used?: boolean | null
          referred_stripe_promo_id?: string
          referred_user_id?: string
          referrer_promo_used?: boolean | null
          referrer_stripe_promo_id?: string
          referrer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_redemptions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          resource: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          resource?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          resource?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_audit_logs_immutable: {
        Row: {
          action: string
          created_at: string
          current_hash: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          previous_hash: string | null
          resource: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          current_hash?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          previous_hash?: string | null
          resource?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          current_hash?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          previous_hash?: string | null
          resource?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          completed_tax_return_id: string
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          completed_tax_return_id: string
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          completed_tax_return_id?: string
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_completed_tax_return_id_fkey"
            columns: ["completed_tax_return_id"]
            isOneToOne: false
            referencedRelation: "completed_tax_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_filers: {
        Row: {
          admin_notes: string | null
          ahv_number: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          first_name: string
          id: string
          is_primary: boolean | null
          last_name: string
          relationship: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          ahv_number?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name: string
          id?: string
          is_primary?: boolean | null
          last_name: string
          relationship?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          ahv_number?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string
          relationship?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_filers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_return_signatures: {
        Row: {
          authorization_accepted: boolean
          authorization_text: string
          completed_tax_return_id: string
          created_at: string
          document_hash: string
          id: string
          ip_address: unknown
          signature_hash: string
          signed_at: string
          signer_date_of_birth: string | null
          signer_email: string
          signer_name: string
          status: string
          tax_year: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          authorization_accepted?: boolean
          authorization_text: string
          completed_tax_return_id: string
          created_at?: string
          document_hash: string
          id?: string
          ip_address?: unknown
          signature_hash: string
          signed_at?: string
          signer_date_of_birth?: string | null
          signer_email: string
          signer_name: string
          status?: string
          tax_year: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          authorization_accepted?: boolean
          authorization_text?: string
          completed_tax_return_id?: string
          created_at?: string
          document_hash?: string
          id?: string
          ip_address?: unknown
          signature_hash?: string
          signed_at?: string
          signer_date_of_birth?: string | null
          signer_email?: string
          signer_name?: string
          status?: string
          tax_year?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_return_signatures_completed_tax_return_id_fkey"
            columns: ["completed_tax_return_id"]
            isOneToOne: false
            referencedRelation: "completed_tax_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_return_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_returns: {
        Row: {
          checkout_session_id: string | null
          created_at: string
          express_service: boolean
          id: string
          last_payment_event_at: string | null
          payment_date: string | null
          payment_failure_code: string | null
          payment_failure_message: string | null
          payment_intent_id: string | null
          payment_status: string | null
          status: string | null
          tax_filer_id: string | null
          tax_year: string
          updated_at: string
          user_id: string
          workflow_step: string | null
        }
        Insert: {
          checkout_session_id?: string | null
          created_at?: string
          express_service?: boolean
          id?: string
          last_payment_event_at?: string | null
          payment_date?: string | null
          payment_failure_code?: string | null
          payment_failure_message?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          status?: string | null
          tax_filer_id?: string | null
          tax_year: string
          updated_at?: string
          user_id: string
          workflow_step?: string | null
        }
        Update: {
          checkout_session_id?: string | null
          created_at?: string
          express_service?: boolean
          id?: string
          last_payment_event_at?: string | null
          payment_date?: string | null
          payment_failure_code?: string | null
          payment_failure_message?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          status?: string | null
          tax_filer_id?: string | null
          tax_year?: string
          updated_at?: string
          user_id?: string
          workflow_step?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_returns_tax_filer_id_fkey"
            columns: ["tax_filer_id"]
            isOneToOne: false
            referencedRelation: "tax_filers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_returns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          message_id: string | null
          ticket_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          message_id?: string | null
          ticket_id?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          message_id?: string | null
          ticket_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin_message: boolean
          message: string
          sender_id: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_message?: boolean
          message: string
          sender_id: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_message?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_documents: {
        Row: {
          assigned_date: string | null
          checklist_item_id: string | null
          document_category: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          is_assigned_to_checklist: boolean | null
          metadata: Json | null
          status: string
          tax_filer_id: string | null
          tax_year: string | null
          upload_date: string
          user_id: string
        }
        Insert: {
          assigned_date?: string | null
          checklist_item_id?: string | null
          document_category?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          is_assigned_to_checklist?: boolean | null
          metadata?: Json | null
          status?: string
          tax_filer_id?: string | null
          tax_year?: string | null
          upload_date?: string
          user_id: string
        }
        Update: {
          assigned_date?: string | null
          checklist_item_id?: string | null
          document_category?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          is_assigned_to_checklist?: boolean | null
          metadata?: Json | null
          status?: string
          tax_filer_id?: string | null
          tax_year?: string | null
          upload_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_documents_tax_filer_id_fkey"
            columns: ["tax_filer_id"]
            isOneToOne: false
            referencedRelation: "tax_filers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_type: string
          consent_version: string
          consented: boolean
          created_at: string
          id: string
          ip_address: unknown
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          consent_version?: string
          consented?: boolean
          created_at?: string
          id?: string
          ip_address?: unknown
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          consent_version?: string
          consented?: boolean
          created_at?: string
          id?: string
          ip_address?: unknown
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_encryption_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          key_salt: string
          key_source: Database["public"]["Enums"]["key_source_type"]
          key_version: number
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key?: string
          id?: string
          key_salt: string
          key_source?: Database["public"]["Enums"]["key_source_type"]
          key_version?: number
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          key_salt?: string
          key_source?: Database["public"]["Enums"]["key_source_type"]
          key_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_encryption_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          created_at: string | null
          feature_request: string | null
          id: string
          rating: number
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          feature_request?: string | null
          id?: string
          rating: number
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          feature_request?: string | null
          id?: string
          rating?: number
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_field_encryption_keys: {
        Row: {
          created_at: string
          encrypted_dek: string
          encryption_algorithm: string
          field_name: string
          id: string
          key_version: number
          rotated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_dek: string
          encryption_algorithm?: string
          field_name: string
          id?: string
          key_version?: number
          rotated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_dek?: string
          encryption_algorithm?: string
          field_name?: string
          id?: string
          key_version?: number
          rotated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          public_key: string
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          public_key: string
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          public_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_passkeys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          login_count: number | null
          login_time: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          login_count?: number | null
          login_time?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          login_count?: number | null
          login_time?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_data_retention_policies: { Args: never; Returns: string }
      apply_security_hardening: { Args: never; Returns: string }
      approve_admin_action: { Args: { p_request_id: string }; Returns: Json }
      assign_admin_role_by_email: {
        Args: { user_email: string }
        Returns: Json
      }
      bootstrap_first_admin: { Args: never; Returns: Json }
      calculate_audit_log_hash: {
        Args: {
          p_action: string
          p_created_at: string
          p_id: string
          p_previous_hash: string
          p_resource: string
        }
        Returns: string
      }
      check_passkeys_for_email: {
        Args: { p_email: string }
        Returns: {
          email: string
          has_passkeys: boolean
          passkey_count: number
          user_id: string
        }[]
      }
      check_progressive_rate_limit: {
        Args: {
          p_action: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      check_rate_limit_secure: {
        Args: {
          p_action: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_data: { Args: never; Returns: Json }
      cleanup_security_logs: { Args: never; Returns: number }
      delete_auth_user_admin: {
        Args: { target_user_id: string }
        Returns: Json
      }
      delete_tax_year_cascade: {
        Args: { p_tax_year: string; p_user_id: string }
        Returns: undefined
      }
      delete_tax_year_data: {
        Args: { p_tax_year: string; p_user_id: string }
        Returns: undefined
      }
      delete_user_completely: {
        Args: { target_user_id: string }
        Returns: Json
      }
      detect_security_anomalies: { Args: never; Returns: undefined }
      detect_suspicious_profile_access: { Args: never; Returns: undefined }
      enhanced_rate_limit_check: {
        Args: {
          p_action: string
          p_ip_address?: unknown
          p_max_attempts?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: Json
      }
      expire_old_admin_requests: { Args: never; Returns: number }
      get_all_profiles_for_admin: {
        Args: never
        Returns: {
          address: string
          admin_notes: string
          avatar_url: string
          date_of_birth: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          privacy_preferences: Json
          updated_at: string
        }[]
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_onboarding_tour_stats: { Args: never; Returns: Json }
      get_profile_with_access_log: {
        Args: { p_include_sensitive_fields?: boolean; p_profile_id: string }
        Returns: {
          address: string
          admin_notes: string
          avatar_url: string
          date_of_birth: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          updated_at: string
        }[]
      }
      get_single_profile_for_admin: {
        Args: { target_user_id: string }
        Returns: {
          address: string
          admin_notes: string
          avatar_url: string
          date_of_birth: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          privacy_preferences: Json
          updated_at: string
        }[]
      }
      get_storage_policies: { Args: { p_bucket_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_login_count: { Args: { p_user_id: string }; Returns: number }
      is_authenticated: { Args: never; Returns: boolean }
      log_security_event_enhanced: {
        Args: {
          p_action: string
          p_error_message?: string
          p_ip_address?: unknown
          p_resource?: string
          p_success?: boolean
          p_user_agent?: string
        }
        Returns: string
      }
      monitor_security_patterns: { Args: never; Returns: undefined }
      reject_admin_action: {
        Args: { p_rejection_reason: string; p_request_id: string }
        Returns: Json
      }
      request_admin_action: {
        Args: {
          p_action_type: string
          p_justification: string
          p_metadata?: Json
          p_target_resource: string
        }
        Returns: string
      }
      reset_onboarding_tour: { Args: { user_ids: string[] }; Returns: number }
      should_show_mfa_prompt: { Args: { p_user_id: string }; Returns: boolean }
      strengthen_user_session_security: { Args: never; Returns: undefined }
      validate_admin_operation_secure: {
        Args: { p_operation_type: string; p_target_resource?: string }
        Returns: Json
      }
      validate_file_upload_secure: {
        Args: { p_file_name: string; p_file_size: number; p_file_type: string }
        Returns: Json
      }
      validate_input_secure: {
        Args: {
          p_context_type?: string
          p_input: string
          p_max_length?: number
        }
        Returns: Json
      }
      validate_user_session: { Args: never; Returns: boolean }
      verify_admin_access: {
        Args: { operation_type?: string }
        Returns: boolean
      }
      verify_admin_role: { Args: never; Returns: boolean }
      verify_admin_role_simple: { Args: never; Returns: boolean }
      verify_audit_log_integrity: { Args: never; Returns: Json }
      verify_passkey_authentication: {
        Args: {
          p_challenge: string
          p_credential_id: string
          p_signature: string
        }
        Returns: {
          email: string
          error_message: string
          success: boolean
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      key_source_type: "local" | "master"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
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
      app_role: ["admin", "user"],
      key_source_type: ["local", "master"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
