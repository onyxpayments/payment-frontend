import { useEffect, useState } from "react";

import {
  buildPaymentPayload,
  validatePaymentForm,
} from "./validation";
import {
  buildPaymentRequestOptions,
  emptyHeader,
  hasHeaderErrors,
  validateHeaderRows,
} from "./requestHeaders";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const DUMMY_NOTIFICATION_URL =
  "https://merchant.example/webhooks/payments";

const initialForm = {
  amount: "",
  currency: "COP",
  notificationUrl: "",
  firstName: "",
  lastName: "",
  personalId: "",
};

function createTransactionId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getErrorMessage(body, status) {
  if (typeof body?.detail === "string") return body.detail;
  if (body?.detail) return JSON.stringify(body.detail);
  return `El API respondió con estado ${status}.`;
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [headerRows, setHeaderRows] = useState([emptyHeader()]);
  const [headerErrors, setHeaderErrors] = useState([{}]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!error && !result) return undefined;

    const timeoutId = window.setTimeout(() => {
      setError("");
      setResult(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [error, result]);

  function handleChange(event) {
    const { name, value } = event.target;
    const normalizedValue =
      name === "personalId" ? value.replace(/\D/g, "") : value;
    const nextForm = { ...form, [name]: normalizedValue };
    setForm(nextForm);

    if (touched[name]) {
      const nextErrors = validatePaymentForm(nextForm);
      setFieldErrors((current) => ({
        ...current,
        [name]: nextErrors[name],
      }));
    }
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
    const nextErrors = validatePaymentForm(form);
    setFieldErrors((current) => ({
      ...current,
      [name]: nextErrors[name],
    }));
  }

  function errorProps(name) {
    const message = fieldErrors[name];
    return {
      "aria-invalid": Boolean(message),
      "aria-describedby": message ? `${name}-error` : undefined,
    };
  }

  function fieldError(name) {
    if (!fieldErrors[name]) return null;
    return (
      <span className="field-error" id={`${name}-error`} role="alert">
        {fieldErrors[name]}
      </span>
    );
  }

  function updateHeader(index, field, value) {
    const nextRows = headerRows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [field]: value } : row,
    );
    setHeaderRows(nextRows);
    setHeaderErrors(validateHeaderRows(nextRows));
  }

  function addHeader() {
    setHeaderRows((current) => [...current, emptyHeader()]);
    setHeaderErrors((current) => [...current, {}]);
  }

  function removeHeader(index) {
    const nextRows = headerRows.filter((_, rowIndex) => rowIndex !== index);
    const rows = nextRows.length > 0 ? nextRows : [emptyHeader()];
    setHeaderRows(rows);
    setHeaderErrors(validateHeaderRows(rows));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    const validationErrors = validatePaymentForm(form);
    const nextHeaderErrors = validateHeaderRows(headerRows);
    if (
      Object.keys(validationErrors).length > 0 ||
      hasHeaderErrors(nextHeaderErrors)
    ) {
      setFieldErrors(validationErrors);
      setHeaderErrors(nextHeaderErrors);
      setTouched(
        Object.fromEntries(
          Object.keys(initialForm).map((field) => [field, true]),
        ),
      );
      setError("Revisa los campos marcados antes de continuar.");
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const payload = buildPaymentPayload(
      form,
      createTransactionId(),
      DUMMY_NOTIFICATION_URL,
    );

    try {
      const response = await fetch(`${API_URL}/payments`, {
        ...buildPaymentRequestOptions(headerRows, payload),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(body, response.status));
      }

      setResult(body);
      setForm(initialForm);
      setTouched({});
      setFieldErrors({});
      setHeaderRows([emptyHeader()]);
      setHeaderErrors([{}]);
    } catch (requestError) {
      const message =
        requestError instanceof TypeError
          ? "No fue posible conectar con el API Gateway."
          : requestError.message;
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="intro">
        <a className="brand" href="/" aria-label="OnyxPay">
          <span className="brand-mark" aria-hidden="true">
            O
          </span>
          <span>OnyxPay</span>
        </a>

        <div className="intro-copy">
          <span className="eyebrow">Payment sandbox</span>
          <h1>Un pago simple, de principio a fin.</h1>
          <p>
            Envía una transacción al entorno de prueba y consulta la respuesta
            inmediata del orquestador.
          </p>
        </div>

        <div className="flow" aria-label="Flujo del pago">
          <span>Gateway</span>
          <i aria-hidden="true" />
          <span>Orquestador</span>
          <i aria-hidden="true" />
          <span>Mock Bank</span>
        </div>
      </section>

      <section className="form-panel">
        <div className="form-heading">
          <div>
            <span className="step">Nueva transacción</span>
            <h2>Datos del pago</h2>
          </div>
          <span className="secure-label">Entorno seguro</span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field-row amount-row">
            <label>
              <span>Monto</span>
              <div className="amount-input">
                <span>$</span>
                <input
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="100000.00"
                  maxLength={20}
                  {...errorProps("amount")}
                />
              </div>
              {fieldError("amount")}
            </label>

            <label className="currency-field">
              <span>Moneda</span>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                onBlur={handleBlur}
                {...errorProps("currency")}
              >
                <option value="COP">COP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              {fieldError("currency")}
            </label>
          </div>

          <div className="divider">
            <span>Información del cliente</span>
          </div>

          <div className="field-row">
            <label>
              <span>Nombre</span>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Juan"
                autoComplete="given-name"
                minLength={2}
                maxLength={100}
                {...errorProps("firstName")}
              />
              {fieldError("firstName")}
            </label>

            <label>
              <span>Apellido</span>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Bello"
                autoComplete="family-name"
                minLength={2}
                maxLength={100}
                {...errorProps("lastName")}
              />
              {fieldError("lastName")}
            </label>
          </div>

          <label>
            <span>Documento de identidad</span>
            <input
              name="personalId"
              value={form.personalId}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ej. 1012345678"
              inputMode="numeric"
              pattern="[0-9]*"
              minLength={5}
              maxLength={20}
              autoComplete="off"
              {...errorProps("personalId")}
            />
            {fieldError("personalId")}
          </label>

          <label>
            <span>URL de notificaciones (opcional por ahora)</span>
            <input
              name="notificationUrl"
              type="url"
              value={form.notificationUrl}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="https://comercio.example/webhooks/pagos"
              autoComplete="url"
              maxLength={2048}
              {...errorProps("notificationUrl")}
            />
            {fieldError("notificationUrl")}
          </label>

          <div className="divider">
            <span>Headers del API Gateway</span>
          </div>

          <div className="headers-editor">
            <p className="headers-help">
              Agrega headers personalizados. Para Basic Auth usa
              <code>Authorization</code> y <code>Basic &lt;base64&gt;</code>.
            </p>

            {headerRows.map((header, index) => (
              <div className="header-entry" key={index}>
                <label>
                  <span>Header</span>
                  <input
                    type="text"
                    value={header.key}
                    onChange={(event) =>
                      updateHeader(index, "key", event.target.value)
                    }
                    placeholder="Authorization"
                    aria-invalid={Boolean(headerErrors[index]?.key)}
                    aria-describedby={
                      headerErrors[index]?.key
                        ? `header-key-${index}-error`
                        : undefined
                    }
                  />
                  {headerErrors[index]?.key && (
                    <span
                      className="field-error"
                      id={`header-key-${index}-error`}
                      role="alert"
                    >
                      {headerErrors[index].key}
                    </span>
                  )}
                </label>

                <label>
                  <span>Value</span>
                  <input
                    type="text"
                    value={header.value}
                    onChange={(event) =>
                      updateHeader(index, "value", event.target.value)
                    }
                    placeholder="Basic bWVyY2hhbnQ6c2VjcmV0LWtleQ=="
                    aria-invalid={Boolean(headerErrors[index]?.value)}
                    aria-describedby={
                      headerErrors[index]?.value
                        ? `header-value-${index}-error`
                        : undefined
                    }
                  />
                  {headerErrors[index]?.value && (
                    <span
                      className="field-error"
                      id={`header-value-${index}-error`}
                      role="alert"
                    >
                      {headerErrors[index].value}
                    </span>
                  )}
                </label>

                <button
                  className="header-remove"
                  type="button"
                  onClick={() => removeHeader(index)}
                  aria-label={`Eliminar header ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}

            <button
              className="add-header-button"
              type="button"
              onClick={addHeader}
            >
              + Agregar header
            </button>
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Procesando…" : "Procesar pago"}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        {error && (
          <div className="feedback toast error" role="alert">
            <strong>No pudimos procesar el pago</strong>
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div
            className="feedback toast success"
            role="status"
            aria-live="polite"
          >
            <div>
              <strong>Transacción recibida</strong>
              <span>Estado: {result.status}</span>
            </div>
            <code>{result.transaction_id}</code>
          </div>
        )}

        <p className="form-note">
          Esta interfaz usa el banco simulado. No se procesará dinero real.
        </p>
      </section>
    </main>
  );
}
