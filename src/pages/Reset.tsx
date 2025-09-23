import { useEffect, useMemo, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

function parseAuthFragmentOrQuery() {
  // suporta hash (#access_token=...) e query (?code=...)
  const hash = window.location.hash?.startsWith('#') ? window.location.hash.substring(1) : '';
  const qs = window.location.search?.startsWith('?') ? window.location.search.substring(1) : '';
  const params = new URLSearchParams(hash || qs);
  return {
    hasRecovery: params.get('type') === 'recovery' || !!params.get('access_token') || !!params.get('code'),
    raw: hash ? `#${hash}` : `?${qs}`
  };
}

export default function Reset() {
  const [step, setStep] = useState<'exchanging'|'form'|'done'|'error'>('exchanging');
  const [err, setErr] = useState<string | null>(null);
  const [pw1, setPw1] = useState(''); 
  const [pw2, setPw2] = useState('');

  const frag = useMemo(parseAuthFragmentOrQuery, []);

  useEffect(() => {
    (async () => {
      try {
        if (!frag.hasRecovery) {
          setErr('LINK_INVALIDO'); setStep('error'); return;
        }
        // troca token por sessão (suporta hash OU query)
        await supabase.auth.exchangeCodeForSession(frag.raw);
        setStep('form');
      } catch (e: any) {
        setErr(e?.message || 'EXCHANGE_FALHOU');
        setStep('error');
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw1 || pw1 !== pw2) { setErr('SENHAS_DIVERGENTES'); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.replace('/login?reset=success');
    } catch (e: any) {
      setErr(e?.message || 'RESET_FALHOU');
    }
  }

  if (step === 'exchanging') return <div style={{padding:24}}>Validando link…</div>;
  if (step === 'error') return <div style={{padding:24}}>Não foi possível validar o link. {err || ''}</div>;
  if (step === 'done') return <div style={{padding:24}}>Senha atualizada. Redirecionando…</div>;

  return (
    <div style={{maxWidth:420, margin:'48px auto', padding:24}}>
      <h1>Redefinir senha</h1>
      <form onSubmit={onSubmit}>
        <label>Nova senha</label>
        <input type="password" value={pw1} onChange={e=>setPw1(e.target.value)} required minLength={6} />
        <label>Confirmar nova senha</label>
        <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} required minLength={6} />
        <button type="submit">Salvar nova senha</button>
      </form>
      {err && <div style={{marginTop:12, color:'#b91c1c'}}>Erro: {String(err)}</div>}
    </div>
  );
}