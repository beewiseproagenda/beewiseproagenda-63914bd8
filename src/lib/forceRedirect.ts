export function redirectToDashboard() {
  const absolute = 'https://beewiseproagenda.com.br/dashboard';
  try {
    // tenta via SPA
    if (typeof window !== 'undefined' && window?.history) {
      // hard replace para eliminar histórico e possíveis loops
      window.location.replace(absolute);
      return;
    }
  } catch {}
  // fallback hard
  // @ts-ignore
  location.href = absolute;
}