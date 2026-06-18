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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_config: {
        Row: {
          account_balance: number
          auto_trade: boolean
          avoid_news_minutes: number
          created_at: string
          daily_loss_limit: number
          daily_profit_target: number
          data_provider: string
          data_proxy_symbol: string
          htf_timeframe: string
          id: string
          ltf_timeframe: string
          max_hold_minutes: number
          min_rr: number
          min_zone_touches: number
          one_setup_per_zone_session: boolean
          paper_symbol: string
          point_value: number
          profit_lock_rr: number
          profit_lock_ticks: number
          require_volume_expansion: boolean
          risk_per_trade_pct: number
          symbol: string
          tick_size: number
          updated_at: string
        }
        Insert: {
          account_balance?: number
          auto_trade?: boolean
          avoid_news_minutes?: number
          created_at?: string
          daily_loss_limit?: number
          daily_profit_target?: number
          data_provider?: string
          data_proxy_symbol?: string
          htf_timeframe?: string
          id?: string
          ltf_timeframe?: string
          max_hold_minutes?: number
          min_rr?: number
          min_zone_touches?: number
          one_setup_per_zone_session?: boolean
          paper_symbol?: string
          point_value?: number
          profit_lock_rr?: number
          profit_lock_ticks?: number
          require_volume_expansion?: boolean
          risk_per_trade_pct?: number
          symbol?: string
          tick_size?: number
          updated_at?: string
        }
        Update: {
          account_balance?: number
          auto_trade?: boolean
          avoid_news_minutes?: number
          created_at?: string
          daily_loss_limit?: number
          daily_profit_target?: number
          data_provider?: string
          data_proxy_symbol?: string
          htf_timeframe?: string
          id?: string
          ltf_timeframe?: string
          max_hold_minutes?: number
          min_rr?: number
          min_zone_touches?: number
          one_setup_per_zone_session?: boolean
          paper_symbol?: string
          point_value?: number
          profit_lock_rr?: number
          profit_lock_ticks?: number
          require_volume_expansion?: boolean
          risk_per_trade_pct?: number
          symbol?: string
          tick_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      agent_decisions: {
        Row: {
          created_at: string
          decision: string
          entry: number | null
          htf_bias: string | null
          id: string
          reason: string | null
          rr: number | null
          snapshot: Json | null
          steps_passed: Json
          stop: number | null
          symbol: string
          target: number | null
        }
        Insert: {
          created_at?: string
          decision: string
          entry?: number | null
          htf_bias?: string | null
          id?: string
          reason?: string | null
          rr?: number | null
          snapshot?: Json | null
          steps_passed?: Json
          stop?: number | null
          symbol: string
          target?: number | null
        }
        Update: {
          created_at?: string
          decision?: string
          entry?: number | null
          htf_bias?: string | null
          id?: string
          reason?: string | null
          rr?: number | null
          snapshot?: Json | null
          steps_passed?: Json
          stop?: number | null
          symbol?: string
          target?: number | null
        }
        Relationships: []
      }
      graph_configs: {
        Row: {
          agents_data: Json
          created_at: string
          edges_data: Json
          id: string
          name: string
          project: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agents_data: Json
          created_at?: string
          edges_data: Json
          id?: string
          name: string
          project?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agents_data?: Json
          created_at?: string
          edges_data?: Json
          id?: string
          name?: string
          project?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      idea_edges: {
        Row: {
          created_at: string
          from_node_id: string
          id: string
          label: string | null
          project_id: string
          to_node_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_node_id: string
          id?: string
          label?: string | null
          project_id: string
          to_node_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_node_id?: string
          id?: string
          label?: string | null
          project_id?: string
          to_node_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "idea_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_edges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "idea_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "idea_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_nodes: {
        Row: {
          color: string | null
          content: string
          created_at: string
          details: string | null
          id: string
          notes: string | null
          parent_node_id: string | null
          position_x: number | null
          position_y: number | null
          project_id: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string
          details?: string | null
          id?: string
          notes?: string | null
          parent_node_id?: string | null
          position_x?: number | null
          position_y?: number | null
          project_id: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string
          details?: string | null
          id?: string
          notes?: string | null
          parent_node_id?: string | null
          position_x?: number | null
          position_y?: number | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_nodes_parent_node_id_fkey"
            columns: ["parent_node_id"]
            isOneToOne: false
            referencedRelation: "idea_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "idea_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_projects: {
        Row: {
          category: string | null
          created_at: string
          id: string
          mood: string | null
          name: string
          prompt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          mood?: string | null
          name: string
          prompt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          mood?: string | null
          name?: string
          prompt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_notes: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      paper_positions: {
        Row: {
          closed_at: string | null
          contracts: number
          decision_id: string | null
          entry_price: number
          exit_price: number | null
          exit_reason: string | null
          id: string
          initial_stop: number
          lock_active: boolean
          opened_at: string
          pnl: number | null
          session_date: string
          side: string
          status: string
          stop_price: number
          symbol: string
          target_price: number
          zone_key: string | null
        }
        Insert: {
          closed_at?: string | null
          contracts?: number
          decision_id?: string | null
          entry_price: number
          exit_price?: number | null
          exit_reason?: string | null
          id?: string
          initial_stop: number
          lock_active?: boolean
          opened_at?: string
          pnl?: number | null
          session_date?: string
          side: string
          status?: string
          stop_price: number
          symbol: string
          target_price: number
          zone_key?: string | null
        }
        Update: {
          closed_at?: string | null
          contracts?: number
          decision_id?: string | null
          entry_price?: number
          exit_price?: number | null
          exit_reason?: string | null
          id?: string
          initial_stop?: number
          lock_active?: boolean
          opened_at?: string
          pnl?: number | null
          session_date?: string
          side?: string
          status?: string
          stop_price?: number
          symbol?: string
          target_price?: number
          zone_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_positions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "agent_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          agent_id: string
          agent_name: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          job_type: string
          recurrence: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          agent_name: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          job_type?: string
          recurrence?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          agent_name?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          job_type?: string
          recurrence?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_history: {
        Row: {
          asset: string
          created_at: string
          entry_price: number
          exit_price: number | null
          id: string
          pnl: number | null
          type: string
          user_id: string
        }
        Insert: {
          asset: string
          created_at?: string
          entry_price: number
          exit_price?: number | null
          id?: string
          pnl?: number | null
          type: string
          user_id: string
        }
        Update: {
          asset?: string
          created_at?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          pnl?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          alert_above: number | null
          alert_below: number | null
          created_at: string
          id: string
          symbol: string
          user_id: string
        }
        Insert: {
          alert_above?: number | null
          alert_below?: number | null
          created_at?: string
          id?: string
          symbol: string
          user_id: string
        }
        Update: {
          alert_above?: number | null
          alert_below?: number | null
          created_at?: string
          id?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
