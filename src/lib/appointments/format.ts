/**
 * BeeWise - Appointment Formatting Helpers
 * Usa start_at_utc (fonte da verdade) e aplica timeZone do registro (tz) ao formatar.
 * Fallback de tz para America/Sao_Paulo para manter comportamento atual.
 */

type Apt = {
  start_at_utc?: string; // ISO
  end_at?: string;       // ISO (opcional)
  data?: string;         // 'YYYY-MM-DD' (não usar p/ exibir aqui)
  hora?: string;         // 'HH:mm:ss' (não usar p/ exibir aqui)
  tz?: string | null;
};

const DEFAULT_TZ = 'America/Sao_Paulo';

export function fmtAptDate(apt: Apt): string {
  const tz = apt?.tz || DEFAULT_TZ;
  const iso = apt?.start_at_utc;
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { timeZone: tz });
}

export function fmtAptTime(apt: Apt): string {
  const tz = apt?.tz || DEFAULT_TZ;
  const iso = apt?.start_at_utc;
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Útil se precisar junto "dd/mm/yyyy • HH:MM"
export function fmtAptDateTime(apt: Apt): { date: string; time: string } {
  return { date: fmtAptDate(apt), time: fmtAptTime(apt) };
}
