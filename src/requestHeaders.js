const HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const FORBIDDEN_HEADERS = new Set([
  "connection",
  "content-length",
  "content-type",
  "cookie",
  "host",
  "origin",
  "referer",
  "transfer-encoding",
  "user-agent",
]);

export const emptyHeader = () => ({ key: "", value: "" });

export function validateHeaderRows(rows) {
  const errors = rows.map(() => ({}));
  const seenHeaders = new Set();

  rows.forEach((row, index) => {
    const key = row.key.trim();
    const value = row.value.trim();

    if (!key && !value) return;

    if (!key) {
      errors[index].key = "Escribe el nombre del header.";
      return;
    }
    if (!HEADER_NAME_PATTERN.test(key)) {
      errors[index].key = "El nombre del header contiene caracteres inválidos.";
    }

    const normalizedKey = key.toLowerCase();
    if (FORBIDDEN_HEADERS.has(normalizedKey)) {
      errors[index].key = "Este header es controlado por el navegador.";
    } else if (seenHeaders.has(normalizedKey)) {
      errors[index].key = "Este header está duplicado.";
    } else {
      seenHeaders.add(normalizedKey);
    }

    if (!value) {
      errors[index].value = "Escribe el valor del header.";
    } else if (/[\r\n]/.test(row.value)) {
      errors[index].value = "El valor no puede contener saltos de línea.";
    }
  });

  return errors;
}

export function hasHeaderErrors(errors) {
  return errors.some((row) => Object.keys(row).length > 0);
}

export function buildRequestHeaders(rows) {
  const headers = { "Content-Type": "application/json" };

  rows.forEach((row) => {
    const key = row.key.trim();
    const value = row.value.trim();
    if (key && value) headers[key] = value;
  });

  return headers;
}

export function buildPaymentRequestOptions(rows, payload) {
  return {
    method: "POST",
    headers: buildRequestHeaders(rows),
    credentials: "omit",
    cache: "no-store",
    body: JSON.stringify(payload),
  };
}
