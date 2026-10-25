/**
 * @file CompanyTabs.tsx
 * @description Selector táctil de empresas paraguas (Belcorp vs Natura & Co) construido con Material UI.
 */

import React from 'react';
import { Paper, Box, ButtonBase, Typography } from '@mui/material';
import type { ParentCompany } from '../../types/database';

interface CompanyTabsProps {
  companies: ParentCompany[];
  selectedCompanyId: string;
  onSelectCompany: (companyId: string) => void;
}

/**
 * Selector de empresa paraguas tipo pestañas segmentadas sin saltos de layout ni re-renders.
 */
export const CompanyTabs: React.FC<CompanyTabsProps> = ({
  companies,
  selectedCompanyId,
  onSelectCompany,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 0.75,
        borderRadius: 4,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(30, 41, 59, 0.6)'
            : 'rgba(226, 232, 240, 0.7)',
      }}
    >
      {companies.map((company) => {
        const isSelected = company.id === selectedCompanyId;
        const isBelcorp = company.name.toLowerCase().includes('belcorp');

        return (
          <ButtonBase
            key={company.id}
            onClick={() => onSelectCompany(company.id)}
            focusRipple
            sx={{
              py: 1,
              px: 1.5,
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: (theme) => theme.transitions.create(['background-color', 'box-shadow', 'color']),
              bgcolor: isSelected ? 'background.paper' : 'transparent',
              color: isSelected ? 'text.primary' : 'text.secondary',
              boxShadow: isSelected ? 1 : 0,
              border: isSelected ? 1 : 1,
              borderColor: isSelected ? 'divider' : 'transparent',
              '&:hover': {
                bgcolor: isSelected ? 'background.paper' : 'action.hover',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography component="span" sx={{ fontSize: '1.1rem' }}>
                {isBelcorp ? '🌸' : '🌿'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {company.name}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
              {isBelcorp ? "Ésika, L'Bel, Cyzone" : 'Natura, Avon'}
            </Typography>
          </ButtonBase>
        );
      })}
    </Paper>
  );
};
