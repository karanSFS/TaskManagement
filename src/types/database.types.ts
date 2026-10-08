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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          comment_id: string | null
          created_at: string
          file_name: string
          id: string
          issue_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          file_name: string
          id?: string
          issue_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          file_name?: string
          id?: string
          issue_id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          issue_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          issue_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          issue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_history: {
        Row: {
          actor_id: string | null
          created_at: string
          field: string
          id: string
          issue_id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          field: string
          id?: string
          issue_id: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          field?: string
          id?: string
          issue_id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_history_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_labels: {
        Row: {
          created_at: string
          issue_id: string
          label_id: string
        }
        Insert: {
          created_at?: string
          issue_id: string
          label_id: string
        }
        Update: {
          created_at?: string
          issue_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_labels_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_links: {
        Row: {
          created_at: string
          created_by: string
          id: string
          link_type: string
          source_issue_id: string
          target_issue_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          link_type: string
          source_issue_id: string
          target_issue_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          link_type?: string
          source_issue_id?: string
          target_issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_links_source_issue_id_fkey"
            columns: ["source_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_links_target_issue_id_fkey"
            columns: ["target_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_statuses: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          position: number
          slug: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      issue_types: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      issues: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          issue_number: number
          issue_type_id: string
          parent_issue_id: string | null
          priority_id: string
          project_id: string
          reporter_id: string
          sprint_id: string | null
          status_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          issue_number: number
          issue_type_id: string
          parent_issue_id?: string | null
          priority_id: string
          project_id: string
          reporter_id: string
          sprint_id?: string | null
          status_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          issue_number?: number
          issue_type_id?: string
          parent_issue_id?: string | null
          priority_id?: string
          project_id?: string
          reporter_id?: string
          sprint_id?: string | null
          status_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_issue_type_id_fkey"
            columns: ["issue_type_id"]
            isOneToOne: false
            referencedRelation: "issue_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_parent_issue_id_fkey"
            columns: ["parent_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "issue_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          id: string
          issue_id: string | null
          kind: string
          project_id: string | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          issue_id?: string | null
          kind: string
          project_id?: string | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          issue_id?: string | null
          kind?: string
          project_id?: string | null
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      priorities: {
        Row: {
          created_at: string
          id: string
          name: string
          rank: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          rank: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          rank?: number
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string
          icon: string | null
          id: string
          key: string
          lead_id: string | null
          name: string
          next_issue_number: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string
          icon?: string | null
          id?: string
          key: string
          lead_id?: string | null
          name: string
          next_issue_number?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          icon?: string | null
          id?: string
          key?: string
          lead_id?: string | null
          name?: string
          next_issue_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_issues: {
        Row: {
          created_at: string
          issue_id: string
          sprint_id: string
        }
        Insert: {
          created_at?: string
          issue_id: string
          sprint_id: string
        }
        Update: {
          created_at?: string
          issue_id?: string
          sprint_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_issues_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: true
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_issues_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          created_at: string
          created_by: string
          end_date: string | null
          goal: string
          id: string
          name: string
          project_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date?: string | null
          goal?: string
          id?: string
          name: string
          project_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string | null
          goal?: string
          id?: string
          name?: string
          project_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_project_member: {
        Args: {
          member_email: string
          member_role: string
          target_project_id: string
        }
        Returns: string
      }
      complete_sprint: { Args: { target_sprint_id: string }; Returns: string }
      project_issue_counts: {
        Args: never
        Returns: {
          done_count: number
          open_count: number
          project_id: string
        }[]
      }
      search_issues: {
        Args: {
          assignee_filter?: string
          page_limit?: number
          page_offset?: number
          search_text?: string
          sort_ascending?: boolean
          sort_by?: string
          target_priority_id?: string
          target_project_id?: string
          target_status_id?: string
          target_type_id?: string
        }
        Returns: {
          assignee_name: string
          id: string
          issue_number: number
          priority_name: string
          project_key: string
          project_name: string
          status_name: string
          title: string
          total_count: number
          updated_at: string
        }[]
      }
      start_sprint: { Args: { target_sprint_id: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
