/**
 * @file LoginView.tsx
 * @description Pantalla de inicio de sesión con Google OAuth construida en Material UI v6.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Alert,
  CircularProgress,
  Container,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { signInWithGoogle } from '../../services/authService';

interface LoginViewProps {
  unauthorizedEmail?: string | null;
}

/**
 * Componente SVG del logotipo oficial de Google.
 */
const GoogleLogoSvg: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

/**
 * Pantalla de acceso seguro para consultoras con Google OAuth.
 */
export const LoginView: React.FC<LoginViewProps> = ({ unauthorizedEmail }) => {
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);

    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMessage(error.message);
      setIsSigningIn(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="xs">
        <Card
          elevation={4}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
          }}
        >
          {/* Encabezado con degradado cosmético */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              py: 4,
              px: 3,
              textAlign: 'center',
              color: 'white',
            }}
          >
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                mx: 'auto',
                mb: 2,
                boxShadow: 2,
              }}
            >
              <MenuBookIcon sx={{ fontSize: 36, color: 'white' }} />
            </Avatar>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, mb: 0.5 }}>
              Gestor de Pedidos
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
              Belcorp (Ésika, L'Bel, Cyzone) & Natura
            </Typography>
          </Box>

          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Alerta de correo no autorizado si ocurrió */}
            {unauthorizedEmail && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Acceso no autorizado
                </Typography>
                <Typography variant="body2">
                  La cuenta <strong>{unauthorizedEmail}</strong> no está en la lista blanca de consultoras permitidas.
                </Typography>
              </Alert>
            )}

            {/* Error de conexión con Supabase / Google */}
            {errorMessage && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                {errorMessage}
              </Alert>
            )}

            <Box sx={{ textAlign: 'center', my: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                Bienvenida
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ingresa con tu cuenta autorizada de Google para consultar y registrar pedidos.
              </Typography>
            </Box>

            {/* Botón de inicio con Google */}
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              startIcon={isSigningIn ? <CircularProgress size={20} /> : <GoogleLogoSvg />}
              sx={{
                py: 1.5,
                borderRadius: 3,
                borderColor: 'divider',
                color: 'text.primary',
                bgcolor: 'background.paper',
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'primary.main',
                },
              }}
            >
              {isSigningIn ? 'Conectando con Google...' : 'Continuar con Google'}
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
