/**
 * @file EditCustomerModal.tsx
 * @description Modal basado en Material UI Dialog para editar la información de una clienta o eliminarla con protecciones de negocio.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Alert,
  Avatar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/Save';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import { formatCurrency, getCustomerDisplayName } from '../../lib/formatters';
import { updateCustomer, deleteCustomer, getCustomerStats } from '../../services/customerService';
import type { Customer } from '../../types/database';

interface CustomerWithDebt extends Customer {
  totalDebt: number;
}

interface EditCustomerModalProps {
  isOpen: boolean;
  customer: CustomerWithDebt | null;
  onClose: () => void;
  onCustomerUpdated: () => void;
  onCustomerDeleted: (deletedCustomerId: string) => void;
}

/**
 * Modal de edición y eliminación segura de clienta estilizado con Material UI.
 */
export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  customer,
  onClose,
  onCustomerUpdated,
  onCustomerDeleted,
}) => {
  const [name, setName] = useState<string>('');
  const [descriptor, setDescriptor] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isSelfProfile, setIsSelfProfile] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const [orderCount, setOrderCount] = useState<number>(0);
  const [paymentCount, setPaymentCount] = useState<number>(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (customer && isOpen) {
      setName(customer.name);
      setDescriptor(customer.descriptor || '');
      setPhone(customer.phone || '');
      setIsSelfProfile(!!customer.isSelfProfile);
      setNotes(customer.notes || '');
      setShowDeleteConfirmation(false);

      getCustomerStats(customer.id).then((stats) => {
        setOrderCount(stats.orderCount);
        setPaymentCount(stats.paymentCount);
      });
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const displayName = getCustomerDisplayName(customer);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await updateCustomer(customer.id, {
        name: name.trim(),
        descriptor: descriptor.trim() || null,
        phone: phone.trim() || null,
        isSelfProfile,
        notes: notes.trim() || null,
      });

      onCustomerUpdated();
      onClose();
    } catch (err) {
      console.error('Error al actualizar clienta:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteCustomer(customer.id);
      onCustomerDeleted(customer.id);
      onClose();
    } catch (err) {
      console.error('Error al eliminar clienta:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 4, p: 1 },
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
            <PersonIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              Editar Clienta
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {displayName}
            </Typography>
          </Box>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
          sx={{ color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSave}>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2.5 }}>
          <TextField
            label="Nombre de la Clienta"
            required
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Clary"
            slotProps={{
              input: {
                sx: { fontWeight: 700 },
              },
            }}
          />

          <TextField
            label="Descriptor de Desambiguación (Opcional)"
            fullWidth
            value={descriptor}
            onChange={(e) => setDescriptor(e.target.value)}
            placeholder="ej. Sede, Trabajo, Vecina"
            helperText="Diferencia a clientas con el mismo nombre"
          />

          <TextField
            label="Teléfono / WhatsApp (Opcional)"
            fullWidth
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="ej. +56912345678"
          />

          <TextField
            label="Notas Adicionales (Opcional)"
            fullWidth
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ej. Dirección de entrega, preferencias de catálogo..."
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isSelfProfile}
                onChange={(e) => setIsSelfProfile(e.target.checked)}
                color="secondary"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Es cuenta propia de mi madre (Autocompras / Metas mínimas)
              </Typography>
            }
          />

          {/* Zona de Peligro: Eliminación de Clienta con Reglas de Seguridad */}
          <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
            {customer.isSelfProfile ? (
              <Alert severity="info" icon={<SecurityIcon />} sx={{ borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Perfil Propio Protegido
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Esta cuenta corresponde a las autocompras de tu madre y asegura el cómputo de metas mínimas. No puede eliminarse.
                </Typography>
              </Alert>
            ) : !showDeleteConfirmation ? (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<DeleteOutlineIcon />}
                onClick={() => setShowDeleteConfirmation(true)}
                sx={{ fontWeight: 600 }}
              >
                Eliminar esta clienta
              </Button>
            ) : (
              <Alert
                severity={customer.totalDebt > 0 ? 'error' : orderCount > 0 ? 'warning' : 'error'}
                icon={<WarningAmberIcon />}
                sx={{
                  borderRadius: 3,
                  '& .MuiAlert-message': { width: '100%' },
                }}
              >
                {customer.totalDebt > 0 && (
                  <Box sx={{ p: 1, mb: 1, bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                      ⚠️ ¡Atención! Esta clienta tiene una DEUDA PENDIENTE de {formatCurrency(customer.totalDebt)}. Si la eliminas, se perderá el registro de este dinero por cobrar.
                    </Typography>
                  </Box>
                )}

                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {orderCount > 0 ? (
                    <>
                      Esta clienta tiene <strong>{orderCount} pedido(s)</strong> y{' '}
                      <strong>{paymentCount} abono(s)</strong>. Al eliminarla, se borrarán todos sus registros asociados.
                    </>
                  ) : (
                    <>
                      ¿Estás segura de eliminar a <strong>{displayName}</strong>? Esta acción no se puede deshacer.
                    </>
                  )}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => setShowDeleteConfirmation(false)}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Eliminando...' : 'Sí, eliminar clienta'}
                  </Button>
                </Box>
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting || isDeleting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={isSubmitting || !name.trim() || isDeleting}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
