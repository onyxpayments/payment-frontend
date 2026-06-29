# OnyxPay Payment Frontend

Simple React interface for submitting test payments to the OnyxPay API Gateway.

The application collects an amount, currency, customer identity, and an
optional merchant notification URL. It generates a transaction UUID in the
browser and sends the payment to `POST /payments`. It displays the immediate
asynchronous acceptance response returned by the platform.

> This interface uses the OnyxPay Mock Bank. It does not process real money.

## Features

- Responsive payment form.
- Client-side UUID generation.
- Optional HTML URL validation with a safe demo fallback for
  `notification_url`.
- Field-level validation for names, personal IDs, amounts, currencies, and
  webhook URLs.
- Dynamic key/value request header editor with duplicate and injection
  validation.
- No browser cookies or implicit browser credentials are sent.
- Custom headers are cleared after a successful transaction.
- Basic HTML form validation.
- Loading state and five-second success/error toast notifications.
- Development proxy for the local API Gateway.
- Production Nginx proxy for the Compose network.
- Multi-stage Docker image.
- GitHub Actions build and GHCR publishing.

## Platform Flow

```text
Browser
  │
  │ POST /api/payments
  ▼
Frontend proxy
  │
  │ POST /payments
  ▼
API Gateway → Payment Request Service → RabbitMQ
                                      → Payment Orchestrator → Mock Bank
                                                               │ callback
                                                               ▼
                                                        Webhook Service
```

## Running with the Full Platform

The recommended way to use the frontend is through the infrastructure
repository:

```bash
cd ../infra
docker compose pull
docker compose up -d
```

Open:

```text
http://localhost:8080
```

Inside the container, Nginx serves the React build and proxies `/api/*` to
`http://api-gateway:8002/*`.

## Local Development

Requirements:

- Node.js 22
- npm
- API Gateway running on `http://localhost:8003`

Install dependencies:

```bash
make install
```

Start Vite:

```bash
make dev
```

Open:

```text
http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:8003/*`, so local development does
not require CORS changes in the API Gateway.

## Submitted payment contract

The form sends:

```json
{
  "transaction_id": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 10000,
  "currency": "COP",
  "notification_url": "https://merchant.example/webhooks/payments",
  "customer": {
    "first_name": "Juan",
    "last_name": "Bello",
    "personal_id": "123456789"
  }
}
```

The browser generates `transaction_id`. While webhook configuration remains
optional in the demo form, an empty value is replaced with
`https://merchant.example/webhooks/payments` so the backend's required
`notification_url` contract remains valid.

## Testing API Gateway Basic authentication

Enable Basic authentication in the infrastructure `.env`:

```dotenv
API_BASIC_AUTH_ENABLED=true
API_BASIC_AUTH_USERNAME=merchant
API_BASIC_AUTH_SECRET=secret-key
```

Restart the API Gateway with the updated image and configuration. Generate the
encoded credential:

```bash
printf 'merchant:secret-key' | base64
```

In the frontend's **API Gateway headers** section, add:

| Header | Value |
| --- | --- |
| `Authorization` | `Basic bWVyY2hhbnQ6c2VjcmV0LWtleQ==` |
| `X-Correlation-ID` | `frontend-test-123` |

Submit a valid payment. A successful request returns `202` and preserves
`X-Correlation-ID` in the response. An incorrect Basic value returns `401`.
Repeated requests beyond the configured limit return `429` with
`Retry-After`.

The editor accepts additional custom headers through **Add header**. Empty rows
are ignored. Duplicate names, invalid names, newline injection, and
browser-controlled headers are rejected before the request is sent.

## Configuration

By default, browser requests use the relative `/api` path.

To call a different API Gateway directly, create `.env.local`:

```dotenv
VITE_API_URL=http://localhost:8003
```

When using an absolute URL, the API Gateway must allow the frontend origin
through CORS.

## Available Commands

```bash
make install       # Install npm dependencies
make dev           # Start the Vite development server
make build         # Create the production build
make lint           # Run unit tests and the production build
make test           # Run validation unit tests
make docker-build  # Build the local Docker image
```

Equivalent npm commands:

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run check
```

Validation rules are covered with Node's built-in test runner. `npm run check`
runs both unit tests and the production build. ESLint has not been added yet.

## Docker

Build the image:

```bash
make docker-build
```

The Dockerfile has two stages:

1. Node.js installs dependencies and creates the Vite production build.
2. Nginx serves the generated static files and proxies API requests.

Run the container in a network where `api-gateway` resolves as a service name:

```bash
docker run --rm --network infra_default -p 8080:80 payment-frontend
```

For the complete service-to-service setup, use the infrastructure Compose file
instead of running this image by itself.

Published image:

```text
ghcr.io/onyxpayments/payment-frontend:latest
```

## Project Structure

```text
.
├── src
│   ├── App.jsx         # Payment form and API request logic
│   ├── main.jsx        # React entry point
│   └── styles.css      # Responsive application styles
├── index.html          # Vite HTML entry point
├── vite.config.js      # Development server and API proxy
├── nginx.conf          # Production static server and API proxy
├── Dockerfile          # Multi-stage production image
├── makefile
└── package.json
```

## CI/CD

GitHub Actions installs dependencies, validates the production build, builds
the Docker image, and publishes these tags on pushes to `main`:

```text
ghcr.io/onyxpayments/payment-frontend:latest
ghcr.io/onyxpayments/payment-frontend:<commit-sha>
```

Pull requests run the same validation and Docker build without publishing the
image.

## Current Limitations

- The interface only displays the immediate `RECEIVED` response.
- It does not poll for or display the final callback status.
- There are no browser-level end-to-end tests yet.
- The production proxy expects the API Gateway to use the Compose service name
  `api-gateway`.

## Health probes

Nginx exposes `/health/live`, `/health/startup`, and `/health/ready`. The
frontend does not make readiness depend on the API Gateway, avoiding cascading
failure when the backend is temporarily unavailable. `/health` remains
available for backward compatibility.
