# OnyxPay Payment Frontend

Formulario React para enviar transacciones al API Gateway de OnyxPay.

## Requisitos

- Node.js 20 o superior
- El stack de OnyxPay ejecutándose con el API Gateway en `localhost:8003`

## Desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Vite redirige automáticamente las solicitudes
desde `/api/payments` hacia `http://localhost:8003/payments`.

## Configuración

Para usar otro API Gateway, crea `.env.local`:

```text
VITE_API_URL=http://localhost:8003
```

Cuando se utiliza una URL absoluta, el API Gateway debe permitir el origen del
frontend mediante CORS.

## Build

```bash
npm run build
npm run preview
```

## Makefile

Los comandos disponibles siguen el patrón de los demás microservicios:

```bash
make install
make dev
make build
make lint
make test
make docker-build
```

## Docker

La imagen compila React con Node.js y sirve los archivos estáticos con Nginx:

```bash
make docker-build
docker run --name payment-frontend -p 8080:80 payment-frontend
```

Dentro de la red de Docker, Nginx redirige `/api` al servicio
`api-gateway:8002`.

## GitHub Actions

El workflow `.github/workflows/main.yml` valida el build en pull requests. En
cada push a `main`, además publica las imágenes `latest` y `${GITHUB_SHA}` en
GitHub Container Registry bajo `ghcr.io/<owner>/<repository>`.
