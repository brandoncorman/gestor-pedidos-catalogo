/**
 * @file PaymentModal.tsx
 * @description Modal de registro de abonos a nivel de clienta con previsualización en cascada construido con Material UI.
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
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  Paper,
  InputAdornment,
  Avatar,
  Chip,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckIcon from '@mui/icons-material/Check';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { formatCurrency, getCustomerDisplayName } from '../../lib/formatters';
import {
  recordCustomerPayment,
  getCustomerPendingOrders,
  allocatePaymentInCascade,
  type OrderWithBalance,
} from '../../services/paymentService';
import type { Customer, PaymentMethod } from '../../types/database';

interface PaymentModalProps {
  isOpen: boolean;
  customerId: string;
  customers: Customer[];
  onClose: () => void;
  onPaymentSuccess: () => void;
}

/**
 * Modal de abonos en cascada para registrar pagos parciales o totales con Material UI.
 */
export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  customerId,
  customers,
  onClose,
  onPaymentSuccess,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customerId);
  const [pendingOrders, setPendingOrders] = useState<OrderWithBalance[]>([]);
  const [amountStr, setAmountStr] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setSelectedCustomerId(customerId);
  }, [customerId]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    getCustomerPendingOrders(selectedCustomerId).then((orders) => {
      setPendingOrders(orders);
    });
  }, [selectedCustomerId]);

  if (!isOpen) return null;

  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);
  const totalDebt = pendingOrders.reduce((acc, curr) => acc + curr.pendingBalance, 0);

  const numericAmount = parseFloat(amountStr.replace(/\D/g, '')) || 0;
  const previewAllocation = allocatePaymentInCascade(pendingOrders, numericAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    try {
      setIsSubmitting(true);
      await recordCustomerPayment(
        selectedCustomerId,
        numericAmount,
        paymentDate,
        method,
        note.trim() || null
      );
      onPaymentSuccess();
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
            <AccountBalanceWalletIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              Registrar Abono
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentCustomer ? getCustomerDisplayName(currentCustomer) : 'Clienta'}
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

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2.5 }}>
          {/* Tarjeta de Deuda Total Acumulada */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
              border: 1,
              borderColor: 'warning.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Deuda Total Pendiente
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                {formatCurrency(totalDebt)}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => setAmountStr(String(totalDebt))}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Pagar Todo
            </Button>
          </Paper>

          {/* Campo Monto del Abono */}
          <TextField
            label="Monto del Abono ($)"
            required
            fullWidth
            type="text"
            value={amountStr ? `$${parseInt(amountStr).toLocaleString('es-CL')}` : ''}
            onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, ''))}
            placeholder="$10.000"
            helperText="Se imputará en cascada al pedido más antiguo primero"
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                sx: { fontWeight: 800, fontSize: '1.1rem' },
              },
            }}
          />

          {/* Fecha y Método de Pago */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Fecha del Abono"
              type="date"
              fullWidth
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />

            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Método de Pago
              </FormLabel>
              <RadioGroup
                row
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              >
                <FormControlLabel
                  value="cash"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2">Efectivo</Typography>}
                />
                <FormControlLabel
                  value="bank_transfer"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2">Transferencia</Typography>}
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <TextField
            label="Nota o Comentario (Opcional)"
            fullWidth
            size="small"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ej. Pagó en efectivo en la reunión"
          />

          {/* Previsualización en Cascada */}
          {numericAmount > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                <ArrowDownwardIcon fontSize="inherit" color="primary" />
                <span>Distribución del Abono en Cascada</span>
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {previewAllocation.allocations.map((alloc) => {
                  const order = pendingOrders.find((o) => o.order.id === alloc.orderId);
                  const isFullyCovered = alloc.allocatedAmount >= (order?.pendingBalance || 0);

                  return (
                    <Box
                      key={alloc.orderId}
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        border: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Pedido #{order?.order.id.slice(-6) || ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Deuda: {formatCurrency(order?.pendingBalance || 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Chip
                          size="small"
                          label={`+${formatCurrency(alloc.allocatedAmount)}`}
                          color={isFullyCovered ? 'success' : 'primary'}
                          sx={{ fontWeight: 700 }}
                        />
                        {isFullyCovered && (
                          <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 600 }}>
                            Saldado
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}

                {previewAllocation.unallocatedCredit > 0 && (
                  <Alert severity="success" sx={{ py: 0.5, mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      Saldo a Favor Remanente: {formatCurrency(previewAllocation.unallocatedCredit)}
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<CheckIcon />}
            disabled={isSubmitting || numericAmount <= 0}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting ? 'Registrando...' : 'Confirmar Abono'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
