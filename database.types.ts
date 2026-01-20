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
      admin_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          pickup_request_id: string
          provider_profile_id: string
          requester_profile_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          trip_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          pickup_request_id: string
          provider_profile_id: string
          requester_profile_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          trip_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          pickup_request_id?: string
          provider_profile_id?: string
          requester_profile_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_pickup_request_id_fkey"
            columns: ["pickup_request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_message_reads: {
        Row: {
          id: string
          invite_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          invite_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          invite_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_message_reads_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          invite_id: string
          pickup_group_id: string | null
          pickup_request_id: string | null
          provider_id: string
          requester_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          invite_id: string
          pickup_group_id?: string | null
          pickup_request_id?: string | null
          provider_id: string
          requester_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          invite_id?: string
          pickup_group_id?: string | null
          pickup_request_id?: string | null
          provider_id?: string
          requester_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_messages_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_messages_pickup_group_id_fkey"
            columns: ["pickup_group_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_messages_pickup_request_id_fkey"
            columns: ["pickup_request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_messages_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_requests: {
        Row: {
          cancel_approved_at: string | null
          cancel_approved_by: string | null
          cancel_reason_code: string | null
          cancel_reason_text: string | null
          cancel_requested_at: string | null
          created_at: string
          destination_lat: number
          destination_lng: number
          destination_text: string
          id: string
          origin_lat: number
          origin_lng: number
          origin_text: string
          picked_up_at: string | null
          pickup_time: string
          progress_stage: string | null
          requester_profile_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          cancel_approved_at?: string | null
          cancel_approved_by?: string | null
          cancel_reason_code?: string | null
          cancel_reason_text?: string | null
          cancel_requested_at?: string | null
          created_at?: string
          destination_lat: number
          destination_lng: number
          destination_text: string
          id?: string
          origin_lat: number
          origin_lng: number
          origin_text: string
          picked_up_at?: string | null
          pickup_time: string
          progress_stage?: string | null
          requester_profile_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          cancel_approved_at?: string | null
          cancel_approved_by?: string | null
          cancel_reason_code?: string | null
          cancel_reason_text?: string | null
          cancel_requested_at?: string | null
          created_at?: string
          destination_lat?: number
          destination_lng?: number
          destination_text?: string
          id?: string
          origin_lat?: number
          origin_lng?: number
          origin_text?: string
          picked_up_at?: string | null
          pickup_time?: string
          progress_stage?: string | null
          requester_profile_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_requests_cancel_approved_by_fkey"
            columns: ["cancel_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_requests_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clerk_user_id: string
          created_at: string
          id: string
          role: string | null
          school_name: string | null
          updated_at: string
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          id?: string
          role?: string | null
          school_name?: string | null
          updated_at?: string
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          id?: string
          role?: string | null
          school_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_documents: {
        Row: {
          created_at: string
          document_type: string
          file_path: string
          id: string
          provider_profile_id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_path: string
          id?: string
          provider_profile_id: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_path?: string
          id?: string
          provider_profile_id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_documents_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_arrivals: {
        Row: {
          created_at: string
          id: string
          photo_path: string
          pickup_request_id: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_path: string
          pickup_request_id: string
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_path?: string
          pickup_request_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_arrivals_pickup_request_id_fkey"
            columns: ["pickup_request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_arrivals_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_participants: {
        Row: {
          created_at: string
          id: string
          is_met_at_pickup: boolean
          pickup_request_id: string
          requester_profile_id: string
          sequence_order: number | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_met_at_pickup?: boolean
          pickup_request_id: string
          requester_profile_id: string
          sequence_order?: number | null
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_met_at_pickup?: boolean
          pickup_request_id?: string
          requester_profile_id?: string
          sequence_order?: number | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_participants_pickup_request_id_fkey"
            columns: ["pickup_request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_participants_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_participants_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          pickup_request_id: string
          provider_profile_id: string
          rating: number
          reviewer_profile_id: string
          trip_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          pickup_request_id: string
          provider_profile_id: string
          rating: number
          reviewer_profile_id: string
          trip_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          pickup_request_id?: string
          provider_profile_id?: string
          rating?: number
          reviewer_profile_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_reviews_pickup_request_id_fkey"
            columns: ["pickup_request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reviews_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reviews_reviewer_profile_id_fkey"
            columns: ["reviewer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          arrived_at: string | null
          capacity: number
          completed_at: string | null
          created_at: string
          id: string
          is_locked: boolean
          is_test: boolean
          provider_profile_id: string
          scheduled_start_at: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["trip_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          arrived_at?: string | null
          capacity?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          is_test?: boolean
          provider_profile_id: string
          scheduled_start_at?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          arrived_at?: string | null
          capacity?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          is_test?: boolean
          provider_profile_id?: string
          scheduled_start_at?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_status: "PENDING" | "APPROVED" | "REJECTED"
      invitation_status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED"
      request_status:
        | "REQUESTED"
        | "MATCHED"
        | "IN_PROGRESS"
        | "ARRIVED"
        | "COMPLETED"
        | "CANCELLED"
        | "EXPIRED"
      trip_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "ARRIVED"
        | "COMPLETED"
        | "CANCELLED"
        | "LOCKED"
        | "EXPIRED"
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
      document_status: ["PENDING", "APPROVED", "REJECTED"],
      invitation_status: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"],
      request_status: [
        "REQUESTED",
        "MATCHED",
        "IN_PROGRESS",
        "ARRIVED",
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
      ],
      trip_status: [
        "OPEN",
        "IN_PROGRESS",
        "ARRIVED",
        "COMPLETED",
        "CANCELLED",
        "LOCKED",
        "EXPIRED",
      ],
    },
  },
} as const
