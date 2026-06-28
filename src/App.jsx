import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const initialForm = {
  amount: "",
  currency: "COP",
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsSubmitting(true);

    const payload = {
      transaction_id: createTransactionId(),
      amount: Number(form.amount),
      currency: form.currency,
      customer: {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        personal_id: form.personalId.trim(),
      },
    };

    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(body, response.status));
      }

      setResult(body);
      setForm(initialForm);
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

        <form onSubmit={handleSubmit}>
          <div className="field-row amount-row">
            <label>
              <span>Monto</span>
              <div className="amount-input">
                <span>$</span>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="100.000"
                  required
                />
              </div>
            </label>

            <label className="currency-field">
              <span>Moneda</span>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
              >
                <option value="COP">COP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
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
                placeholder="Juan"
                autoComplete="given-name"
                required
              />
            </label>

            <label>
              <span>Apellido</span>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Bello"
                autoComplete="family-name"
                required
              />
            </label>
          </div>

          <label>
            <span>Documento de identidad</span>
            <input
              name="personalId"
              value={form.personalId}
              onChange={handleChange}
              placeholder="Ej. 1012345678"
              autoComplete="off"
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Procesando…" : "Procesar pago"}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        {error && (
          <div className="feedback error" role="alert">
            <strong>No pudimos procesar el pago</strong>
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="feedback success" role="status">
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

