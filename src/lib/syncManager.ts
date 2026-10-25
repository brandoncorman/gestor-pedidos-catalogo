/**
 * @file syncManager.ts
 * @description Motor de sincronización offline-first bidireccional y gestión de copias de seguridad JSON.
 */

import { db } from './db';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { SyncMutationType } from '../types/database';

/**
 * Convierte un objeto con claves en camelCase a snake_case para PostgreSQL/Supabase.
 *
 * @param obj - Objeto de origen en formato TypeScript.
 */
export function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Convierte un objeto con claves en snake_case a camelCase para Dexie/TypeScript.
 *
 * @param obj - Objeto de origen desde Supabase.
 */
export function snakeToCamel<T = Record<string, unknown>>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

/**
 * Normaliza el payload de una mutación adaptándolo a la estructura de columnas de Supabase.
 *
 * @param tableName - Nombre de la tabla destino.
 * @param payload - Datos originales del registro.
 */
function normalizePayloadForSupabase(
  tableName: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const snake = camelToSnake(payload);

  // Adaptación de compatibilidad para la tabla campaigns
  if (tableName === 'campaigns') {
    const arrivalDate = payload.estimatedArrivalDate || payload.startDate || new Date().toISOString().split('T')[0];
    const paymentDate = payload.targetPaymentDate || payload.closeDate || new Date().toISOString().split('T')[0];
    snake.start_date = arrivalDate;
    snake.close_date = paymentDate;
  }

  return snake;
}

/**
 * Encola una mutación en la base de datos local para su posterior réplica a la nube.
 *
 * @param tableName - Nombre de la tabla en base de datos.
 * @param mutationType - Tipo de mutación ('INSERT', 'UPDATE' o 'DELETE').
 * @param recordId - Identificador único del registro afectado.
 * @param payload - Datos serializados del registro.
 */
export async function enqueueMutation(
  tableName: string,
  mutationType: SyncMutationType,
  recordId: string,
  payload: Record<string, unknown>
): Promise<void> {
  await db.syncQueue.add({
    tableName,
    mutationType,
    recordId,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });

  // Si estamos en línea y Supabase está configurado, intentamos sincronizar de inmediato
  if (navigator.onLine && isSupabaseConfigured()) {
    triggerSync().catch((err) => console.warn('Error al procesar sincronización en segundo plano:', err));
  }
}

/**
 * Procesa la cola de mutaciones locales pendientes hacia Supabase.
 *
 * @returns Cantidad de mutaciones procesadas con éxito.
 */
export async function triggerSync(): Promise<number> {
  if (!navigator.onLine || !isSupabaseConfigured() || !supabase) {
    return 0;
  }

  const queueItems = await db.syncQueue.orderBy('id').toArray();
  if (queueItems.length === 0) return 0;

  let processedCount = 0;

  for (const item of queueItems) {
    try {
      if (item.mutationType === 'INSERT' || item.mutationType === 'UPDATE') {
        const payload = normalizePayloadForSupabase(item.tableName, item.payload);
        const { error } = await supabase.from(item.tableName).upsert(payload);
        if (error) throw error;
      } else if (item.mutationType === 'DELETE') {
        const { error } = await supabase.from(item.tableName).delete().eq('id', item.recordId);
        if (error) throw error;
      }

      // Eliminamos de la cola tras éxito
      if (item.id !== undefined) {
        await db.syncQueue.delete(item.id);
        processedCount++;
      }
    } catch (err) {
      console.error(`Error sincronizando item ${item.id} de tabla ${item.tableName}:`, err);
      if (item.id !== undefined) {
        await db.syncQueue.update(item.id, {
          retryCount: item.retryCount + 1,
          lastError: err instanceof Error ? err.message : String(err),
        });
      }
      // Detenemos el lote para mantener orden causal
      break;
    }
  }

  return processedCount;
}

/**
 * Descarga y sincroniza los datos desde Supabase hacia la base de datos local Dexie.
 * Permite que múltiples dispositivos (ej. celular de la madre y del hijo) compartan los datos actualizados.
 */
