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
      driver_details: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null
          created_at: string
          current_city: string | null
          dimensions: string | null
          id: string
          is_available: boolean | null
          plate_number: string | null
          truck_type: Database["public"]["Enums"]["truck_type"] | null
        }
        Insert: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          created_at?: string
          current_city?: string | null
          dimensions?: string | null
          id: string
          is_available?: boolean | null
          plate_number?: string | null
          truck_type?: Database["public"]["Enums"]["truck_type"] | null
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          created_at?: string
          current_city?: string | null
          dimensions?: string | null
          id?: string
          is_available?: boolean | null
          plate_number?: string | null
          truck_type?: Database["public"]["Enums"]["truck_type"] | null
        }
        Relationships: []
      }
      load_bids: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          load_id: string
          message: string | null
          price: number
          status: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          load_id: string
          message?: string | null
          price: number
          status?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          load_id?: string
          message?: string | null
          price?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "load_bids_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      loads: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null
          created_at: string
          description: string | null
          dest_lat: number | null
          dest_lng: number | null
          destination: string
          distance: number | null
          driver_id: string | null
          estimated_time: string | null
          id: string
          origin: string
          origin_lat: number | null
          origin_lng: number | null
          owner_id: string
          package_type: string | null
          pickup_date: string | null
          price: number | null
          receiver_address: string | null
          receiver_name: string | null
          receiver_phone: string | null
          status: Database["public"]["Enums"]["load_status"]
          truck_size: string | null
          truck_type_required: Database["public"]["Enums"]["truck_type"] | null
          type: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          created_at?: string
          description?: string | null
          dest_lat?: number | null
          dest_lng?: number | null
          destination: string
          distance?: number | null
          driver_id?: string | null
          estimated_time?: string | null
          id?: string
          origin: string
          origin_lat?: number | null
          origin_lng?: number | null
          owner_id: string
          package_type?: string | null
          pickup_date?: string | null
          price?: number | null
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          status?: Database["public"]["Enums"]["load_status"]
          truck_size?: string | null
          truck_type_required?: Database["public"]["Enums"]["truck_type"] | null
          type?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          created_at?: string
          description?: string | null
          dest_lat?: number | null
          dest_lng?: number | null
          destination?: string
          distance?: number | null
          driver_id?: string | null
          estimated_time?: string | null
          id?: string
          origin?: string
          origin_lat?: number | null
          origin_lng?: number | null
          owner_id?: string
          package_type?: string | null
          pickup_date?: string | null
          price?: number | null
          receiver_address?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          status?: Database["public"]["Enums"]["load_status"]
          truck_size?: string | null
          truck_type_required?: Database["public"]["Enums"]["truck_type"] | null
          type?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          type: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          type?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          type?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country_code: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          load_id: string | null
          rated_by: string
          rated_user: string
          rating: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          load_id?: string | null
          rated_by: string
          rated_user: string
          rating?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          load_id?: string | null
          rated_by?: string
          rated_user?: string
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      receivers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      sub_drivers: {
        Row: {
          assigned_truck_id: string | null
          carrier_id: string
          created_at: string
          driver_name: string
          driver_phone: string | null
          id: string
          id_number: string | null
          license_number: string | null
        }
        Insert: {
          assigned_truck_id?: string | null
          carrier_id: string
          created_at?: string
          driver_name: string
          driver_phone?: string | null
          id?: string
          id_number?: string | null
          license_number?: string | null
        }
        Update: {
          assigned_truck_id?: string | null
          carrier_id?: string
          created_at?: string
          driver_name?: string
          driver_phone?: string | null
          id?: string
          id_number?: string | null
          license_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_drivers_assigned_truck_id_fkey"
            columns: ["assigned_truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          message: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trucks: {
        Row: {
          brand: string | null
          capacity: string | null
          created_at: string
          id: string
          model_year: string | null
          owner_id: string
          plate_number: string
          truck_type: Database["public"]["Enums"]["truck_type"] | null
        }
        Insert: {
          brand?: string | null
          capacity?: string | null
          created_at?: string
          id?: string
          model_year?: string | null
          owner_id: string
          plate_number: string
          truck_type?: Database["public"]["Enums"]["truck_type"] | null
        }
        Update: {
          brand?: string | null
          capacity?: string | null
          created_at?: string
          id?: string
          model_year?: string | null
          owner_id?: string
          plate_number?: string
          truck_type?: Database["public"]["Enums"]["truck_type"] | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "driver" | "shipper"
      body_type:
        | "flatbed"
        | "curtain"
        | "box"
        | "refrigerated"
        | "lowboy"
        | "tank"
      load_status:
        | "available"
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
      truck_type:
        | "trella"
        | "lorry"
        | "dyna"
        | "pickup"
        | "refrigerated"
        | "tanker"
        | "flatbed"
        | "container"
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
      app_role: ["admin", "driver", "shipper"],
      body_type: [
        "flatbed",
        "curtain",
        "box",
        "refrigerated",
        "lowboy",
        "tank",
      ],
      load_status: [
        "available",
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ],
      truck_type: [
        "trella",
        "lorry",
        "dyna",
        "pickup",
        "refrigerated",
        "tanker",
        "flatbed",
        "container",
      ],
    },
  },
} as const
