/**
 * @file financialService.ts
 * @description Lógica de cálculo de rentabilidad silenciosa, totales de pedido y balances financieros.
 */

import type { OrderItem } from '../types/database';

/**
 * Calcula el importe total a cobrar a una clienta por un pedido.
 * Excluye automáticamente productos con estado 'missing' (faltantes de fábrica)
 * y 'defective' (defectuosos/dañados a devolver).
 *
 * @param items - Lista de líneas de producto del pedido.
 * @returns Monto total válido a cobrar.
 */
export function calculateOrderTotal(items: OrderItem[]): number {
  if (!items || items.length === 0) return 0;

  return items.reduce((accumulator, item) => {
    // Si el producto no llegó por faltante o está dañado para devolución, no se le cobra a la clienta
    if (item.status === 'missing' || item.status === 'defective') {
      return accumulator;
    }
    return accumulator + (Number(item.finalLinePrice) || 0);
  }, 0);
}

/**
 * Calcula el saldo pendiente por pagar de un pedido individual.
 *
 * @param orderTotal - Monto total válido del pedido.
 * @param totalPaid - Suma de abonos asignados al pedido.
 * @returns Saldo pendiente (nunca negativo).
 */
export function calculatePendingBalance(orderTotal: number, totalPaid: number): number {
  const balance = orderTotal - totalPaid;
  return balance > 0 ? balance : 0;
}

/**
 * Calcula la ganancia real neta de una campaña comercial completa.
 * Fórmula: Suma de todos los pedidos válidos cobrables - Monto de la factura final de la empresa.
 *
 * @param campaignTotalSales - Suma total de todos los pedidos válidos de la campaña.
 * @param companyInvoiceAmount - Monto total facturado y pagado a la empresa paraguas.
 * @returns Ganancia real neta en pesos. Si no hay factura registrada aún, retorna 0.
 */
export function calculateRealProfit(
  campaignTotalSales: number,
  companyInvoiceAmount: number | null | undefined
): number {
  if (companyInvoiceAmount === null || companyInvoiceAmount === undefined || isNaN(companyInvoiceAmount)) {
    return 0;
  }
  return campaignTotalSales - companyInvoiceAmount;
}

/**
 * Calcula el "dinero en la calle" consolidado (total adeudado por todas las clientas).
 *
 * @param customerBalances - Lista de saldos adeudados por clienta.
 * @returns Monto global pendiente de cobro.
 */
export function calculateMoneyOnTheStreet(customerBalances: number[]): number {
  return customerBalances.reduce((acc, curr) => acc + (curr > 0 ? curr : 0), 0);
}
