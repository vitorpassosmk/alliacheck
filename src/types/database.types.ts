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
      users: {
        Row: {
          id: string
          nome: string
          papel: 'ADMIN' | 'SUPERVISOR' | 'CONFERENTE'
          telefone: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id: string
          nome: string
          papel: 'ADMIN' | 'SUPERVISOR' | 'CONFERENTE'
          telefone?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          papel?: 'ADMIN' | 'SUPERVISOR' | 'CONFERENTE'
          telefone?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          id: string
          razao_social: string
          cnpj: string | null
          cidade: string | null
          uf: string | null
          contato_nome: string | null
          contato_telefone: string | null
          ativo: boolean
        }
        Insert: {
          id?: string
          razao_social: string
          cnpj?: string | null
          cidade?: string | null
          uf?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          ativo?: boolean
        }
        Update: {
          id?: string
          razao_social?: string
          cnpj?: string | null
          cidade?: string | null
          uf?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          ativo?: boolean
        }
        Relationships: []
      }
      motoristas: {
        Row: {
          id: string
          nome: string
          cpf: string
          cnh: string
          categoria_cnh: string | null
          validade_cnh: string
          rntrc: string | null
          telefone: string | null
          status: 'ATIVO' | 'INATIVO' | 'BLOQUEADO'
          criado_em: string
        }
        Insert: {
          id?: string
          nome: string
          cpf: string
          cnh: string
          categoria_cnh?: string | null
          validade_cnh: string
          rntrc?: string | null
          telefone?: string | null
          status?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO'
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          cpf?: string
          cnh?: string
          categoria_cnh?: string | null
          validade_cnh?: string
          rntrc?: string | null
          telefone?: string | null
          status?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO'
          criado_em?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          id: string
          placa: string
          tipo: 'VAN' | 'TOCO' | 'TRUCK' | 'BITRUCK' | 'CARRETA' | 'BITREM'
          modelo: string | null
          ano: number | null
          proprietario: string | null
          rntrc: string | null
          ativo: boolean
        }
        Insert: {
          id?: string
          placa: string
          tipo: 'VAN' | 'TOCO' | 'TRUCK' | 'BITRUCK' | 'CARRETA' | 'BITREM'
          modelo?: string | null
          ano?: number | null
          proprietario?: string | null
          rntrc?: string | null
          ativo?: boolean
        }
        Update: {
          id?: string
          placa?: string
          tipo?: 'VAN' | 'TOCO' | 'TRUCK' | 'BITRUCK' | 'CARRETA' | 'BITREM'
          modelo?: string | null
          ano?: number | null
          proprietario?: string | null
          rntrc?: string | null
          ativo?: boolean
        }
        Relationships: []
      }
      fretes: {
        Row: {
          id: string
          cliente_id: string | null
          motorista_id: string | null
          veiculo_id: string | null
          status: 'ABERTO' | 'CARREGANDO' | 'AGUARDANDO_CTE' | 'CTE_EMITIDO' | 'EM_VIAGEM' | 'FINALIZADO' | 'CANCELADO'
          cte_status: 'PENDENTE' | 'AGUARDANDO_NF' | 'NF_RECEBIDA' | 'CT_E_EMITIDO' | 'CT_E_CANCELADO'
          chave_cte: string | null
          origem_cidade: string
          origem_uf: string
          destino_cidade: string
          destino_uf: string
          tipo_veiculo: string | null
          valor_frete: number | null
          data_carregamento: string | null
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          observacoes: string | null
          criado_por: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          cliente_id?: string | null
          motorista_id?: string | null
          veiculo_id?: string | null
          status?: 'ABERTO' | 'CARREGANDO' | 'AGUARDANDO_CTE' | 'CTE_EMITIDO' | 'EM_VIAGEM' | 'FINALIZADO' | 'CANCELADO'
          cte_status?: 'PENDENTE' | 'AGUARDANDO_NF' | 'NF_RECEBIDA' | 'CT_E_EMITIDO' | 'CT_E_CANCELADO'
          chave_cte?: string | null
          origem_cidade: string
          origem_uf: string
          destino_cidade: string
          destino_uf: string
          tipo_veiculo?: string | null
          valor_frete?: number | null
          data_carregamento?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          observacoes?: string | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          cliente_id?: string | null
          motorista_id?: string | null
          veiculo_id?: string | null
          status?: 'ABERTO' | 'CARREGANDO' | 'AGUARDANDO_CTE' | 'CTE_EMITIDO' | 'EM_VIAGEM' | 'FINALIZADO' | 'CANCELADO'
          cte_status?: 'PENDENTE' | 'AGUARDANDO_NF' | 'NF_RECEBIDA' | 'CT_E_EMITIDO' | 'CT_E_CANCELADO'
          chave_cte?: string | null
          origem_cidade?: string
          origem_uf?: string
          destino_cidade?: string
          destino_uf?: string
          tipo_veiculo?: string | null
          valor_frete?: number | null
          data_carregamento?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          observacoes?: string | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fretes_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fretes_motorista_id_fkey'
            columns: ['motorista_id']
            isOneToOne: false
            referencedRelation: 'motoristas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fretes_veiculo_id_fkey'
            columns: ['veiculo_id']
            isOneToOne: false
            referencedRelation: 'veiculos'
            referencedColumns: ['id']
          }
        ]
      }
      documentos: {
        Row: {
          id: string
          frete_id: string
          tipo: 'NFE' | 'CTE' | 'CNH' | 'CRLV' | 'RNTRC' | 'OUTROS'
          nome_arquivo: string
          url: string
          chave_acesso: string | null
          valor: number | null
          enviado_por: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          frete_id: string
          tipo: 'NFE' | 'CTE' | 'CNH' | 'CRLV' | 'RNTRC' | 'OUTROS'
          nome_arquivo: string
          url: string
          chave_acesso?: string | null
          valor?: number | null
          enviado_por?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          frete_id?: string
          tipo?: 'NFE' | 'CTE' | 'CNH' | 'CRLV' | 'RNTRC' | 'OUTROS'
          nome_arquivo?: string
          url?: string
          chave_acesso?: string | null
          valor?: number | null
          enviado_por?: string | null
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: 'documentos_frete_id_fkey'
            columns: ['frete_id']
            isOneToOne: false
            referencedRelation: 'fretes'
            referencedColumns: ['id']
          }
        ]
      }
      eventos: {
        Row: {
          id: string
          frete_id: string
          tipo: string
          descricao: string | null
          status_anterior: string | null
          status_novo: string | null
          usuario_id: string | null
          ip_address: string | null
          user_agent: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          frete_id: string
          tipo: string
          descricao?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          usuario_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          frete_id?: string
          tipo?: string
          descricao?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          usuario_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: 'eventos_frete_id_fkey'
            columns: ['frete_id']
            isOneToOne: false
            referencedRelation: 'fretes'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
