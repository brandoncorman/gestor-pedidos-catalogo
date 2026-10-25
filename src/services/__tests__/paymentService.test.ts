import { describe, it, expect } from 'vitest';
import { allocatePaymentInCascade, type OrderWithBalance } from '../paymentService';
import type { Order } from '../../types/database';

describe('paymentService - Cascade Allocation', () => {
  const dummyOrder = (id: string): Order => ({
    id,
    campaignId: 'c1',
    customerId: 'cust1',
    deliveryStatus: 'delivered',
    createdAt: '2026-10-01',
  });

  it('allocates partial payment to the oldest order first', () => {
    const pendingOrders: OrderWithBalance[] = [
      {
        order: dummyOrder('order-oldest'),
        orderTotal: 20000,
        alreadyPaid: 5000,
        pendingBalance: 15000, // Pendiente 15.000
      },
      {
        order: dummyOrder('order-newer'),
        orderTotal: 10000,
        alreadyPaid: 0,
        pendingBalance: 10000, // Pendiente 10.000
      },
    ];

    // Clienta abona 10.000 (no alcanza a cubrir el primer pedido entero)
    const result = allocatePaymentInCascade(pendingOrders, 10000);

    expect(result.allocations).toEqual([
      {
        orderId: 'order-oldest',
        allocatedAmount: 10000,
      },
    ]);
    expect(result.unallocatedCredit).toBe(0);
    expect(result.fullyPaidOrderIds).toEqual([]);
  });

  it('cascades payments across multiple orders until payment is exhausted', () => {
    const pendingOrders: OrderWithBalance[] = [
      {
        order: dummyOrder('order-1'),
        orderTotal: 15000,
        alreadyPaid: 0,
        pendingBalance: 15000,
      },
      {
        order: dummyOrder('order-2'),
        orderTotal: 20000,
        alreadyPaid: 0,
        pendingBalance: 20000,
      },
      {
        order: dummyOrder('order-3'),
        orderTotal: 10000,
        alreadyPaid: 0,
        pendingBalance: 10000,
      },
    ];

    // Clienta abona 25.000: debe saldar completamente order-1 (15.000) y abonar 10.000 a order-2
    const result = allocatePaymentInCascade(pendingOrders, 25000);

    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0]).toEqual({
      orderId: 'order-1',
      allocatedAmount: 15000,
    });
    expect(result.allocations[1]).toEqual({
      orderId: 'order-2',
      allocatedAmount: 10000,
    });
    expect(result.unallocatedCredit).toBe(0);
    expect(result.fullyPaidOrderIds).toEqual(['order-1']);
  });

  it('handles overpayment, salding all orders and returning leftover credit', () => {
    const pendingOrders: OrderWithBalance[] = [
      {
        order: dummyOrder('order-1'),
        orderTotal: 5000,
        alreadyPaid: 0,
        pendingBalance: 5000,
      },
    ];

    // Clienta paga 8.000 sobre una deuda de 5.000
    const result = allocatePaymentInCascade(pendingOrders, 8000);

    expect(result.allocations).toEqual([
      {
        orderId: 'order-1',
        allocatedAmount: 5000,
      },
    ]);
    expect(result.fullyPaidOrderIds).toEqual(['order-1']);
    expect(result.unallocatedCredit).toBe(3000);
  });
});