export async function pullFromSupabase(): Promise<void> {
  if (!navigator.onLine || !isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    const [
      companiesRes,
      brandsRes,
      campaignsRes,
      customersRes,
      ordersRes,
      orderItemsRes,
      paymentsRes,
      allocationsRes,
    ] = await Promise.all([
      supabase.from('parent_companies').select('*'),
      supabase.from('brands').select('*'),
      supabase.from('campaigns').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('orders').select('*'),
      supabase.from('order_items').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('payment_allocations').select('*'),
    ]);

    // Actualizamos tablas en Dexie si la consulta fue exitosa
    if (companiesRes.data && companiesRes.data.length > 0) {
      const parsed = companiesRes.data.map((r) => snakeToCamel(r));
      await db.parentCompanies.bulkPut(parsed as any);
    }

    if (brandsRes.data && brandsRes.data.length > 0) {
      const parsed = brandsRes.data.map((r) => snakeToCamel(r));
      await db.brands.bulkPut(parsed as any);
    }

    if (campaignsRes.data && campaignsRes.data.length > 0) {
      const parsed = campaignsRes.data.map((r: any) => {
        const camel = snakeToCamel(r) as any;
        // Restauramos los nombres de campos esperados por la app
        if (!camel.estimatedArrivalDate && camel.startDate) camel.estimatedArrivalDate = camel.startDate;
        if (!camel.targetPaymentDate && camel.closeDate) camel.targetPaymentDate = camel.closeDate;
        return camel;
      });
      await db.campaigns.bulkPut(parsed as any);
    }

    if (customersRes.data && customersRes.data.length > 0) {
      const parsed = customersRes.data.map((r) => snakeToCamel(r));
      await db.customers.bulkPut(parsed as any);
    }

    if (ordersRes.data && ordersRes.data.length > 0) {
      const parsed = ordersRes.data.map((r) => snakeToCamel(r));
      await db.orders.bulkPut(parsed as any);
    }

    if (orderItemsRes.data && orderItemsRes.data.length > 0) {
      const parsed = orderItemsRes.data.map((r) => snakeToCamel(r));
      await db.orderItems.bulkPut(parsed as any);
    }

    if (paymentsRes.data && paymentsRes.data.length > 0) {
      const parsed = paymentsRes.data.map((r) => snakeToCamel(r));
      await db.payments.bulkPut(parsed as any);
    }

    if (allocationsRes.data && allocationsRes.data.length > 0) {
      const parsed = allocationsRes.data.map((r) => snakeToCamel(r));
      await db.paymentAllocations.bulkPut(parsed as any);
    }
  } catch (err) {
    console.error('Error al descargar datos desde Supabase:', err);
  }
}

/**
 * Exporta el contenido completo de la base de datos local a un archivo JSON de respaldo.
 *
 * @returns Cadena con el contenido JSON formateado.
 */
export async function exportDatabaseToJson(): Promise<string> {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    parentCompanies: await db.parentCompanies.toArray(),
    brands: await db.brands.toArray(),
    campaigns: await db.campaigns.toArray(),
    customers: await db.customers.toArray(),
    orders: await db.orders.toArray(),
    orderItems: await db.orderItems.toArray(),
    payments: await db.payments.toArray(),
    paymentAllocations: await db.paymentAllocations.toArray(),
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Restaura la base de datos local desde un objeto JSON de respaldo previamente exportado.
 *
 * @param jsonString - Contenido JSON de la copia de seguridad.
 */
export async function importDatabaseFromJson(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);

  if (!data.version || !data.parentCompanies) {
    throw new Error('El archivo seleccionado no corresponde a un respaldo válido del gestor de pedidos.');
  }

  await db.transaction(
    'rw',
    [
      db.parentCompanies,
      db.brands,
      db.campaigns,
      db.customers,
      db.orders,
      db.orderItems,
      db.payments,
      db.paymentAllocations,
    ],
    async () => {
      // Limpiamos tablas actuales
      await db.parentCompanies.clear();
      await db.brands.clear();
      await db.campaigns.clear();
      await db.customers.clear();
      await db.orders.clear();
      await db.orderItems.clear();
      await db.payments.clear();
      await db.paymentAllocations.clear();

      // Restauramos los registros
      if (data.parentCompanies?.length) await db.parentCompanies.bulkAdd(data.parentCompanies);
      if (data.brands?.length) await db.brands.bulkAdd(data.brands);
      if (data.campaigns?.length) await db.campaigns.bulkAdd(data.campaigns);
      if (data.customers?.length) await db.customers.bulkAdd(data.customers);
      if (data.orders?.length) await db.orders.bulkAdd(data.orders);
      if (data.orderItems?.length) await db.orderItems.bulkAdd(data.orderItems);
      if (data.payments?.length) await db.payments.bulkAdd(data.payments);
      if (data.paymentAllocations?.length) await db.paymentAllocations.bulkAdd(data.paymentAllocations);
    }
  );
}
