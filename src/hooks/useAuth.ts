import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: { first_name: string; last_name: string; phone: string }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const checkEmailExists = async (email: string) => {
    try {
      // Usa resetPasswordForEmail para verificar se o email existe
      // Esta é uma abordagem mais direta e confiável
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/verificacao-email`
      });
      
      if (error) {
        // Se o erro menciona que o usuário não foi encontrado, o email não existe
        if (error.message.includes('User not found') || 
            error.message.includes('No user found') ||
            error.message.includes('user_not_found')) {
          return { exists: false, error: null };
        }
        
        // Se há rate limiting, assumimos que o email existe
        if (error.message.includes('Too many requests') ||
            error.message.includes('rate limit')) {
          return { exists: true, error: null };
        }
        
        // Outros erros podem indicar problemas de configuração
        // mas não necessariamente que o email não existe
        return { exists: true, error: null };
      }
      
      // Se não há erro, o email existe e o reset foi enviado
      return { exists: true, error: null };
    } catch (error: any) {
      console.error('Erro ao verificar email:', error);
      // Em caso de erro, assumimos que o email pode existir para não bloquear o usuário
      return { exists: true, error };
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/redefinir-senha`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    checkEmailExists
  };
};