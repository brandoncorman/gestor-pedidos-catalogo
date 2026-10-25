/**
 * @file campaignService.ts
 * @description Servicio para gestión de empresas paraguas, marcas/revistas y campañas comerciales.
 */

import { db } from '../lib/db';
import { enqueueMutation } from '../lib/syncManager';
import type { Campaign, ParentCompany, Brand } from '../types/database';

/**
 * Obtiene todas las empresas paraguas registradas.
 */
export async function getParentCompanies(): Promise<ParentCompany[]> {
  return await db.parentCompanies.toArray();
}

/**
 * Obtiene todas las marcas/revistas asociadas a una empresa paraguas o todas si no se especifica.
 *
 * @param parentCompanyId - Opcional. Filtrar por empresa paraguas.
 */
export async function getBrands(parentCompanyId?: string): Promise<Brand[]> {
  if (parentCompanyId) {
    return await db.brands.where('parentCompanyId').equals(parentCompanyId).toArray();
  }
  return await db.brands.toArray();
}

/**
 * Obtiene todas las campañas ordenadas por fecha de creación descendente.
 */
export async function getCampaigns(): Promise<Campaign[]> {
  return await db.campaigns.reverse().sortBy('createdAt');
}

/**
 * Registra una nueva campaña comercial y encola su sincronización.
 *
 * @param campaignData - Datos de la campaña.
 */
export async function createCampaign(
  campaignData: Omit<Campaign, 'id' | 'createdAt'>
): Promise<Campaign> {
  const newCampaign: Campaign = {
    ...campaignData,
    id: `camp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  await db.campaigns.add(newCampaign);
  await enqueueMutation('campaigns', 'INSERT', newCampaign.id, newCampaign as unknown as Record<string, unknown>);

  return newCampaign;
}

/**
 * Actualiza el monto facturado por la empresa u otros datos de la campaña.
 *
 * @param id - Identificador de la campaña.
 * @param updates - Campos a modificar.
 */
export async function updateCampaign(
  id: string,
  updates: Partial<Omit<Campaign, 'id' | 'createdAt'>>
): Promise<void> {
  await db.campaigns.update(id, updates);
  const updated = await db.campaigns.get(id);
  if (updated) {
    await enqueueMutation('campaigns', 'UPDATE', id, updated as unknown as Record<string, unknown>);
  }
}

/**
 * Obtiene el conteo de pedidos asociados a una campaña comercial.
 *
 * @param campaignId - Identificador de la campaña.
 */
export async function getCampaignOrderCount(campaignId: string): Promise<number> {
  return await db.orders.where('campaignId').equals(campaignId).count();
}

/**
 * Elimina una campaña comercial y realiza la limpieza en cascada de sus pedidos y líneas asociadas.
 *
 * @param campaignId - Identificador de la campaña a eliminar.
 */
export async function deleteCampaign(campaignId: string): Promise<{ deletedOrdersCount: number }> {
  const orders = await db.orders.where('campaignId').equals(campaignId).toArray();
  const orderIds = orders.map((o) => o.id);

  // 1. Eliminar líneas de productos asociadas a los pedidos
  for (const orderId of orderIds) {
    await db.orderItems.where('orderId').equals(orderId).delete();
    await enqueueMutation('orders', 'DELETE', orderId, {});
  }

  // 2. Eliminar pedidos asociados
  await db.orders.where('campaignId').equals(campaignId).delete();

  // 3. Eliminar la campaña comercial
  await db.campaigns.delete(campaignId);
  await enqueueMutation('campaigns', 'DELETE', campaignId, {});

  return { deletedOrdersCount: orders.length };
}
