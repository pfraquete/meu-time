import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  birth_date: string | null;
  city: string | null;
  state: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useSupabaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        loading: false,
      }));

      // Se houver usuário, buscar perfil
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        loading: false,
      }));

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setAuthState(prev => ({ ...prev, profile: null }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setAuthState(prev => ({ ...prev, profile: data }));
    }
  };

  const signUp = async (email: string, password: string, metadata?: { name?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;

    // Criar perfil após registro
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        name: metadata?.name || null,
      });
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!authState.user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', authState.user.id);

    if (error) throw error;

    // Atualizar estado local
    setAuthState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, ...updates } : null,
    }));
  };

  const refreshProfile = async () => {
    if (!authState.user) return;
    await fetchProfile(authState.user.id);
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  };
}
