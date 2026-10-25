/**
 * @file formatters.ts
 * @description Utilidades de formateo para monedas, fechas y nombres desambiguados.
 */

/**
 * Formatea un valor numérico como monto monetario en pesos con separadores de miles.
 * Ejemplo: 15880 -> "$15.880"
 *
 * @param amount - Valor numérico a formatear.
 * @returns Cadena con el formato monetario.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0';
  }

  // Usamos el locale es-CL para separador de miles con punto y sin decimales
  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);

  return formatted;
}

/**
 * Formatea una fecha ISO o string (YYYY-MM-DD) a formato legible en español.
 * Ejemplo: "2026-10-15" -> "15 oct 2026"
 *
 * @param dateString - Cadena de fecha en formato compatible con Date.
 * @returns Cadena legible de la fecha.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Sin fecha';

  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);

    return new Intl.DateTimeFormat('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Obtiene el nombre visual de la clienta, incorporando el descriptor si existe.
 * Ejemplo: { name: 'Clary', descriptor: 'Sede' } -> "Clary (Sede)"
 *
 * @param customer - Objeto con nombre y descriptor opcional.
 * @returns Nombre completo desambiguado.
 */
export function getCustomerDisplayName(customer: {
  name: string;
  descriptor?: string | null;
  isSelfProfile?: boolean;
}): string {
  if (customer.isSelfProfile) {
    return `${customer.name} (Mi cuenta / Stock personal)`;
  }
  if (customer.descriptor && customer.descriptor.trim() !== '') {
    return `${customer.name} (${customer.descriptor.trim()})`;
  }
  return customer.name;
}
