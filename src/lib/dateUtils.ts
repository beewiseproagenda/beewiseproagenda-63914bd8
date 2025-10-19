/**
 * Helpers centralizados para conversão de data/hora
 * Correção cirúrgica: evitar mudança de data ao editar e garantir timezone consistente
 */

import { format as dateFnsFormat, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Feature flag para conversões estritas de timezone
export const STRICT_TIMEZONE = true;

export const DEFAULT_TZ = 'America/Sao_Paulo';

/**
 * Obtém o timezone do navegador
 */
export function getBrowserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

/**
 * Converte data+hora local para UTC ISO string
 * Input: dateStr = "2024-10-15", timeStr = "14:30", tz = "America/Sao_Paulo"
 * Output: Date object em UTC pronto para persistir
 */
export function toUtcISO(dateStr: string, timeStr: string, tz: string = DEFAULT_TZ): string {
  if (!STRICT_TIMEZONE) {
    // Fallback antigo para compatibilidade
    const localISO = `${dateStr}T${timeStr}:00`;
    return fromZonedTime(localISO, tz).toISOString();
  }

  // Conversão estrita
  const localDateTime = `${dateStr}T${timeStr}:00`;
  
  if (process.env.NODE_ENV === 'development') {
    console.debug('[dateUtils] toUtcISO input:', { dateStr, timeStr, tz, localDateTime });
  }
  
  const utcDate = fromZonedTime(localDateTime, tz);
  
  if (process.env.NODE_ENV === 'development') {
    console.debug('[dateUtils] toUtcISO output:', { utcISO: utcDate.toISOString() });
  }
  
  return utcDate.toISOString();
}

/**
 * Converte UTC ISO string para partes locais (data e hora separadas)
 * Input: utcISO = "2024-10-15T17:30:00Z", tz = "America/Sao_Paulo"
 * Output: { date: "2024-10-15", time: "14:30" }
 */
export function fromUtcToLocalParts(utcISO: string, tz: string = DEFAULT_TZ): { date: string; time: string } {
  if (!STRICT_TIMEZONE) {
    // Fallback antigo
    const zonedDate = toZonedTime(utcISO, tz);
    return {
      date: dateFnsFormat(zonedDate, 'yyyy-MM-dd'),
      time: dateFnsFormat(zonedDate, 'HH:mm')
    };
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug('[dateUtils] fromUtcToLocalParts input:', { utcISO, tz });
  }

  const zonedDate = toZonedTime(utcISO, tz);
  
  const result = {
    date: dateFnsFormat(zonedDate, 'yyyy-MM-dd'),
    time: dateFnsFormat(zonedDate, 'HH:mm')
  };

  if (process.env.NODE_ENV === 'development') {
    console.debug('[dateUtils] fromUtcToLocalParts output:', result);
  }

  return result;
}

/**
 * Formata data UTC para exibição local
 */
export function formatUtcToLocal(
  utcISO: string,
  tz: string = DEFAULT_TZ,
  formatStr: string = 'dd/MM/yyyy HH:mm'
): string {
  return formatInTimeZone(utcISO, tz, formatStr, { locale: ptBR });
}

/**
 * Formata apenas a data
 */
export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return dateFnsFormat(date, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Formata apenas a hora
 */
export function formatTime(timeStr: string): string {
  if (timeStr.includes(':')) {
    return timeStr.substring(0, 5); // HH:mm
  }
  return timeStr;
}

/**
 * Obtém a data/hora atual no timezone especificado
 */
export function getCurrentLocalDateTime(tz: string = DEFAULT_TZ): { date: string; time: string } {
  const now = new Date();
  return fromUtcToLocalParts(now.toISOString(), tz);
}

/**
 * Valida formato de hora HH:mm
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

/**
 * Normaliza hora para formato HH:mm
 */
export function normalizeTime(time: string): string {
  if (!time) return '08:00';
  
  // Se já está no formato correto, retornar
  if (isValidTimeFormat(time)) {
    return time;
  }
  
  // Tentar extrair HH:mm de formatos como "HH:mm:ss"
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2];
    return `${hours}:${minutes}`;
  }
  
  return '08:00'; // Fallback
}
