/**
 * @file FinancialDashboardView.tsx
 * @description Panel financiero con cálculo de rentabilidad silenciosa, factura de empresa y dinero en la calle en Material UI.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  InputAdornment,
  Avatar,
  Alert,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PeopleIcon from '@mui/icons-material/People';
import SaveIcon from '@mui/icons-material/Save';
import { formatCurrency, getCustomerDisplayName } from '../../lib/formatters';
import { calculateRealProfit } from '../../services/financialService';
import { updateCampaign } from '../../services/campaignService';
import type { Campaign, Customer } from '../../types/database';

interface FinancialDashboardViewProps {
  companyName?: string;
  selectedCompanyId?: string;
  campaigns: Campaign[];
  activeCampaignId: string;
  onSelectCampaign: (id: string) => void;
  campaignSalesTotal: number;
  customersWithDebt: (Customer & { totalDebt: number })[];
  onOpenPaymentModal: (customerId: string) => void;
  onRefresh: () => void;
}

/**
 * Dashboard financiero simplificado para control de dinero adelantado y ganancias con Material UI.
 */
export const FinancialDashboardView: React.FC<FinancialDashboardViewProps> = ({
  companyName,
  selectedCompanyId,
  campaigns,
  activeCampaignId,
  onSelectCampaign,
  campaignSalesTotal,
  customersWithDebt,
  onOpenPaymentModal,
  onRefresh,
}) => {
  const companyCampaigns = selectedCompanyId
    ? campaigns.filter((c) => c.parentCompanyId === selectedCompanyId)
    : campaigns;

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);
  const [invoiceAmountInput, setInvoiceAmountInput] = useState<string>(
    activeCampaign?.companyInvoiceAmount ? String(activeCampaign.companyInvoiceAmount) : ''
  );
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  useEffect(() => {
    setInvoiceAmountInput(
      activeCampaign?.companyInvoiceAmount ? String(activeCampaign.companyInvoiceAmount) : ''
    );
  }, [activeCampaignId, activeCampaign?.companyInvoiceAmount]);

  // Total dinero en la calle de todas las clientas
  const totalMoneyOnTheStreet = customersWithDebt.reduce((sum, c) => sum + c.totalDebt, 0);

  // Ganancia real de la campaña activa
  const invoiceNum = parseFloat(invoiceAmountInput.replace(/\D/g, '')) || null;
  const realProfit = calculateRealProfit(campaignSalesTotal, invoiceNum);

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaignId) return;

    try {
      setIsSavingInvoice(true);
      await updateCampaign(activeCampaignId, {
        companyInvoiceAmount: invoiceNum,
      });
      onRefresh();
    } finally {
      setIsSavingInvoice(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
      {/* Selector de Campaña para Análisis */}
      <Card elevation={0} sx={{ borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
              Campaña Analizada {companyName ? `(${companyName})` : ''}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {activeCampaign ? `Campaña ${activeCampaign.campaignCode}` : 'Sin campaña activa'}
            </Typography>
          </Box>

          {companyCampaigns.length > 0 ? (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={activeCampaignId}
                onChange={(e) => onSelectCampaign(e.target.value)}
                sx={{ borderRadius: 3, fontWeight: 700 }}
              >
                {companyCampaigns.map((c) => (
                  <MenuItem key={c.id} value={c.id} sx={{ fontWeight: 600 }}>
                    {c.campaignCode} {c.status === 'active' ? '(En curso)' : '(Cerrada)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Sin campañas registradas
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Tarjetas Principales de Métricas en Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        {/* Dinero en la Calle */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: 1,
            borderColor: 'warning.light',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Dinero en la Calle (Por Cobrar)
              </Typography>
              <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: '1.1rem' }} />
              </Avatar>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.dark' }}>
              {formatCurrency(totalMoneyOnTheStreet)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Total adeudado por {customersWithDebt.filter((c) => c.totalDebt > 0).length} clienta(s)
            </Typography>
          </CardContent>
        </Card>

        {/* Ganancia Real de la Campaña */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: 1,
            borderColor: 'success.light',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Ganancia Real (Campaña {activeCampaign?.campaignCode || ''})
              </Typography>
              <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
                <TrendingUpIcon sx={{ fontSize: '1.1rem' }} />
              </Avatar>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.dark' }}>
              {realProfit !== null ? formatCurrency(realProfit) : 'Pendiente factura'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {invoiceNum
                ? 'Ventas válidas menos el costo facturado'
                : 'Ingresa la factura para calcular la ganancia real'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tarjeta de Factura Digital y Registro */}
      <Card elevation={0} sx={{ borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
              <ReceiptLongIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Factura Digital de la Empresa
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Monto final cobrado por {companyName || 'la empresa'} para esta campaña
              </Typography>
            </Box>
          </Box>

          <Box
            component="form"
            onSubmit={handleSaveInvoice}
            sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}
          >
            <TextField
              label="Monto Factura Empresa ($)"
              size="small"
              value={invoiceAmountInput ? `$${parseInt(invoiceAmountInput).toLocaleString('es-CL')}` : ''}
              onChange={(e) => setInvoiceAmountInput(e.target.value.replace(/\D/g, ''))}
              placeholder="$95.000"
              helperText="Monto a pagar a la distribuidora"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  sx: { fontWeight: 700 },
                },
              }}
              sx={{ flex: 1, minWidth: 200 }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSavingInvoice || !activeCampaignId}
              startIcon={<SaveIcon />}
              sx={{ fontWeight: 700, borderRadius: 3, py: 1 }}
            >
              {isSavingInvoice ? 'Guardando...' : 'Guardar Factura'}
            </Button>
          </Box>

          {/* Resumen de rentabilidad */}
          <Box
            sx={{
              mt: 2.5,
              p: 2,
              borderRadius: 3,
              bgcolor: 'action.hover',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Ventas Totales Pedidas:
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {formatCurrency(campaignSalesTotal)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Costo Factura Empresa:
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: invoiceNum ? 'error.main' : 'text.disabled' }}>
                {invoiceNum ? formatCurrency(invoiceNum) : 'Sin ingresar'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Detalle de Clientas con Deuda */}
      <Card elevation={0} sx={{ borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.light', width: 36, height: 36 }}>
              <PeopleIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Clientas con Deuda Pendiente
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Saldos acumulados de campañas activas y anteriores
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {customersWithDebt.filter((c) => c.totalDebt > 0).length === 0 ? (
              <Alert severity="success" sx={{ borderRadius: 3 }}>
                ¡Excelente! Todas las clientas están al día con sus pagos.
              </Alert>
            ) : (
              customersWithDebt
                .filter((c) => c.totalDebt > 0)
                .map((c) => (
                  <Box
                    key={c.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      border: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {getCustomerDisplayName(c)}
                      </Typography>
                      <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                        Debe: {formatCurrency(c.totalDebt)}
                      </Typography>
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => onOpenPaymentModal(c.id)}
                      startIcon={<AccountBalanceWalletIcon />}
                      sx={{ borderRadius: 2.5, fontWeight: 700 }}
                    >
                      Abonar
                    </Button>
                  </Box>
                ))
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
