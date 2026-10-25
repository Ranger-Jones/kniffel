
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "friendships": {
                  Row: {
                    "addressee_id": string,"created_at": string,"id": string,"requester_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addressee_id": string,"created_at"?: string,"id"?: string,"requester_id": string,"status"?: string
                  }
                  Update: {
                    "addressee_id"?: string,"created_at"?: string,"id"?: string,"requester_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_invites": {
                  Row: {
                    "created_at": string,"from_id": string,"game_id": string,"id": string,"status": string,"to_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_id": string,"game_id": string,"id"?: string,"status"?: string,"to_id": string
                  }
                  Update: {
                    "created_at"?: string,"from_id"?: string,"game_id"?: string,"id"?: string,"status"?: string,"to_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_invites_from_id_fkey"
      columns: ["from_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_invites_from_id_fkey"
      columns: ["from_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_invites_from_id_fkey"
      columns: ["from_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_invites_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_invites_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_invites_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_invites_to_id_fkey"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_players": {
                  Row: {
                    "game_id": string,"joined_at": string,"left_game": boolean,"place": number | null,"scores": NonNullable<Json>,"seat": number,"total": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "game_id": string,"joined_at"?: string,"left_game"?: boolean,"place"?: number | null,"scores"?: NonNullable<Json>,"seat": number,"total"?: number | null,"user_id": string
                  }
                  Update: {
                    "game_id"?: string,"joined_at"?: string,"left_game"?: boolean,"place"?: number | null,"scores"?: NonNullable<Json>,"seat"?: number,"total"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_players_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"games": {
                  Row: {
                    "code": string,"created_at": string,"finished_at": string | null,"host_id": string,"id": string,"rematch_game_id": string | null,"started_at": string | null,"state": NonNullable<Json>,"status": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"finished_at"?: string | null,"host_id": string,"id"?: string,"rematch_game_id"?: string | null,"started_at"?: string | null,"state": NonNullable<Json>,"status"?: string,"version"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"finished_at"?: string | null,"host_id"?: string,"id"?: string,"rematch_game_id"?: string | null,"started_at"?: string | null,"state"?: NonNullable<Json>,"status"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "games_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "leaderboard"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "games_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "player_stats"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "games_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "games_rematch_game_id_fkey"
      columns: ["rematch_game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"id": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"id": string,"username": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"id"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "leaderboard": {
                  Row: {
                    "avatar_url": string | null,"avg_score": number | null,"best_score": number | null,"games_played": number | null,"kniffel_count": number | null,"user_id": string,"username": string | null,"wins": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"player_stats": {
                  Row: {
                    "avatar_url": string | null,"avg_score": number | null,"best_score": number | null,"games_played": number | null,"kniffel_count": number | null,"user_id": string,"username": string | null,"wins": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "commit_game":
{ Args: { "p_expected_version": number,"p_game_id": string,"p_players": Json,"p_state": Json }; Returns: number
                           },
"is_game_member":
{ Args: { "gid": string }; Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
