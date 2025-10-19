# Checklist de Testes - Correções Cirúrgicas BeeWise

## Resumo das Correções Implementadas

### 1. Modal de Agendamento - Contexto Preservado
- ✅ Modal não herda mais dados do último agendamento
- ✅ Contexto de data/hora preservado ao abrir modal
- ✅ Botões "Salvar e Novo" e "Duplicar" implementados

### 2. Edição de Agendamentos - Data/Hora Corrigida
- ✅ Conversões Local↔UTC padronizadas com helpers centralizados
- ✅ Edição não muda data para dia anterior
- ✅ Não é mais necessário tocar no campo hora ao editar
- ✅ Feature flag `STRICT_TIMEZONE` ativada

### 3. Financeiro - Competência vs Recebimento
- ✅ Campo `recebimento_posterior` adicionado em clientes
- ✅ Campos `competencia_date` e `recebimento_previsto` em atendimentos
- ✅ Trigger automático para calcular recebimento (+1 mês se convênio)
- ✅ Função SQL para cálculo de data de recebimento

### 4. Recorrências - Valores Propagados
- ✅ Materialização atualizada para propagar valores de pacotes
- ✅ Valores refletem no dashboard e financeiro
- ✅ Edições manuais são respeitadas (não sobrescrevem)
- ✅ Flag de recebimento posterior considerada nas projeções

### 5. Input Validation
- ✅ Validação completa na edge function `create-appointment`
- ✅ Validação de campos obrigatórios
- ✅ Validação de tipos e limites
- ✅ Validação de enums

---

## Roteiro de Testes Manuais

### Teste 1: Modal Não Herda Dados

**Objetivo:** Garantir que o modal sempre abre limpo ou com contexto correto

**Passos:**
1. Abrir "Novo Atendimento" sem contexto
   - ✅ Deve mostrar hoje + hora padrão (08:00)
2. Preencher todos os campos e salvar
3. Abrir "Novo Atendimento" novamente
   - ✅ Deve mostrar formulário vazio/resetado
   - ✅ Não deve conter dados do agendamento anterior
4. Clicar em um dia do calendário
5. Clicar em "Novo Atendimento"
   - ✅ Deve mostrar o dia selecionado + hora padrão
   - ✅ Cabeçalho deve exibir: "Criando para Sex, 01/11 às 08:00"

**Resultado esperado:** ✅ Formulário sempre reseta corretamente

---

### Teste 2: Edição Sem Mudança de Data

**Objetivo:** Editar agendamento sem tocar na hora não deve alterar data/hora

**Passos:**
1. Criar um agendamento para amanhã às 14:30
2. Aguardar salvar e listar
3. Clicar em "Editar" no agendamento criado
4. Modal deve abrir com:
   - ✅ Data: amanhã
   - ✅ Hora: 14:30 (preenchido e formatado)
5. Alterar apenas o campo "Observações"
6. Salvar sem tocar em data/hora
   - ✅ Não deve pedir para "tocar no campo hora"
   - ✅ Data e hora devem permanecer iguais
7. Verificar no banco: `start_at_utc` deve ser o mesmo

**Resultado esperado:** ✅ Data e hora preservadas na edição

---

### Teste 3: Recebimento Posterior (Convênios)

**Objetivo:** Cliente marcado como convênio deve ter recebimento no mês seguinte

**Passos:**
1. Criar um novo cliente:
   - Nome: "Convênio Teste"
   - Marcar checkbox "Recebimento no mês seguinte" (se houver UI)
   - Ou via SQL: `UPDATE clientes SET recebimento_posterior = true WHERE nome = 'Convênio Teste'`
2. Criar atendimento para este cliente:
   - Data: 15/10/2024
   - Valor: R$ 150,00
3. Verificar no dashboard/financeiro:
   - ✅ Competência (mês prestado): outubro
   - ✅ Recebimento previsto: 15/11/2024
4. Conferir SQL:
   ```sql
   SELECT 
     cliente_id,
     data,
     competencia_date,
     recebimento_previsto,
     valor
   FROM atendimentos
   WHERE cliente_id = '<ID_DO_CLIENTE>'
   ORDER BY data DESC
   LIMIT 1;
   ```
   - ✅ `competencia_date` = 2024-10-15
   - ✅ `recebimento_previsto` = 2024-11-15

**Resultado esperado:** ✅ Recebimento calculado corretamente (+1 mês)

---

### Teste 4: Recorrência com Pacote

**Objetivo:** Valor do pacote deve aparecer nos agendamentos gerados

**Passos:**
1. Criar um pacote:
   - Nome: "Pacote Mensal"
   - Valor: R$ 250,00
2. Criar um cliente recorrente:
   - Nome: "Cliente Recorrente Teste"
   - Associar ao pacote criado
   - Configurar recorrência: Semanal (ex: segundas)
3. Materializar recorrências (executar automaticamente ou chamar função)
4. Verificar atendimentos gerados:
   - ✅ Todos devem ter `valor = 250.00`
   - ✅ Dashboard deve somar corretamente
   - ✅ Projeções devem incluir esses valores
5. Conferir SQL:
   ```sql
   SELECT 
     data,
     valor,
     recurring_rule_id,
     observacoes
   FROM atendimentos
   WHERE cliente_id = '<ID_CLIENTE_RECORRENTE>'
     AND recurring_rule_id IS NOT NULL
   ORDER BY data ASC
   LIMIT 5;
   ```
   - ✅ Todos com `valor = 250`

**Resultado esperado:** ✅ Valores propagados e somados corretamente

---

### Teste 5: Botões "Salvar e Novo" e "Duplicar"

**Objetivo:** Testar novos botões de produtividade

