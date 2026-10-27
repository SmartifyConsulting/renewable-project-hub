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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          entity_id: string
          entity_type: string
          id: number
          occurred_at: string
          organisation_id: string | null
          project_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          entity_id: string
          entity_type: string
          id?: never
          occurred_at?: string
          organisation_id?: string | null
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          entity_id?: string
          entity_type?: string
          id?: never
          occurred_at?: string
          organisation_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_objects: {
        Row: {
          approval_status: string
          canonical_code: string
          classification: string
          confidence: number | null
          created_at: string
          created_by: string | null
          id: string
          object_type: string
          owner_user_id: string | null
          payload: Json
          project_id: string
          revision: number
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          canonical_code: string
          classification?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          object_type: string
          owner_user_id?: string | null
          payload?: Json
          project_id: string
          revision?: number
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          canonical_code?: string
          classification?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          object_type?: string
          owner_user_id?: string | null
          payload?: Json
          project_id?: string
          revision?: number
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_objects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_references: {
        Row: {
          captured_at: string
          captured_by: string | null
          checksum_sha256: string | null
          classification: string
          expires_at: string | null
          external_uri: string | null
          id: string
          object_id: string
          project_id: string
          storage_path: string | null
          title: string
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          checksum_sha256?: string | null
          classification?: string
          expires_at?: string | null
          external_uri?: string | null
          id?: string
          object_id: string
          project_id: string
          storage_path?: string | null
          title: string
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          checksum_sha256?: string | null
          classification?: string
          expires_at?: string | null
          external_uri?: string | null
          id?: string
          object_id?: string
          project_id?: string
          storage_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_references_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "canonical_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      object_relationships: {
        Row: {
          created_at: string
          evidence_object_id: string | null
          id: string
          predicate: string
          project_id: string
          source_object_id: string
          target_object_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          evidence_object_id?: string | null
          id?: string
          predicate: string
          project_id: string
          source_object_id: string
          target_object_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          evidence_object_id?: string | null
          id?: string
          predicate?: string
          project_id?: string
          source_object_id?: string
          target_object_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "object_relationships_evidence_object_id_fkey"
            columns: ["evidence_object_id"]
            isOneToOne: false
            referencedRelation: "canonical_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_relationships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_relationships_source_object_id_fkey"
            columns: ["source_object_id"]
            isOneToOne: false
            referencedRelation: "canonical_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "object_relationships_target_object_id_fkey"
            columns: ["target_object_id"]
            isOneToOne: false
            referencedRelation: "canonical_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_memberships: {
        Row: {
          created_at: string
          organisation_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organisation_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          organisation_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_memberships_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          created_at: string
          description: string
          geography: string
          id: string
          name: string
          org_id: string
          owner: string
          status: string
          technology: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          geography?: string
          id?: string
          name: string
          org_id: string
          owner?: string
          status?: string
          technology?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          geography?: string
          id?: string
          name?: string
          org_id?: string
          owner?: string
          status?: string
          technology?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_memberships: {
        Row: {
          created_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          activation_day: number
          budget: number
          capacity: string
          cod: string | null
          country: string
          cpi: number
          created_at: string
          director: string
          epc: string
          id: string
          manager: string
          name: string
          objective: string
          offtaker: string
          portfolio_id: string | null
          region: string
          spent: number
          spi: number
          stage: string
          status: string
          technology: string
          updated_at: string
        }
        Insert: {
          activation_day?: number
          budget?: number
          capacity?: string
          cod?: string | null
          country?: string
          cpi?: number
          created_at?: string
          director?: string
          epc?: string
          id?: string
          manager?: string
          name: string
          objective?: string
          offtaker?: string
          portfolio_id?: string | null
          region?: string
          spent?: number
          spi?: number
          stage?: string
          status?: string
          technology?: string
          updated_at?: string
        }
        Update: {
          activation_day?: number
          budget?: number
          capacity?: string
          cod?: string | null
          country?: string
          cpi?: number
          created_at?: string
          director?: string
          epc?: string
          id?: string
          manager?: string
          name?: string
          objective?: string
          offtaker?: string
          portfolio_id?: string | null
          region?: string
          spent?: number
          spi?: number
          stage?: string
          status?: string
          technology?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rpos_remove_org_membership: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: undefined
      }
      rpos_remove_project_membership: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      rpos_set_org_membership: {
        Args: { p_org_id: string; p_role: string; p_user_id: string }
        Returns: {
          created_at: string
          organisation_id: string
          role: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "organisation_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_set_project_membership: {
        Args: { p_project_id: string; p_role: string; p_user_id: string }
        Returns: {
          created_at: string
          project_id: string
          role: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "project_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_upsert_portfolio: {
        Args: {
          p_description?: string
          p_geography?: string
          p_id: string
          p_name: string
          p_org_id: string
          p_owner?: string
          p_status?: string
          p_technology?: string
        }
        Returns: {
          created_at: string
          description: string
          geography: string
          id: string
          name: string
          org_id: string
          owner: string
          status: string
          technology: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "portfolios"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_upsert_project: {
        Args: {
          p_budget?: number
          p_capacity?: string
          p_cod?: string
          p_country?: string
          p_id: string
          p_name: string
          p_objective?: string
          p_portfolio_id: string
          p_region?: string
          p_stage?: string
          p_status?: string
          p_technology?: string
        }
        Returns: {
          activation_day: number
          budget: number
          capacity: string
          cod: string | null
          country: string
          cpi: number
          created_at: string
          director: string
          epc: string
          id: string
          manager: string
          name: string
          objective: string
          offtaker: string
          portfolio_id: string | null
          region: string
          spent: number
          spi: number
          stage: string
          status: string
          technology: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
