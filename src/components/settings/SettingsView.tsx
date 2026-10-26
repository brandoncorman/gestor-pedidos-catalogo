/**
 * @file SettingsView.tsx
 * @description Pantalla de ajustes, sesión de Google, copias de seguridad en JSON, selector de tema y base limpia construida en Material UI.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  Button,
  Avatar,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import StorageIcon from '@mui/icons-material/Storage';
import PaletteIcon from '@mui/icons-material/Palette';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { exportDatabaseToJson, importDatabaseFromJson } from '../../lib/syncManager';
import { getSavedTheme, saveTheme, type ThemeMode } from '../../lib/theme';
import { resetDatabaseToCleanSeed } from '../../lib/db';

interface SettingsViewProps {
  currentTheme?: ThemeMode;
  onThemeChange?: (newTheme: ThemeMode) => void;
  onRefreshAll: () => void;
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  currentUserAvatarUrl?: string | null;
  onSignOut?: () => Promise<void>;
}

/**
 * Pantalla de configuración del sistema, gestión de sesión y respaldo de datos en Material UI.
 */
export const SettingsView: React.FC<SettingsViewProps> = ({
  currentTheme,
  onThemeChange,
  onRefreshAll,
  currentUserEmail,
  currentUserName,
  currentUserAvatarUrl,
  onSignOut,
}) => {
  const [theme, setTheme] = useState<ThemeMode>(currentTheme || getSavedTheme());
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Notificación tipo Snackbar de Material UI
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Diálogo modal de confirmación en Material UI
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  const handleThemeSelection = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    saveTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const json = await exportDatabaseToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo-pedidos-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: 'Copia de seguridad exportada exitosamente.',
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: 'Error al exportar la copia de seguridad.',
        severity: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmDialog({
      open: true,
      title: '¿Restaurar copia de seguridad?',
      message: 'Se reemplazarán los datos locales actuales de clientas, campañas y pedidos por los contenidos en este archivo.',
      onConfirm: async () => {
        try {
          setIsImporting(true);
          const text = await file.text();
          await importDatabaseFromJson(text);
          setSnackbar({
            open: true,
            message: 'Base de datos restaurada correctamente.',
            severity: 'success',
          });
          onRefreshAll();
        } catch (err) {
          console.error(err);
          setSnackbar({
            open: true,
            message: 'Error: El archivo seleccionado no es un respaldo JSON válido.',
            severity: 'error',
          });
        } finally {
          setIsImporting(false);
          e.target.value = '';
        }
      },
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10, maxWidth: 640, mx: 'auto' }}>
      {/* Sección: Cuenta Conectada y Sesión */}
      <Card elevation={0} sx={{ borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                src={currentUserAvatarUrl || undefined}
                alt={currentUserName || 'Usuario'}
                sx={{ bgcolor: 'primary.main', width: 48, height: 48, border: 1.5, borderColor: 'divider' }}
              >
                <PersonIcon />
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {currentUserName || 'Cuenta Conectada'}
                  </Typography>
                  <Chip label="Autorizada" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {currentUserEmail || 'Modo Local'}
                </Typography>
              </Box>
            </Box>

            {onSignOut && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<LogoutIcon />}
                onClick={() => {
                  setConfirmDialog({
                    open: true,
                    title: '¿Cerrar sesión?',
                    message: 'Se cerrará la sesión de Google en este dispositivo.',
                    onConfirm: async () => {
                      await onSignOut();
                    },
                  });
                }}
                sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
              >
                Cerrar Sesión
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Sección: Tema Visual */}
      <Card elevation={0} sx={{ borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
              <PaletteIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Apariencia Visual
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Personaliza el contraste para usar la app de día o de noche
              </Typography>
            </Box>
          </Box>

          <FormControl component="fieldset">
            <RadioGroup
              value={theme}
              onChange={(e) => handleThemeSelection(e.target.value as ThemeMode)}
            >
              <FormControlLabel
                value="light"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LightModeIcon fontSize="small" sx={{ color: 'warning.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Modo Claro (Día)
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="dark"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DarkModeIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Modo Oscuro (Noche)
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="system"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsBrightnessIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Automático (Preferencia del sistema)
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {/* Sección: Respaldo y Copia de Seguridad */}
      <Card elevation={0} sx={{ borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.light', width: 36, height: 36 }}>
              <StorageIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Copia de Seguridad y Restauración
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Guarda tus datos en tu teléfono o restáuralos en otro dispositivo
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={handleExportBackup}
              disabled={isExporting}
              sx={{ py: 1.25, fontWeight: 700 }}
            >
              {isExporting ? 'Generando archivo...' : 'Descargar Copia de Seguridad (JSON)'}
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              component="label"
              fullWidth
              startIcon={<UploadIcon />}
              disabled={isImporting}
              sx={{ py: 1.25, fontWeight: 700 }}
            >
              {isImporting ? 'Restaurando...' : 'Restaurar Copia desde Archivo'}
              <input type="file" accept=".json" hidden onChange={handleImportFileSelected} />
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Sección: Estado Local y Restablecimiento a Base Limpia */}
      <Card elevation={0} sx={{ borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Base de Datos Limpia (Para Producción)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Deja el cuaderno totalmente vacío sin clientas ni pedidos de prueba, conservando únicamente las empresas (Belcorp y Natura) y tu cuenta personal ("Mi Cuenta").
          </Typography>

          <Button
            variant="outlined"
            color="warning"
            startIcon={<DeleteSweepIcon />}
            onClick={() => {
              setConfirmDialog({
                open: true,
                title: '¿Limpiar base de datos y dejar en blanco?',
                message: 'Esta acción borrará todos los pedidos, clientas y campañas de prueba. El cuaderno quedará 100% limpio listo para los pedidos reales.',
                onConfirm: async () => {
                  await resetDatabaseToCleanSeed();
                  setSnackbar({
                    open: true,
                    message: 'Base de datos limpia y lista para su uso real.',
                    severity: 'success',
                  });
                  onRefreshAll();
                },
              });
            }}
            sx={{ fontWeight: 700 }}
          >
            Dejar Cuaderno Vacío (Base Limpia)
          </Button>
        </CardContent>
      </Card>

      {/* Feedback Snackbar de Material UI */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 8 }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%', fontWeight: 600, borderRadius: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Modal de Confirmación Nativo de Material UI */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 4, p: 1 } },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              const action = confirmDialog.onConfirm;
              setConfirmDialog((prev) => ({ ...prev, open: false }));
              await action();
            }}
            sx={{ fontWeight: 700 }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
