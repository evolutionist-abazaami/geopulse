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
      analysis_results: {
        Row: {
          ai_analysis: Json | null
          area_analyzed: string | null
          change_percent: number | null
          coordinates: Json | null
          created_at: string
          end_date: string
          event_type: string
          id: string
          region: string
          start_date: string
          summary: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          area_analyzed?: string | null
          change_percent?: number | null
          coordinates?: Json | null
          created_at?: string
          end_date: string
          event_type: string
          id?: string
          region: string
          start_date: string
          summary?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          area_analyzed?: string | null
          change_percent?: number | null
          coordinates?: Json | null
          created_at?: string
          end_date?: string
          event_type?: string
          id?: string
          region?: string
          start_date?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      comparison_results: {
        Row: {
          ai_analysis: Json | null
          comparison_summary: string | null
          coordinates: Json | null
          created_at: string
          event_type: string
          id: string
          location_name: string
          period1_change: number | null
          period1_end: string
          period1_start: string
          period2_change: number | null
          period2_end: string
          period2_start: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          comparison_summary?: string | null
          coordinates?: Json | null
          created_at?: string
          event_type: string
          id?: string
          location_name: string
          period1_change?: number | null
          period1_end: string
          period1_start: string
          period2_change?: number | null
          period2_end: string
          period2_start: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          comparison_summary?: string | null
          coordinates?: Json | null
          created_at?: string
          event_type?: string
          id?: string
          location_name?: string
          period1_change?: number | null
          period1_end?: string
          period1_start?: string
          period2_change?: number | null
          period2_end?: string
          period2_start?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_recordings: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number
          file_path: string
          file_size: number
          id: string
          is_public: boolean
          share_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds: number
          file_path: string
          file_size: number
          id?: string
          is_public?: boolean
          share_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number
          file_path?: string
          file_size?: number
          id?: string
          is_public?: boolean
          share_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_locations: {
        Row: {
          created_at: string
          display_name: string | null
          event_types: string[] | null
          id: string
          last_checked_at: string | null
          lat: number
          lng: number
          monitoring_enabled: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          event_types?: string[] | null
          id?: string
          last_checked_at?: string | null
          lat: number
          lng: number
          monitoring_enabled?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          event_types?: string[] | null
          id?: string
          last_checked_at?: string | null
          lat?: number
          lng?: number
          monitoring_enabled?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          ai_interpretation: string | null
          confidence_level: number | null
          created_at: string
          id: string
          query: string
          results: Json | null
          user_id: string
        }
        Insert: {
          ai_interpretation?: string | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          query: string
          results?: Json | null
          user_id: string
        }
        Update: {
          ai_interpretation?: string | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          query?: string
          results?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      shared_reports: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          expires_at: string | null
          id: string
          is_active: boolean
          location_name: string
          report_data: Json
          report_type: string
          share_id: string
          title: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          location_name: string
          report_data: Json
          report_type?: string
          share_id?: string
          title: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          location_name?: string
          report_data?: Json
          report_type?: string
          share_id?: string
          title?: string
          view_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_demo_recordings: {
        Row: {
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string | null
          public_access_id: string | null
          share_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string | null
          public_access_id?: never
          share_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string | null
          public_access_id?: never
          share_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_shared_report_view: {
        Args: { p_share_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
