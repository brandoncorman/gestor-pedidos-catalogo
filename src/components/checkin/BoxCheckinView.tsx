/**
 * @file BoxCheckinView.tsx
 * @description Pantalla de recepción rápida de caja para marcar productos como recibidos, faltantes o defectuosos,
 * construida enteramente con Material UI.
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  Button,
  ButtonGroup,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatCurrency, getCustomerDisplayName } from '../../lib/formatters';
import { updateOrderItemStatus } from '../../services/orderService';
import type { OrderDetail } from '../../services/orderService';
import type { Campaign, OrderItemStatus } from '../../types/database';

interface BoxCheckinViewProps {
  companyName: string;
  companyCampaigns: Campaign[];
  activeCampaignId: string;
  onSelectCampaign: (campaignId: string) => void;
  orders: OrderDetail[];
  onRefresh: () => void;
  onGoToOrders: () => void;
}

/**
 * Modo Check-in para verificar la caja al momento de recibir los productos de catálogo con Material UI.
 */
export const BoxCheckinView: React.FC<BoxCheckinViewProps> = ({
  companyName,
  companyCampaigns,
  activeCampaignId,
  onSelectCampaign,
  orders,
  onRefresh,
  onGoToOrders,
}) => {
  // Aplanamos todas las líneas de todos los pedidos para la verificación rápida de caja
  const allItems = orders.flatMap((o) =>
    o.items.map((i) => ({
      ...i,
      customerName: getCustomerDisplayName(o.customer),
    }))
  );

  const totalCount = allItems.length;
  const receivedCount = allItems.filter((i) => i.status === 'received').length;
  const missingCount = allItems.filter((i) => i.status === 'missing').length;
  const defectiveCount = allItems.filter((i) => i.status === 'defective').length;

  // Monto total a descontar de la factura digital de la empresa
  const discountedAmount = allItems
    .filter((i) => i.status === 'missing' || i.status === 'defective')
    .reduce((sum, i) => sum + i.finalLinePrice, 0);

  const handleStatusChange = async (itemId: string, newStatus: OrderItemStatus) => {
    await updateOrderItemStatus(itemId, newStatus);
    onRefresh();
  };

  // Si la empresa no tiene campañas creadas, mostramos estado vacío amigable
  if (companyCampaigns.length === 0) {
    return (
      <Box sx={{ pb: 10 }}>
        <Card
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 4,
            border: '2px dashed',
            borderColor: 'divider',
          }}
        >
          <Avatar
            sx={{
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              width: 56,
              height: 56,
              mx: 'auto',
              mb: 2,
            }}
          >
            <FactCheckIcon fontSize="medium" />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Sin campañas registradas para {companyName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto', mb: 2.5 }}>
            Para realizar el check-in de una caja de {companyName}, primero debes registrar una campaña en la sección de Pedidos.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={onGoToOrders}
            sx={{ borderRadius: 3, fontWeight: 700 }}
          >
            Ir a Pedidos
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
      {/* Cabecera y Resumen de Recepción con selector de campaña */}
      <Card elevation={0} sx={{ borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'secondary.main', width: 44, height: 44, borderRadius: 3 }}>
                <FactCheckIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Check-in de Caja: {companyName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Revisa los productos al abrir la caja antes de pagar la factura digital
                </Typography>
              </Box>
            </Box>

            {/* Selector de Campaña dentro de Check-in */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={activeCampaignId}
                onChange={(e) => onSelectCampaign(e.target.value)}
                sx={{ borderRadius: 3, fontWeight: 700 }}
              >
                {companyCampaigns.map((camp) => (
                  <MenuItem key={camp.id} value={camp.id} sx={{ fontWeight: 600 }}>
                    {camp.campaignCode} {camp.status === 'active' ? '(En curso)' : '(Cerrada)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Métricas del Check-in en Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1.5,
              pt: 1,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                Total
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {totalCount}
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.light', color: '#ffffff', borderRadius: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', opacity: 0.9 }}>
                Recibidos
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {receivedCount}
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', bgcolor: 'warning.light', color: '#ffffff', borderRadius: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', opacity: 0.9 }}>
                Faltantes
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {missingCount}
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', bgcolor: 'error.light', color: '#ffffff', borderRadius: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', opacity: 0.9 }}>
                Dañados
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {defectiveCount}
              </Typography>
            </Paper>
          </Box>

          {discountedAmount > 0 && (
            <Alert severity="warning" sx={{ borderRadius: 3 }}>
              Se descontarán <strong>{formatCurrency(discountedAmount)}</strong> de la factura de la empresa y de los saldos de las clientas afectadas.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Lista Plana de Productos para Verificación Rápida */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {allItems.length === 0 ? (
          <Card elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              No hay productos registrados en los pedidos de esta campaña para verificar.
            </Typography>
          </Card>
        ) : (
          allItems.map((item) => (
            <Card
              key={item.id}
              elevation={0}
              sx={{
                borderRadius: 4,
                border: 1,
                borderColor:
                  item.status === 'received'
                    ? 'success.light'
                    : item.status === 'missing'
                    ? 'warning.light'
                    : item.status === 'defective'
                    ? 'error.light'
                    : 'divider',
                bgcolor:
                  item.status === 'received'
                    ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4')
                    : item.status === 'missing'
                    ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb')
                    : item.status === 'defective'
                    ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2')
                    : 'background.paper',
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {item.quantity}x {item.description}
                      </Typography>
                      {item.brand && (
                        <Chip
                          size="small"
                          label={item.brand.name}
                          sx={{
                            bgcolor: item.brand.colorTag,
                            color: '#ffffff',
                            fontWeight: 700,
                            height: 20,
                            fontSize: '0.65rem',
                          }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Cód: <strong>{item.code}</strong> • Clienta: <strong>{item.customerName}</strong> • {formatCurrency(item.finalLinePrice)}
                    </Typography>
                  </Box>
                </Box>

                {/* Botones Táctiles de Acción de Check-in */}
                <ButtonGroup fullWidth size="small" variant="outlined" sx={{ borderRadius: 2.5 }}>
                  <Button
                    onClick={() => handleStatusChange(item.id, 'received')}
                    variant={item.status === 'received' ? 'contained' : 'outlined'}
                    color="success"
                    startIcon={<CheckIcon />}
                    sx={{ fontWeight: 700, textTransform: 'none' }}
                  >
                    Recibido OK
                  </Button>
                  <Button
                    onClick={() => handleStatusChange(item.id, 'missing')}
                    variant={item.status === 'missing' ? 'contained' : 'outlined'}
                    color="warning"
                    startIcon={<CancelIcon />}
                    sx={{ fontWeight: 700, textTransform: 'none' }}
                  >
                    Faltó
                  </Button>
                  <Button
                    onClick={() => handleStatusChange(item.id, 'defective')}
                    variant={item.status === 'defective' ? 'contained' : 'outlined'}
                    color="error"
                    startIcon={<WarningAmberIcon />}
                    sx={{ fontWeight: 700, textTransform: 'none' }}
                  >
                    Dañado
                  </Button>
                </ButtonGroup>
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};
