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
          tipo_motorista: 'FROTA' | 'AGREGADO' | null
          banco: string | null
          agencia_conta: string | null
          chave_pix: string | null
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
          tipo_motorista?: 'FROTA' | 'AGREGADO' | null
          banco?: string | null
          agencia_conta?: string | null
          chave_pix?: string | null
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
          tipo_motorista?: 'FROTA' | 'AGREGADO' | null
          banco?: string | null
          agencia_conta?: string | null
          chave_pix?: string | null
          criado_em?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          id: string
          placa: string
          tipo: 'VAN' | 'TOCO' | 'TRUCK' | 'BITRUCK' | 'CARRETA' | 'CARRETA_LS' | 'BITREM'
          modelo: string | null
          ano: number | null
          proprietario: string | null
          rntrc: string | null
          ativo: boolean
          tipo_veiculo: 'FROTA' | 'AGREGADO' | null
          tem_placas_separadas: boolean
          placa_carreta: string | null
          cpf_proprietario: string | null
          cnpj_proprietario: string | null
          banco_proprietario: string | null
          agencia_conta_proprietario: string | null
          chave_pix_proprietario: string | null
        }
        Insert: {
          id?: string
          placa: string
          tipo: 'VAN' | 'TOCO' | 'TRUCK' | 'BITRUCK' | 'CARRETA' | 'CARRETA_LS' | 'BITREM'
          modelo?: string | null
          ano?: number | null
          proprietario?: string | null
          rntrc?: string | null
          ativo?: boolean
          tipo_veiculo?: 'FROTA' | 'AGREGADO' | null
          tem_placas_separadas?: boolean
          placa_carreta?: string | null
          cpf_proprietario?: string | null
          cnpj_proprietario?: string | null
          banco_proprietario?: string | null
          agencia_conta_proprietario?: string | null
          chave_pix_proprietario?: string | null
        }
        Update: {
          id?: string
          placa?: string
          tipo?: 'VAN' | 'TOCO' | 'TRUCK' | 'BITRUCK' | 'CARRETA' | 'CARRETA_LS' | 'BITREM'
          modelo?: string | null
          ano?: number | null
          proprietario?: string | null
          rntrc?: string | null
          ativo?: boolean
          tipo_veiculo?: 'FROTA' | 'AGREGADO' | null
          tem_placas_separadas?: boolean
          placa_carreta?: string | null
          cpf_proprietario?: string | null
          cnpj_proprietario?: string | null
          banco_proprietario?: string | null
          agencia_conta_proprietario?: string | null
          chave_pix_proprietario?: string | null
        }
        Relationships: []
      }
      fretes: {
        Row: {
          id: string
          numero_frete: string
          cliente_id: string | null
          motorista_id: string | null
          veiculo_id: string | null
          status: 'ABERTO' | 'PROGRAMADO' | 'CARREGANDO' | 'CTE_EMITIDO' | 'AGUARDANDO_LIBERACAO' | 'EM_VIAGEM' | 'CONCLUIDA' | 'CANCELADO'
          chave_cte: string | null
          origem_cidade: string
          origem_uf: string
          destino_cidade: string
          destino_uf: string
          tipo_veiculo: string | null
          tipo_produto: string | null
          valor_frete: number | null
          valor_mercadoria: number | null
          data_carregamento: string | null
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          numero_gr: string | null
          numero_contrato: string | null
          numero_ciot: string | null
          valor_adiantamento: number | null
          observacoes: string | null
          criado_por: string | null
          criado_em: string
          atualizado_em: string
          custo_agregado: number | null
          adiantamento_pago_em: string | null
          adiantamento_pago_por: string | null
          pago_em: string | null
          pago_por: string | null
          excluido_em: string | null
          excluido_por: string | null
          placa_carreta: string | null
        }
        Insert: {
          id?: string
          numero_frete: string
          cliente_id?: string | null
          motorista_id?: string | null
          veiculo_id?: string | null
          status?: 'ABERTO' | 'PROGRAMADO' | 'CARREGANDO' | 'CTE_EMITIDO' | 'AGUARDANDO_LIBERACAO' | 'EM_VIAGEM' | 'CONCLUIDA' | 'CANCELADO'
          chave_cte?: string | null
          origem_cidade: string
          origem_uf: string
          destino_cidade: string
          destino_uf: string
          tipo_veiculo?: string | null
          tipo_produto?: string | null
          valor_frete?: number | null
          valor_mercadoria?: number | null
          data_carregamento?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          numero_gr?: string | null
          numero_contrato?: string | null
          numero_ciot?: string | null
          valor_adiantamento?: number | null
          observacoes?: string | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
          custo_agregado?: number | null
          adiantamento_pago_em?: string | null
          adiantamento_pago_por?: string | null
          pago_em?: string | null
          pago_por?: string | null
          excluido_em?: string | null
          excluido_por?: string | null
          placa_carreta?: string | null
        }
        Update: {
          id?: string
          numero_frete?: string
          cliente_id?: string | null
          motorista_id?: string | null
          veiculo_id?: string | null
          status?: 'ABERTO' | 'PROGRAMADO' | 'CARREGANDO' | 'CTE_EMITIDO' | 'AGUARDANDO_LIBERACAO' | 'EM_VIAGEM' | 'CONCLUIDA' | 'CANCELADO'
          chave_cte?: string | null
          origem_cidade?: string
          origem_uf?: string
          destino_cidade?: string
          destino_uf?: string
          tipo_veiculo?: string | null
          tipo_produto?: string | null
          valor_frete?: number | null
          valor_mercadoria?: number | null
          data_carregamento?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          numero_gr?: string | null
          numero_contrato?: string | null
          numero_ciot?: string | null
          valor_adiantamento?: number | null
          observacoes?: string | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
          custo_agregado?: number | null
          adiantamento_pago_em?: string | null
          adiantamento_pago_por?: string | null
          pago_em?: string | null
          pago_por?: string | null
          excluido_em?: string | null
          excluido_por?: string | null
          placa_carreta?: string | null
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
          },
          {
            foreignKeyName: 'eventos_usuario_id_fkey_public'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'users'
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

// Evento com JOIN de users (usado no EventTimeline para mostrar nome do funcionário)
export type EventoComUsuario = Tables<'eventos'> & {
  users: Pick<Tables<'users'>, 'nome' | 'papel'> | null
}
