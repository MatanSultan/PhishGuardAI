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
