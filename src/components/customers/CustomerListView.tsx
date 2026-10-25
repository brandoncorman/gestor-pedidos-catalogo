/**
 * @file CustomerListView.tsx
 * @description Directorio de clientas con búsqueda ágil, indicador de deuda consolidada y gestión completa en Material UI.
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Link,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PhoneIcon from '@mui/icons-material/Phone';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { formatCurrency, getCustomerDisplayName } from '../../lib/formatters';
import { createCustomer } from '../../services/customerService';
import { EditCustomerModal } from './EditCustomerModal';
import type { Customer } from '../../types/database';

interface CustomerWithDebt extends Customer {
  totalDebt: number;
}

interface CustomerListViewProps {
  customers: CustomerWithDebt[];
  onOpenPaymentModal: (customerId: string) => void;
  onRefresh: () => void;
}

/**
 * Directorio de clientas optimizado para búsqueda rápida y control de saldos construido con Material UI.
 */
export const CustomerListView: React.FC<CustomerListViewProps> = ({
  customers,
  onOpenPaymentModal,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<CustomerWithDebt | null>(null);

  // Campos para nueva clienta
  const [name, setName] = useState('');
  const [descriptor, setDescriptor] = useState('');
  const [phone, setPhone] = useState('');
  const [isSelfProfile, setIsSelfProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesName = c.name.toLowerCase().includes(term);
    const matchesDescriptor = c.descriptor ? c.descriptor.toLowerCase().includes(term) : false;
    return matchesName || matchesDescriptor;
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await createCustomer({
        name: name.trim(),
        descriptor: descriptor.trim() || null,
        phone: phone.trim() || null,
        isSelfProfile,
      });

      setName('');
      setDescriptor('');
      setPhone('');
      setIsSelfProfile(false);
      setIsAddModalOpen(false);
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 10 }}>
      {/* Barra de Búsqueda y Botón Añadir */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <TextField
          placeholder="Buscar por nombre o descriptor (ej. Clary, Sede)..."
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: { borderRadius: 3 },
            },
          }}
        />

        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonAddIcon />}
          onClick={() => setIsAddModalOpen(true)}
          sx={{ fontWeight: 700, borderRadius: 3, px: 2.5, whiteSpace: 'nowrap' }}
        >
          Nueva
        </Button>
      </Box>

      {/* Lista de Clientas en Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
        }}
      >
        {filteredCustomers.map((customer) => {
          const displayName = getCustomerDisplayName(customer);

          return (
            <Card
              key={customer.id}
              elevation={0}
              sx={{
                borderRadius: 4,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <CardContent
                sx={{
                  p: 2,
                  '&:last-child': { pb: 2 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                  <Avatar
                    sx={{
                      bgcolor: customer.isSelfProfile ? 'secondary.main' : 'primary.light',
                      color: '#ffffff',
                      fontWeight: 700,
                      width: 42,
                      height: 42,
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    {customer.name.charAt(0).toUpperCase()}
                  </Avatar>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.92rem' }}
                    >
                      {displayName}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25, flexWrap: 'wrap' }}>
                      {customer.phone && (
                        <Link
                          href={`tel:${customer.phone}`}
                          underline="hover"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                          }}
                        >
                          <PhoneIcon sx={{ fontSize: '0.85rem' }} />
                          <span>{customer.phone}</span>
                        </Link>
                      )}

                      <Chip
                        size="small"
                        label={customer.totalDebt > 0 ? `Debe: ${formatCurrency(customer.totalDebt)}` : 'Al día'}
                        color={customer.totalDebt > 0 ? 'warning' : 'success'}
                        variant={customer.totalDebt > 0 ? 'filled' : 'outlined'}
                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Acciones de la Clienta */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                  {customer.totalDebt > 0 && (
                    <IconButton
                      color="primary"
                      onClick={() => onOpenPaymentModal(customer.id)}
                      size="small"
                      sx={{
                        bgcolor: 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' },
                        borderRadius: 2.5,
                      }}
                      title="Registrar abono"
                    >
                      <AccountBalanceWalletIcon fontSize="small" />
                    </IconButton>
                  )}

                  <IconButton
                    color="default"
                    onClick={() => setSelectedCustomerForEdit(customer)}
                    size="small"
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2.5,
                    }}
                    title="Editar o eliminar clienta"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Modal para Registrar Nueva Clienta */}
      <Dialog
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 4, p: 1 } },
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            Registrar Nueva Clienta
          </Typography>
          <IconButton
            size="small"
            onClick={() => setIsAddModalOpen(false)}
            sx={{ color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleCreateCustomer}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2.5 }}>
            <TextField
              label="Nombre de la Clienta"
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Clary"
              slotProps={{ input: { sx: { fontWeight: 700 } } }}
            />

            <TextField
              label="Descriptor de Desambiguación (Opcional)"
              fullWidth
              value={descriptor}
              onChange={(e) => setDescriptor(e.target.value)}
              placeholder="ej. Sede, Trabajo, Vecina"
              helperText="Permite diferenciar clientas con el mismo nombre"
            />

            <TextField
              label="Teléfono / WhatsApp (Opcional)"
              fullWidth
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ej. +56912345678"
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
          </DialogContent>

          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setIsAddModalOpen(false)} color="inherit">
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting || !name.trim()}
              sx={{ fontWeight: 700 }}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Clienta'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal para Editar o Eliminar Clienta */}
      {selectedCustomerForEdit && (
        <EditCustomerModal
          isOpen={true}
          customer={selectedCustomerForEdit}
          onClose={() => setSelectedCustomerForEdit(null)}
          onCustomerUpdated={() => {
            onRefresh();
          }}
          onCustomerDeleted={() => {
            onRefresh();
          }}
        />
      )}
    </Box>
  );
};