**Passos (Salvar e Novo):**
1. Abrir "Novo Atendimento" para dia 20/10 às 10:00
2. Preencher todos os campos
3. Clicar em "Salvar e Novo"
   - ✅ Agendamento salvo com sucesso
   - ✅ Modal deve reabrir vazio
   - ✅ Contexto deve ser preservado (mesmo dia, próximo horário +1h = 11:00)
4. Preencher novo agendamento e salvar

**Passos (Duplicar):**
1. Abrir "Novo Atendimento"
2. Preencher todos os campos (cliente, serviço, valor, etc.)
3. Clicar em "Duplicar"
   - ✅ Agendamento salvo
   - ✅ Modal reabre com TODOS os dados preenchidos
   - ✅ Data/hora avançam para próximo slot (+1h)
4. Apenas ajustar hora se necessário e salvar

**Resultado esperado:** ✅ Produtividade aumentada no cadastro em lote

---

### Teste 6: Conversões de Timezone (Debug)

**Objetivo:** Verificar que conversões estão corretas

**Passos:**
1. Abrir console do navegador (F12)
2. Criar um novo agendamento para 15/10/2024 às 14:00
3. Verificar logs no console (em development):
   ```
   [dateUtils] toUtcISO input: { dateStr: "2024-10-15", timeStr: "14:00", tz: "America/Sao_Paulo" }
   [dateUtils] toUtcISO output: { utcISO: "2024-10-15T17:00:00.000Z" }
   ```
   - ✅ 14:00 BRT deve virar 17:00 UTC (diferença de -3h)
4. Editar o mesmo agendamento
5. Verificar logs:
   ```
   [dateUtils] fromUtcToLocalParts input: { utcISO: "2024-10-15T17:00:00.000Z", tz: "America/Sao_Paulo" }
   [dateUtils] fromUtcToLocalParts output: { date: "2024-10-15", time: "14:00" }
   ```
   - ✅ Conversão reversa deve retornar os valores originais

**Resultado esperado:** ✅ Conversões bidirecionais corretas

---

## Verificação Rápida no Banco de Dados

Execute estes comandos SQL no Supabase para verificar que tudo está correto:

```sql
-- 1. Verificar trigger de datas financeiras
SELECT 
  id,
  data,
  competencia_date,
  recebimento_previsto,
  valor,
  cliente_id
FROM atendimentos
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
-- Espera: competencia_date = data, recebimento_previsto calculado

-- 2. Verificar clientes com recebimento posterior
SELECT 
  id,
  nome,
  recebimento_posterior
FROM clientes
WHERE recebimento_posterior = true;

-- 3. Verificar atendimentos recorrentes com valor
SELECT 
  a.data,
  a.valor,
  c.nome as cliente_nome,
  sp.valor as pacote_valor,
  a.recurring_rule_id
FROM atendimentos a
JOIN clientes c ON c.id = a.cliente_id
LEFT JOIN servicos_pacotes sp ON sp.id = c.pacote_id
WHERE a.recurring_rule_id IS NOT NULL
ORDER BY a.data DESC
LIMIT 10;
-- Espera: a.valor = sp.valor (quando pacote existe)

-- 4. Verificar financial_entries
SELECT 
  fe.id,
  fe.due_date,
  fe.amount,
  fe.status,
  a.data as appointment_date,
  a.recebimento_previsto
FROM financial_entries fe
JOIN atendimentos a ON a.id = fe.appointment_id
WHERE fe.created_at > NOW() - INTERVAL '1 hour'
ORDER BY fe.created_at DESC
LIMIT 10;
-- Espera: fe.due_date = a.recebimento_previsto
```

---

## Problemas Conhecidos / Limitações

1. **DST (Horário de Verão):** 
   - Implementação atual assume offset fixo
   - date-fns-tz lida com DST automaticamente
   - ✅ Não há problemas esperados

2. **Edições Manuais em Recorrências:**
   - Se um agendamento recorrente for editado (observações mudadas), a rematerialização NÃO sobrescreverá
   - ✅ Comportamento desejado

3. **Clientes Sem Pacote:**
   - Recorrências de clientes sem pacote terão `valor = 0` se não informado na rule
   - ✅ Pode ser ajustado manualmente

---

## Critérios de Aceite Finais

- [ ] Teste 1 passou: Modal não herda dados
- [ ] Teste 2 passou: Edição sem mudança de data funciona
- [ ] Teste 3 passou: Recebimento posterior calculado corretamente
- [ ] Teste 4 passou: Valores de pacotes propagados
- [ ] Teste 5 passou: Botões "Salvar e Novo" e "Duplicar" funcionam
- [ ] Teste 6 passou: Logs de conversão corretos
- [ ] Consultas SQL retornam dados esperados
- [ ] Nenhum fluxo anterior foi quebrado

---

## Rollback (se necessário)

Caso algo crítico quebre, execute:

```sql
-- Remover campos adicionados (CUIDADO: perda de dados)
ALTER TABLE clientes DROP COLUMN IF EXISTS recebimento_posterior;
ALTER TABLE atendimentos DROP COLUMN IF EXISTS competencia_date;
ALTER TABLE atendimentos DROP COLUMN IF EXISTS recebimento_previsto;

-- Remover trigger
DROP TRIGGER IF EXISTS trg_atendimentos_datas_financeiras ON atendimentos;
DROP FUNCTION IF EXISTS atualizar_datas_financeiras();
DROP FUNCTION IF EXISTS calcular_recebimento_previsto(date, boolean);

-- Restaurar função de materialização anterior
-- (consultar histórico de migrações)
```

**Nota:** Sempre faça backup antes de alterações críticas!

---

## Contato e Suporte

Para dúvidas ou problemas, consulte:
- Documentação do projeto
- Logs do Supabase: Edge Functions e Database
- Console do navegador (desenvolvimento)
