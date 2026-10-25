import { describe, it, expect } from 'vitest';
import {
  calculateOrderTotal,
  calculatePendingBalance,
  calculateRealProfit,
  calculateMoneyOnTheStreet,
} from '../financialService';
import type { OrderItem } from '../../types/database';

describe('financialService - Business Rules', () => {
  it('calculates order total correctly including requested and received items', () => {
    const items: OrderItem[] = [
      {
        id: '1',
        orderId: 'o1',
        brandId: 'b1',
        description: 'Set Vibranza Provocative',
        code: '35344',
        quantity: 1,
        finalLinePrice: 27990,
        status: 'received',
        createdAt: '2026-10-01',
      },
      {
        id: '2',
        orderId: 'o1',
        brandId: 'b1',
        description: 'Crema gel contorno de ojos',
        code: '20438',
        quantity: 1,
        finalLinePrice: 6790,
        status: 'requested',
        createdAt: '2026-10-01',
      },
    ];

    expect(calculateOrderTotal(items)).toBe(34780);
  });

  it('excludes missing and defective items from customer order total', () => {
    const items: OrderItem[] = [
      {
        id: '1',
        orderId: 'o1',
        brandId: 'b1',
        description: 'Esmalte Cyzone pink me up',
        code: '21489',
        quantity: 1,
        finalLinePrice: 2690,
        status: 'received',
        createdAt: '2026-10-01',
      },
      {
        id: '2',
        orderId: 'o1',
        brandId: 'b1',
        description: 'Labial defectuoso roto',
        code: '06252',
        quantity: 1,
        finalLinePrice: 5980,
        status: 'defective', // Defectuoso a devolver
        createdAt: '2026-10-01',
      },
      {
        id: '3',
        orderId: 'o1',
        brandId: 'b1',
        description: 'Collar que no llegó de fábrica',
        code: '99999',
        quantity: 1,
        finalLinePrice: 14990,
        status: 'missing', // Faltante de empaque
        createdAt: '2026-10-01',
      },
    ];

    // Solo se debe cobrar el esmalte recibido (2690)
    expect(calculateOrderTotal(items)).toBe(2690);
  });

  it('calculates pending balance correctly without negative values', () => {
    expect(calculatePendingBalance(30000, 10000)).toBe(20000);
    expect(calculatePendingBalance(30000, 30000)).toBe(0);
    expect(calculatePendingBalance(30000, 35000)).toBe(0);
  });

  it('calculates real profit accurately against company invoice', () => {
    // Si las ventas válidas son 150.000 y la factura pagada fue 110.000, la ganancia es 40.000
    expect(calculateRealProfit(150000, 110000)).toBe(40000);
    // Si aún no se ingresa la factura, retorna 0
    expect(calculateRealProfit(150000, null)).toBe(0);
    expect(calculateRealProfit(150000, undefined)).toBe(0);
  });

  it('calculates consolidated money on the street correctly', () => {
    const balances = [15880, 8670, 0, 4690];
    expect(calculateMoneyOnTheStreet(balances)).toBe(29240);
  });
});
