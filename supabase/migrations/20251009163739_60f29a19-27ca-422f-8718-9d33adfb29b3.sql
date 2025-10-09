-- 1. Criar tabela de regras de recorrência
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  title text not null,
  weekdays int[] not null,
  time_local text not null,
  timezone text not null default 'America/Sao_Paulo',
  start_date date not null,
  end_date date,
  interval_weeks int not null default 1,
  occurrences_limit int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recurring_rules_user on public.recurring_rules(user_id);
create index if not exists idx_recurring_rules_client on public.recurring_rules(client_id);

-- 2. Adicionar colunas em appointments para materialização
alter table public.atendimentos
  add column if not exists rule_id uuid references public.recurring_rules(id) on delete set null,
  add column if not exists occurrence_date date;

-- 3. Índice único para evitar duplicação
create unique index if not exists uq_atendimentos_rule_occurrence
  on public.atendimentos (rule_id, occurrence_date)
  where rule_id is not null;

-- 4. RLS para recurring_rules
alter table public.recurring_rules enable row level security;

drop policy if exists "rr_select_own" on public.recurring_rules;
create policy "rr_select_own" on public.recurring_rules
  for select using (auth.uid() = user_id);

drop policy if exists "rr_insert_own" on public.recurring_rules;
create policy "rr_insert_own" on public.recurring_rules
  for insert with check (auth.uid() = user_id);

drop policy if exists "rr_update_own" on public.recurring_rules;
create policy "rr_update_own" on public.recurring_rules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rr_delete_own" on public.recurring_rules;
create policy "rr_delete_own" on public.recurring_rules
  for delete using (auth.uid() = user_id);

-- 5. Trigger para updated_at
create trigger update_recurring_rules_updated_at
  before update on public.recurring_rules
  for each row
  execute function public.update_updated_at_column();