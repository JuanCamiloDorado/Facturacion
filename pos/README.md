# POS Restaurantes

Sistema POS para restaurantes, multitenant, que corre en Cloudflare Workers.
Reemplaza poco a poco al sistema Django que está en `config/djangoProject`.

## Stack

| Parte | Herramienta |
|---|---|
| API | TypeScript + [Hono](https://hono.dev) en Cloudflare Workers |
| Base de datos | Cloudflare D1 (SQLite) con [Drizzle ORM](https://orm.drizzle.team) |
| Pantallas | React + React Router + TanStack Query + Tailwind |
| Validación | Zod, compartido entre la API y los formularios (`src/shared`) |
| Pruebas | Vitest dentro del runtime de Workers (`@cloudflare/vitest-plugin`) |

## Cómo está organizado (multitenant)

- **Una sola aplicación para todos los clientes.** Cada cliente (tenant) entra por su subdominio:
  `lacasona.<dominio>` → cliente `lacasona`.
- **Una base D1 por cliente.** Así los datos de un cliente nunca se cruzan con los de otro, y cada uno
  tiene su propio límite de tamaño y su propio *Time Travel* (restaurar la base a un minuto anterior).
- **Una base de control** (`pos-control`) guarda la lista de clientes y qué base usa cada uno.
- Dentro de cada cliente hay **sedes** (cada restaurante), **usuarios** con rol (administrador, cajero,
  mesero, cocina) y el catálogo: categorías, productos y clientes.

```
src/
  shared/   validaciones, constantes y tipos que usan la API y las pantallas
  worker/   la API (Hono): db/ esquemas, lib/ sesión, cliente, errores; routes/ endpoints
  app/      las pantallas de React
migrations/
  control/  tablas de la base de control
  tenant/   tablas de la base de cada cliente
scripts/    alta de clientes y datos de ejemplo
test/       pruebas de la API
```

### Reglas que sigue el código

- **El dinero se guarda en pesos enteros**, nunca con decimales.
- **El precio de los productos incluye el impuesto.** `tax_rate` va en puntos básicos (800 = 8 %).
  Para restaurantes el impuesto normal es el **INC del 8 %**.
- **Nada se borra:** los registros se desactivan, porque las ventas los van a referenciar.
- Las contraseñas usan PBKDF2-SHA256 y las sesiones son cookies `HttpOnly` que duran 7 días mientras se usen.
  Después de 10 intentos fallidos, el correo queda bloqueado 15 minutos.

## Desarrollo local

Requisitos: Node 22 o superior.

```bash
cd pos
npm install
npm run db:setup     # crea las bases locales con el cliente "demo" y datos de ejemplo
npm run dev          # http://localhost:5173
```

Los usuarios de prueba y su contraseña están en `scripts/dev-seed.json`.
Para empezar de cero, borra la carpeta `pos/.wrangler/state` y vuelve a correr `npm run db:setup`.

Sin subdominio se entra al cliente `DEFAULT_TENANT` (en local, `demo`). Para probar otro cliente:

```bash
npm run tenant:create -- --slug lacasona --name "La Casona" --admin-email dueno@lacasona.co
```

y entra en `http://lacasona.localhost:5173`. El script imprime la contraseña del administrador una sola vez.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | App y API en modo desarrollo |
| `npm test` | Pruebas de la API |
| `npm run typecheck` | Revisa los tipos de todo el proyecto |
| `npm run db:generate` | Genera migraciones nuevas después de cambiar `src/worker/db/*-schema.ts` |
| `npm run tenant:create` | Da de alta un cliente nuevo |
| `npm run cf-typegen` | Regenera los tipos de `wrangler.jsonc` |

### Cambiar las tablas

1. Edita `src/worker/db/tenant-schema.ts` (o `control-schema.ts`).
2. Corre `npm run db:generate`: crea el `.sql` nuevo en `migrations/`.
3. Aplica la migración en local a cada base, por ejemplo `npx wrangler d1 migrations apply pos-tenant-demo --local`.

## Producción (Cloudflare)

Aún no está desplegado. Los pasos serán:

1. `npx wrangler login`.
2. `npx wrangler d1 create pos-control` y poner su id en `env.production` de `wrangler.jsonc`.
3. Cambiar `BASE_DOMAIN` en `env.production` por el dominio real.
4. `npx wrangler d1 migrations apply pos-control --remote --env production`.
5. Por cada cliente: `npm run tenant:create -- --slug ... --remote`.
6. `npm run deploy`.

Para producción se recomienda el plan **Workers Paid** (USD 5/mes): no tiene corte diario de solicitudes
y cada base puede crecer hasta 10 GB (500 MB en el plan gratis).
