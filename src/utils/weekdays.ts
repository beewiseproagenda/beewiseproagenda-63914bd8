export const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatWeekdays(weekdays: number[]): string {
  if (!weekdays || weekdays.length === 0) return '';
  
  const sorted = [...weekdays].sort((a, b) => a - b);
  const names = sorted.map(d => WEEKDAY_NAMES[d]);
  
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(' e ');
  
  const last = names.pop();
  return `${names.join(', ')} e ${last}`;
}

export function formatWeekdaysShort(weekdays: number[]): string {
  if (!weekdays || weekdays.length === 0) return '';
  
  const sorted = [...weekdays].sort((a, b) => a - b);
  return sorted.map(d => WEEKDAY_NAMES_SHORT[d]).join(', ');
}
