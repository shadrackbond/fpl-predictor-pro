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
      chip_analysis: {
        Row: {
          analysis: string | null
          chip_name: string
          created_at: string
          gameweek_id: number | null
          id: number
          recommendation: string | null
          success_percentage: number | null
          user_team_id: number | null
        }
        Insert: {
          analysis?: string | null
          chip_name: string
          created_at?: string
          gameweek_id?: number | null
          id?: number
          recommendation?: string | null
          success_percentage?: number | null
          user_team_id?: number | null
        }
        Update: {
          analysis?: string | null
          chip_name?: string
          created_at?: string
          gameweek_id?: number | null
          id?: number
          recommendation?: string | null
          success_percentage?: number | null
          user_team_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chip_analysis_user_team_id_fkey"
            columns: ["user_team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      differential_alerts: {
        Row: {
          alert_type: string
          confidence: number | null
          created_at: string
          gameweek_id: number | null
          id: number
          is_active: boolean | null
          ownership_percent: number | null
          player_id: number | null
          predicted_points: number | null
          reason: string | null
        }
        Insert: {
          alert_type: string
          confidence?: number | null
          created_at?: string
          gameweek_id?: number | null
          id?: number
          is_active?: boolean | null
          ownership_percent?: number | null
          player_id?: number | null
          predicted_points?: number | null
          reason?: string | null
        }
        Update: {
          alert_type?: string
          confidence?: number | null
          created_at?: string
          gameweek_id?: number | null
          id?: number
          is_active?: boolean | null
          ownership_percent?: number | null
          player_id?: number | null
          predicted_points?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "differential_alerts_gameweek_id_fkey"
            columns: ["gameweek_id"]
            isOneToOne: false
            referencedRelation: "gameweeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "differential_alerts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      fixtures: {
        Row: {
          away_score: number | null
          away_team_difficulty: number | null
          away_team_id: number | null
          created_at: string
          finished: boolean | null
          fpl_id: number
          gameweek_id: number | null
          home_score: number | null
          home_team_difficulty: number | null
          home_team_id: number | null
          id: number
          kickoff_time: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_difficulty?: number | null
          away_team_id?: number | null
          created_at?: string
          finished?: boolean | null
          fpl_id: number
          gameweek_id?: number | null
          home_score?: number | null
          home_team_difficulty?: number | null
          home_team_id?: number | null
          id?: number
          kickoff_time?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_difficulty?: number | null
          away_team_id?: number | null
          created_at?: string
          finished?: boolean | null
          fpl_id?: number
          gameweek_id?: number | null
          home_score?: number | null
          home_team_difficulty?: number | null
          home_team_id?: number | null
          id?: number
          kickoff_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_gameweek_id_fkey"
            columns: ["gameweek_id"]
            isOneToOne: false
            referencedRelation: "gameweeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      gameweeks: {
        Row: {
          average_score: number | null
          created_at: string
          deadline_time: string | null
          finished: boolean | null
          fpl_id: number
          highest_score: number | null
          id: number
          is_current: boolean | null
          is_next: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          average_score?: number | null
          created_at?: string
          deadline_time?: string | null
          finished?: boolean | null
          fpl_id: number
          highest_score?: number | null
          id?: number
          is_current?: boolean | null
          is_next?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          average_score?: number | null
          created_at?: string
          deadline_time?: string | null
          finished?: boolean | null
          fpl_id?: number
          highest_score?: number | null
          id?: number
          is_current?: boolean | null
          is_next?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          content: string | null
          id: number
          player_mentions: Json | null
          published_at: string | null
          relevance_score: number | null
          scraped_at: string
          source: string
          title: string | null
          url: string | null
        }
        Insert: {
          content?: string | null
          id?: number
          player_mentions?: Json | null
          published_at?: string | null
          relevance_score?: number | null
          scraped_at?: string
          source: string
          title?: string | null
          url?: string | null
        }
        Update: {
          content?: string | null
          id?: number
          player_mentions?: Json | null
          published_at?: string | null
          relevance_score?: number | null
          scraped_at?: string
          source?: string
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      optimal_teams: {
        Row: {
          accuracy_percentage: number | null
          actual_points: number | null
          analysis: string | null
          captain_id: number | null
          created_at: string
          formation: string
          gameweek_id: number | null
          id: number
          player_ids: number[]
          starting_xi: number[]
          team_rating: number
          total_predicted_points: number
          updated_at: string | null
          vice_captain_id: number | null
        }
        Insert: {
          accuracy_percentage?: number | null
          actual_points?: number | null
          analysis?: string | null
          captain_id?: number | null
          created_at?: string
          formation: string
          gameweek_id?: number | null
          id?: number
          player_ids: number[]
          starting_xi: number[]
          team_rating: number
          total_predicted_points: number
          updated_at?: string | null
          vice_captain_id?: number | null
        }
        Update: {
          accuracy_percentage?: number | null
          actual_points?: number | null
          analysis?: string | null
          captain_id?: number | null
          created_at?: string
          formation?: string
          gameweek_id?: number | null
          id?: number
          player_ids?: number[]
          starting_xi?: number[]
          team_rating?: number
          total_predicted_points?: number
          updated_at?: string | null
          vice_captain_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "optimal_teams_gameweek_id_fkey"
            columns: ["gameweek_id"]
            isOneToOne: true
            referencedRelation: "gameweeks"
            referencedColumns: ["id"]
          },
        ]
      }
      player_hype: {
        Row: {
          created_at: string
          gameweek_id: number | null
          hype_score: number | null
          id: number
          mentions: number | null
          player_id: number | null
          sentiment: string | null
          sources: Json | null
          trending_direction: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          gameweek_id?: number | null
          hype_score?: number | null
          id?: number
          mentions?: number | null
          player_id?: number | null
          sentiment?: string | null
          sources?: Json | null
          trending_direction?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          gameweek_id?: number | null
          hype_score?: number | null
          id?: number
          mentions?: number | null
          player_id?: number | null
          sentiment?: string | null
          sources?: Json | null
          trending_direction?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_hype_gameweek_id_fkey"
            columns: ["gameweek_id"]
            isOneToOne: false
            referencedRelation: "gameweeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_hype_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_predictions: {
        Row: {
          actual_points: number | null
          ai_analysis: string | null
          created_at: string
          fixture_difficulty: number | null
          form_factor: number | null
          gameweek_id: number | null
          id: number
          player_id: number | null
          predicted_points: number
          prediction_accuracy: number | null
        }
        Insert: {
          actual_points?: number | null
          ai_analysis?: string | null
          created_at?: string
          fixture_difficulty?: number | null
          form_factor?: number | null
          gameweek_id?: number | null
          id?: number
          player_id?: number | null
          predicted_points: number
          prediction_accuracy?: number | null
        }
        Update: {
          actual_points?: number | null
          ai_analysis?: string | null
          created_at?: string
          fixture_difficulty?: number | null
          form_factor?: number | null
          gameweek_id?: number | null
          id?: number
          player_id?: number | null
          predicted_points?: number
          prediction_accuracy?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_predictions_gameweek_id_fkey"
            columns: ["gameweek_id"]
            isOneToOne: false
            referencedRelation: "gameweeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_predictions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          assists: number | null
          bonus: number | null
          clean_sheets: number | null
          created_at: string
          first_name: string
          form: number | null
          fpl_id: number
          goals_conceded: number | null
          goals_scored: number | null
          id: number
          minutes: number | null
          photo: string | null
          position: string
          price: number
          second_name: string
          selected_by_percent: number | null
          status: string | null
          team_id: number | null
          total_points: number | null
          updated_at: string
          web_name: string
        }
        Insert: {
          assists?: number | null
          bonus?: number | null
          clean_sheets?: number | null
          created_at?: string
          first_name: string
          form?: number | null
          fpl_id: number
          goals_conceded?: number | null
          goals_scored?: number | null
          id?: number
          minutes?: number | null
          photo?: string | null
          position: string
          price: number
          second_name: string
          selected_by_percent?: number | null
          status?: string | null
          team_id?: number | null
          total_points?: number | null
          updated_at?: string
          web_name: string
        }
        Update: {
          assists?: number | null
          bonus?: number | null
          clean_sheets?: number | null
          created_at?: string
          first_name?: string
          form?: number | null
          fpl_id?: number
          goals_conceded?: number | null
          goals_scored?: number | null
          id?: number
          minutes?: number | null
          photo?: string | null
          position?: string
          price?: number
          second_name?: string
          selected_by_percent?: number | null
          status?: string | null
          team_id?: number | null
          total_points?: number | null
          updated_at?: string
          web_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_history: {
        Row: {
          accuracy_percentage: number | null
          avg_prediction_error: number | null
          correct_predictions: number | null
          created_at: string | null
          gameweek_id: number | null
          id: number
          players_analyzed: number | null
          total_actual_points: number | null
          total_predicted_points: number
          updated_at: string | null
        }
        Insert: {
          accuracy_percentage?: number | null
          avg_prediction_error?: number | null
          correct_predictions?: number | null
          created_at?: string | null
          gameweek_id?: number | null
          id?: number
          players_analyzed?: number | null
          total_actual_points?: number | null
          total_predicted_points: number
          updated_at?: string | null
        }
        Update: {
          accuracy_percentage?: number | null
          avg_prediction_error?: number | null
          correct_predictions?: number | null
          created_at?: string | null
          gameweek_id?: number | null
          id?: number
          players_analyzed?: number | null
          total_actual_points?: number | null
          total_predicted_points?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prediction_history_gameweek_id_fkey"
            columns: ["gameweek_id"]
            isOneToOne: true
            referencedRelation: "gameweeks"
            referencedColumns: ["id"]
          },
        ]
      }
      price_changes: {
        Row: {
          change_date: string | null
          created_at: string | null
          id: number
          new_price: number
          old_price: number
          player_id: number | null
        }
        Insert: {
          change_date?: string | null
          created_at?: string | null
          id?: number
          new_price: number
          old_price: number
          player_id?: number | null
        }
        Update: {
          change_date?: string | null
          created_at?: string | null
          id?: number
          new_price?: number
          old_price?: number
          player_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_changes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          fpl_id: number
          id: number
          name: string
          short_name: string
          strength_attack_away: number | null
          strength_attack_home: number | null
          strength_defence_away: number | null
          strength_defence_home: number | null
          strength_overall: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fpl_id: number
          id?: number
          name: string
          short_name: string
          strength_attack_away?: number | null
          strength_attack_home?: number | null
          strength_defence_away?: number | null
          strength_defence_home?: number | null
          strength_overall?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fpl_id?: number
          id?: number
          name?: string
          short_name?: string
          strength_attack_away?: number | null
          strength_attack_home?: number | null
          strength_defence_away?: number | null
          strength_defence_home?: number | null
          strength_overall?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      transfer_suggestions: {
        Row: {
          created_at: string
          gameweek_id: number | null
          id: number
          player_in_id: number | null
          player_out_id: number | null
          points_impact: number | null
          priority: string | null
          reason: string | null
          user_team_id: number | null
        }
        Insert: {
          created_at?: string
          gameweek_id?: number | null
          id?: number
          player_in_id?: number | null
          player_out_id?: number | null
          points_impact?: number | null
          priority?: string | null
          reason?: string | null
          user_team_id?: number | null
        }
        Update: {
          created_at?: string
          gameweek_id?: number | null
          id?: number
          player_in_id?: number | null
          player_out_id?: number | null
          points_impact?: number | null
          priority?: string | null
          reason?: string | null
          user_team_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_suggestions_user_team_id_fkey"
            columns: ["user_team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_teams: {
        Row: {
          active_chip: string | null
          bank: number | null
          captain_id: number | null
          chips_available: Json | null
          created_at: string
          fpl_team_id: number
          free_transfers: number | null
          gameweek_points: number | null
          id: number
          overall_points: number | null
          overall_rank: number | null
          player_ids: number[]
          team_name: string | null
          updated_at: string
          user_id: string | null
          vice_captain_id: number | null
        }
        Insert: {
          active_chip?: string | null
          bank?: number | null
          captain_id?: number | null
          chips_available?: Json | null
          created_at?: string
          fpl_team_id: number
          free_transfers?: number | null
          gameweek_points?: number | null
          id?: number
          overall_points?: number | null
          overall_rank?: number | null
          player_ids?: number[]
          team_name?: string | null
          updated_at?: string
          user_id?: string | null
          vice_captain_id?: number | null
        }
        Update: {
          active_chip?: string | null
          bank?: number | null
          captain_id?: number | null
          chips_available?: Json | null
          created_at?: string
          fpl_team_id?: number
          free_transfers?: number | null
          gameweek_points?: number | null
          id?: number
          overall_points?: number | null
          overall_rank?: number | null
          player_ids?: number[]
          team_name?: string | null
          updated_at?: string
          user_id?: string | null
          vice_captain_id?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
