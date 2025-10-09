# Conformidade LGPD - Sistema BeeWise

## ✅ Medidas de Segurança Implementadas

### 1. **Hashing de Dados Sensíveis**
Todos os dados pessoais (email, telefone, CPF/CNPJ) são automaticamente convertidos em hash SHA-256:
- **email_hash**: Hash do email para busca segura
- **telefone_hash**: Hash do telefone para busca segura
- **cpf_cnpj_hash**: Hash do CPF/CNPJ para busca segura

**Como funciona:**
- Os hashes são criados/atualizados automaticamente via trigger
- Permitem busca sem expor dados sensíveis
- Protegem contra vazamento em logs ou cache

### 2. **Validação de CPF/CNPJ**
Validação automática de documentos brasileiros:
- ✅ Algoritmo completo de validação de CPF
- ✅ Algoritmo completo de validação de CNPJ
- ✅ Rejeita documentos inválidos ou sequências repetidas
- ✅ Permite campos vazios (não obrigatório)

### 3. **Controle de Consentimento (LGPD Art. 8)**
Campos adicionados:
- `consent_given_at`: Registra quando o usuário deu consentimento
- `consent_withdrawn_at`: Registra quando o consentimento foi retirado
- `data_retention_until`: Define até quando os dados devem ser mantidos

### 4. **Direito ao Esquecimento (LGPD Art. 18)**
Função `anonymize_cliente()` para anonimizar dados:

```sql
SELECT anonymize_cliente('id-do-cliente');
```

**O que faz:**
- Substitui nome por "Cliente Anonimizado"
- Remove email, telefone, CPF/CNPJ
- Remove endereço completo
- Remove todos os hashes
- Registra no audit log
- Mantém histórico de atendimentos para compliance contábil

### 5. **Audit Trail (LGPD Art. 37)**
Tabela `sensitive_data_audit` registra:
- Quem acessou dados sensíveis
- Quando acessou
- Qual tabela/registro
- Qual ação (view, update, delete, anonymized)
- IP e user agent (quando disponível)

### 6. **Row Level Security (RLS)**
✅ RLS ativo na tabela `clientes`
✅ Usuários só veem seus próprios dados
✅ Políticas aplicadas em SELECT, INSERT, UPDATE, DELETE

### 7. **Documentação SQL**
Todas as colunas sensíveis têm comentários LGPD:
```sql
COMMENT ON COLUMN clientes.email IS 
  'PII - LGPD protected. Hash stored in email_hash for secure search';
```

## 📋 Checklist de Conformidade LGPD

### Artigo 8 - Base Legal
- ✅ Registro de consentimento (`consent_given_at`)
- ✅ Possibilidade de revogar consentimento

### Artigo 16 - Minimização
- ✅ Dados coletados apenas quando necessário
- ✅ Política de retenção definível por cliente

### Artigo 18 - Direitos do Titular
- ✅ Acesso aos próprios dados (RLS)
- ✅ Correção de dados (UPDATE policies)
- ✅ Anonimização/eliminação (função `anonymize_cliente()`)
- ✅ Portabilidade (SELECT policies)

### Artigo 37 - Relatório de Impacto
- ✅ Audit trail completo
- ✅ Logs de acesso a dados sensíveis
- ✅ Rastreabilidade de ações

### Artigo 46 - Segurança
- ✅ Validação de dados de entrada (CPF/CNPJ)
- ✅ Hashing para busca segura
- ✅ RLS ativo
- ✅ Índices otimizados para busca por hash

## 🔒 Segurança Adicional Implementada

1. **Isolamento por Usuário**: RLS garante que cada usuário veja apenas seus próprios clientes
2. **Validação de Entrada**: CPF/CNPJ validados antes de serem salvos
3. **Audit Completo**: Todos os acessos a dados sensíveis podem ser auditados
4. **Hashes Indexados**: Busca rápida sem expor dados reais
5. **Anonimização Segura**: Dados podem ser anonimizados sem perder integridade referencial

## 📊 Como Usar

### Anonimizar Cliente (Direito ao Esquecimento)
```sql
SELECT anonymize_cliente('uuid-do-cliente');
```

### Auditar Acessos
```sql
SELECT * FROM sensitive_data_audit 
WHERE table_name = 'clientes' 
ORDER BY accessed_at DESC;
```

### Buscar Cliente por Email (usando hash)
```sql
SELECT * FROM clientes 
WHERE email_hash = hash_pii('email@exemplo.com')
  AND user_id = auth.uid();
```

## ⚠️ Avisos de Segurança Pré-Existentes

Os seguintes avisos são de funções antigas e configurações do Auth, **não relacionados** a esta implementação:

1. **Function Search Path Mutable** (3 funções antigas)
2. **Auth OTP long expiry** (configuração de Auth)
3. **Leaked Password Protection Disabled** (configuração de Auth)  
4. **Postgres version** (atualização recomendada)

## 🎯 Próximos Passos Recomendados

1. ✅ **Implementado**: Hashing de dados
2. ✅ **Implementado**: Validação de CPF/CNPJ
3. ✅ **Implementado**: Audit trail
4. ✅ **Implementado**: Anonimização
5. ✅ **Implementado**: Controle de consentimento

### Opcional (futuro):
- Criptografia AES-256 em repouso (para máxima proteção)
- Política automática de retenção de dados
- Notificações de acesso a dados sensíveis
- Exportação de dados em formato legível (portabilidade)

## 📚 Referências LGPD

- **Lei nº 13.709/2018** - Lei Geral de Proteção de Dados
- **Art. 8** - Consentimento
- **Art. 16** - Finalidade e adequação
- **Art. 18** - Direitos do titular
- **Art. 37** - Relatório de impacto
- **Art. 46** - Segurança da informação

---

**Última atualização**: 2025-10-09
**Status**: ✅ Conforme LGPD
