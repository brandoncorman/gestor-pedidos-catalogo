/**
 * @file AddOrderItemModal.tsx
 * @description Modal basado en Material UI Dialog para ingresar líneas de pedido con asistente inteligente de precios y ofertas.
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
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { formatCurrency } from '../../lib/formatters';
import type { Brand } from '../../types/database';

export type PricingMode = 'unit' | 'total';

interface AddOrderItemModalProps {
  isOpen: boolean;
  orderId: string;
  customerName: string;
  availableBrands: Brand[];
  defaultBrandId?: string;
  onClose: () => void;
  onSave: (itemData: {
    orderId: string;
    brandId: string;
    description: string;
    code: string;
    quantity: number;
    finalLinePrice: number;
  }) => Promise<void>;
}

/**
 * Modal optimizado para inserción rápida de productos de catálogo con asistente inteligente de precios en Material UI.
 */
export const AddOrderItemModal: React.FC<AddOrderItemModalProps> = ({
  isOpen,
  orderId,
  customerName,
  availableBrands,
  defaultBrandId,
  onClose,
  onSave,
}) => {
  const [brandId, setBrandId] = useState<string>(
    defaultBrandId || (availableBrands[0] ? availableBrands[0].id : '')
  );
  const [description, setDescription] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Asistente de precios: modo unitario (c/u) o modo total de oferta/pack
  const [pricingMode, setPricingMode] = useState<PricingMode>('unit');
  const [unitPriceStr, setUnitPriceStr] = useState<string>('');
  const [totalPriceStr, setTotalPriceStr] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Cálculos dinámicos
  const numericUnitPrice = parseFloat(unitPriceStr.replace(/\D/g, '')) || 0;
  const numericTotal = parseFloat(totalPriceStr.replace(/\D/g, '')) || 0;

  // Total final a registrar según la modalidad activa
  const effectiveTotal =
    pricingMode === 'unit' ? numericUnitPrice * quantity : numericTotal;

  // Unitario referencial cuando se anota una promo de pack
  const computedUnitFromTotal =
    quantity > 0 ? Math.round(numericTotal / quantity) : numericTotal;

  const handlePricingModeChange = (mode: PricingMode) => {
    setPricingMode(mode);
    if (mode === 'total' && numericUnitPrice > 0 && !totalPriceStr) {
      setTotalPriceStr(String(numericUnitPrice * quantity));
    } else if (mode === 'unit' && numericTotal > 0 && !unitPriceStr) {
      setUnitPriceStr(String(computedUnitFromTotal));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !code.trim() || effectiveTotal <= 0) return;

    try {
      setIsSubmitting(true);
      await onSave({
        orderId,
        brandId: brandId || (availableBrands[0]?.id ?? ''),
        description: description.trim(),
        code: code.trim(),
        quantity: Math.max(1, quantity),
        finalLinePrice: effectiveTotal,
      });

      // Limpiamos formulario para el siguiente ingreso
      setDescription('');
      setCode('');
      setQuantity(1);
      setUnitPriceStr('');
      setTotalPriceStr('');
      setPricingMode('unit');
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
            Anotar Producto
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Para clienta: <strong>{customerName}</strong>
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
          {/* Selección de Revista con Chips táctiles */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Revista / Marca de Catálogo
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {availableBrands.map((b) => {
                const isSelected = (brandId || availableBrands[0]?.id) === b.id;
                return (
                  <Chip
                    key={b.id}
                    label={b.name}
                    onClick={() => setBrandId(b.id)}
                    sx={{
                      cursor: 'pointer',
                      fontWeight: 700,
                      bgcolor: isSelected ? b.colorTag : 'action.hover',
                      color: isSelected ? '#ffffff' : 'text.primary',
                      borderColor: isSelected ? b.colorTag : 'divider',
                      border: 1,
                      '&:hover': {
                        bgcolor: isSelected ? b.colorTag : 'action.selected',
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Cantidad y Código en Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Cantidad
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <TextField
                  type="number"
                  size="small"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  slotProps={{
                    input: {
                      sx: { textAlign: 'center', fontWeight: 700, px: 0.5 },
                    },
                  }}
                  sx={{ width: 60 }}
                />
                <IconButton
                  size="small"
                  onClick={() => setQuantity((q) => q + 1)}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <TextField
              label="Código Revista"
              required
              size="small"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ej. 15880"
              helperText="Código numérico"
              slotProps={{
                input: {
                  sx: { fontFamily: 'monospace', fontWeight: 700 },
                },
              }}
            />
          </Box>

          <TextField
            label="Descripción o Nombre del Producto"
            required
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ej. Labial Hidracolor Fucsia"
          />

          {/* Asistente Inteligente de Precios */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9'),
              border: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {quantity > 1 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <AutoFixHighIcon fontSize="inherit" color="primary" />
                  <span>Asistente de Precios y Ofertas</span>
                </Typography>
                <ToggleButtonGroup
                  value={pricingMode}
                  exclusive
                  onChange={(_, val) => {
                    if (val) handlePricingModeChange(val);
                  }}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="unit" sx={{ fontWeight: 700, py: 0.5 }}>
                    Precio por Unidad (c/u)
                  </ToggleButton>
                  <ToggleButton value="total" sx={{ fontWeight: 700, py: 0.5 }}>
                    <LocalOfferIcon fontSize="small" sx={{ mr: 0.5 }} />
                    Pack / Oferta Total
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            {pricingMode === 'unit' ? (
              <TextField
                label={quantity > 1 ? `Precio Catálogo (c/u) [Multiplica x${quantity}]` : 'Precio de Catálogo ($)'}
                required
                fullWidth
                type="text"
                value={unitPriceStr ? `$${parseInt(unitPriceStr).toLocaleString('es-CL')}` : ''}
                onChange={(e) => setUnitPriceStr(e.target.value.replace(/\D/g, ''))}
                placeholder="$4.990"
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    sx: { fontWeight: 700 },
                  },
                }}
              />
            ) : (
              <TextField
                label={`Precio Total de la Promoción (por los ${quantity} productos)`}
                required
                fullWidth
                type="text"
                value={totalPriceStr ? `$${parseInt(totalPriceStr).toLocaleString('es-CL')}` : ''}
                onChange={(e) => setTotalPriceStr(e.target.value.replace(/\D/g, ''))}
                placeholder="$5.980"
                helperText={`Equivale a ${formatCurrency(computedUnitFromTotal)} c/u referencial`}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    sx: { fontWeight: 700 },
                  },
                }}
              />
            )}

            {/* Total Final Calculado en Vivo */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Total a Cobrar:
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {formatCurrency(effectiveTotal)}
              </Typography>
            </Box>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            disabled={isSubmitting || !description.trim() || !code.trim() || effectiveTotal <= 0}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting ? 'Guardando...' : 'Anotar Pedido'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
