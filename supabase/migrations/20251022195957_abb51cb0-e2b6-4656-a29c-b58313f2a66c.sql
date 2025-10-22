-- RPC segura para atualizar APENAS o status de agendamentos (inclusive passados)
create or replace function public.update_appointment_status(p_id uuid, p_status text)
returns table (id uuid, status text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed_status text[] := array['agendado','confirmado','realizado','nao_compareceu','cancelado','pago','pendente'];
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_status is null or not (p_status = any (v_allowed_status)) then
    raise exception 'Invalid status: %', p_status;
  end if;

  -- garantir que o atendimento pertence ao usuário autenticado
  if not exists (
    select 1 from public.atendimentos a
     where a.id = p_id and a.user_id = v_user_id
  ) then
    raise exception 'Appointment not found or not owned by user';
  end if;

  -- atualizar somente o status (permitido para passados)
  update public.atendimentos
     set status = p_status,
         updated_at = now()
   where atendimentos.id = p_id
   returning atendimentos.id, atendimentos.status, atendimentos.updated_at
   into update_appointment_status.id, update_appointment_status.status, update_appointment_status.updated_at;

  return next;
end
$$;

-- Permitir execução para usuários autenticados
grant execute on function public.update_appointment_status(uuid, text) to authenticated;

-- Trigger para impedir mudanças de data/horário em passados, mas permitir update de STATUS
create or replace function public.only_status_update_on_past()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.start_at_utc < now()) then
    if (new.start_at_utc is distinct from old.start_at_utc)
       or (new.end_at is distinct from old.end_at)
       or (new.data is distinct from old.data)
       or (new.hora is distinct from old.hora) then
      raise exception 'Past appointments: only status can be updated';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_only_status_update_on_past on public.atendimentos;
create trigger trg_only_status_update_on_past
before update on public.atendimentos
for each row
execute function public.only_status_update_on_past();