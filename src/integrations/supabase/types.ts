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
          {
            foreignKeyName: "audit_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "audit_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "canonical_objects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "canonical_objects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "evidence_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "evidence_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
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
            foreignKeyName: "object_relationships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "object_relationships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "project_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
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
      readiness_domain_assessments: {
        Row: {
          domain_id: string
          evidence_notes: string
          evidence_verified: boolean
          hard_stop: boolean
          project_id: string
          score: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          domain_id: string
          evidence_notes?: string
          evidence_verified?: boolean
          hard_stop?: boolean
          project_id: string
          score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          domain_id?: string
          evidence_notes?: string
          evidence_verified?: boolean
          hard_stop?: boolean
          project_id?: string
          score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "readiness_domain_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_domain_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "readiness_domain_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      readiness_gate_decisions: {
        Row: {
          decided_at: string
          decided_by: string
          decision: string
          domain_snapshot: Json
          id: number
          project_id: string
          rationale: string
          snapshot_updated_at: string
        }
        Insert: {
          decided_at?: string
          decided_by: string
          decision: string
          domain_snapshot: Json
          id?: never
          project_id: string
          rationale: string
          snapshot_updated_at: string
        }
        Update: {
          decided_at?: string
          decided_by?: string
          decision?: string
          domain_snapshot?: Json
          id?: never
          project_id?: string
          rationale?: string
          snapshot_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_gate_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_gate_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "readiness_gate_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rpos_activation_acceptances: {
        Row: {
          accepted_at: string
          accepted_by: string
          item_id: string
          project_id: string
          rationale: string
        }
        Insert: {
          accepted_at?: string
          accepted_by: string
          item_id: string
          project_id: string
          rationale: string
        }
        Update: {
          accepted_at?: string
          accepted_by?: string
          item_id?: string
          project_id?: string
          rationale?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_activation_acceptances_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "rpos_activation_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_activation_acceptances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_activation_acceptances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_activation_acceptances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rpos_activation_items: {
        Row: {
          created_at: string
          created_by: string
          day_number: number
          depends_on: string | null
          id: string
          item_type: string
          notes: string
          owner_user_id: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
          workstream: string
        }
        Insert: {
          created_at?: string
          created_by: string
          day_number: number
          depends_on?: string | null
          id?: string
          item_type: string
          notes?: string
          owner_user_id?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
          workstream: string
        }
        Update: {
          created_at?: string
          created_by?: string
          day_number?: number
          depends_on?: string | null
          id?: string
          item_type?: string
          notes?: string
          owner_user_id?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          workstream?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_activation_items_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "rpos_activation_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_activation_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_activation_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_activation_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rpos_ai_agent_settings: {
        Row: {
          agent_key: string
          enabled: boolean
          organisation_id: string
          reason: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          agent_key: string
          enabled?: boolean
          organisation_id: string
          reason: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          agent_key?: string
          enabled?: boolean
          organisation_id?: string
          reason?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_ai_agent_settings_agent_key_fkey"
            columns: ["agent_key"]
            isOneToOne: false
            referencedRelation: "rpos_ai_agents"
            referencedColumns: ["agent_key"]
          },
        ]
      }
      rpos_ai_agents: {
        Row: {
          agent_key: string
          created_at: string
          domain: string
          enabled: boolean
          name: string
          purpose: string
        }
        Insert: {
          agent_key: string
          created_at?: string
          domain: string
          enabled?: boolean
          name: string
          purpose: string
        }
        Update: {
          agent_key?: string
          created_at?: string
          domain?: string
          enabled?: boolean
          name?: string
          purpose?: string
        }
        Relationships: []
      }
      rpos_ai_recommendations: {
        Row: {
          agent_key: string
          created_at: string
          created_by: string
          generated_at: string | null
          generation_method: string
          id: string
          model_name: string | null
          project_id: string
          recommendation: string
          review_rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_references: string
          status: string
          title: string
        }
        Insert: {
          agent_key: string
          created_at?: string
          created_by: string
          generated_at?: string | null
          generation_method?: string
          id?: string
          model_name?: string | null
          project_id: string
          recommendation: string
          review_rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_references: string
          status?: string
          title: string
        }
        Update: {
          agent_key?: string
          created_at?: string
          created_by?: string
          generated_at?: string | null
          generation_method?: string
          id?: string
          model_name?: string | null
          project_id?: string
          recommendation?: string
          review_rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_references?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_ai_recommendations_agent_key_fkey"
            columns: ["agent_key"]
            isOneToOne: false
            referencedRelation: "rpos_ai_agents"
            referencedColumns: ["agent_key"]
          },
          {
            foreignKeyName: "rpos_ai_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_ai_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_ai_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rpos_assurance_inspections: {
        Row: {
          created_at: string
          discipline: string
          findings: string
          id: string
          inspection_date: string
          inspector_user_id: string
          project_id: string
          reference: string
          result: string
          title: string
        }
        Insert: {
          created_at?: string
          discipline: string
          findings?: string
          id?: string
          inspection_date: string
          inspector_user_id: string
          project_id: string
          reference: string
          result?: string
          title: string
        }
        Update: {
          created_at?: string
          discipline?: string
          findings?: string
          id?: string
          inspection_date?: string
          inspector_user_id?: string
          project_id?: string
          reference?: string
          result?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_assurance_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_assurance_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_assurance_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rpos_assurance_ncrs: {
        Row: {
          corrective_action: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          inspection_id: string
          owner_user_id: string | null
          project_id: string
          reference: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          corrective_action?: string
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          id?: string
          inspection_id: string
          owner_user_id?: string | null
          project_id: string
          reference: string
          severity: string
          status?: string
          updated_at?: string
        }
        Update: {
          corrective_action?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          inspection_id?: string
          owner_user_id?: string | null
          project_id?: string
          reference?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_assurance_ncrs_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "rpos_assurance_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_assurance_ncrs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_assurance_ncrs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_assurance_ncrs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rpos_assurance_verifications: {
        Row: {
          ncr_id: string
          project_id: string
          verification_notes: string
          verified_at: string
          verified_by: string
        }
        Insert: {
          ncr_id: string
          project_id: string
          verification_notes: string
          verified_at?: string
          verified_by: string
        }
        Update: {
          ncr_id?: string
          project_id?: string
          verification_notes?: string
          verified_at?: string
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_assurance_verifications_ncr_id_fkey"
            columns: ["ncr_id"]
            isOneToOne: true
            referencedRelation: "rpos_assurance_ncrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_assurance_verifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_assurance_verifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_assurance_verifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rpos_delivery_approvals: {
        Row: {
          decided_at: string
          decided_by: string
          decision: string
          project_id: string
          rationale: string
          record_id: string
        }
        Insert: {
          decided_at?: string
          decided_by: string
          decision: string
          project_id: string
          rationale: string
          record_id: string
        }
        Update: {
          decided_at?: string
          decided_by?: string
          decision?: string
          project_id?: string
          rationale?: string
          record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_delivery_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_delivery_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_delivery_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_delivery_approvals_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: true
            referencedRelation: "rpos_delivery_records"
            referencedColumns: ["id"]
          },
        ]
      }
      rpos_delivery_records: {
        Row: {
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          impact: string
          mitigation: string
          owner_user_id: string | null
          priority: string
          project_id: string
          record_type: string
          reference: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          due_date?: string | null
          id?: string
          impact?: string
          mitigation?: string
          owner_user_id?: string | null
          priority?: string
          project_id: string
          record_type: string
          reference: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          impact?: string
          mitigation?: string
          owner_user_id?: string | null
          priority?: string
          project_id?: string
          record_type?: string
          reference?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_delivery_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_delivery_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_delivery_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rpos_delivery_schedule: {
        Row: {
          baseline_finish_date: string
          created_at: string
          created_by: string
          depends_on: string | null
          finish_date: string
          id: string
          progress_percent: number
          project_id: string
          start_date: string
          status: string
          title: string
        }
        Insert: {
          baseline_finish_date: string
          created_at?: string
          created_by: string
          depends_on?: string | null
          finish_date: string
          id?: string
          progress_percent?: number
          project_id: string
          start_date: string
          status?: string
          title: string
        }
        Update: {
          baseline_finish_date?: string
          created_at?: string
          created_by?: string
          depends_on?: string | null
          finish_date?: string
          id?: string
          progress_percent?: number
          project_id?: string
          start_date?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_delivery_schedule_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "rpos_delivery_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_delivery_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_delivery_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_delivery_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rpos_escalation_policies: {
        Row: {
          critical_days: number
          organisation_id: string
          updated_at: string
          updated_by: string
          warning_days: number
        }
        Insert: {
          critical_days?: number
          organisation_id: string
          updated_at?: string
          updated_by: string
          warning_days?: number
        }
        Update: {
          critical_days?: number
          organisation_id?: string
          updated_at?: string
          updated_by?: string
          warning_days?: number
        }
        Relationships: []
      }
      rpos_knowledge_sources: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          project_id: string
          review_notes: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_type: string
          source_uri: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          project_id: string
          review_notes?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_type: string
          source_uri: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          project_id?: string
          review_notes?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_type?: string
          source_uri?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_knowledge_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_knowledge_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_knowledge_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rpos_notification_reads: {
        Row: {
          notification_key: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_key: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_key?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rpos_readiness_source_links: {
        Row: {
          domain_id: string
          linked_at: string
          linked_by: string
          project_id: string
          source_id: string
        }
        Insert: {
          domain_id: string
          linked_at?: string
          linked_by: string
          project_id: string
          source_id: string
        }
        Update: {
          domain_id?: string
          linked_at?: string
          linked_by?: string
          project_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_readiness_source_links_project_id_domain_id_fkey"
            columns: ["project_id", "domain_id"]
            isOneToOne: false
            referencedRelation: "readiness_domain_assessments"
            referencedColumns: ["project_id", "domain_id"]
          },
          {
            foreignKeyName: "rpos_readiness_source_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "rpos_knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      rpos_source_facts: {
        Row: {
          created_at: string
          created_by: string
          excerpt: string
          extraction_method: string
          fact_key: string
          fact_value: string
          id: string
          project_id: string
          review_notes: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          excerpt?: string
          extraction_method: string
          fact_key: string
          fact_value: string
          id?: string
          project_id: string
          review_notes?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          excerpt?: string
          extraction_method?: string
          fact_key?: string
          fact_value?: string
          id?: string
          project_id?: string
          review_notes?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rpos_source_facts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_source_facts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_source_facts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_source_facts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "rpos_knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      rpos_delivery_escalations: {
        Row: {
          item_id: string | null
          item_type: string | null
          project_id: string | null
          reason: string | null
          title: string | null
        }
        Relationships: []
      }
      rpos_escalation_overview: {
        Row: {
          approvals_pending: number | null
          critical_alerts: number | null
          delivery_alerts: number | null
          organisation_id: string | null
          project_id: string | null
          schedule_alerts: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_org_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      rpos_executive_project_kpis: {
        Row: {
          activation_blocked: number | null
          activation_completed: number | null
          activation_total: number | null
          closed_ncrs: number | null
          critical_ncrs: number | null
          inspections_total: number | null
          open_actions: number | null
          open_issues: number | null
          open_ncrs: number | null
          open_risks: number | null
          pending_changes: number | null
          portfolio_id: string | null
          project_id: string | null
          project_name: string | null
          schedule_completed: number | null
          schedule_overdue: number | null
          schedule_total: number | null
        }
        Insert: {
          activation_blocked?: never
          activation_completed?: never
          activation_total?: never
          closed_ncrs?: never
          critical_ncrs?: never
          inspections_total?: never
          open_actions?: never
          open_issues?: never
          open_ncrs?: never
          open_risks?: never
          pending_changes?: never
          portfolio_id?: string | null
          project_id?: string | null
          project_name?: string | null
          schedule_completed?: never
          schedule_overdue?: never
          schedule_total?: never
        }
        Update: {
          activation_blocked?: never
          activation_completed?: never
          activation_total?: never
          closed_ncrs?: never
          critical_ncrs?: never
          inspections_total?: never
          open_actions?: never
          open_issues?: never
          open_ncrs?: never
          open_risks?: never
          pending_changes?: never
          portfolio_id?: string | null
          project_id?: string | null
          project_name?: string | null
          schedule_completed?: never
          schedule_overdue?: never
          schedule_total?: never
        }
        Relationships: []
      }
      rpos_fact_conflicts: {
        Row: {
          fact_a_id: string | null
          fact_b_id: string | null
          fact_key: string | null
          project_id: string | null
          source_a_id: string | null
          source_b_id: string | null
          value_a: string | null
          value_b: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rpos_source_facts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_source_facts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_escalation_overview"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_source_facts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rpos_executive_project_kpis"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rpos_source_facts_source_id_fkey"
            columns: ["source_a_id"]
            isOneToOne: false
            referencedRelation: "rpos_knowledge_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpos_source_facts_source_id_fkey"
            columns: ["source_b_id"]
            isOneToOne: false
            referencedRelation: "rpos_knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      rpos_notifications: {
        Row: {
          category: string | null
          message: string | null
          notification_key: string | null
          occurred_at: string | null
          project_id: string | null
          recipient_id: string | null
          severity: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      rpos_accept_activation_milestone: {
        Args: { p_item_id: string; p_rationale: string }
        Returns: {
          accepted_at: string
          accepted_by: string
          item_id: string
          project_id: string
          rationale: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_activation_acceptances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_add_delivery_schedule: {
        Args: {
          p_finish: string
          p_project_id: string
          p_start: string
          p_title: string
        }
        Returns: {
          baseline_finish_date: string
          created_at: string
          created_by: string
          depends_on: string | null
          finish_date: string
          id: string
          progress_percent: number
          project_id: string
          start_date: string
          status: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_delivery_schedule"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_agent_evidence_brief: {
        Args: { p_agent_key: string; p_project_id: string }
        Returns: {
          conflict_count: number
          excerpt: string
          fact_id: string
          fact_key: string
          fact_value: string
          source_id: string
        }[]
      }
      rpos_decide_delivery_change: {
        Args: { p_decision: string; p_rationale: string; p_record_id: string }
        Returns: {
          decided_at: string
          decided_by: string
          decision: string
          project_id: string
          rationale: string
          record_id: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_delivery_approvals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_decide_readiness_gate: {
        Args: { p_decision: string; p_project_id: string; p_rationale: string }
        Returns: {
          decided_at: string
          decided_by: string
          decision: string
          domain_snapshot: Json
          id: number
          project_id: string
          rationale: string
          snapshot_updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "readiness_gate_decisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_link_readiness_source: {
        Args: { p_domain_id: string; p_project_id: string; p_source_id: string }
        Returns: {
          domain_id: string
          linked_at: string
          linked_by: string
          project_id: string
          source_id: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_readiness_source_links"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_my_notifications: {
        Args: never
        Returns: {
          category: string
          is_read: boolean
          message: string
          notification_key: string
          occurred_at: string
          project_id: string
          severity: string
          title: string
        }[]
      }
      rpos_record_inspection: {
        Args: {
          p_date: string
          p_discipline: string
          p_findings: string
          p_project_id: string
          p_reference: string
          p_result: string
          p_title: string
        }
        Returns: {
          created_at: string
          discipline: string
          findings: string
          id: string
          inspection_date: string
          inspector_user_id: string
          project_id: string
          reference: string
          result: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_assurance_inspections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_record_ncr: {
        Args: {
          p_action: string
          p_description: string
          p_due_date: string
          p_inspection_id: string
          p_owner: string
          p_reference: string
          p_severity: string
        }
        Returns: {
          corrective_action: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          inspection_id: string
          owner_user_id: string | null
          project_id: string
          reference: string
          severity: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_assurance_ncrs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_record_source_fact: {
        Args: {
          p_excerpt: string
          p_fact_key: string
          p_fact_value: string
          p_method: string
          p_source_id: string
        }
        Returns: {
          created_at: string
          created_by: string
          excerpt: string
          extraction_method: string
          fact_key: string
          fact_value: string
          id: string
          project_id: string
          review_notes: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_source_facts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_register_knowledge_source: {
        Args: {
          p_description?: string
          p_project_id: string
          p_source_type: string
          p_source_uri: string
          p_title: string
        }
        Returns: {
          created_at: string
          created_by: string
          description: string
          id: string
          project_id: string
          review_notes: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_type: string
          source_uri: string
          status: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_knowledge_sources"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_remove_org_membership: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: undefined
      }
      rpos_remove_project_membership: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      rpos_review_ai_recommendation: {
        Args: { p_decision: string; p_id: string; p_rationale: string }
        Returns: {
          agent_key: string
          created_at: string
          created_by: string
          generated_at: string | null
          generation_method: string
          id: string
          model_name: string | null
          project_id: string
          recommendation: string
          review_rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_references: string
          status: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_ai_recommendations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_review_knowledge_source: {
        Args: { p_notes: string; p_source_id: string; p_status: string }
        Returns: {
          created_at: string
          created_by: string
          description: string
          id: string
          project_id: string
          review_notes: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_type: string
          source_uri: string
          status: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_knowledge_sources"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_review_source_fact: {
        Args: { p_fact_id: string; p_notes: string; p_status: string }
        Returns: {
          created_at: string
          created_by: string
          excerpt: string
          extraction_method: string
          fact_key: string
          fact_value: string
          id: string
          project_id: string
          review_notes: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_source_facts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_save_activation_item: {
        Args: {
          p_day: number
          p_dependency?: string
          p_item_id?: string
          p_notes?: string
          p_owner?: string
          p_project_id: string
          p_status?: string
          p_title: string
          p_type: string
          p_workstream: string
        }
        Returns: {
          created_at: string
          created_by: string
          day_number: number
          depends_on: string | null
          id: string
          item_type: string
          notes: string
          owner_user_id: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
          workstream: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_activation_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_save_delivery_record: {
        Args: {
          p_description: string
          p_due_date: string
          p_impact: string
          p_mitigation: string
          p_owner: string
          p_priority: string
          p_project_id: string
          p_record_id?: string
          p_reference: string
          p_status?: string
          p_title: string
          p_type: string
        }
        Returns: {
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          impact: string
          mitigation: string
          owner_user_id: string | null
          priority: string
          project_id: string
          record_type: string
          reference: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_delivery_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_save_readiness_domain: {
        Args: {
          p_domain_id: string
          p_evidence_notes: string
          p_evidence_verified: boolean
          p_hard_stop: boolean
          p_project_id: string
          p_score: number
        }
        Returns: {
          domain_id: string
          evidence_notes: string
          evidence_verified: boolean
          hard_stop: boolean
          project_id: string
          score: number | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "readiness_domain_assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_set_escalation_policy: {
        Args: { p_critical: number; p_org: string; p_warning: number }
        Returns: {
          critical_days: number
          organisation_id: string
          updated_at: string
          updated_by: string
          warning_days: number
        }
        SetofOptions: {
          from: "*"
          to: "rpos_escalation_policies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_set_org_ai_agent: {
        Args: {
          p_agent_key: string
          p_enabled: boolean
          p_org_id: string
          p_reason: string
        }
        Returns: {
          agent_key: string
          enabled: boolean
          organisation_id: string
          reason: string
          updated_at: string
          updated_by: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_ai_agent_settings"
          isOneToOne: true
          isSetofReturn: false
        }
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
      rpos_submit_ai_recommendation: {
        Args: {
          p_agent_key: string
          p_project_id: string
          p_recommendation: string
          p_sources: string
          p_title: string
        }
        Returns: {
          agent_key: string
          created_at: string
          created_by: string
          generated_at: string | null
          generation_method: string
          id: string
          model_name: string | null
          project_id: string
          recommendation: string
          review_rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_references: string
          status: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_ai_recommendations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_submit_generated_recommendation: {
        Args: {
          p_agent_key: string
          p_model: string
          p_project_id: string
          p_recommendation: string
          p_sources: string
          p_title: string
        }
        Returns: {
          agent_key: string
          created_at: string
          created_by: string
          generated_at: string | null
          generation_method: string
          id: string
          model_name: string | null
          project_id: string
          recommendation: string
          review_rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_references: string
          status: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_ai_recommendations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_update_delivery_schedule: {
        Args: {
          p_dependency?: string
          p_finish: string
          p_id: string
          p_progress: number
          p_start: string
          p_status: string
          p_title: string
        }
        Returns: {
          baseline_finish_date: string
          created_at: string
          created_by: string
          depends_on: string | null
          finish_date: string
          id: string
          progress_percent: number
          project_id: string
          start_date: string
          status: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_delivery_schedule"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpos_update_ncr_action: {
        Args: {
          p_action: string
          p_due_date: string
          p_ncr_id: string
          p_status: string
        }
        Returns: {
          corrective_action: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          inspection_id: string
          owner_user_id: string | null
          project_id: string
          reference: string
          severity: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_assurance_ncrs"
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
      rpos_verify_ncr: {
        Args: { p_ncr_id: string; p_notes: string }
        Returns: {
          ncr_id: string
          project_id: string
          verification_notes: string
          verified_at: string
          verified_by: string
        }
        SetofOptions: {
          from: "*"
          to: "rpos_assurance_verifications"
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
