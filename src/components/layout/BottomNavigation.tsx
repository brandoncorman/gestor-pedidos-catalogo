/**
 * @file BottomNavigation.tsx
 * @description Barra de navegación inferior móvil basada en Material UI BottomNavigation.
 */

import React from 'react';
import {
  Paper,
  BottomNavigation as MuiBottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SettingsIcon from '@mui/icons-material/Settings';

export type NavigationTab = 'orders' | 'checkin' | 'customers' | 'finance' | 'settings';

interface BottomNavigationProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

/**
 * Barra inferior fija basada en Material UI optimizada para uso con una sola mano en pantallas móviles.
 */
export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange,
}) => {
  return (
    <Paper
      elevation={4}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderTop: 1,
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <MuiBottomNavigation
        showLabels
        value={currentTab}
        onChange={(_, newValue: NavigationTab) => {
          onTabChange(newValue);
        }}
        sx={{
          height: 64,
          '& .Mui-selected': {
            fontWeight: 700,
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.72rem',
            '&.Mui-selected': {
              fontSize: '0.75rem',
            },
          },
        }}
      >
        <BottomNavigationAction
          label="Pedidos"
          value="orders"
          icon={<MenuBookIcon />}
        />
        <BottomNavigationAction
          label="Check-in"
          value="checkin"
          icon={<FactCheckIcon />}
        />
        <BottomNavigationAction
          label="Clientas"
          value="customers"
          icon={<PeopleAltIcon />}
        />
        <BottomNavigationAction
          label="Finanzas"
          value="finance"
          icon={<AttachMoneyIcon />}
        />
        <BottomNavigationAction
          label="Ajustes"
          value="settings"
          icon={<SettingsIcon />}
        />
      </MuiBottomNavigation>
    </Paper>
  );
};
