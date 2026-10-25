/**
 * @file supabaseClient.ts
 * @description Configuración e inicialización del cliente de Supabase.
 * Opera de forma segura: si las variables de entorno no están configuradas,
 * la aplicación opera en modo Local-First sin intentar conexiones externas no autorizadas.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const allowedEmailsRaw = import.meta.env.VITE_ALLOWED_EMAILS || '';

/** Lista blanca de correos autorizados para acceder */
export const ALLOWED_EMAILS: string[] = allowedEmailsRaw
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

/**
 * Verifica si las credenciales de Supabase están configuradas y no son valores de ejemplo.
 */
export function isSupabaseConfigured(): boolean {
  return (
    typeof supabaseUrl === 'string' &&
    typeof supabaseAnonKey === 'string' &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-id') &&
    supabaseAnonKey.length > 20
  );
}

/**
 * Cliente de Supabase condicional.
 * Si no está configurado, es `null` para evitar cualquier llamada externa.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Valida si un correo electrónico está presente en la lista blanca de acceso.
 *
 * @param email - Correo a validar.
 * @returns Verdadero si la lista está vacía (modo desarrollo inicial) o si el correo está autorizado.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  // Si no se definió lista blanca aún, permitimos el acceso local
  if (ALLOWED_EMAILS.length === 0) return true;
  return ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}
