const NAME_PATTERN = /^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u;
const PERSONAL_ID_PATTERN = /^\d{5,20}$/;
const AMOUNT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const SUPPORTED_CURRENCIES = new Set(["COP", "USD", "EUR"]);
const MAX_AMOUNT = 9999999999999999.99;

export function normalizeAmount(value) {
  return value.trim().replace(",", ".");
}

function validateName(value, label) {
  const normalized = value.trim();

  if (!normalized) return `${label} es obligatorio.`;
  if (normalized.length < 2) {
    return `${label} debe tener al menos 2 caracteres.`;
  }
  if (normalized.length > 100) {
    return `${label} no puede superar 100 caracteres.`;
  }
  if (!NAME_PATTERN.test(normalized)) {
    return `${label} solo puede contener letras, espacios, guiones o apóstrofes.`;
  }

  return "";
}

function validateAmount(value) {
  const normalized = normalizeAmount(value);

  if (!normalized) return "El monto es obligatorio.";
  if (!AMOUNT_PATTERN.test(normalized)) {
    return "Usa un monto positivo con máximo 2 decimales.";
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "El monto debe ser mayor que cero.";
  }
  if (amount > MAX_AMOUNT) {
    return "El monto supera el máximo permitido.";
  }

  return "";
}

function validateNotificationUrl(value) {
  const normalized = value.trim();
  if (!normalized) return "";

  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) {
      return "La URL debe usar http:// o https://.";
    }
  } catch {
    return "Ingresa una URL de notificaciones válida.";
  }

  return "";
}

export function validatePaymentForm(form) {
  const errors = {
    amount: validateAmount(form.amount),
    currency: SUPPORTED_CURRENCIES.has(form.currency)
      ? ""
      : "Selecciona una moneda válida.",
    firstName: validateName(form.firstName, "El nombre"),
    lastName: validateName(form.lastName, "El apellido"),
    personalId: PERSONAL_ID_PATTERN.test(form.personalId.trim())
      ? ""
      : "El documento debe contener entre 5 y 20 dígitos.",
    notificationUrl: validateNotificationUrl(form.notificationUrl),
  };

  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message),
  );
}

export function buildPaymentPayload(
  form,
  transactionId,
  fallbackNotificationUrl,
) {
  return {
    transaction_id: transactionId,
    amount: normalizeAmount(form.amount),
    currency: form.currency,
    notification_url:
      form.notificationUrl.trim() || fallbackNotificationUrl,
    customer: {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      personal_id: form.personalId.trim(),
    },
  };
}
