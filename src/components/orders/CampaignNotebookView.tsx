/**
 * @file CampaignNotebookView.tsx
 * @description Vista principal estilo cuaderno basada en Material UI que organiza los pedidos por clienta en la campaña seleccionada.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CloseIcon from '@mui/icons-material/Close';

import { formatCurrency, getCustomerDisplayName } from '../../lib/formatters';
import { AddOrderItemModal } from './AddOrderItemModal';
import { deleteOrderItem, addOrderItem, createOrder } from '../../services/orderService';
import type { Campaign, Brand, Customer, ParentCompany } from '../../types/database';
import type { OrderDetail } from '../../services/orderService';

interface CampaignNotebookViewProps {
  companies: ParentCompany[];
  selectedCompanyId: string;
  campaigns: Campaign[];
  activeCampaignId: string;
  onSelectCampaign: (id: string) => void;
  orders: OrderDetail[];
  brands: Brand[];
  allCustomers: Customer[];
  onRefresh: () => void;
  onOpenPaymentModal: (customerId: string) => void;
  onCreateCampaignClick: () => void;
  onEditCampaignClick?: () => void;
  onCreateCustomerClick: () => void;
}

/**
 * Vista cuaderno que emula las páginas del cuaderno físico con cálculo automático de totales en Material UI.
 */
