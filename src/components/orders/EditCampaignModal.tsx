/**
 * @file EditCampaignModal.tsx
 * @description Modal basado en Material UI Dialog para editar o eliminar una campaña comercial con protección en cascada.
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
  ToggleButtonGroup,
  ToggleButton,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/Save';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { updateCampaign, deleteCampaign, getCampaignOrderCount } from '../../services/campaignService';
import type { Campaign, CampaignStatus } from '../../types/database';

interface EditCampaignModalProps {
  isOpen: boolean;
  campaign: Campaign | null;
  companyName: string;
  onClose: () => void;
  onCampaignUpdated: () => void;
  onCampaignDeleted: (deletedCampaignId: string) => void;
}

/**
 * Modal de edición y eliminación segura de campaña comercial con Material UI.
 */
export const EditCampaignModal: React.FC<EditCampaignModalProps> = ({
  isOpen,
  campaign,
  companyName,
  onClose,
  onCampaignUpdated,
  onCampaignDeleted,
}) => {
  const [campaignCode, setCampaignCode] = useState<string>('');
  const [status, setStatus] = useState<CampaignStatus>('active');
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState<string>('');
  const [targetPaymentDate, setTargetPaymentDate] = useState<string>('');
  const [orderCount, setOrderCount] = useState<number>(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (campaign && isOpen) {
      setCampaignCode(campaign.campaignCode);
      setStatus(campaign.status);
      setEstimatedArrivalDate(campaign.estimatedArrivalDate || '');
      setTargetPaymentDate(campaign.targetPaymentDate || '');
      setShowDeleteConfirmation(false);

      getCampaignOrderCount(campaign.id).then((count) => {
        setOrderCount(count);
      });
    }
  }, [campaign, isOpen]);

  if (!isOpen || !campaign) return null;

  const isBelcorp = companyName.toLowerCase().includes('belcorp');

  const handleArrivalDateChange = (val: string) => {
    setEstimatedArrivalDate(val);
    if (val && !targetPaymentDate) {
      const d = new Date(val);
      d.setDate(d.getDate() + 10);
      setTargetPaymentDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignCode.trim()) return;

    try {
      setIsSubmitting(true);
      await updateCampaign(campaign.id, {
        campaignCode: campaignCode.trim(),
        status,
        estimatedArrivalDate: estimatedArrivalDate || null,
        targetPaymentDate: targetPaymentDate || null,
      });

      onCampaignUpdated();
      onClose();
    } catch (err) {
      console.error('Error al actualizar la campaña:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteCampaign(campaign.id);
      onCampaignDeleted(campaign.id);
      onClose();
    } catch (err) {
      console.error('Error al eliminar la campaña:', err);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography component="span" sx={{ fontSize: '1.25rem' }}>
            {isBelcorp ? '🌸' : '🌿'}
          </Typography>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              Editar Campaña
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {companyName}
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
            label="Código de la Campaña"
            required
            fullWidth
            value={campaignCode}
            onChange={(e) => setCampaignCode(e.target.value)}
            placeholder="ej. C-06"
            slotProps={{
              input: {
                sx: { fontWeight: 700 },
              },
            }}
          />

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Estado de la Campaña
            </Typography>
            <ToggleButtonGroup
              value={status}
              exclusive
              onChange={(_, newStatus) => {
                if (newStatus) setStatus(newStatus);
              }}
              fullWidth
              size="small"
            >
              <ToggleButton value="active" color="success" sx={{ py: 1, gap: 1, fontWeight: 700 }}>
                <CheckCircleIcon fontSize="small" />
                <span>En curso (Activa)</span>
              </ToggleButton>
              <ToggleButton value="closed" color="standard" sx={{ py: 1, fontWeight: 700 }}>
                <span>Cerrada</span>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Llegada estimada"
              type="date"
              fullWidth
              value={estimatedArrivalDate}
              onChange={(e) => handleArrivalDateChange(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />

            <TextField
              label="Pago referencial"
              type="date"
              fullWidth
              value={targetPaymentDate}
              onChange={(e) => setTargetPaymentDate(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
          </Box>

          {/* Zona de Peligro / Eliminación */}
          <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
            {!showDeleteConfirmation ? (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<DeleteOutlineIcon />}
                onClick={() => setShowDeleteConfirmation(true)}
                sx={{ fontWeight: 600 }}
              >
                Eliminar esta campaña
              </Button>
            ) : (
              <Alert
                severity={orderCount > 0 ? 'warning' : 'error'}
                icon={<WarningAmberIcon />}
                sx={{
                  borderRadius: 3,
                  '& .MuiAlert-message': { width: '100%' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  {orderCount > 0 ? (
                    <>
                      Atención: Esta campaña tiene <strong>{orderCount} pedido(s)</strong> de clientas.
                      Al eliminarla, se borrarán todos sus pedidos asociados.
                    </>
                  ) : (
                    <>
                      ¿Estás segura de eliminar la campaña <strong>{campaign.campaignCode}</strong>?
                      Esta acción no se puede deshacer.
                    </>
                  )}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
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
                    {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
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
            disabled={isSubmitting || !campaignCode.trim() || isDeleting}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
