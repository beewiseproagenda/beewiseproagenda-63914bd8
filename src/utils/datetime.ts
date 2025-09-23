import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

export const DEFAULT_TZ = 'America/Sao_Paulo';

export function toUTCFromLocal(dateISOorYMD: string, timeHHmm: string, sourceTz: string): Date {
  // Monta local date+time no TZ de origem e converte para UTC
  const localISO = `${dateISOorYMD}T${timeHHmm}:00`;
  return fromZonedTime(localISO, sourceTz);
}

export function utcToViewer(dateUtc: string | Date, targetTz: string): Date {
  return toZonedTime(dateUtc, targetTz);
}

export function fmt(dateLike: Date | string, tz: string, pattern: 'DATE'|'TIME'|'DATETIME'): string {
  const p = pattern === 'DATE' ? "dd/MM/yyyy"
          : pattern === 'TIME' ? "HH:mm"
          : "dd/MM/yyyy HH:mm";
  return formatInTimeZone(dateLike, tz, p);
}

export function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
}