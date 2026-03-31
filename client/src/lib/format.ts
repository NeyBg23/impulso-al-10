/**
 * Formatea un número como moneda colombiana (COP)
 */
export function formatCOP(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return "$ 0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formatea una fecha en formato local colombiano
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Formatea fecha y hora
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Calcula días de diferencia desde hoy
 */
export function daysFromNow(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Etiquetas de frecuencia
 */
export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  call: "Llamada",
  message: "Mensaje",
  visit: "Visita",
  email: "Correo",
  other: "Otro",
};

export const CONTACT_RESULT_LABELS: Record<string, string> = {
  contacted: "Contactado",
  no_answer: "No contestó",
  promised_payment: "Prometió pago",
  refused: "Se negó",
  other: "Otro",
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  id_front: "Cédula (frente)",
  id_back: "Cédula (reverso)",
  selfie: "Selfie",
  receipt: "Comprobante",
  contract: "Contrato",
  other: "Otro",
};

export const CONSENT_TYPE_LABELS: Record<string, string> = {
  terms: "Términos y condiciones",
  data_policy: "Política de datos",
  identity_auth: "Autorización de identidad",
};
