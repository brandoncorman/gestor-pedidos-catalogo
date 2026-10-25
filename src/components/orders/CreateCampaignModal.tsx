/**
 * @file CreateCampaignModal.tsx
 * @description Modal contextual basado en Material UI Dialog para registrar una nueva campaña comercial.
 */

import React, { useState } from 'react';
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
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { createCampaign } from '../../services/campaignService';
import type { ParentCompany } from '../../types/database';

interface CreateCampaignModalProps {
  isOpen: boolean;
  targetCompany?: ParentCompany | null;
  onClose: () => void;
  onCampaignCreated: (newCampaignId: string) => void;
}

/**
 * Modal para registrar una nueva campaña asociada directamente a la empresa paraguas activa.
 */
export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  targetCompany,
  onClose,
  onCampaignCreated,
}) => {
  const [campaignCode, setCampaignCode] = useState<string>('C-07');
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState<string>('');
  const [targetPaymentDate, setTargetPaymentDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBelcorp = targetCompany?.name.toLowerCase().includes('belcorp');

  const handleArrivalDateChange = (val: string) => {
    setEstimatedArrivalDate(val);
    if (val) {
      const d = new Date(val);
      d.setDate(d.getDate() + 10);
      setTargetPaymentDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignCode.trim() || !targetCompany?.id) return;

    try {
      setIsSubmitting(true);
      const created = await createCampaign({
        parentCompanyId: targetCompany.id,
        campaignCode: campaignCode.trim(),
        status: 'active',
        estimatedArrivalDate: estimatedArrivalDate || null,
        targetPaymentDate: targetPaymentDate || null,
        companyInvoiceAmount: null,
      });

      onCampaignCreated(created.id);
      onClose();
    } finally {
      setIsSubmitting(false);
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
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            Nueva Campaña Comercial
          </Typography>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
            Para {targetCompany?.name || 'Catálogo'}
          </Typography>
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

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2.5 }}>
          {/* Tarjeta de empresa paraguas contextual */}
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Empresa Paraguas
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{isBelcorp ? '🌸' : '🌿'}</span>
                <span>{targetCompany?.name || 'Empresa'}</span>
              </Typography>
            </Box>
            <Chip
              label={isBelcorp ? 'Ésika, L\'Bel, Cyzone' : 'Natura, Avon'}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>

          <TextField
            label="Código de la Campaña"
            required
            fullWidth
            value={campaignCode}
            onChange={(e) => setCampaignCode(e.target.value)}
            placeholder="ej. C-07"
            helperText="Identificador de la revista en el ciclo actual"
            slotProps={{
              input: {
                sx: { fontWeight: 700 },
              },
            }}
          />

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
              helperText="Fecha en que llega la caja"
            />

            <TextField
              label="Fecha límite de cobro"
              type="date"
              fullWidth
              value={targetPaymentDate}
              onChange={(e) => setTargetPaymentDate(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
              }}
              helperText="Plazo máximo sugerido"
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting || !campaignCode.trim()}
            startIcon={<AddIcon />}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting ? 'Creando...' : 'Crear Campaña'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
