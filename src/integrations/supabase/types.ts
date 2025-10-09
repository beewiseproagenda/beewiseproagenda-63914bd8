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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      atendimentos: {
        Row: {
          cliente_id: string
          created_at: string
          data: string
          end_at: string | null
          forma_pagamento: string
          hora: string
          id: string
          observacoes: string | null
          occurrence_date: string | null
          recurring_rule_id: string | null
          rule_id: string | null
          servico: string
          start_at_utc: string | null
          status: string
          tz: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data: string
          end_at?: string | null
          forma_pagamento: string
          hora: string
          id?: string
          observacoes?: string | null
          occurrence_date?: string | null
          recurring_rule_id?: string | null
          rule_id?: string | null
          servico: string
          start_at_utc?: string | null
          status: string
          tz?: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data?: string
          end_at?: string | null
          forma_pagamento?: string
          hora?: string
          id?: string
          observacoes?: string | null
          occurrence_date?: string | null
          recurring_rule_id?: string | null
          rule_id?: string | null
          servico?: string
          start_at_utc?: string | null
          status?: string
          tz?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          agendamento_fixo: Json | null
          cpf_cnpj: string
          criado_em: string
          email: string
          endereco: Json
          id: string
          nome: string
          pacote_id: string | null
          recorrencia: string | null
          recorrente: boolean | null
          telefone: string
          tipo_cobranca: string | null
          tipo_pessoa: string
          ultimo_atendimento: string | null
          user_id: string
        }
        Insert: {
          agendamento_fixo?: Json | null
          cpf_cnpj: string
          criado_em?: string
          email: string
          endereco?: Json
          id?: string
          nome: string
          pacote_id?: string | null
          recorrencia?: string | null
          recorrente?: boolean | null
          telefone: string
          tipo_cobranca?: string | null
          tipo_pessoa: string
          ultimo_atendimento?: string | null
          user_id: string
        }
        Update: {
          agendamento_fixo?: Json | null
          cpf_cnpj?: string
          criado_em?: string
          email?: string
          endereco?: Json
          id?: string
          nome?: string
          pacote_id?: string | null
          recorrencia?: string | null
          recorrente?: boolean | null
          telefone?: string
          tipo_cobranca?: string | null
          tipo_pessoa?: string
          ultimo_atendimento?: string | null
          user_id?: string
        }
        Relationships: []
      }
      despesas: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          id: string
          observacoes: string | null
          recorrencia: Json | null
          recorrente: boolean | null
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data: string
          descricao: string
          id?: string
          observacoes?: string | null
          recorrencia?: Json | null
          recorrente?: boolean | null
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          recorrencia?: Json | null
          recorrente?: boolean | null
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          due_date: string
          id: string
          kind: string
          note: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          kind: string
          note?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          kind?: string
          note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      mercadopago_payments: {
        Row: {
          amount: number | null
          approved_at: string | null
          created_at: string
          currency: string | null
          external_reference: string | null
          id: string
          payment_id: string
          payment_method: string | null
          status: string
          updated_at: string
          user_email: string
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          created_at: string
          currency?: string | null
          external_reference?: string | null
          id?: string
          payment_id: string
          payment_method?: string | null
          status: string
          updated_at?: string
          user_email: string
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          created_at?: string
          currency?: string | null
          external_reference?: string | null
          id?: string
          payment_id?: string
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      mercadopago_webhooks: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          request_id: string
          signature_valid: boolean
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          request_id: string
          signature_valid?: boolean
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          request_id?: string
          signature_valid?: boolean
        }
        Relationships: []
      }
      mp_events: {
        Row: {
          created_at: string | null
          id: number
          payload: Json | null
          resource_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          payload?: Json | null
          resource_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          payload?: Json | null
          resource_id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      mp_subscriptions: {
        Row: {
          created_at: string
          external_reference: string
          id: number
          init_point: string | null
          mp_preapproval_id: string | null
          mp_preference_id: string | null
          plan: string
          raw_response: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_reference: string
          id?: number
          init_point?: string | null
          mp_preapproval_id?: string | null
          mp_preference_id?: string | null
          plan: string
          raw_response?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_reference?: string
          id?: number
          init_point?: string | null
          mp_preapproval_id?: string | null
          mp_preference_id?: string | null
          plan?: string
          raw_response?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          code: string
          created_at: string | null
          id: string
          interval: string
          is_active: boolean | null
          mp_preapproval_plan_id: string
          price_cents: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          interval: string
          is_active?: boolean | null
          mp_preapproval_plan_id: string
          price_cents: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          interval?: string
          is_active?: boolean | null
          mp_preapproval_plan_id?: string
          price_cents?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dark_mode_enabled: boolean
          first_name: string
          id: string
          last_name: string
          phone: string | null
          pwa_install_guide_disabled: boolean
          subscription_active: boolean | null
          subscription_status: string
          subscription_updated_at: string | null
          trial_days: number
          trial_expires_at: string | null
          trial_started_at: string | null
          tz: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dark_mode_enabled?: boolean
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          pwa_install_guide_disabled?: boolean
          subscription_active?: boolean | null
          subscription_status?: string
          subscription_updated_at?: string | null
          trial_days?: number
          trial_expires_at?: string | null
          trial_started_at?: string | null
          tz?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dark_mode_enabled?: boolean
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          pwa_install_guide_disabled?: boolean
          subscription_active?: boolean | null
          subscription_status?: string
          subscription_updated_at?: string | null
          trial_days?: number
          trial_expires_at?: string | null
          trial_started_at?: string | null
          tz?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receitas: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          forma_pagamento: string
          id: string
          observacoes: string | null
          recorrencia: Json | null
          recorrente: boolean | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data: string
          descricao: string
          forma_pagamento: string
          id?: string
          observacoes?: string | null
          recorrencia?: Json | null
          recorrente?: boolean | null
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          recorrencia?: Json | null
          recorrente?: boolean | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          active: boolean
          amount: number | null
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          interval_weeks: number
          occurrences_limit: number | null
          start_date: string
          time_local: string
          timezone: string
          title: string
          updated_at: string
          user_id: string
          weekdays: number[]
        }
        Insert: {
          active?: boolean
          amount?: number | null
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          interval_weeks?: number
          occurrences_limit?: number | null
          start_date: string
          time_local: string
          timezone?: string
          title: string
          updated_at?: string
          user_id: string
          weekdays: number[]
        }
        Update: {
          active?: boolean
          amount?: number | null
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          interval_weeks?: number
          occurrences_limit?: number | null
          start_date?: string
          time_local?: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      sensitive_data_audit: {
        Row: {
          accessed_at: string | null
          action: string
          id: string
          ip_address: unknown | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          id?: string
          ip_address?: unknown | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          id?: string
          ip_address?: unknown | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      servicos_pacotes: {
        Row: {
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          payment_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          payment_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          payment_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          id: string
          mp_preapproval_id: string | null
          next_charge_at: string | null
          plan_code: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          id?: string
          mp_preapproval_id?: string | null
          next_charge_at?: string | null
          plan_code: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          id?: string
          mp_preapproval_id?: string | null
          next_charge_at?: string | null
          plan_code?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_materialize_rule: {
        Args: { p_rule_id: string; p_window_days?: number }
        Returns: Json
      }
      fn_prune_rule_future: {
        Args: { p_rule_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_cnpj: {
        Args: { cnpj: string }
        Returns: boolean
      }
      validate_cpf: {
        Args: { cpf: string }
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
