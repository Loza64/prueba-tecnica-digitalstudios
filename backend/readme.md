# Planilla Backend

API de planillas (Parte 2 de la prueba técnica): consulta del detalle de una planilla y envío a SAP (simulado).

**Stack:** Node.js · Express · TypeScript · Prisma · SQL Server · Arquitectura hexagonal (puertos y adaptadores)

## Estructura del repositorio

```
.
├── backend/                     Esta API
│   ├── src/
│   ├── prisma/                  schema.prisma y seed.ts
│   ├── Dockerfile
│   ├── docker-compose.yml       Solo la API
│   ├── .env.example             Plantilla (se sube a Git)
│   ├── .env                     Valores reales (NO se sube a Git)
│   └── README.md
└── infra/
    └── mssql/                   SQL Server en Docker (independiente de la API)
        ├── docker-compose.yml
        ├── .env.example         Plantilla (se sube a Git)
        ├── .env                 Valores reales (NO se sube a Git)
        └── backups/
```

La base de datos vive en `infra/mssql` y la API en `backend`. Son dos composes independientes que se conectan por
una red Docker compartida llamada **`mssql_network`** (la crea el compose de SQL Server).

**Cada servicio tiene su propio `.env`.** El de `infra/mssql` configura la contraseña de SQL Server y el de `backend`
configura la API y la conexión a la base de datos. Ambos deben usar la **misma contraseña** (ver
[Variables de entorno](#variables-de-entorno)).

## Requisitos

- Node.js 22 y pnpm (`corepack enable`)
- Docker y Docker Compose

## Puesta en marcha (desarrollo local)

La base de datos corre en Docker y la API en tu máquina.

```bash
# 1. Base de datos (desde la raíz del repositorio)
cd infra/mssql
cp .env.example .env                      # <- obligatorio crear el .env de SQL Server
docker compose up -d
docker inspect --format '{{.State.Health.Status}}' some-mssql     # esperar "healthy"

# 2. API
cd ../../backend
cp .env.example .env                      # <- y el .env del backend
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init       # crea la BD "planillas" y las tablas
pnpm prisma:seed                          # datos de prueba
pnpm dev                                  # http://localhost:4200
```

- Swagger: `http://localhost:4200/api-docs`
- Pruebas: `pnpm test` (no necesitan base de datos)

## Variables de entorno

Hay **dos archivos `.env`** para esta guía: uno en `infra/mssql` y otro en `backend`. Créelos copiando sus
`.env.example`; los archivos reales están en `.gitignore`.

### 1. `infra/mssql/.env` (SQL Server)

Este archivo permite establecer explícitamente la contraseña de SQL Server. Docker Compose lo lee automáticamente
desde la misma carpeta del `docker-compose.yaml` para resolver `${SA_PASSWORD}`. La plantilla
`infra/mssql/.env.example` contiene un valor de ejemplo que debes reemplazar.

```env
SA_PASSWORD=ReplaceWithAStrongPassword123!
```

| Variable | En la plantilla | Respaldo de Compose si falta `.env` | Descripción |
|---|---|---|---|
| `SA_PASSWORD` | `ReplaceWithAStrongPassword123!` | `ChangeMe123*` | Contraseña del usuario `sa` de SQL Server |

- Debe cumplir la política de complejidad de SQL Server: mínimo 8 caracteres, con mayúsculas, minúsculas, números y
  símbolos. Si no la cumple, el contenedor arranca y se detiene sin dar un error claro.
- Si el `.env` no existe, Compose usa el valor de respaldo `ChangeMe123*`. No lo uses fuera de un entorno local
  desechable; crea el `.env` desde la plantilla y cámbialo.
- La contraseña **se fija la primera vez que se crea el volumen `data`**. Cambiar `SA_PASSWORD` después no cambia la
  contraseña de la base ya creada; para aplicarla hay que borrar el volumen (`docker compose down -v`, borra los datos).

### 2. `backend/.env` (API)

La plantilla `backend/.env.example` define `PORT`, `ORIGIN` y `DATABASE_URL`. Reemplaza el valor de ejemplo de la
contraseña en `DATABASE_URL` por la contraseña elegida para SQL Server. Ajusta el host según dónde se ejecute la API:
`localhost` desde tu máquina o `some-mssql` desde el contenedor de la API.

Las variables de SAP y del circuit breaker son opcionales y no se incluyen en la plantilla. Si no las agregas al
`.env`, la aplicación usa estos valores predeterminados:

| Variable | En la plantilla | Predeterminado si se omite | Descripción |
|---|---|---:|---|
| `PORT` | `4200` | `4200` | Puerto del servidor (también lo usa el compose de la API) |
| `ORIGIN` | `http://localhost:5173` | `*` | Origen(es) permitidos por CORS, separados por coma. Si se omite, se permite cualquier origen y no se habilitan credenciales. |
| `DATABASE_URL` | Requiere configurar contraseña | Sin valor | Cadena de conexión de Prisma a SQL Server |
| `SAP_MOCK_LATENCY_MS` | No incluida | `300` | Latencia simulada de SAP |
| `SAP_MOCK_FAIL_RATE` | No incluida | `0` | Probabilidad de fallo simulado (0 a 1) |
| `SAP_TX_TIMEOUT_MS` | No incluida | `15000` | Timeout de la transacción (debe ser mayor que `CB_TIMEOUT_MS`) |
| `CB_TIMEOUT_MS` | No incluida | `8000` | Timeout del circuit breaker de SAP |
| `CB_ERROR_THRESHOLD_PERCENTAGE` | No incluida | `50` | % de errores para abrir el circuito |
| `CB_RESET_TIMEOUT_MS` | No incluida | `15000` | Tiempo antes de reintentar con el circuito abierto |
| `CB_VOLUME_THRESHOLD` | No incluida | `5` | Mínimo de llamadas antes de evaluar el circuito |

`.env` mínimo para desarrollo local:

```env
PORT=4200
ORIGIN=http://localhost:5173
DATABASE_URL="sqlserver://localhost:1433;database=planillas;user=sa;password=ChangeMe123*;trustServerCertificate=true"
```

### Cómo se relacionan los dos `.env`

La contraseña de `SA_PASSWORD` (en `infra/mssql/.env`) debe ser la misma que aparece en `DATABASE_URL` (en
`backend/.env`). Si no coinciden, la API falla con error de autenticación (`Login failed for user 'sa'`).

```
infra/mssql/.env  →  SA_PASSWORD=ChangeMe123*
                                      │  misma contraseña
backend/.env      →  DATABASE_URL="...;user=sa;password=ChangeMe123*;..."
```

El host de `DATABASE_URL` cambia según dónde corra la API:

| Dónde corre la API | `DATABASE_URL` |
|---|---|
| En tu máquina (`pnpm dev`) | `sqlserver://localhost:1433;database=planillas;user=sa;password=ChangeMe123*;trustServerCertificate=true` |
| En Docker (`docker compose up`) | `sqlserver://some-mssql:1433;database=planillas;user=sa;password=ChangeMe123*;trustServerCertificate=true` |

Dentro de Docker, `localhost` es el propio contenedor de la API, por eso se usa el nombre del contenedor de SQL Server
(`some-mssql`). La base `planillas` no hay que crearla a mano: `prisma migrate` la crea.

## Docker

### 1. SQL Server (`infra/mssql`)

Requiere su propio `.env` (ver [arriba](#1-inframssqlenv-sql-server)).

```yaml
# infra/mssql/docker-compose.yml
services:
  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: some-mssql
    restart: unless-stopped
    ports:
      - "1433:1433"
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: ${SA_PASSWORD:-ChangeMe123*}
    volumes:
      - data:/var/opt/mssql
      - ./backups:/var/opt/mssql/backup
    networks:
      - network
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P \"$$SA_PASSWORD\" -Q 'SELECT 1' || exit 1",
        ]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  network:
    name: mssql_network
    driver: bridge

volumes:
  data:
```

- La contraseña viene de `infra/mssql/.env` (`SA_PASSWORD`).
- La red se crea con el nombre fijo `mssql_network`, sin depender del nombre de la carpeta.
- Los datos persisten en el volumen `data`; los backups, en `infra/mssql/backups`.
- Este compose debe levantarse **primero**, porque crea la red que usa la API.

```bash
cd infra/mssql
cp .env.example .env
docker compose up -d
docker network ls | grep mssql_network
docker inspect --format '{{.State.Health.Status}}' some-mssql     # healthy
```

### 2. Crear las tablas

El contenedor de la API no ejecuta migraciones. Se aplican desde tu máquina (el puerto `1433` está publicado) con la
URL apuntando a `localhost`:

```bash
cd backend

DATABASE_URL="sqlserver://localhost:1433;database=planillas;user=sa;password=ChangeMe123*;trustServerCertificate=true" \
  pnpm prisma migrate deploy

# opcional: datos de prueba
DATABASE_URL="sqlserver://localhost:1433;database=planillas;user=sa;password=ChangeMe123*;trustServerCertificate=true" \
  pnpm prisma:seed
```

### 3. API (`backend`)

Requiere su propio `.env`, que el compose carga con `env_file`.

```yaml
# backend/docker-compose.yml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: nodets-backend-api
    restart: unless-stopped
    ports:
      - "${PORT:-4200}:${PORT:-4200}"
    env_file:
      - .env
    networks:
      - mssql_network

networks:
  mssql_network:
    external: true
```

Para este modo, el `.env` del backend usa el host `some-mssql`:

```env
PORT=4200
ORIGIN=http://localhost:5173
DATABASE_URL="sqlserver://some-mssql:1433;database=planillas;user=sa;password=ChangeMe123*;trustServerCertificate=true"
```

```bash
cd backend
docker compose up -d --build
docker logs -f nodets-backend-api
```

La API queda en `http://localhost:${PORT}` y Swagger en `/api-docs`.

### Dockerfile

Es multi-stage:

- **builder:** instala dependencias con `pnpm install --frozen-lockfile`, genera el cliente de Prisma
  (`pnpm prisma generate`), **ejecuta los tests** y compila. Si un test falla, la imagen no se construye.
- **runner:** imagen final con `build/`, `node_modules/` y `package.json`, sin código fuente, ejecutada con un usuario
  sin privilegios (`nodets`).

Requisitos que debe cumplir:

- `RUN pnpm prisma generate` después de `COPY . .` y antes de `pnpm test`.
- `RUN apk add --no-cache openssl` en ambas etapas (Prisma lo necesita en Alpine).
- El `tsconfig` debe compilar a `build/index.js` (`rootDir: "src"`, `include: ["src"]`), que es lo que ejecuta `CMD ["node", "build/index"]`.

### Resumen de comandos

| Quiero | Dónde | Comando |
|---|---|---|
| Crear el `.env` de SQL Server | `infra/mssql` | `cp .env.example .env` |
| Levantar la base de datos | `infra/mssql` | `docker compose up -d` |
| Crear el `.env` de la API | `backend` | `cp .env.example .env` |
| Levantar la API en Docker | `backend` | `docker compose up -d --build` |
| Ver logs de la API | — | `docker logs -f nodets-backend-api` |
| Apagar la API | `backend` | `docker compose down` |
| Apagar la base de datos (conserva datos) | `infra/mssql` | `docker compose down` |
| Borrar también los datos | `infra/mssql` | `docker compose down -v` |

### Problemas comunes

| Síntoma | Causa probable |
|---|---|
| `network mssql_network declared as external, but could not be found` | No se levantó antes el compose de `infra/mssql` |
| `Login failed for user 'sa'` | La contraseña de `DATABASE_URL` no coincide con `SA_PASSWORD`, o se cambió `SA_PASSWORD` con el volumen ya creado |
| El contenedor `some-mssql` se reinicia o se apaga | `SA_PASSWORD` no cumple la política de complejidad de SQL Server |
| La API en Docker no conecta pero en local sí | `DATABASE_URL` usa `localhost` en vez de `some-mssql` |

## Restricciones CHECK (opcional, recomendado)

Prisma no puede declarar CHECK constraints. Para agregarlas, crea la migración sin aplicarla:

```bash
pnpm prisma migrate dev --name init --create-only
```

Agrega esto al final del `migration.sql` generado y luego ejecuta `pnpm prisma migrate dev`:

```sql
ALTER TABLE [dbo].[Planillas] ADD CONSTRAINT [CK_Planillas_Estado]
  CHECK ([Estado] IN ('Borrador','Aprobada','EnviadaSAP'));
ALTER TABLE [dbo].[PlanillaDetalle] ADD CONSTRAINT [CK_PlanillaDetalle_Tipo]
  CHECK ([Tipo] IN ('D','C'));
```

## Arquitectura

```
src/
├── composition-root.ts          Ensambla puertos y adaptadores (inyección de dependencias)
├── app.ts / index.ts            Express y arranque
├── interfaces/http/routes.ts    Router raíz (/api)
├── modules/
│   ├── health/                  Chequeo de vida y estado de circuit breakers
│   └── planilla/
│       ├── domain/              Reglas de negocio puras + PUERTOS (interfaces)
│       │   ├── planilla.entity.ts        Totales en centavos, estaCuadrada(), estaAprobada()...
│       │   ├── planilla.repository.ts    Puertos: PlanillaRepository, PlanillaUnitOfWork
│       │   └── sap.gateway.ts            Puerto: SapGateway
│       ├── application/         Casos de uso (sin Express ni Prisma)
│       │   ├── enviar-planilla-sap.use-case.ts
│       │   └── obtener-planilla.use-case.ts
│       └── infrastructure/      ADAPTADORES
│           ├── http/            Routes → Controller (entrada)
│           ├── persistence/     Prisma + SQL Server (repositorio y unidad de trabajo)
│           └── sap/             MockSapGateway (con circuit breaker)
└── shared/                      Config, errores, logger, middlewares, circuit breaker, cliente Prisma
prisma/
├── schema.prisma
└── seed.ts
```

Flujo de una petición:

```
Routes → Controller → UseCase → PlanillaRepository / PlanillaUnitOfWork / SapGateway
                                        │                 │                │
                                      Prisma            Prisma          MockSapGateway
```

El dominio y la aplicación solo dependen de interfaces. Para usar el SAP real basta crear otro adaptador que
implemente `SapGateway` (por ejemplo, uno de SAP Service Layer) y cambiarlo en el `composition-root`.

## Modelo de datos

Tablas y columnas mapeadas (`@map`) a los nombres exactos del enunciado, para que el `.sql` de la Parte 1 funcione
sobre esta misma base de datos.

| Tabla | Columnas |
|---|---|
| `CentrosCosto` | `CentroCostoId`, `Nombre` |
| `Empleados` | `EmpleadoId`, `Nombre`, `CentroCostoId`, `Activo` |
| `Planillas` | `PlanillaId`, `Periodo` (`YYYY-MM`), `Estado` (`Borrador` / `Aprobada` / `EnviadaSAP`), `SapReferencia`, `EnviadaSapAt` |
| `PlanillaDetalle` | `DetalleId`, `PlanillaId`, `EmpleadoId`, `Concepto`, `Monto` (`DECIMAL(18,2)`), `Tipo` (`'D'` / `'C'`) |

`SapReferencia` y `EnviadaSapAt` se agregaron para poder conciliar con SAP y diagnosticar incidentes.

## Endpoints

### `POST /api/planillas/:id/enviar-sap`

Envía una planilla «Aprobada» a SAP.

```bash
curl -X POST http://localhost:4200/api/planillas/1/enviar-sap
```

```json
{
  "message": "Planilla enviada a SAP",
  "data": {
    "planillaId": 1,
    "periodo": "2026-09",
    "estado": "EnviadaSAP",
    "sapReferencia": "SAP-2026-09-000001",
    "enviadaSapAt": "2026-10-05T21:00:00.000Z",
    "totalDebitos": 5400,
    "totalCreditos": 5400
  }
}
```

| Código | Cuándo |
|-------:|--------|
| 200 | Enviada correctamente |
| 400 | `id` no es un entero positivo |
| 404 | La planilla no existe |
| 409 | No está «Aprobada», ya fue enviada, o otra solicitud la está enviando |
| 422 | Sin movimientos o descuadrada (débitos ≠ créditos) |
| 502 | SAP rechazó o falló el envío |
| 503 | Circuit breaker abierto: SAP no disponible temporalmente |
| 504 | SAP no respondió a tiempo |

### `GET /api/planillas/:id`

Devuelve el detalle con sus movimientos (empleado, centro de costo, concepto, monto, tipo) y los totales de
débitos y créditos. Lo consume la pantalla de detalle (Parte 3).

### `GET /api/health/hello` · `GET /api/health/circuit-breakers`

Chequeo de vida y estado actual de los circuit breakers.

## Protección contra doble envío

1. **Pre-chequeo de estado** fuera de la transacción: falla rápido con 409.
2. **Reserva atómica** dentro de `prisma.$transaction`:
   `UPDATE Planillas SET Estado='EnviadaSAP' WHERE PlanillaId=@id AND Estado='Aprobada'`.
   SQL Server mantiene el lock de la fila hasta el commit; una solicitud concurrente espera, ve 0 filas afectadas y recibe 409.
3. **Idempotency key** (`planilla-<id>`) hacia SAP: si SAP procesó el mensaje pero el commit local falló, reintentar
   no duplica el asiento contable.

Si SAP falla, la transacción hace **rollback**: la planilla sigue «Aprobada» y se puede reintentar.
`EnviadaSAP` nunca queda guardado sin confirmación de SAP.

## Datos de prueba (seed)

`pnpm prisma:seed` limpia las tablas y crea 3 centros de costo, 4 empleados y 4 planillas:

| Planilla | Escenario | Resultado de `enviar-sap` |
|---:|---|---|
| 1 | Aprobada y cuadrada (2026-09) | 200 |
| 2 | Borrador (2026-10) | 409 |
| 3 | Aprobada, descuadrada y con concepto duplicado (2026-09) | 422 |
| 4 | Ya `EnviadaSAP` (2026-08) | 409 |

Los ids dependen de la columna identity; el seed imprime los ids reales al terminar.

## Probar fallos de SAP

Con el mock de SAP se pueden provocar los errores cambiando variables en `backend/.env` (y reiniciando la API):

- `SAP_MOCK_FAIL_RATE=1` → 502 en los primeros intentos y 503 cuando el circuit breaker abre.
- `SAP_MOCK_LATENCY_MS=9000` → 504 (supera `CB_TIMEOUT_MS`).

En ambos casos la planilla queda en «Aprobada» (rollback). Estado de los breakers: `GET /api/health/circuit-breakers`.

## Pruebas

```bash
pnpm test
```

- **Dominio:** cuadre en centavos y estados de la planilla.
- **Caso de uso:** envío exitoso, 404, 409, 422, fallo de SAP con rollback, reintento tras fallo y doble envío concurrente
  (SAP se llama una sola vez).
- **HTTP (supertest):** códigos de estado de ambos endpoints con puertos en memoria.
- **SAP mock:** referencia, idempotencia y traducción de fallos a 502.

Los tests no necesitan base de datos. También se ejecutan al construir la imagen de Docker.

## Supuestos y decisiones

- `Periodo` es texto `YYYY-MM`. `Monto` es positivo; el signo lo da `Tipo` (`'D'` débito, `'C'` crédito).
- El cuadre se calcula en **centavos** para evitar errores de punto flotante.
- 409 = conflicto de estado; 422 = la planilla no es contablemente válida.
- La llamada a SAP ocurre **dentro** de la transacción para que «EnviadaSAP» no se guarde sin confirmación de SAP.
  Trade-off: la fila queda bloqueada hasta `CB_TIMEOUT_MS` como máximo. A mayor escala se usaría el patrón
  outbox con un worker.
- SQL Server vive en `infra/mssql` como compose independiente, con su propio `.env`; se comunica con la API por la red
  `mssql_network`.
- Las migraciones no corren dentro del contenedor de la API; se aplican como paso aparte (`prisma migrate deploy`).
- SAP está simulado; no se implementa autenticación ni autorización porque no forman parte del enunciado.
- Se agregó `GET /api/planillas/:id` porque el frontend necesita datos reales.