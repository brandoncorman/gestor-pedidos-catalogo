/**
 * @file orderService.ts
 * @description Servicio para gestión de pedidos, líneas de producto y check-in de caja.
 */

import { db } from '../lib/db';
import { enqueueMutation } from '../lib/syncManager';
import { calculateOrderTotal, calculatePendingBalance } from './financialService';
import type { Order, OrderItem, Customer, Brand, OrderItemStatus } from '../types/database';

/**
 * Representa un pedido con sus líneas de productos, clienta y balances calculados.
 */
export interface OrderDetail {
  order: Order;
  customer: Customer;
  items: (OrderItem & { brand?: Brand })[];
  orderTotal: number;
  totalPaid: number;
  pendingBalance: number;
}

/**
 * Obtiene todos los pedidos de una campaña con sus detalles completos y balances calculados.
 *
 * @param campaignId - Identificador de la campaña.
 */
export async function getOrdersWithDetails(campaignId: string): Promise<OrderDetail[]> {
  const orders = await db.orders.where('campaignId').equals(campaignId).toArray();
  const allCustomers = await db.customers.toArray();
  const customerMap = new Map(allCustomers.map((c) => [c.id, c]));

  const allBrands = await db.brands.toArray();
  const brandMap = new Map(allBrands.map((b) => [b.id, b]));

  const details: OrderDetail[] = [];

  for (const order of orders) {
    const customer = customerMap.get(order.customerId) || {
      id: order.customerId,
      name: 'Clienta desconocida',
      isSelfProfile: false,
      createdAt: order.createdAt,
    };

    const rawItems = await db.orderItems.where('orderId').equals(order.id).toArray();
    const items = rawItems.map((item) => ({
      ...item,
      brand: brandMap.get(item.brandId),
    }));

    const orderTotal = calculateOrderTotal(items);

    // Calculamos los abonos asignados a este pedido específico
    const allocations = await db.paymentAllocations.where('orderId').equals(order.id).toArray();
    const totalPaid = allocations.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
    const pendingBalance = calculatePendingBalance(orderTotal, totalPaid);

    details.push({
      order,
      customer,
      items,
      orderTotal,
      totalPaid,
      pendingBalance,
    });
  }

  return details;
}

/**
 * Crea un nuevo pedido para una clienta dentro de una campaña si no existe ya.
 *
 * @param campaignId - Identificador de la campaña.
 * @param customerId - Identificador de la clienta.
 */
export async function createOrder(campaignId: string, customerId: string): Promise<Order> {
  const existing = await db.orders
    .where('campaignId')
    .equals(campaignId)
    .filter((o) => o.customerId === customerId)
    .first();

  if (existing) {
    return existing;
  }

  const newOrder: Order = {
    id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    campaignId,
    customerId,
    deliveryStatus: 'pending',
    createdAt: new Date().toISOString(),
  };

  await db.orders.add(newOrder);
  await enqueueMutation('orders', 'INSERT', newOrder.id, newOrder as unknown as Record<string, unknown>);

  return newOrder;
}

/**
 * Agrega una línea de producto a un pedido existente.
 *
 * @param itemData - Datos de la línea de producto.
 */
export async function addOrderItem(
  itemData: Omit<OrderItem, 'id' | 'createdAt'>
): Promise<OrderItem> {
  const newItem: OrderItem = {
    ...itemData,
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  await db.orderItems.add(newItem);
  await enqueueMutation('order_items', 'INSERT', newItem.id, newItem as unknown as Record<string, unknown>);

  return newItem;
}

/**
 * Actualiza los datos de una línea de producto (descripción, precio, código, cantidad).
 *
 * @param id - Identificador de la línea.
 * @param updates - Campos a modificar.
 */
export async function updateOrderItem(
  id: string,
  updates: Partial<Omit<OrderItem, 'id' | 'createdAt'>>
): Promise<void> {
  await db.orderItems.update(id, updates);
  const updated = await db.orderItems.get(id);
  if (updated) {
    await enqueueMutation('order_items', 'UPDATE', id, updated as unknown as Record<string, unknown>);
  }
}

/**
 * Actualiza el estado de recepción de una línea (check-in de caja: received, missing, defective).
 *
 * @param id - Identificador de la línea.
 * @param status - Nuevo estado verificado.
 */
export async function updateOrderItemStatus(id: string, status: OrderItemStatus): Promise<void> {
  await updateOrderItem(id, { status });
}

/**
 * Elimina una línea de producto de un pedido.
 *
 * @param id - Identificador de la línea.
 */
export async function deleteOrderItem(id: string): Promise<void> {
  await db.orderItems.delete(id);
  await enqueueMutation('order_items', 'DELETE', id, {});
}
