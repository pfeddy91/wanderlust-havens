export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      background_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order: number
          id?: string
          image_url: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string
          description: string | null
          featured_image: string | null
          id: string
          map_image: string | null
          name: string
          region_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          featured_image?: string | null
          id?: string
          map_image?: string | null
          name: string
          region_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          featured_image?: string | null
          id?: string
          map_image?: string | null
          name?: string
          region_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_images: {
        Row: {
          alt_text: string | null
          created_at: string
          hotel_id: string | null
          id: string
          image_url: string
          is_featured: boolean | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          hotel_id?: string | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          hotel_id?: string | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_images_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          country_id: string | null
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          location: string
          name: string
          star_rating: number | null
          updated_at: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          location: string
          name: string
          star_rating?: number | null
          updated_at?: string
        }
        Update: {
          country_id?: string | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          location?: string
          name?: string
          star_rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotels_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          description: string | null
          featured_image: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          featured_image?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          featured_image?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tour_countries: {
        Row: {
          country_id: string | null
          created_at: string
          id: string
          order: number
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          id?: string
          order: number
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          country_id?: string | null
          created_at?: string
          id?: string
          order?: number
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_countries_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_countries_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_highlights: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          order: number
          title: string
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          order: number
          title: string
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          order?: number
          title?: string
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_highlights_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_hotels: {
        Row: {
          created_at: string
          hotel_id: string | null
          id: string
          nights: number
          order: number
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          hotel_id?: string | null
          id?: string
          nights: number
          order: number
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          hotel_id?: string | null
          id?: string
          nights?: number
          order?: number
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_hotels_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_hotels_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_featured: boolean | null
          is_primary: boolean | null
          overall_score: number | null
          search_term: string | null
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order: number
          id?: string
          image_url: string
          is_featured?: boolean | null
          is_primary?: boolean | null
          overall_score?: number | null
          search_term?: string | null
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_featured?: boolean | null
          is_primary?: boolean | null
          overall_score?: number | null
          search_term?: string | null
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_images_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_locations: {
        Row: {
          description: string | null
          id: number
          latitude: number
          longitude: number
          name: string
          order_index: number
          tour_id: string
        }
        Insert: {
          description?: string | null
          id?: number
          latitude: number
          longitude: number
          name: string
          order_index: number
          tour_id: string
        }
        Update: {
          description?: string | null
          id?: number
          latitude?: number
          longitude?: number
          name?: string
          order_index?: number
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tour"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_maps: {
        Row: {
          created_at: string
          distance: string | null
          duration: string | null
          id: string
          route_geojson: Json | null
          static_map_url: string | null
          tour_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distance?: string | null
          duration?: string | null
          id?: string
          route_geojson?: Json | null
          static_map_url?: string | null
          tour_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distance?: string | null
          duration?: string | null
          id?: string
          route_geojson?: Json | null
          static_map_url?: string | null
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_maps_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          created_at: string
          description: string
          duration: number
          featured_image: string | null
          guide_price: number
          id: string
          is_featured: boolean | null
          name: string
          slug: string
          summary: string
          updated_at: string
          vibe_tag: Json | null
        }
        Insert: {
          created_at?: string
          description: string
          duration: number
          featured_image?: string | null
          guide_price: number
          id?: string
          is_featured?: boolean | null
          name: string
          slug: string
          summary: string
          updated_at?: string
          vibe_tag?: Json | null
        }
        Update: {
          created_at?: string
          description?: string
          duration?: number
          featured_image?: string | null
          guide_price?: number
          id?: string
          is_featured?: boolean | null
          name?: string
          slug?: string
          summary?: string
          updated_at?: string
          vibe_tag?: Json | null
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
      vibe_tag:
        | "adventure"
        | "luxury"
        | "romantic"
        | "cultural"
        | "relaxation"
        | "wildlife"
        | "beach"
        | "mountain"
        | "city"
        | "culinary"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
