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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          kind: string
          ref_id: string | null
          subtitle: string | null
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          kind: string
          ref_id?: string | null
          subtitle?: string | null
          title: string
          url?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          ref_id?: string | null
          subtitle?: string | null
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      community_submissions: {
        Row: {
          admin_notes: string
          approved_at: string | null
          created_at: string
          credit_name: string
          deleted_at: string | null
          description: string
          edited_by_admin: boolean
          id: string
          kind: string
          link: string
          material_name: string
          status: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          admin_notes?: string
          approved_at?: string | null
          created_at?: string
          credit_name: string
          deleted_at?: string | null
          description: string
          edited_by_admin?: boolean
          id?: string
          kind?: string
          link?: string
          material_name: string
          status?: string
          updated_at?: string
          user_email?: string
          user_id: string
        }
        Update: {
          admin_notes?: string
          approved_at?: string | null
          created_at?: string
          credit_name?: string
          deleted_at?: string | null
          description?: string
          edited_by_admin?: boolean
          id?: string
          kind?: string
          link?: string
          material_name?: string
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_quotes: {
        Row: {
          author: string
          category: string
          created_at: string
          display_count: number
          end_at: string | null
          id: string
          last_displayed_at: string | null
          sort_order: number
          start_at: string | null
          status: string
          text: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string
          created_at?: string
          display_count?: number
          end_at?: string | null
          id?: string
          last_displayed_at?: string | null
          sort_order?: number
          start_at?: string | null
          status?: string
          text: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          created_at?: string
          display_count?: number
          end_at?: string | null
          id?: string
          last_displayed_at?: string | null
          sort_order?: number
          start_at?: string | null
          status?: string
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      dio_ad_completions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          offer_id: string
          reference: string
          reward_amount: number
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          offer_id: string
          reference: string
          reward_amount?: number
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          offer_id?: string
          reference?: string
          reward_amount?: number
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dio_ad_completions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "dio_ad_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dio_ad_completions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "dio_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      dio_ad_offers: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          id: string
          reward_amount: number
          sort_order: number
          starts_at: string | null
          title: string
          updated_at: string
          url: string
          verification: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          reward_amount?: number
          sort_order?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
          url?: string
          verification?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          reward_amount?: number
          sort_order?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
          url?: string
          verification?: string
        }
        Relationships: []
      }
      dio_transactions: {
        Row: {
          ad_completion_id: string | null
          ad_offer_id: string | null
          admin_id: string | null
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          id: string
          item_id: string | null
          item_kind: string | null
          reason: string
          reference: string
          source: string
          type: string
          user_id: string
        }
        Insert: {
          ad_completion_id?: string | null
          ad_offer_id?: string | null
          admin_id?: string | null
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          id?: string
          item_id?: string | null
          item_kind?: string | null
          reason?: string
          reference: string
          source?: string
          type: string
          user_id: string
        }
        Update: {
          ad_completion_id?: string | null
          ad_offer_id?: string | null
          admin_id?: string | null
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          id?: string
          item_id?: string | null
          item_kind?: string | null
          reason?: string
          reference?: string
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      dio_wallets: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      essentials: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          price: string | null
          sort_order: number
          source: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          price?: string | null
          sort_order?: number
          source?: string | null
          title?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          price?: string | null
          sort_order?: number
          source?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      home_posts: {
        Row: {
          avatar_url: string | null
          bio: string
          created_at: string
          enabled: boolean
          id: string
          link: string
          name: string
          role_title: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          enabled?: boolean
          id?: string
          link?: string
          name?: string
          role_title?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          enabled?: boolean
          id?: string
          link?: string
          name?: string
          role_title?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      home_slides: {
        Row: {
          caption: string
          created_at: string
          enabled: boolean
          id: string
          image_url: string | null
          link: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          caption?: string
          created_at?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          link?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          caption?: string
          created_at?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          link?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      home_stats: {
        Row: {
          caption: string
          created_at: string
          enabled: boolean
          id: string
          label: string
          sort_order: number
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          caption?: string
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          sort_order?: number
          unit?: string
          updated_at?: string
          value?: number
        }
        Update: {
          caption?: string
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          sort_order?: number
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      material_unlocks: {
        Row: {
          amount_paid: number
          id: string
          item_id: string
          item_kind: string
          status: string
          transaction_id: string | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          id?: string
          item_id: string
          item_kind: string
          status?: string
          transaction_id?: string | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          id?: string
          item_id?: string
          item_kind?: string
          status?: string
          transaction_id?: string | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_unlocks_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "dio_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          credit_name: string | null
          description: string
          dio_cost: number
          id: string
          image_url: string | null
          link: string
          slug: string | null
          sort_order: number
          subject: string
          tier: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_name?: string | null
          description?: string
          dio_cost?: number
          id?: string
          image_url?: string | null
          link?: string
          slug?: string | null
          sort_order?: number
          subject: string
          tier?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_name?: string | null
          description?: string
          dio_cost?: number
          id?: string
          image_url?: string | null
          link?: string
          slug?: string | null
          sort_order?: number
          subject?: string
          tier?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      nav_items: {
        Row: {
          created_at: string
          enabled: boolean
          external: boolean
          href: string
          icon: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          external?: boolean
          href: string
          icon?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          external?: boolean
          href?: string
          icon?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          event: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          event: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      portals: {
        Row: {
          created_at: string
          credit_name: string | null
          description: string
          dio_cost: number
          id: string
          link: string
          link_count: number
          logo_url: string | null
          name: string
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_name?: string | null
          description?: string
          dio_cost?: number
          id?: string
          link?: string
          link_count?: number
          logo_url?: string | null
          name: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_name?: string | null
          description?: string
          dio_cost?: number
          id?: string
          link?: string
          link_count?: number
          logo_url?: string | null
          name?: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_guest: boolean
          target: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_guest?: boolean
          target?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_guest?: boolean
          target?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_history: {
        Row: {
          id: string
          mode: string
          period_key: string
          quote_id: string
          shown_at: string
        }
        Insert: {
          id?: string
          mode?: string
          period_key: string
          quote_id: string
          shown_at?: string
        }
        Update: {
          id?: string
          mode?: string
          period_key?: string
          quote_id?: string
          shown_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "daily_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_settings: {
        Row: {
          animation_duration_ms: number
          animation_enabled: boolean
          animation_speed: string
          animation_type: string
          anti_repeat: boolean
          avoid_last_count: number
          card_style: string
          created_at: string
          custom_interval_minutes: number
          display_mode: string
          enabled: boolean
          fixed_quote_id: string | null
          key: string
          lock_quote: boolean
          multi_interval_seconds: number
          multi_layout: string
          quotes_per_day: number
          rotation_frequency: string
          rotation_state: Json
          scheduling_enabled: boolean
          selection_mode: string
          show_author: boolean
          show_category: boolean
          show_icon: boolean
          text_align: string
          timezone: string
          updated_at: string
          visibility: string
        }
        Insert: {
          animation_duration_ms?: number
          animation_enabled?: boolean
          animation_speed?: string
          animation_type?: string
          anti_repeat?: boolean
          avoid_last_count?: number
          card_style?: string
          created_at?: string
          custom_interval_minutes?: number
          display_mode?: string
          enabled?: boolean
          fixed_quote_id?: string | null
          key: string
          lock_quote?: boolean
          multi_interval_seconds?: number
          multi_layout?: string
          quotes_per_day?: number
          rotation_frequency?: string
          rotation_state?: Json
          scheduling_enabled?: boolean
          selection_mode?: string
          show_author?: boolean
          show_category?: boolean
          show_icon?: boolean
          text_align?: string
          timezone?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          animation_duration_ms?: number
          animation_enabled?: boolean
          animation_speed?: string
          animation_type?: string
          anti_repeat?: boolean
          avoid_last_count?: number
          card_style?: string
          created_at?: string
          custom_interval_minutes?: number
          display_mode?: string
          enabled?: boolean
          fixed_quote_id?: string | null
          key?: string
          lock_quote?: boolean
          multi_interval_seconds?: number
          multi_layout?: string
          quotes_per_day?: number
          rotation_frequency?: string
          rotation_state?: Json
          scheduling_enabled?: boolean
          selection_mode?: string
          show_author?: boolean
          show_category?: boolean
          show_icon?: boolean
          text_align?: string
          timezone?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_settings_fixed_quote_id_fkey"
            columns: ["fixed_quote_id"]
            isOneToOne: false
            referencedRelation: "daily_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          body: string
          created_at: string
          hero_image_url: string | null
          id: string
          slug: string
          sort_order: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          hero_image_url?: string | null
          id?: string
          slug: string
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          hero_image_url?: string | null
          id?: string
          slug?: string
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          footer_about: string
          footer_copyright: string
          footer_tagline: string
          hero_headline: string
          hero_image_url: string | null
          hero_subheadline: string
          key: string
          legal_dmca_url: string | null
          legal_privacy_url: string | null
          legal_terms_url: string | null
          logo_url: string | null
          promo_body: string
          promo_code: string
          promo_headline: string
          site_title: string
          support_body: string
          support_email: string
          support_whatsapp: string
          tagline: string
          updated_at: string
        }
        Insert: {
          footer_about?: string
          footer_copyright?: string
          footer_tagline?: string
          hero_headline?: string
          hero_image_url?: string | null
          hero_subheadline?: string
          key: string
          legal_dmca_url?: string | null
          legal_privacy_url?: string | null
          legal_terms_url?: string | null
          logo_url?: string | null
          promo_body?: string
          promo_code?: string
          promo_headline?: string
          site_title?: string
          support_body?: string
          support_email?: string
          support_whatsapp?: string
          tagline?: string
          updated_at?: string
        }
        Update: {
          footer_about?: string
          footer_copyright?: string
          footer_tagline?: string
          hero_headline?: string
          hero_image_url?: string | null
          hero_subheadline?: string
          key?: string
          legal_dmca_url?: string | null
          legal_privacy_url?: string | null
          legal_terms_url?: string | null
          logo_url?: string | null
          promo_body?: string
          promo_code?: string
          promo_headline?: string
          site_title?: string
          support_body?: string
          support_email?: string
          support_whatsapp?: string
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      admin_quote_action: {
        Args: { p_action: string; p_quote_id?: string | null }
        Returns: Json
      }
      dio_ad_award: { Args: { _reference: string }; Returns: Json }
      dio_ad_start: { Args: { _offer_id: string }; Returns: Json }
      dio_admin_adjust: {
        Args: {
          _amount: number
          _reason: string
          _type: string
          _user_id: string
        }
        Returns: Json
      }
      dio_admin_pending_completions: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          offer_id: string
          offer_title: string
          reference: string
          reward_amount: number
          user_id: string
        }[]
      }
      dio_admin_review_completion: {
        Args: { _approve: boolean; _completion_id: string }
        Returns: Json
      }
      dio_admin_stats: { Args: never; Returns: Json }
      dio_admin_transactions: {
        Args: {
          _admin_id?: string
          _from?: string
          _limit?: number
          _min_amount?: number
          _source?: string
          _to?: string
          _type?: string
          _user_id?: string
        }
        Returns: {
          ad_offer_id: string
          admin_email: string
          admin_id: string
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          email: string
          id: string
          item_id: string
          item_kind: string
          reason: string
          reference: string
          source: string
          type: string
          user_id: string
        }[]
      }
      dio_admin_users: {
        Args: { _limit?: number; _search?: string; _sort?: string }
        Returns: {
          balance: number
          display_name: string
          email: string
          user_id: string
        }[]
      }
      dio_unlock: {
        Args: { _item_id: string; _item_kind: string }
        Returns: Json
      }
      get_active_quotes: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
