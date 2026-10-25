/**
 * @file App.tsx
 * @description Componente raíz de la aplicación 'catalogo-pedidos-app'.
 * Integra autenticación con Google OAuth, gestión de empresas paraguas (Belcorp vs Natura) con campañas independientes,
 * sincronización bidireccional con Supabase y tema Material UI v6.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ThemeProvider, CssBaseline, Box, Container, CircularProgress, Typography } from '@mui/material';
import { Navbar } from './components/layout/Navbar';
import { BottomNavigation, type NavigationTab } from './components/layout/BottomNavigation';
import { CampaignNotebookView } from './components/orders/CampaignNotebookView';
import { BoxCheckinView } from './components/checkin/BoxCheckinView';
import { CustomerListView } from './components/customers/CustomerListView';
import { FinancialDashboardView } from './components/finance/FinancialDashboardView';
import { SettingsView } from './components/settings/SettingsView';
import { PaymentModal } from './components/payments/PaymentModal';
import { CreateCampaignModal } from './components/orders/CreateCampaignModal';
import { EditCampaignModal } from './components/orders/EditCampaignModal';
import { CompanyTabs } from './components/common/CompanyTabs';
import { LoginView } from './components/auth/LoginView';

import { seedInitialDataIfNeeded } from './lib/db';
import { pullFromSupabase, triggerSync } from './lib/syncManager';
import {
  getInitialAuthState,
  subscribeToAuthChanges,
  signOut,
  type AuthState,
} from './services/authService';
import {
  createAppTheme,
  getSavedTheme,
  saveTheme,
  type ThemeMode,
} from './lib/theme';
import { getCampaigns, getBrands, getParentCompanies } from './services/campaignService';
import { getCustomers } from './services/customerService';
import { getOrdersWithDetails, type OrderDetail } from './services/orderService';
import { getCustomerPendingOrders } from './services/paymentService';
import type { Campaign, Brand, Customer, ParentCompany } from './types/database';

interface CustomerWithDebt extends Customer {
  totalDebt: number;
}

/**
 * Componente principal de la aplicación con soporte completo de Material UI y Google OAuth.
 */
