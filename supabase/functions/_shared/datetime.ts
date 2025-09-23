// Shared datetime utilities for edge functions
// Note: We can't import date-fns-tz directly in edge functions due to module resolution
// So we implement basic timezone conversion using native Date methods

export const DEFAULT_TZ = 'America/Sao_Paulo';

export function toUTCFromLocal(dateISOorYMD: string, timeHHmm: string, sourceTz: string): Date {
  // Create a date string in the source timezone and convert to UTC
  const localISO = `${dateISOorYMD}T${timeHHmm}:00`;
  
  // For edge functions, we'll use a simpler approach
  // This assumes the sourceTz offset and converts accordingly
  const localDate = new Date(localISO);
  
  // Get the timezone offset for the source timezone
  // This is a simplified implementation - in production you'd want proper timezone handling
  const offsetMap: Record<string, number> = {
    'America/Sao_Paulo': -3, // UTC-3
    'America/New_York': -5,  // UTC-5 (EST)
    'Europe/London': 0,      // UTC+0
    'Europe/Paris': 1,       // UTC+1
  };
  
  const offsetHours = offsetMap[sourceTz] || -3; // Default to São Paulo
  const utcDate = new Date(localDate.getTime() - (offsetHours * 60 * 60 * 1000));
  
  return utcDate;
}

export function utcToViewer(dateUtc: string | Date, targetTz: string): Date {
  const utcDate = typeof dateUtc === 'string' ? new Date(dateUtc) : dateUtc;
  
  // Get the timezone offset for the target timezone
  const offsetMap: Record<string, number> = {
    'America/Sao_Paulo': -3,
    'America/New_York': -5,
    'Europe/London': 0,
    'Europe/Paris': 1,
  };
  
  const offsetHours = offsetMap[targetTz] || -3;
  const localDate = new Date(utcDate.getTime() + (offsetHours * 60 * 60 * 1000));
  
  return localDate;
}

export function fmt(dateLike: Date | string, tz: string, pattern: 'DATE'|'TIME'|'DATETIME'): string {
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  const localDate = utcToViewer(date, tz);
  
  if (pattern === 'DATE') {
    return localDate.toLocaleDateString('pt-BR');
  } else if (pattern === 'TIME') {
    return localDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } else {
    return localDate.toLocaleDateString('pt-BR') + ' ' + localDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}

export function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}