/**
 * BeeWise - Appointment Time Helpers
 * Determina se um agendamento está no passado e calcula status efetivo
 */

export interface Appointment {
  id?: string;
  start_at_utc?: string;
  end_at?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Verifica se um agendamento está no passado (lado do cliente)
 * Prioriza end_at; senão usa start_at_utc + 60min (alinha com a regra do banco)
 */
export function isPastClient(apt: Appointment | null | undefined): boolean {
  if (!apt) return false;
  
  // Prioriza end_at; senão usa start + 60min (alinha com a regra do banco)
  const end = apt.end_at 
    ? new Date(apt.end_at)
    : apt.start_at_utc 
      ? new Date(new Date(apt.start_at_utc).getTime() + 60 * 60 * 1000)
      : null;
  
  if (!end) return false;
  return Date.now() >= end.getTime();
}

/**
 * Retorna o status efetivo do agendamento
 * (espelhando a VIEW opcional atendimentos_effective do banco)
 */
export function effectiveStatus(apt: Appointment | null | undefined): string {
  if (!apt) return 'agendado';
  if (isPastClient(apt)) return 'realizado';
  return apt.status ?? 'agendado';
}

/**
 * Retorna o label traduzido do status
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'agendado': 'Agendado',
    'confirmado': 'Confirmado',
    'realizado': 'Realizado',
    'nao_compareceu': 'Não Compareceu',
    'cancelado': 'Cancelado',
    'pago': 'Pago',
    'pendente': 'Pendente'
  };
  return labels[status] || status;
}

/**
 * Retorna a variante do badge baseada no status
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'realizado':
    case 'pago':
      return 'default';
    case 'cancelado':
    case 'nao_compareceu':
      return 'destructive';
    case 'confirmado':
      return 'secondary';
    default:
      return 'outline';
  }
}
