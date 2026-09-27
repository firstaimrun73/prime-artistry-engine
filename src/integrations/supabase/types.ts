export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      generations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          input_url: string | null
          is_private: boolean | null
          metadata: Json | null
          output_url: string | null
          prompt: string | null
          r2_object_key: string | null
          retained_as_history: boolean | null
          status: Database["public"]["Enums"]["gen_status"]
          storage_provider: string | null
          thumbnail_key: string | null
          title: string | null
          type: Database["public"]["Enums"]["gen_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          input_url?: string | null
          is_private?: boolean | null
          metadata?: Json | null
          output_url?: string | null
          prompt?: string | null
          r2_object_key?: string | null
          retained_as_history?: boolean | null
          status?: Database["public"]["Enums"]["gen_status"]
          storage_provider?: string | null
          thumbnail_key?: string | null
          title?: string | null
          type: Database["public"]["Enums"]["gen_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          input_url?: string | null
          is_private?: boolean | null
          metadata?: Json | null
          output_url?: string | null
          prompt?: string | null
          r2_object_key?: string | null
          retained_as_history?: boolean | null
          status?: Database["public"]["Enums"]["gen_status"]
          storage_provider?: string | null
          thumbnail_key?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["gen_type"]
          user_id?: string
        }
        Relationships: []
      }
      history_media_deletion_queue: {
        Row: {
          attempt_count: number | null
          created_at: string
          id: string
          last_error: string | null
          object_key: string | null
          processed_at: string | null
          source_id: string
          source_table: string
          status: string
          storage_provider: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          id?: string
          last_error?: string | null
          object_key?: string | null
          processed_at?: string | null
          source_id: string
          source_table: string
          status?: string
          storage_provider?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          id?: string
          last_error?: string | null
          object_key?: string | null
          processed_at?: string | null
          source_id?: string
          source_table?: string
          status?: string
          storage_provider?: string | null
          user_id?: string
        }
        Relationships: []
      }
      music_history: {
        Row: {
          audio_url: string
          bpm: number | null
          created_at: string
          duration: number | null
          genre: string | null
          id: string
          mood: string | null
          prompt: string | null
          track_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url: string
          bpm?: number | null
          created_at?: string
          duration?: number | null
          genre?: string | null
          id?: string
          mood?: string | null
          prompt?: string | null
          track_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string
          bpm?: number | null
          created_at?: string
          duration?: number | null
          genre?: string | null
          id?: string
          mood?: string | null
          prompt?: string | null
          track_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked: boolean
          created_at: string
          credits: number
          currency: string
          display_name: string | null
          email: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          credits?: number
          currency?: string
          display_name?: string | null
          email?: string | null
          id: string
          plan?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          credits?: number
          currency?: string
          display_name?: string | null
          email?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          history_enabled: boolean | null
          sensitive_mode: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          history_enabled?: boolean | null
          sensitive_mode?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          history_enabled?: boolean | null
          sensitive_mode?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: unknown[]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_payment_credits: {
        Args: {
          _credits: number
          _reason?: string
          _transaction_id: string
          _user_id: string
        }
        Returns: Json
      }
      deduct_credits: {
        Args: { _amount: number; _gen_type: string; _user_id: string }
        Returns: Json
      }
      history_user_delete: {
        Args: { p_generation_id: string }
        Returns: undefined
      }
      music_history_user_delete: {
        Args: { p_track_id: string }
        Returns: undefined
      }
      should_retain_as_history: {
        Args: { p_is_private: boolean; p_user_id: string }
        Returns: Json
      }
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      gen_status: "pending" | "processing" | "success" | "failed"
      gen_type: "image" | "video" | "music"
      plan_type: "free" | "lite" | "plus" | "pro" | "studio" | "business"
      ticket_category:
        | "payment"
        | "credits"
        | "generation"
        | "account"
        | "technical"
        | "feature_request"
        | "bug_report"
        | "other"
      ticket_status:
        | "open"
        | "in_progress"
        | "resolved"
        | "waiting_user"
        | "closed"
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
