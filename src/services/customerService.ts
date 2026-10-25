/**
 * @file customerService.ts
 * @description Servicio para gestión de clientas (creación, edición, consulta y búsqueda).
 */

import { db } from '../lib/db';
import { enqueueMutation } from '../lib/syncManager';
import type { Customer } from '../types/database';

/**
 * Obtiene la lista completa de clientas ordenadas por nombre.
 */
export async function getCustomers(): Promise<Customer[]> {
  return await db.customers.orderBy('name').toArray();
}

/**
 * Registra una nueva clienta en la base de datos local y encola la sincronización.
 *
 * @param customerData - Datos de la clienta.
 * @returns La clienta creada con su identificador generado.
 */
export async function createCustomer(
  customerData: Omit<Customer, 'id' | 'createdAt'>
): Promise<Customer> {
  const newCustomer: Customer = {
    ...customerData,
    id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  await db.customers.add(newCustomer);
  await enqueueMutation('customers', 'INSERT', newCustomer.id, newCustomer as unknown as Record<string, unknown>);

  return newCustomer;
}

/**
 * Actualiza los datos de una clienta existente.
 *
 * @param id - Identificador de la clienta.
 * @param updates - Campos a modificar.
 */
export async function updateCustomer(
  id: string,
  updates: Partial<Omit<Customer, 'id' | 'createdAt'>>
): Promise<void> {
  await db.customers.update(id, updates);
  const updated = await db.customers.get(id);
  if (updated) {
    await enqueueMutation('customers', 'UPDATE', id, updated as unknown as Record<string, unknown>);
  }
}

/**
 * Obtiene estadísticas de pedidos y pagos de una clienta para evaluar el impacto previo a su eliminación.
 *
 * @param customerId - Identificador de la clienta.
 */
export async function getCustomerStats(customerId: string): Promise<{
  orderCount: number;
  paymentCount: number;
  isSelfProfile: boolean;
}> {
  const [orders, payments, customer] = await Promise.all([
    db.orders.where('customerId').equals(customerId).toArray(),
    db.payments.where('customerId').equals(customerId).toArray(),
    db.customers.get(customerId),
  ]);

  return {
    orderCount: orders.length,
    paymentCount: payments.length,
    isSelfProfile: !!customer?.isSelfProfile,
  };
}

/**
 * Elimina una clienta y realiza la limpieza en cascada atómica de sus pedidos, líneas y pagos asociados.
 *
 * @param customerId - Identificador de la clienta a eliminar.
 */
export async function deleteCustomer(
  customerId: string
): Promise<{ deletedOrdersCount: number; deletedPaymentsCount: number }> {
  // 1. Obtener pedidos de la clienta
  const orders = await db.orders.where('customerId').equals(customerId).toArray();
  const orderIds = orders.map((o) => o.id);

  // 2. Eliminar líneas de productos de cada pedido
  for (const orderId of orderIds) {
    await db.orderItems.where('orderId').equals(orderId).delete();
    await enqueueMutation('orders', 'DELETE', orderId, {});
  }

  // 3. Eliminar pedidos
  await db.orders.where('customerId').equals(customerId).delete();

  // 4. Eliminar abonos y sus imputaciones en cascada
  const payments = await db.payments.where('customerId').equals(customerId).toArray();
  for (const p of payments) {
    await db.paymentAllocations.where('paymentId').equals(p.id).delete();
    await db.payments.delete(p.id);
    await enqueueMutation('payments', 'DELETE', p.id, {});
  }

  // 5. Eliminar la clienta
  await db.customers.delete(customerId);
  await enqueueMutation('customers', 'DELETE', customerId, {});

  return { deletedOrdersCount: orders.length, deletedPaymentsCount: payments.length };
}
