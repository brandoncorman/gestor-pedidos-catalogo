/**
 * @file theme.ts
 * @description Configuración del tema Material UI (MUI v6) con soporte para Modo Claro, Modo Oscuro y detección del sistema.
 */

import { createTheme, type Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'catalogo_theme_preference';

/**
 * Obtiene la preferencia de tema guardada en localStorage o 'system' por defecto.
 */
export function getSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  return saved || 'system';
}

/**
 * Guarda la preferencia de tema en localStorage.
 *
 * @param mode - Modo seleccionado.
 */
export function saveTheme(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

/**
 * Resuelve el modo efectivo ('light' o 'dark') considerando la preferencia del sistema operativo si es 'system'.
 *
 * @param mode - Modo configurado.
 */
export function getEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

/**
 * Crea el tema de Material UI adaptado a la estética de venta por catálogo con bordes redondeados y colores cosméticos.
 *
 * @param effectiveMode - Modo efectivo ('light' o 'dark').
 */
export function createAppTheme(effectiveMode: 'light' | 'dark'): Theme {
  return createTheme({
    palette: {
      mode: effectiveMode,
      primary: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#ec4899',
        light: '#f472b6',
        dark: '#db2777',
        contrastText: '#ffffff',
      },
      success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
      },
      error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
      },
      background: {
        default: effectiveMode === 'light' ? '#f8fafc' : '#0b0f19',
        paper: effectiveMode === 'light' ? '#ffffff' : '#131b2e',
      },
      text: {
        primary: effectiveMode === 'light' ? '#0f172a' : '#f8fafc',
        secondary: effectiveMode === 'light' ? '#64748b' : '#94a3b8',
      },
    },
    shape: {
      borderRadius: 14,
    },
    typography: {
      fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
      h6: {
        fontWeight: 700,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
            border: effectiveMode === 'light' ? '1px solid #e2e8f0' : '1px solid #1e293b',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: 16,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 10,
          },
        },
      },
    },
  });
}