export const CampaignNotebookView: React.FC<CampaignNotebookViewProps> = ({
  companies,
  selectedCompanyId,
  campaigns,
  activeCampaignId,
  onSelectCampaign,
  orders,
  brands,
  allCustomers,
  onRefresh,
  onOpenPaymentModal,
  onCreateCampaignClick,
  onEditCampaignClick,
  onCreateCustomerClick,
}) => {
  const [selectedOrderForAdd, setSelectedOrderForAdd] = useState<{
    orderId: string;
    customerName: string;
  } | null>(null);

  const [isAddCustomerToCampaignOpen, setIsAddCustomerToCampaignOpen] = useState(false);
  const [selectedCustomerIdToAdd, setSelectedCustomerIdToAdd] = useState('');

  // Diálogo de confirmación para eliminar ítem de pedido en MUI
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const companyCampaigns = campaigns.filter((c) => c.parentCompanyId === selectedCompanyId);
  const companyBrands = brands.filter((b) => b.parentCompanyId === selectedCompanyId);
  const activeCampaign =
    companyCampaigns.find((c) => c.id === activeCampaignId) || companyCampaigns[0];

  const safeCampaignValue = companyCampaigns.some((c) => c.id === activeCampaignId)
    ? activeCampaignId
    : companyCampaigns[0]?.id || '';

  const customersNotInCampaign = allCustomers.filter(
    (c) => !orders.some((o) => o.customer.id === c.id)
  );

  const handleAddCustomerToCampaign = async () => {
    if (!selectedCustomerIdToAdd || !safeCampaignValue) return;
    await createOrder(safeCampaignValue, selectedCustomerIdToAdd);
    setIsAddCustomerToCampaignOpen(false);
    setSelectedCustomerIdToAdd('');
    onRefresh();
  };

  const handleConfirmDeleteItem = async () => {
    if (itemToDelete) {
      await deleteOrderItem(itemToDelete);
      setItemToDelete(null);
      onRefresh();
    }
  };

  const campaignTotalAmount = orders.reduce((sum, o) => sum + o.orderTotal, 0);
  const campaignPendingAmount = orders.reduce((sum, o) => sum + o.pendingBalance, 0);

  const currentCompanyName =
    companies.find((c) => c.id === selectedCompanyId)?.name || 'esta empresa';
  const hasCampaigns = companyCampaigns.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 10 }}>
      {/* Selector de Campaña y Resumen Superior */}
      <Card elevation={0} sx={{ borderRadius: 4, border: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                Campaña Activa:
              </Typography>

              {hasCampaigns ? (
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={safeCampaignValue}
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
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Sin campañas registradas
                </Typography>
              )}

              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={onCreateCampaignClick}
                sx={{ borderRadius: 2.5, fontWeight: 700 }}
              >
                Nueva
              </Button>

              {hasCampaigns && onEditCampaignClick && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={onEditCampaignClick}
                  sx={{ borderRadius: 2.5, fontWeight: 700 }}
                >
                  Editar
                </Button>
              )}
            </Box>

            {activeCampaign?.estimatedArrivalDate && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: '0.8rem' }}>
                <CalendarMonthIcon fontSize="small" color="primary" />
                <span>Llegada estimada: <strong>{activeCampaign.estimatedArrivalDate}</strong></span>
              </Box>
            )}
          </Box>

          {/* Cifras Globales de la Campaña en Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : '#eef2ff'),
                border: 1,
                borderColor: 'primary.light',
              }}
            >
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Total Ventas Campaña
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                {formatCurrency(campaignTotalAmount)}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb'),
                border: 1,
                borderColor: 'warning.light',
              }}
            >
              <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Saldo Pendiente Cobro
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                {formatCurrency(campaignPendingAmount)}
              </Typography>
            </Paper>
          </Box>
        </CardContent>
      </Card>

      {/* Barra de Título de Pedidos y Botón Añadir Clienta */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Pedidos por Clienta
          </Typography>
          <Chip label={orders.length} size="small" sx={{ fontWeight: 700, height: 22 }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!hasCampaigns && (
            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'inline' } }}>
              (Crea una campaña primero)
            </Typography>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            disabled={!hasCampaigns}
            onClick={() => setIsAddCustomerToCampaignOpen(true)}
            sx={{ fontWeight: 700, borderRadius: 3 }}
          >
            Añadir Clienta
          </Button>
        </Box>
      </Box>

      {/* Lista de Pedidos por Clienta o Estados Vacíos */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {!hasCampaigns ? (
          <Card elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 4, border: '2px dashed', borderColor: 'divider' }}>
            <Avatar sx={{ bgcolor: 'primary.light', width: 56, height: 56, mx: 'auto', mb: 2 }}>
              <ReceiptLongIcon fontSize="medium" />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              No hay campañas para {currentCompanyName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto', mb: 2.5 }}>
              Crea tu primera campaña para esta empresa para comenzar a registrar los pedidos de las clientas.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={onCreateCampaignClick}
              sx={{ borderRadius: 3, fontWeight: 700 }}
            >
              Crear Campaña para {currentCompanyName}
            </Button>
          </Card>
        ) : orders.length === 0 ? (
          <Card elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
            <Avatar sx={{ bgcolor: 'action.hover', color: 'text.secondary', width: 56, height: 56, mx: 'auto', mb: 2 }}>
              <ReceiptLongIcon fontSize="medium" />
            </Avatar>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              No hay pedidos en esta campaña todavía
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 360, mx: 'auto' }}>
              Presiona el botón "Añadir Clienta" para comenzar a transcribir los productos solicitados de las revistas.
            </Typography>
          </Card>
        ) : (
          orders.map((detail) => {
            const displayName = getCustomerDisplayName(detail.customer);
            const isFullyPaid = detail.pendingBalance === 0 && detail.orderTotal > 0;

            return (
              <Card
                key={detail.order.id}
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: 1,
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                {/* Cabecera del Pedido de la Clienta */}
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    bgcolor: 'action.hover',
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {displayName}
                    </Typography>
                    {detail.customer.isSelfProfile && (
                      <Chip
                        size="small"
                        label="Autocompra"
                        color="secondary"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    )}
                  </Box>

                  {/* Estado de Cobro */}
                  <Box>
                    {isFullyPaid ? (
                      <Chip
                        size="small"
                        icon={<CheckCircleIcon sx={{ fontSize: '0.9rem !important' }} />}
                        label="Al día"
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    ) : detail.pendingBalance > 0 ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<AccountBalanceWalletIcon />}
                        onClick={() => onOpenPaymentModal(detail.customer.id)}
                        sx={{ borderRadius: 2, fontWeight: 700, py: 0.25 }}
                      >
                        Abonar
                      </Button>
                    ) : null}
                  </Box>
                </Box>

                {/* Tabla de Productos del Pedido */}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell align="center" sx={{ width: 50, fontWeight: 700, fontSize: '0.75rem' }}>
                          Cant.
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Producto</TableCell>
                        <TableCell align="center" sx={{ width: 90, fontWeight: 700, fontSize: '0.75rem' }}>
                          Revista
                        </TableCell>
                        <TableCell align="center" sx={{ width: 80, fontWeight: 700, fontSize: '0.75rem' }}>
                          Código
                        </TableCell>
                        <TableCell align="right" sx={{ width: 100, fontWeight: 700, fontSize: '0.75rem' }}>
                          Precio
                        </TableCell>
                        <TableCell align="center" sx={{ width: 44 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                            Sin productos anotados. Presiona "Agregar Producto" abajo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        detail.items.map((item) => {
                          const isExcluded = item.status === 'missing' || item.status === 'defective';

                          return (
                            <TableRow
                              key={item.id}
                              sx={{
                                opacity: isExcluded ? 0.6 : 1,
                                bgcolor: isExcluded ? 'action.hover' : 'inherit',
                              }}
                            >
                              <TableCell align="center" sx={{ fontWeight: 800 }}>
                                {item.quantity}
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    textDecoration: isExcluded ? 'line-through' : 'none',
                                    fontWeight: 500,
                                    color: isExcluded ? 'text.secondary' : 'text.primary',
                                  }}
                                >
                                  {item.description}
                                </Typography>
                                {item.status === 'missing' && (
                                  <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <WarningAmberIcon sx={{ fontSize: '0.8rem' }} /> Faltante empresa (no cobrado)
                                  </Typography>
                                )}
                                {item.status === 'defective' && (
                                  <Typography variant="caption" color="error.main" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <WarningAmberIcon sx={{ fontSize: '0.8rem' }} /> Defectuoso devuelto (no cobrado)
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                {item.brand ? (
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
                                ) : (
                                  <Typography variant="caption" color="text.secondary">-</Typography>
                                )}
                              </TableCell>
                              <TableCell align="center" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {item.code}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 800 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 800,
                                    textDecoration: isExcluded ? 'line-through' : 'none',
                                  }}
                                >
                                  {formatCurrency(item.finalLinePrice)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setItemToDelete(item.id)}
                                  title="Eliminar producto"
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pie del Bloque de la Clienta: Botón Agregar y Totales */}
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.75,
                    bgcolor: 'action.hover',
                    borderTop: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1.5,
                  }}
                >
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() =>
                      setSelectedOrderForAdd({
                        orderId: detail.order.id,
                        customerName: displayName,
                      })
                    }
                    sx={{ borderRadius: 2.5, fontWeight: 700 }}
                  >
                    Agregar Producto
                  </Button>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Total
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {formatCurrency(detail.orderTotal)}
                      </Typography>
                    </Box>

                    {detail.totalPaid > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Abonado
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                          {formatCurrency(detail.totalPaid)}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Saldo
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 800,
                          color: detail.pendingBalance > 0 ? 'warning.main' : 'success.main',
                        }}
                      >
                        {formatCurrency(detail.pendingBalance)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Card>
            );
          })
        )}
      </Box>

      {/* Modal para Añadir Clienta a la Campaña */}
      <Dialog
        open={isAddCustomerToCampaignOpen}
        onClose={() => setIsAddCustomerToCampaignOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            Añadir Clienta a la Campaña
          </Typography>
          <IconButton size="small" onClick={() => setIsAddCustomerToCampaignOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          {customersNotInCampaign.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Todas las clientas registradas ya tienen un pedido en esta campaña.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setIsAddCustomerToCampaignOpen(false);
                  onCreateCustomerClick();
                }}
                sx={{ borderRadius: 2.5, fontWeight: 700 }}
              >
                Registrar Nueva Clienta
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <Select
                  value={selectedCustomerIdToAdd}
                  onChange={(e) => setSelectedCustomerIdToAdd(e.target.value)}
                  displayEmpty
                  sx={{ borderRadius: 3 }}
                >
                  <MenuItem value="" disabled>
                    Selecciona una clienta...
                  </MenuItem>
                  {customersNotInCampaign.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontWeight: 600 }}>
                      {getCustomerDisplayName(c)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setIsAddCustomerToCampaignOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!selectedCustomerIdToAdd}
            onClick={handleAddCustomerToCampaign}
            sx={{ fontWeight: 700 }}
          >
            Añadir Pedido
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Agregar Producto al Pedido */}
      {selectedOrderForAdd && (
        <AddOrderItemModal
          isOpen={true}
          orderId={selectedOrderForAdd.orderId}
          customerName={selectedOrderForAdd.customerName}
          availableBrands={companyBrands}
          onClose={() => setSelectedOrderForAdd(null)}
          onSave={async (itemData) => {
            await addOrderItem({ ...itemData, status: 'requested' });
            setSelectedOrderForAdd(null);
            onRefresh();
          }}
        />
      )}

      {/* Diálogo de Confirmación para Eliminar Línea de Pedido en Material UI */}
      <Dialog
        open={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar producto?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás segura de eliminar esta línea del pedido? El monto se descontará automáticamente del total.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setItemToDelete(null)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeleteItem} sx={{ fontWeight: 700 }}>
            Sí, eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
