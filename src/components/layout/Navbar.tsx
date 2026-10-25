/**
 * @file Navbar.tsx
 * @description Barra de navegación superior con Material UI, avatar de usuaria, estado de conexión y selector de tema.
 */

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Box,
  Container,
  Tooltip,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import type { ThemeMode } from '../../lib/theme';

interface NavbarProps {
  currentTheme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings?: () => void;
  userAvatarUrl?: string | null;
  userName?: string | null;
}

/**
 * Encabezado superior de la aplicación estilizado con Material UI.
 */
export const Navbar: React.FC<NavbarProps> = ({
  currentTheme,
  onToggleTheme,
  onOpenSettings,
  userAvatarUrl,
  userName,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isDarkMode = currentTheme === 'dark';

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(19, 27, 46, 0.9)'
            : 'rgba(255, 255, 255, 0.9)',
      }}
    >
      <Container maxWidth="md">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between', minHeight: 64 }}>
          {/* Logotipo y Título de la Aplicación */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              variant="rounded"
              sx={{
                bgcolor: 'primary.main',
                width: 40,
                height: 40,
                borderRadius: '12px',
                boxShadow: 2,
              }}
            >
              <MenuBookIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Mis Pedidos
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Gestor de Catálogo
              </Typography>
            </Box>
          </Box>

          {/* Acciones del Encabezado */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Indicador de Conectividad (Online / Offline) */}
            <Chip
              size="small"
              icon={isOnline ? <WifiIcon /> : <WifiOffIcon />}
              label={isOnline ? 'En línea' : 'Offline'}
              color={isOnline ? 'success' : 'warning'}
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />

            {/* Alternador de Tema Claro / Oscuro */}
            <Tooltip title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
              <IconButton onClick={onToggleTheme} color="inherit" size="small">
                {isDarkMode ? (
                  <LightModeIcon sx={{ color: 'warning.light' }} />
                ) : (
                  <DarkModeIcon color="action" />
                )}
              </IconButton>
            </Tooltip>

            {/* Avatar / Acceso a Ajustes */}
            <Tooltip title="Ajustes y perfil">
              <IconButton onClick={onOpenSettings} size="small" sx={{ p: 0.5 }}>
                <Avatar
                  src={userAvatarUrl || undefined}
                  alt={userName || 'Perfil'}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'secondary.main',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    border: 1.5,
                    borderColor: 'divider',
                  }}
                >
                  {(userName || 'M').charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
