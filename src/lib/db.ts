/**
 * @file db.ts
 * @description Configuración de la base de datos local IndexedDB mediante Dexie.js.
 * Implementa la arquitectura Local-First para que la aplicación funcione 100% offline.
 */

import Dexie, { type Table } from 'dexie';
import type {
  ParentCompany,
  Brand,
  Campaign,
  Customer,
  Order,
  OrderItem,
  Payment,
  PaymentAllocation,
  SyncQueueItem,
} from '../types/database';

/**
 * Clase que encapsula la base de datos local Dexie.
 */
export class CatalogDatabase extends Dexie {
  parentCompanies!: Table<ParentCompany, string>;
  brands!: Table<Brand, string>;
  campaigns!: Table<Campaign, string>;
  customers!: Table<Customer, string>;
  orders!: Table<Order, string>;
  orderItems!: Table<OrderItem, string>;
  payments!: Table<Payment, string>;
  paymentAllocations!: Table<PaymentAllocation, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('CatalogOrdersDB');

    // Definición de índices de tablas locales
    this.version(1).stores({
      parentCompanies: 'id, name',
      brands: 'id, parentCompanyId, name',
      campaigns: 'id, parentCompanyId, campaignCode, status',
      customers: 'id, name, isSelfProfile',
      orders: 'id, campaignId, customerId, deliveryStatus',
      orderItems: 'id, orderId, brandId, code, status',
      payments: 'id, customerId, paymentDate',
      paymentAllocations: 'id, paymentId, orderId',
      syncQueue: '++id, tableName, mutationType, recordId, retryCount',
    });
  }
}

/** Instancia única de la base de datos local */
export const db = new CatalogDatabase();

/**
 * Semilla de datos iniciales en blanco para producción.
 * Inicializa únicamente las empresas paraguas, las revistas comerciales y la cuenta personal del vendedor ("Mi Cuenta").
 * No crea pedidos ni campañas falsas para que el cuaderno comience 100% limpio.
 */
export async function seedInitialDataIfNeeded(): Promise<void> {
  // Migración automática de compatibilidad para cuentas anteriores
  const legacyRecords = await db.customers.where('name').equals('Personal').toArray();
  for (const record of legacyRecords) {
    await db.customers.update(record.id, { name: 'Mi Cuenta', descriptor: 'Mis compras / Metas' });
  }

  const legacySelf = await db.customers.where('isSelfProfile').equals(1).first();
  if (legacySelf && (legacySelf.descriptor === 'Autocompras / Metas' || legacySelf.descriptor?.includes('Stock personal'))) {
    await db.customers.update(legacySelf.id, { descriptor: 'Mis compras / Metas' });
  }

  const companyCount = await db.parentCompanies.count();
  if (companyCount > 0) return;

  // 1. Empresas Paraguas
  const belcorpId = 'comp-belcorp';
  const naturaId = 'comp-natura';

  await db.parentCompanies.bulkAdd([
    {
      id: belcorpId,
      name: 'Belcorp',
      createdAt: new Date().toISOString(),
    },
    {
      id: naturaId,
      name: 'Natura & Co',
      createdAt: new Date().toISOString(),
    },
  ]);

  // 2. Marcas / Revistas oficiales
  const esikaId = 'brand-esika';
  const lbelId = 'brand-lbel';
  const cyzoneId = 'brand-cyzone';
  const naturaBrandId = 'brand-natura';
  const avonBrandId = 'brand-avon';

  await db.brands.bulkAdd([
    {
      id: esikaId,
      parentCompanyId: belcorpId,
      name: 'Ésika',
      colorTag: '#ec4899', // Rosa
      createdAt: new Date().toISOString(),
    },
    {
      id: lbelId,
      parentCompanyId: belcorpId,
      name: "L'Bel",
      colorTag: '#8b5cf6', // Púrpura
      createdAt: new Date().toISOString(),
    },
    {
      id: cyzoneId,
      parentCompanyId: belcorpId,
      name: 'Cyzone',
      colorTag: '#06b6d4', // Celeste
      createdAt: new Date().toISOString(),
    },
    {
      id: naturaBrandId,
      parentCompanyId: naturaId,
      name: 'Natura',
      colorTag: '#f97316', // Naranja
      createdAt: new Date().toISOString(),
    },
    {
      id: avonBrandId,
      parentCompanyId: naturaId,
      name: 'Avon',
      colorTag: '#ef4444', // Rojo
      createdAt: new Date().toISOString(),
    },
  ]);

  // 3. Cuenta personal para registrar compras propias y cómputo de metas
  await db.customers.bulkAdd([
    {
      id: 'cust-self-consultant',
      name: 'Mi Cuenta',
      descriptor: 'Mis compras / Metas',
      phone: null,
      notes: null,
      isSelfProfile: true,
      createdAt: new Date().toISOString(),
    },
  ]);
}

/**
 * Restablece la base de datos local al estado limpio de producción,
 * eliminando cualquier dato de prueba anterior y conservando únicamente la semilla base.
 */
export async function resetDatabaseToCleanSeed(): Promise<void> {
  await db.orderItems.clear();
  await db.paymentAllocations.clear();
  await db.orders.clear();
  await db.payments.clear();
  await db.campaigns.clear();
  await db.customers.clear();
  await db.brands.clear();
  await db.parentCompanies.clear();
  await db.syncQueue.clear();

  await seedInitialDataIfNeeded();
}
