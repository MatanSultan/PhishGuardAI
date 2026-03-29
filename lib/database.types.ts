import type {
  Channel,
  Difficulty,
  MemoryType,
  OrganizationMemberStatus,
  OrganizationType,
  SimulationCategory,
  SupportedLocale,
  TeamInviteStatus,
} from '@/lib/constants'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type NoRelationships = []

export interface Database {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: NoRelationships
      }
      billing_events: {
        Row: {
          actor_user_id: string | null
          billing_order_id: string | null
          created_at: string
          event_type: string
          id: string
          organization_id: string | null
          payload: Json
          provider: 'paypal' | null
          provider_event_id: string | null
          source: 'checkout' | 'capture' | 'webhook' | 'system'
          status: string | null
          summary: string
        }
        Insert: {
          actor_user_id?: string | null
          billing_order_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          organization_id?: string | null
          payload?: Json
          provider?: 'paypal' | null
          provider_event_id?: string | null
          source: 'checkout' | 'capture' | 'webhook' | 'system'
          status?: string | null
          summary: string
        }
        Update: {
          actor_user_id?: string | null
          billing_order_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string | null
          payload?: Json
          provider?: 'paypal' | null
          provider_event_id?: string | null
          source?: 'checkout' | 'capture' | 'webhook' | 'system'
          status?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: 'billing_events_actor_user_id_fkey'
            columns: ['actor_user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'billing_events_billing_order_id_fkey'
            columns: ['billing_order_id']
            referencedRelation: 'billing_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'billing_events_organization_id_fkey'
            columns: ['organization_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      billing_orders: {
        Row: {
          amount: number
          approval_url: string | null
          captured_at: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          initiated_by: string | null
          metadata: Json
          organization_id: string
          payer_email: string | null
          plan_applied_at: string | null
          processed_at: string | null
          provider: 'paypal'
          provider_order_id: string
          provider_payload: Json
          status: 'created' | 'approved' | 'captured' | 'completed' | 'failed' | 'canceled'
          target_max_members: number
          target_plan_status: string
          target_plan_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          approval_url?: string | null
          captured_at?: string | null
          created_at?: string
          currency: string
          id?: string
          idempotency_key: string
          initiated_by?: string | null
          metadata?: Json
          organization_id: string
          payer_email?: string | null
          plan_applied_at?: string | null
          processed_at?: string | null
          provider?: 'paypal'
          provider_order_id: string
          provider_payload?: Json
          status?: 'created' | 'approved' | 'captured' | 'completed' | 'failed' | 'canceled'
          target_max_members: number
          target_plan_status: string
          target_plan_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_url?: string | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          initiated_by?: string | null
          metadata?: Json
          organization_id?: string
          payer_email?: string | null
          plan_applied_at?: string | null
          processed_at?: string | null
          provider?: 'paypal'
          provider_order_id?: string
          provider_payload?: Json
          status?: 'created' | 'approved' | 'captured' | 'completed' | 'failed' | 'canceled'
          target_max_members?: number
          target_plan_status?: string
          target_plan_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'billing_orders_initiated_by_fkey'
            columns: ['initiated_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'billing_orders_organization_id_fkey'
            columns: ['organization_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      billing_payments: {
        Row: {
          amount: number
          billing_order_id: string
          created_at: string
          currency: string
          id: string
          payer_email: string | null
          provider: 'paypal'
          provider_capture_id: string
          provider_payload: Json
          source: 'capture' | 'webhook'
          status: 'completed' | 'pending' | 'failed' | 'refunded' | 'declined'
          updated_at: string
        }
        Insert: {
          amount: number
          billing_order_id: string
          created_at?: string
          currency: string
          id?: string
          payer_email?: string | null
          provider?: 'paypal'
          provider_capture_id: string
          provider_payload?: Json
          source: 'capture' | 'webhook'
          status: 'completed' | 'pending' | 'failed' | 'refunded' | 'declined'
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_order_id?: string
          created_at?: string
          currency?: string
          id?: string
          payer_email?: string | null
          provider?: 'paypal'
          provider_capture_id?: string
          provider_payload?: Json
          source?: 'capture' | 'webhook'
          status?: 'completed' | 'pending' | 'failed' | 'refunded' | 'declined'
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'billing_payments_billing_order_id_fkey'
            columns: ['billing_order_id']
            referencedRelation: 'billing_orders'
            referencedColumns: ['id']
          },
        ]
      }
      memory_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          importance_score: number
          memory_type: MemoryType
          related_category: SimulationCategory | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          importance_score?: number
          memory_type: MemoryType
          related_category?: SimulationCategory | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          importance_score?: number
          memory_type?: MemoryType
          related_category?: SimulationCategory | null
          user_id?: string
        }
        Relationships: NoRelationships
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string
          organization_id: string
          role: 'member' | 'admin'
          status: OrganizationMemberStatus
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          organization_id: string
          role?: 'member' | 'admin'
          status?: OrganizationMemberStatus
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          organization_id?: string
          role?: 'member' | 'admin'
          status?: OrganizationMemberStatus
          user_id?: string
        }
        Relationships: NoRelationships
      }
      organization_settings: {
        Row: {
          allow_leaderboard: boolean
          created_at: string
          default_language: SupportedLocale | null
          id: string
          organization_id: string
        }
        Insert: {
          allow_leaderboard?: boolean
          created_at?: string
          default_language?: SupportedLocale | null
          id?: string
          organization_id: string
        }
        Update: {
          allow_leaderboard?: boolean
          created_at?: string
          default_language?: SupportedLocale | null
          id?: string
          organization_id?: string
        }
        Relationships: NoRelationships
      }
      organization_plan_changes: {
        Row: {
          billing_order_id: string | null
          changed_by: string | null
          created_at: string
          id: string
          next_max_members: number
          next_plan_status: string
          next_plan_type: string
          note: string | null
          organization_id: string
          previous_max_members: number
          previous_plan_status: string
          previous_plan_type: string
          source: 'owner_console' | 'paypal_payment' | 'system'
        }
        Insert: {
          billing_order_id?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          next_max_members: number
          next_plan_status: string
          next_plan_type: string
          note?: string | null
          organization_id: string
          previous_max_members: number
          previous_plan_status: string
          previous_plan_type: string
          source: 'owner_console' | 'paypal_payment' | 'system'
        }
        Update: {
          billing_order_id?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          next_max_members?: number
          next_plan_status?: string
          next_plan_type?: string
          note?: string | null
          organization_id?: string
          previous_max_members?: number
          previous_plan_status?: string
          previous_plan_type?: string
          source?: 'owner_console' | 'paypal_payment' | 'system'
        }
        Relationships: [
          {
            foreignKeyName: 'organization_plan_changes_billing_order_id_fkey'
            columns: ['billing_order_id']
            referencedRelation: 'billing_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_plan_changes_changed_by_fkey'
            columns: ['changed_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_plan_changes_organization_id_fkey'
            columns: ['organization_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          access_blocked: boolean
          billing_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          max_members_allowed: number
          name: string
          organization_type: OrganizationType
          plan_status: string
          plan_type: string
          slug: string
          trial_ends_at: string | null
        }
        Insert: {
          access_blocked?: boolean
          billing_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          max_members_allowed?: number
          name: string
          organization_type?: OrganizationType
          plan_status?: string
          plan_type?: string
          slug: string
          trial_ends_at?: string | null
        }
        Update: {
          access_blocked?: boolean
          billing_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          max_members_allowed?: number
          name?: string
          organization_type?: OrganizationType
          plan_status?: string
          plan_type?: string
          slug?: string
          trial_ends_at?: string | null
        }
        Relationships: NoRelationships
      }
      platform_owners: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: NoRelationships
      }
      owner_org_notes: {
        Row: {
          follow_up_status: 'new' | 'contacted' | 'offered_discount' | 'upgraded'
          note: string | null
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          follow_up_status?: 'new' | 'contacted' | 'offered_discount' | 'upgraded'
          note?: string | null
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          follow_up_status?: 'new' | 'contacted' | 'offered_discount' | 'upgraded'
          note?: string | null
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'owner_org_notes_organization_id_fkey'
            columns: ['organization_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'owner_org_notes_updated_by_fkey'
            columns: ['updated_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          preferred_language: SupportedLocale
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          preferred_language?: SupportedLocale
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          preferred_language?: SupportedLocale
        }
        Relationships: NoRelationships
      }
      simulations: {
        Row: {
          category: SimulationCategory
          channel: Channel
          content: string
          created_at: string
          created_by: string | null
          difficulty: Difficulty
          explanation: string
          id: string
          is_phishing: boolean
          language: SupportedLocale
          red_flags: Json
          sender: string | null
          source_model: string | null
          title: string | null
        }
        Insert: {
          category: SimulationCategory
          channel: Channel
          content: string
          created_at?: string
          created_by?: string | null
          difficulty: Difficulty
          explanation: string
          id?: string
          is_phishing: boolean
          language?: SupportedLocale
          red_flags?: Json
          sender?: string | null
          source_model?: string | null
          title?: string | null
        }
        Update: {
          category?: SimulationCategory
          channel?: Channel
          content?: string
          created_at?: string
          created_by?: string | null
          difficulty?: Difficulty
          explanation?: string
          id?: string
          is_phishing?: boolean
          language?: SupportedLocale
          red_flags?: Json
          sender?: string | null
          source_model?: string | null
          title?: string | null
        }
        Relationships: NoRelationships
      }
      team_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: 'member' | 'admin'
          status: TeamInviteStatus
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: 'member' | 'admin'
          status?: TeamInviteStatus
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: 'member' | 'admin'
          status?: TeamInviteStatus
          token?: string
        }
        Relationships: NoRelationships
      }
      training_recommendations: {
        Row: {
          created_at: string
          id: string
          priority: number
          reason: string | null
          recommendation_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: number
          reason?: string | null
          recommendation_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: number
          reason?: string | null
          recommendation_text?: string
          user_id?: string
        }
        Relationships: NoRelationships
      }
      user_attempts: {
        Row: {
          ai_feedback: string | null
          confidence: number | null
          created_at: string
          id: string
          is_correct: boolean
          response_time_ms: number | null
          simulation_id: string
          user_answer: boolean
          user_id: string
          user_reason: string | null
        }
        Insert: {
          ai_feedback?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          is_correct: boolean
          response_time_ms?: number | null
          simulation_id: string
          user_answer: boolean
          user_id: string
          user_reason?: string | null
        }
        Update: {
          ai_feedback?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          is_correct?: boolean
          response_time_ms?: number | null
          simulation_id?: string
          user_answer?: boolean
          user_id?: string
          user_reason?: string | null
        }
        Relationships: NoRelationships
      }
      user_training_profile: {
        Row: {
          confidence_score: number
          current_level: Difficulty
          last_trained_at: string | null
          legit_detection_rate: number
          phishing_detection_rate: number
          preferred_domains: SimulationCategory[]
          streak_count: number
          strongest_category: SimulationCategory | null
          total_attempts: number
          total_score: number
          user_id: string
          weakest_category: SimulationCategory | null
        }
        Insert: {
          confidence_score?: number
          current_level?: Difficulty
          last_trained_at?: string | null
          legit_detection_rate?: number
          phishing_detection_rate?: number
          preferred_domains?: SimulationCategory[]
          streak_count?: number
          strongest_category?: SimulationCategory | null
          total_attempts?: number
          total_score?: number
          user_id: string
          weakest_category?: SimulationCategory | null
        }
        Update: {
          confidence_score?: number
          current_level?: Difficulty
          last_trained_at?: string | null
          legit_detection_rate?: number
          phishing_detection_rate?: number
          preferred_domains?: SimulationCategory[]
          streak_count?: number
          strongest_category?: SimulationCategory | null
          total_attempts?: number
          total_score?: number
          user_id?: string
          weakest_category?: SimulationCategory | null
        }
        Relationships: NoRelationships
      }
      user_weaknesses: {
        Row: {
          category: SimulationCategory | null
          id: string
          last_seen_at: string
          score: number
          user_id: string
          weakness_key: string
          weakness_label: string
        }
        Insert: {
          category?: SimulationCategory | null
          id?: string
          last_seen_at?: string
          score?: number
          user_id: string
          weakness_key: string
          weakness_label: string
        }
        Update: {
          category?: SimulationCategory | null
          id?: string
          last_seen_at?: string
          score?: number
          user_id?: string
          weakness_key?: string
          weakness_label?: string
        }
        Relationships: NoRelationships
      }
    }
    Views: Record<string, never>
    Functions: {
      accept_team_invite: {
        Args: {
          invite_token: string
        }
        Returns: Json
      }
      create_organization_with_admin: {
        Args: {
          org_industry?: string | null
          org_name: string
          org_slug: string
          org_type?: string | null
        }
        Returns: Json
      }
      get_organization_leaderboard_rows: {
        Args: {
          target_organization_id: string
        }
        Returns: {
          current_level: Difficulty
          email: string
          full_name: string
          joined_at: string
          last_trained_at: string | null
          member_id: string
          phishing_detection_rate: number
          role: 'member' | 'admin'
          safe_detection_rate: number
          streak_count: number
          strongest_category: SimulationCategory | null
          total_attempts: number
          total_score: number
          user_id: string
          weakest_category: SimulationCategory | null
        }[]
      }
      remove_organization_member: {
        Args: {
          target_member_id: string
        }
        Returns: Json
      }
      cancel_team_invite: {
        Args: {
          target_invite_id: string
        }
        Returns: Json
      }
      update_organization_member_role: {
        Args: {
          next_role: string
          target_member_id: string
        }
        Returns: Json
      }
      update_organization_member_status: {
        Args: {
          next_status: string
          target_member_id: string
        }
        Returns: Json
      }
      owner_list_organizations: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          slug: string
          organization_type: string | null
          plan_type: string
          plan_status: string
          max_members_allowed: number
          trial_ends_at: string | null
          access_blocked: boolean
          billing_notes: string | null
          created_at: string
          total_members: number
          active_members: number
          attempts_7d: number
          attempts_30d: number
          last_activity: string | null
          pending_invites: number
          limit_reached: boolean
          likely_to_convert: boolean
          follow_up_status: string
          owner_note: string | null
        }[]
      }
      owner_update_org_plan: {
        Args: {
          org_id: string
          next_plan_status?: string | null
          next_plan_type?: string | null
          next_max_members?: number | null
          next_trial_ends_at?: string | null
          next_access_blocked?: boolean | null
          next_billing_notes?: string | null
          next_follow_up_status?: string | null
          next_owner_note?: string | null
          actor_id?: string | null
        }
        Returns: {
          id: string
          name: string
          slug: string
          organization_type: string | null
          plan_type: string
          plan_status: string
          max_members_allowed: number
          trial_ends_at: string | null
          access_blocked: boolean
          billing_notes: string | null
          created_at: string
          total_members: number
          active_members: number
          attempts_7d: number
          attempts_30d: number
          last_activity: string | null
          pending_invites: number
          limit_reached: boolean
          likely_to_convert: boolean
          follow_up_status: string
          owner_note: string | null
        }[]
      }
      record_verified_billing_payment: {
        Args: {
          p_provider: string
          p_provider_order_id: string
          p_provider_capture_id: string
          p_capture_status: string
          p_amount: number
          p_currency: string
          p_payer_email?: string | null
          p_payment_source?: string
          p_event_source?: string
          p_event_type?: string | null
          p_event_summary?: string | null
          p_provider_event_id?: string | null
          p_order_payload?: Json
          p_capture_payload?: Json
        }
        Returns: {
          billing_order_id: string
          organization_id: string
          provider_order_id: string
          provider_capture_id: string
          payment_status: string
          order_status: string
          plan_applied: boolean
          plan_type: string
          plan_status: string
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type PublicTables = Database['public']['Tables']
export type TableName = keyof PublicTables
export type TableRow<T extends TableName> = PublicTables[T]['Row']
export type TableInsert<T extends TableName> = PublicTables[T]['Insert']
export type TableUpdate<T extends TableName> = PublicTables[T]['Update']
