/**
 * @file paymentService.ts
 * @description Lógica de abonos, registro de pagos y distribución en cascada sobre pedidos impagos.
 */

import { db } from '../lib/db';
import { enqueueMutation } from '../lib/syncManager';
import { calculateOrderTotal, calculatePendingBalance } from './financialService';
import type { Order, Payment, PaymentAllocation, PaymentMethod } from '../types/database';

/**
 * Estructura de un pedido con su saldo pendiente calculado.
 */
export interface OrderWithBalance {
  /** Pedido */
  order: Order;
  /** Monto total facturable del pedido */
  orderTotal: number;
  /** Monto ya abonado previamente al pedido */
  alreadyPaid: number;
  /** Saldo pendiente por pagar */
  pendingBalance: number;
}

/**
 * Resultado de una asignación en cascada.
 */
export interface CascadeAllocationResult {
  /** Asignaciones individuales generadas */
  allocations: {
    orderId: string;
    allocatedAmount: number;
  }[];
  /** Crédito remanente no asignado si el pago superó la deuda total */
  unallocatedCredit: number;
  /** Identificadores de pedidos que quedaron completamente saldados */
  fullyPaidOrderIds: string[];
}

/**
 * Distribuye un pago en cascada sobre los pedidos pendientes de una clienta,
 * cubriendo prioritariamente los pedidos más antiguos.
 *
 * @param pendingOrders - Lista de pedidos pendientes ordenados de más antiguo a más reciente.
 * @param paymentAmount - Monto abonado por la clienta.
 * @returns Resultado con las asignaciones calculadas y remanente si existiera.
 */
export function allocatePaymentInCascade(
  pendingOrders: OrderWithBalance[],
  paymentAmount: number
): CascadeAllocationResult {
  let remainingPayment = Math.max(0, paymentAmount);
  const allocations: { orderId: string; allocatedAmount: number }[] = [];
  const fullyPaidOrderIds: string[] = [];

  for (const item of pendingOrders) {
    if (remainingPayment <= 0) break;
    if (item.pendingBalance <= 0) continue;

    // Asignamos lo que alcance para cubrir este pedido o lo que quede del pago
    const amountToApply = Math.min(item.pendingBalance, remainingPayment);

    allocations.push({
      orderId: item.order.id,
      allocatedAmount: amountToApply,
    });

    remainingPayment -= amountToApply;

    if (amountToApply >= item.pendingBalance) {
      fullyPaidOrderIds.push(item.order.id);
    }
  }

  return {
    allocations,
    unallocatedCredit: remainingPayment,
    fullyPaidOrderIds,
  };
}

/**
 * Obtiene todos los pedidos pendientes de una clienta ordenados cronológicamente por fecha de creación.
 *
 * @param customerId - Identificador de la clienta.
 */
export async function getCustomerPendingOrders(customerId: string): Promise<OrderWithBalance[]> {
  const orders = await db.orders.where('customerId').equals(customerId).sortBy('createdAt');
  const results: OrderWithBalance[] = [];

  for (const order of orders) {
    const rawItems = await db.orderItems.where('orderId').equals(order.id).toArray();
    const orderTotal = calculateOrderTotal(rawItems);

    const allocations = await db.paymentAllocations.where('orderId').equals(order.id).toArray();
    const alreadyPaid = allocations.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
    const pendingBalance = calculatePendingBalance(orderTotal, alreadyPaid);

    if (pendingBalance > 0) {
      results.push({
        order,
        orderTotal,
        alreadyPaid,
        pendingBalance,
      });
    }
  }

  return results;
}

/**
 * Registra un pago/abono de una clienta y distribuye automáticamente el monto
 * en cascada entre sus pedidos pendientes más antiguos.
 *
 * @param customerId - Identificador de la clienta.
 * @param amount - Monto entregado.
 * @param paymentDate - Fecha del pago (YYYY-MM-DD).
 * @param method - Método de pago ('cash', 'bank_transfer', 'other').
 * @param note - Nota o comprobante opcional.
 */
export async function recordCustomerPayment(
  customerId: string,
  amount: number,
  paymentDate: string,
  method: PaymentMethod = 'cash',
  note?: string | null
): Promise<{ payment: Payment; allocationResult: CascadeAllocationResult }> {
  const newPayment: Payment = {
    id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    customerId,
    amount,
    paymentDate,
    method,
    note: note || null,
    createdAt: new Date().toISOString(),
  };

  // 1. Guardamos el pago principal
  await db.payments.add(newPayment);
  await enqueueMutation('payments', 'INSERT', newPayment.id, newPayment as unknown as Record<string, unknown>);

  // 2. Buscamos pedidos con saldo pendiente y ejecutamos la cascada
  const pendingOrders = await getCustomerPendingOrders(customerId);
  const allocationResult = allocatePaymentInCascade(pendingOrders, amount);

  // 3. Guardamos las asignaciones generadas
  for (const alloc of allocationResult.allocations) {
    const newAllocation: PaymentAllocation = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      paymentId: newPayment.id,
      orderId: alloc.orderId,
      allocatedAmount: alloc.allocatedAmount,
      createdAt: new Date().toISOString(),
    };

    await db.paymentAllocations.add(newAllocation);
    await enqueueMutation('payment_allocations', 'INSERT', newAllocation.id, newAllocation as unknown as Record<string, unknown>);
  }

  return { payment: newPayment, allocationResult };
}
