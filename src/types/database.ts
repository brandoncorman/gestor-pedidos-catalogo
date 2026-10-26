/**
 * @file database.ts
 * @description Definición de tipos de datos e interfaces del modelo relacional y local del sistema.
 * Todos los identificadores están en inglés, y la documentación explicativa en español latino neutro.
 */

/**
 * Estado del ciclo de vida de una campaña comercial.
 */
export type CampaignStatus = 'active' | 'closed';

/**
 * Estado de entrega de un pedido hacia la clienta.
 */
export type DeliveryStatus = 'pending' | 'delivered';

/**
 * Estado de una línea de producto dentro de un pedido.
 * - requested: Solicitado inicialmente por la clienta.
 * - received: Llegó en la caja y verificado en buen estado.
 * - missing: Faltante de empaque por error de la empresa (no llegó).
 * - defective: Llegó roto, abierto o dañado (para devolución a la empresa).
 */
export type OrderItemStatus = 'requested' | 'received' | 'missing' | 'defective';

/**
 * Método de pago utilizado en el abono o cancelación.
 */
export type PaymentMethod = 'cash' | 'bank_transfer' | 'other';

/**
 * Tipo de mutación registrado en la cola de sincronización offline.
 */
export type SyncMutationType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Entidad que representa la empresa paraguas (ej. Belcorp, Natura & Co).
 */
export interface ParentCompany {
  /** Identificador único UUID */
  id: string;
  /** Nombre de la empresa (ej. 'Belcorp', 'Natura') */
  name: string;
  /** Fecha de creación del registro */
  createdAt: string;
}

/**
 * Entidad que representa la revista o submarca comercial específica (ej. Ésika, L'Bel, Cyzone / Natura, Avon).
 */
export interface Brand {
  /** Identificador único UUID */
  id: string;
  /** Identificador de la empresa paraguas a la que pertenece */
  parentCompanyId: string;
  /** Nombre comercial de la revista (ej. 'Ésika', 'Cyzone') */
  name: string;
  /** Color distintivo para representación visual en etiquetas táctiles (chip) */
  colorTag: string;
  /** Fecha de creación */
  createdAt: string;
}

/**
 * Entidad que representa una campaña comercial emitida por una empresa paraguas.
 */
export interface Campaign {
  /** Identificador único UUID */
  id: string;
  /** Empresa paraguas a la que corresponde la campaña */
  parentCompanyId: string;
  /** Código identificador de la campaña (ej. 'C-06', 'C-08') */
  campaignCode: string;
  /** Monto total facturado por la empresa tras descuentos y notas de crédito */
  companyInvoiceAmount?: number | null;
  /** Estado de la campaña (activa o cerrada) */
  status: CampaignStatus;
  /** Fecha aproximada en que llegará la caja de productos */
  estimatedArrivalDate?: string | null;
  /** Fecha objetivo referencial en que se espera el pago de las clientas */
  targetPaymentDate?: string | null;
  /** Fecha de creación */
  createdAt: string;
}

/**
 * Entidad que representa a una clienta o compradora habitual.
 */
export interface Customer {
  /** Identificador único UUID */
  id: string;
  /** Nombre de pila de la clienta (ej. 'Clary') */
  name: string;
  /** Descriptor o apodo desambiguador para nombres repetidos (ej. 'Sede', 'Trabajo') */
  descriptor?: string | null;
  /** Número de teléfono o contacto WhatsApp */
  phone?: string | null;
  /** Indica si corresponde al perfil propio de la consultora para autocompras de metas mínimas */
  isSelfProfile: boolean;
  /** Notas adicionales sobre la clienta (preferencias, dirección) */
  notes?: string | null;
  /** Fecha de creación */
  createdAt: string;
}

/**
 * Entidad que representa el pedido de una clienta dentro de una campaña específica.
 */
export interface Order {
  /** Identificador único UUID */
  id: string;
  /** Campaña a la que pertenece este pedido */
  campaignId: string;
  /** Clienta que realizó el pedido */
  customerId: string;
  /** Estado de entrega física de los productos */
  deliveryStatus: DeliveryStatus;
  /** Fecha en la que se entregó físicamente a la clienta */
  deliveryDate?: string | null;
  /** Notas u observaciones del pedido */
  notes?: string | null;
  /** Fecha de creación */
  createdAt: string;
}

/**
 * Entidad que representa una línea individual de producto dentro de un pedido.
 */
export interface OrderItem {
  /** Identificador único UUID */
  id: string;
  /** Pedido al que pertenece esta línea */
  orderId: string;
  /** Revista o submarca de origen (ej. Ésika, Cyzone, Natura) */
  brandId: string;
  /** Descripción del producto o texto libre anotado */
  description: string;
  /** Código del producto en el catálogo / revista */
  code: string;
  /** Cantidad solicitada */
  quantity: number;
  /** Precio final acordado a cobrar por toda la línea (con descuentos aplicados) */
  finalLinePrice: number;
  /** Estado del producto tras la recepción y revisión */
  status: OrderItemStatus;
  /** Observaciones sobre la línea (ej. motivo de sustitución) */
  notes?: string | null;
  /** Fecha de creación */
  createdAt: string;
}

/**
 * Entidad que representa un pago o abono realizado por una clienta a su cuenta global.
 */
export interface Payment {
  /** Identificador único UUID */
  id: string;
  /** Clienta que realiza el abono */
  customerId: string;
  /** Monto abonado */
  amount: number;
  /** Fecha en la que se efectuó el pago */
  paymentDate: string;
  /** Medio de pago empleado (efectivo, transferencia) */
  method: PaymentMethod;
  /** Nota o comprobante de pago */
  note?: string | null;
  /** Fecha de creación */
  createdAt: string;
}

/**
 * Entidad que vincula y distribuye un pago sobre los pedidos pendientes de una clienta.
 */
export interface PaymentAllocation {
  /** Identificador único UUID */
  id: string;
  /** Pago original al que pertenece la porción */
  paymentId: string;
  /** Pedido al cual se le imputa este monto */
  orderId: string;
  /** Monto específico asignado a este pedido */
  allocatedAmount: number;
  /** Fecha de creación */
  createdAt: string;
}

/**
 * Registro de mutación encolado localmente para sincronización posterior con Supabase.
 */
export interface SyncQueueItem {
  /** Identificador local autoincremental */
  id?: number;
  /** Nombre de la tabla afectada en Supabase */
  tableName: string;
  /** Tipo de operación efectuada */
  mutationType: SyncMutationType;
  /** Identificador del registro afectado */
  recordId: string;
  /** Carga útil serializada con los datos del registro */
  payload: Record<string, unknown>;
  /** Timestamp de la creación de la mutación */
  createdAt: string;
  /** Cantidad de intentos fallidos de sincronización */
  retryCount: number;
  /** Último mensaje de error capturado */
  lastError?: string | null;
}
