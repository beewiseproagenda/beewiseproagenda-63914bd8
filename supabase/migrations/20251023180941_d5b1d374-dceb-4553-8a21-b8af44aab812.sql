-- 1. Helper: devolve "agora" no fuso informado (horário local do usuário p/ comparação)
create or replace function public.now_at_tz(p_tz text)
returns timestamp without time zone
language sql
stable
as $$
  select (now() at time zone p_tz);
$$;

-- 2. Função: verifica se um atendimento está no passado considerando o fuso armazenado
-- Regras:
--   - usa end_at se existir; senão usa start_at_utc + 60min (fallback)
--   - compara "agora no fuso do atendimento" com "fim no fuso do atendimento"
create or replace function public.is_appointment_past(p_start timestamptz, p_end timestamptz, p_tz text)
returns boolean
language plpgsql
stable
as $$
declare
  v_end_local timestamp;
  v_now_local timestamp;
  v_end timestamptz := coalesce(p_end, p_start + interval '60 minutes');
begin
  v_end_local := (v_end at time zone p_tz);
  v_now_local := public.now_at_tz(p_tz);
  return v_now_local >= v_end_local;
end;
$$;

-- 3. Trigger BEFORE INSERT/UPDATE: se atendimento for passado → status = 'realizado'
create or replace function public.enforce_realizado_on_past()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Se o atendimento já é passado no fuso do registro, forçar "realizado"
  if public.is_appointment_past(coalesce(new.start_at_utc, now()), new.end_at, coalesce(new.tz, 'America/Sao_Paulo')) then
    new.status := 'realizado';
  end if;

  -- Bloquear ALTERAÇÃO manual de status em atendimentos já passados
  if (tg_op = 'UPDATE') then
    if public.is_appointment_past(coalesce(old.start_at_utc, now()), old.end_at, coalesce(old.tz, 'America/Sao_Paulo')) then
      if new.status is distinct from old.status then
        raise exception 'Agendamentos passados não permitem alteração manual de status; eles são automaticamente "realizado". Para cancelados, exclua o agendamento.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_realizado on public.atendimentos;
create trigger trg_auto_realizado
before insert or update on public.atendimentos
for each row
execute function public.enforce_realizado_on_past();

-- 4. VIEW de leitura com "status efetivo"
create or replace view public.atendimentos_effective as
select
  a.*,
  case
    when public.is_appointment_past(coalesce(a.start_at_utc, now()), a.end_at, coalesce(a.tz,'America/Sao_Paulo'))
      then 'realizado'
    else a.status
  end as status_efetivo
from public.atendimentos a;

comment on view public.atendimentos_effective is
'View que aplica regra de status automático: passados aparecem como "realizado".';

grant select on public.atendimentos_effective to authenticated;