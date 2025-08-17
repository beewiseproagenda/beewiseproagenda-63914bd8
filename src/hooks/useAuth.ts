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
      // Tentativa de login com senha inválida para verificar se o email existe
      // O Supabase retorna diferentes erros para email inexistente vs senha errada
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'invalid_password_check_email_exists'
      });
      
      // Se o erro é "Invalid login credentials", o email existe mas a senha está errada
      // Se o erro é "User not found" ou similar, o email não existe
      if (error) {
        // Email existe se o erro é sobre credenciais inválidas
        const emailExists = error.message.includes('Invalid login credentials') ||
                           error.message.includes('Invalid user credentials') ||
                           error.message.includes('Too many requests');
        return { exists: emailExists, error: null };
      }
      
      return { exists: true, error: null };
    } catch (error: any) {
      return { exists: false, error };
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