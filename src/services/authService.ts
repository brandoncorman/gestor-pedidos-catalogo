/**
 * @file authService.ts
 * @description Servicio de autenticación con Google OAuth vía Supabase y validación de lista blanca.
 */

import { supabase, isSupabaseConfigured, isEmailAllowed } from '../lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAllowed: boolean;
  unauthorizedEmail: string | null;
}

/**
 * Inicia el proceso de autenticación con Google OAuth en Supabase.
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      error: new Error('Supabase no está configurado. Revisa las variables en el archivo .env'),
    };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Error al iniciar sesión con Google:', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Cierra la sesión activa del usuario.
 */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
  }
}

/**
 * Obtiene la sesión actual de Supabase y verifica si el correo está autorizado.
 */
export async function getInitialAuthState(): Promise<AuthState> {
  if (!isSupabaseConfigured() || !supabase) {
    // Si Supabase no está configurado, operamos en modo local sin bloqueo
    return {
      user: null,
      session: null,
      isLoading: false,
      isAllowed: true,
      unauthorizedEmail: null,
    };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const session = data.session;
    const user = session?.user || null;

    if (!user) {
      return {
        user: null,
        session: null,
        isLoading: false,
        isAllowed: false,
        unauthorizedEmail: null,
      };
    }

    const emailAllowed = isEmailAllowed(user.email);
    if (!emailAllowed) {
      // Si el correo no está en la lista blanca, cerramos la sesión automáticamente
      const blockedEmail = user.email || 'desconocido';
      await supabase.auth.signOut();
      return {
        user: null,
        session: null,
        isLoading: false,
        isAllowed: false,
        unauthorizedEmail: blockedEmail,
      };
    }

    return {
      user,
      session,
      isLoading: false,
      isAllowed: true,
      unauthorizedEmail: null,
    };
  } catch (err) {
    console.error('Error al obtener estado inicial de autenticación:', err);
    return {
      user: null,
      session: null,
      isLoading: false,
      isAllowed: false,
      unauthorizedEmail: null,
    };
  }
}

/**
 * Suscribe a los cambios de autenticación de Supabase (inicio de sesión, cierre de sesión, etc.).
 *
 * @param callback - Función a ejecutar con el nuevo estado de autenticación.
 * @returns Función de desuscripción para limpieza al desmontar componentes.
 */
export function subscribeToAuthChanges(
  callback: (state: AuthState) => void
): () => void {
  if (!isSupabaseConfigured() || !supabase) {
    return () => {};
  }

  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      const user = session?.user || null;

      if (!user) {
        callback({
          user: null,
          session: null,
          isLoading: false,
          isAllowed: false,
          unauthorizedEmail: null,
        });
        return;
      }

      const emailAllowed = isEmailAllowed(user.email);
      if (!emailAllowed) {
        const blockedEmail = user.email || 'desconocido';
        await signOut();
        callback({
          user: null,
          session: null,
          isLoading: false,
          isAllowed: false,
          unauthorizedEmail: blockedEmail,
        });
        return;
      }

      callback({
        user,
        session,
        isLoading: false,
        isAllowed: true,
        unauthorizedEmail: null,
      });
    }
  );

  return () => {
    authListener.subscription.unsubscribe();
  };
}