export function App() {
  // Estado de autenticación y sesión
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAllowed: false,
    unauthorizedEmail: null,
  });

  const [currentTab, setCurrentTab] = useState<NavigationTab>('orders');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [companies, setCompanies] = useState<ParentCompany[]>([]);
  const [customers, setCustomers] = useState<CustomerWithDebt[]>([]);
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Estado del tema visual con Material UI
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getSavedTheme());
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const effectiveMode = themeMode === 'system' ? (systemIsDark ? 'dark' : 'light') : themeMode;
  const muiTheme = useMemo(() => createAppTheme(effectiveMode), [effectiveMode]);

  const handleToggleTheme = () => {
    const nextMode: ThemeMode = effectiveMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    saveTheme(nextMode);
  };

  const handleThemeChange = (newMode: ThemeMode) => {
    setThemeMode(newMode);
    saveTheme(newMode);
  };

  // Empresa paraguas seleccionada (Belcorp o Natura) con persistencia local
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    () => localStorage.getItem('catalogo_selected_company') || 'comp-belcorp'
  );
  const selectedCompanyIdRef = useRef<string>(selectedCompanyId);
  selectedCompanyIdRef.current = selectedCompanyId;

  // Campaña activa independiente para cada empresa paraguas
  const [activeCampaignByCompany, setActiveCampaignByCompany] = useState<Record<string, string>>({});
  const activeCampaignByCompanyRef = useRef<Record<string, string>>({});
  activeCampaignByCompanyRef.current = activeCampaignByCompany;

  const [activeCampaignId, setActiveCampaignId] = useState<string>('');

  // Estados de modales
  const [paymentCustomerId, setPaymentCustomerId] = useState<string | null>(null);
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState<boolean>(false);
  const [isEditCampaignOpen, setIsEditCampaignOpen] = useState<boolean>(false);

  /**
   * Carga y refresca todos los datos de la base de datos local Dexie y sincroniza con Supabase.
   */
  const loadData = useCallback(async () => {
    try {
      await seedInitialDataIfNeeded();

      // Si hay conexión, sincronizamos con Supabase en segundo plano
      if (navigator.onLine) {
        try {
          await pullFromSupabase();
          await triggerSync();
        } catch (syncErr) {
          console.warn('Aviso de sincronización inicial en segundo plano:', syncErr);
        }
      }

      const [allCampaigns, allBrands, allCompanies, rawCustomers] = await Promise.all([
        getCampaigns(),
        getBrands(),
        getParentCompanies(),
        getCustomers(),
      ]);

      setCampaigns(allCampaigns);
      setBrands(allBrands);
      setCompanies(allCompanies);

      // Calculamos la deuda pendiente acumulada de cada clienta
      const customersWithDebt: CustomerWithDebt[] = await Promise.all(
        rawCustomers.map(async (c) => {
          const pending = await getCustomerPendingOrders(c.id);
          const totalDebt = pending.reduce((sum, p) => sum + p.pendingBalance, 0);
          return { ...c, totalDebt };
        })
      );
      setCustomers(customersWithDebt);

      // Determinamos o validamos la campaña activa por empresa
      const updatedCampaignMap: Record<string, string> = { ...activeCampaignByCompanyRef.current };
      for (const comp of allCompanies) {
        const companyCamps = allCampaigns.filter((c) => c.parentCompanyId === comp.id);
        const existingId = updatedCampaignMap[comp.id];
        if (!existingId || !companyCamps.some((c) => c.id === existingId)) {
          const defaultCamp = companyCamps.find((c) => c.status === 'active') || companyCamps[0];
          if (defaultCamp) {
            updatedCampaignMap[comp.id] = defaultCamp.id;
          }
        }
      }
      setActiveCampaignByCompany(updatedCampaignMap);
      activeCampaignByCompanyRef.current = updatedCampaignMap;

      // Verificamos empresa seleccionada
      let currentCompanyId = selectedCompanyIdRef.current;
      if (!allCompanies.some((c) => c.id === currentCompanyId)) {
        currentCompanyId = allCompanies[0] ? allCompanies[0].id : '';
        setSelectedCompanyId(currentCompanyId);
        selectedCompanyIdRef.current = currentCompanyId;
      }

      const activeCampId = updatedCampaignMap[currentCompanyId] || '';
      setActiveCampaignId(activeCampId);

      // Cargamos pedidos de la campaña activa
      if (activeCampId) {
        const campaignOrders = await getOrdersWithDetails(activeCampId);
        setOrders(campaignOrders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error al cargar datos locales:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Suscripción al ciclo de vida de autenticación
  useEffect(() => {
    let isMounted = true;

    getInitialAuthState().then((initialState) => {
      if (isMounted) {
        setAuth(initialState);
        if (initialState.isAllowed) {
          loadData();
        } else {
          setIsLoading(false);
        }
      }
    });

    const unsubscribe = subscribeToAuthChanges((newState) => {
      if (isMounted) {
        setAuth(newState);
        if (newState.isAllowed) {
          loadData();
        } else {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadData]);

  /**
   * Cambia la empresa paraguas activa (Belcorp vs Natura) recordando su campaña correspondiente.
   */
  const handleSelectCompany = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    selectedCompanyIdRef.current = companyId;
    localStorage.setItem('catalogo_selected_company', companyId);

    const companyCamps = campaigns.filter((c) => c.parentCompanyId === companyId);
    const targetCampId =
      activeCampaignByCompanyRef.current[companyId] ||
      companyCamps.find((c) => c.status === 'active')?.id ||
      companyCamps[0]?.id ||
      '';

    setActiveCampaignId(targetCampId);

    if (targetCampId) {
      const campaignOrders = await getOrdersWithDetails(targetCampId);
      setOrders(campaignOrders);
    } else {
      setOrders([]);
    }
  };

  /**
   * Cambia la campaña activa dentro de la empresa actual.
   */
  const handleSelectCampaign = async (campaignId: string) => {
    setActiveCampaignId(campaignId);
    setActiveCampaignByCompany((prev) => {
      const next = { ...prev, [selectedCompanyId]: campaignId };
      activeCampaignByCompanyRef.current = next;
      return next;
    });
    const campaignOrders = await getOrdersWithDetails(campaignId);
    setOrders(campaignOrders);
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const campaignSalesTotal = orders.reduce((sum, o) => sum + o.orderTotal, 0);

  const userAvatarUrl =
    (auth.user?.user_metadata?.avatar_url as string | undefined) ||
    (auth.user?.user_metadata?.picture as string | undefined) ||
    null;

  const userName =
    (auth.user?.user_metadata?.full_name as string | undefined) ||
    (auth.user?.user_metadata?.name as string | undefined) ||
    null;

  // Pantalla de carga mientras se verifica la sesión inicial de Google
  if (auth.isLoading) {
    return (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress color="primary" size={40} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Verificando sesión...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  // Si no está autenticado o no está en la lista blanca, mostramos la pantalla de Login
  if (!auth.isAllowed) {
    return (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <LoginView unauthorizedEmail={auth.unauthorizedEmail} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        {/* Encabezado Superior */}
        <Navbar
          currentTheme={themeMode}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={() => setCurrentTab('settings')}
          userAvatarUrl={userAvatarUrl}
          userName={userName}
        />

        {/* Contenido Principal por Pestaña */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: { xs: 2.5, sm: 3 },
            pb: { xs: 12, sm: 10 },
          }}
        >
          <Container maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Selector de Empresa Paraguas compartido (Belcorp / Natura) */}
            {(currentTab === 'orders' || currentTab === 'checkin' || currentTab === 'finance') && (
              <CompanyTabs
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                onSelectCompany={handleSelectCompany}
              />
            )}

            {isLoading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  py: 12,
                }}
              >
                <CircularProgress color="primary" />
              </Box>
            ) : (
              <>
                {/* Pestaña: Pedidos (Cuaderno) */}
                {currentTab === 'orders' && (
                  <CampaignNotebookView
                    companies={companies}
                    selectedCompanyId={selectedCompanyId}
                    campaigns={campaigns}
                    activeCampaignId={activeCampaignId}
                    onSelectCampaign={handleSelectCampaign}
                    orders={orders}
                    brands={brands}
                    allCustomers={customers}
                    onRefresh={loadData}
                    onOpenPaymentModal={(customerId) => setPaymentCustomerId(customerId)}
                    onCreateCampaignClick={() => setIsCreateCampaignOpen(true)}
                    onEditCampaignClick={() => setIsEditCampaignOpen(true)}
                    onCreateCustomerClick={() => setCurrentTab('customers')}
                  />
                )}

                {/* Pestaña: Check-in de Recepción de Caja */}
                {currentTab === 'checkin' && (
                  <BoxCheckinView
                    companyName={selectedCompany?.name || ''}
                    companyCampaigns={campaigns.filter((c) => c.parentCompanyId === selectedCompanyId)}
                    activeCampaignId={activeCampaignId}
                    onSelectCampaign={handleSelectCampaign}
                    orders={orders}
                    onRefresh={loadData}
                    onGoToOrders={() => setCurrentTab('orders')}
                  />
                )}

                {/* Pestaña: Directorio de Clientas */}
                {currentTab === 'customers' && (
                  <CustomerListView
                    customers={customers}
                    onOpenPaymentModal={(customerId) => setPaymentCustomerId(customerId)}
                    onRefresh={loadData}
                  />
                )}

                {/* Pestaña: Finanzas y Rentabilidad */}
                {currentTab === 'finance' && (
                  <FinancialDashboardView
                    companyName={selectedCompany?.name}
                    selectedCompanyId={selectedCompanyId}
                    campaigns={campaigns}
                    activeCampaignId={activeCampaignId}
                    onSelectCampaign={handleSelectCampaign}
                    campaignSalesTotal={campaignSalesTotal}
                    customersWithDebt={customers}
                    onOpenPaymentModal={(customerId) => setPaymentCustomerId(customerId)}
                    onRefresh={loadData}
                  />
                )}

                {/* Pestaña: Ajustes y Respaldo */}
                {currentTab === 'settings' && (
                  <SettingsView
                    currentTheme={themeMode}
                    onThemeChange={handleThemeChange}
                    onRefreshAll={loadData}
                    currentUserEmail={auth.user?.email || null}
                    currentUserName={userName}
                    currentUserAvatarUrl={userAvatarUrl}
                    onSignOut={signOut}
                  />
                )}
              </>
            )}
          </Container>
        </Box>

        {/* Modal de Abono / Pago */}
        {paymentCustomerId !== null && (
          <PaymentModal
            isOpen={true}
            customerId={paymentCustomerId}
            customers={customers}
            onClose={() => setPaymentCustomerId(null)}
            onPaymentSuccess={loadData}
          />
        )}

        {/* Modal de Creación de Campaña */}
        {isCreateCampaignOpen && (
          <CreateCampaignModal
            isOpen={true}
            targetCompany={selectedCompany}
            onClose={() => setIsCreateCampaignOpen(false)}
            onCampaignCreated={(newId) => {
              setActiveCampaignId(newId);
              setActiveCampaignByCompany((prev) => ({
                ...prev,
                [selectedCompanyId]: newId,
              }));
              loadData();
            }}
          />
        )}

        {/* Modal de Edición y Eliminación de Campaña */}
        {isEditCampaignOpen && (
          <EditCampaignModal
            isOpen={true}
            campaign={campaigns.find((c) => c.id === activeCampaignId) || null}
            companyName={selectedCompany?.name || ''}
            onClose={() => setIsEditCampaignOpen(false)}
            onCampaignUpdated={async () => {
              await loadData();
            }}
            onCampaignDeleted={async (deletedId) => {
              // Buscar otra campaña de la misma empresa para activar
              const remaining = campaigns.filter(
                (c) => c.parentCompanyId === selectedCompanyId && c.id !== deletedId
              );
              const nextId = remaining.find((c) => c.status === 'active')?.id || remaining[0]?.id || '';
              setActiveCampaignId(nextId);
              setActiveCampaignByCompany((prev) => ({
                ...prev,
                [selectedCompanyId]: nextId,
              }));
              await loadData();
            }}
          />
        )}

        {/* Barra de Navegación Inferior (Móvil) */}
        <BottomNavigation
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
