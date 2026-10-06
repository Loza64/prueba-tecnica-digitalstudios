# Prueba técnica Full Stack: planilla y contabilidad

Sistema de planilla con envío a SAP (simulado).

```
React  →  Node / Express  →  Prisma  →  SQL Server  →  SAP (mock)
```

## Estructura del repositorio

```
.
├── backend/     API Node.js + Express + TypeScript + Prisma (Parte 2). Su README tiene el detalle
├── frontend/    Pantalla «Detalle de planilla» en React + TypeScript (Parte 3)
├── infra/
│   ├── mssql/       SQL Server en Docker, independiente de la API
│   └── script.sql   Consultas y stored procedure (Parte 1)
└── readme.md        Instrucciones, supuestos y diagnóstico (Parte 4)
```

## Requisitos

- Node.js 22 y pnpm (`corepack enable`)
- Docker y Docker Compose

## Puesta en marcha

Desde la raíz del repositorio. La base de datos corre en Docker; la API y el front, en la máquina local.

```bash
# 1. SQL Server
cd infra/mssql
cp .env.example .env                  # editar SA_PASSWORD
docker compose up -d
docker inspect --format '{{.State.Health.Status}}' some-mssql     # esperar "healthy"

# 2. API
cd ../../backend
cp .env.example .env                  # la contraseña de DATABASE_URL debe ser igual a SA_PASSWORD
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init   # crea la base "planillas" y las tablas
pnpm prisma:seed                      # datos de prueba
pnpm dev                              # http://localhost:4200  ·  Swagger: /api-docs

# 3. Front (otra terminal)
cd ../frontend
pnpm install
pnpm dev                              # http://localhost:5173/?id=1
```

El front llama a `/api` y Vite lo reenvía a `http://localhost:4200`, así que no hace falta configurar CORS en
desarrollo. Si la API corre en otra URL, defina `VITE_API_URL` en `frontend/.env`.

Para correr la API también en Docker, las variables de entorno, el Dockerfile y los problemas comunes, vea
[`backend/README.md`](backend/README.md).

### Pruebas del backend

```bash
cd backend
pnpm test        # no necesitan base de datos
```

### Parte 1: ejecutar el `.sql`

Abra `infra/script.sql` en SSMS o Azure Data Studio sobre la base `planillas`, o ejecútelo con el contenedor:

```bash
docker cp infra/script.sql some-mssql:/tmp/script.sql
docker exec -it some-mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "<SA_PASSWORD>" -d planillas -I -i /tmp/script.sql
```

## Datos de prueba (seed)

`pnpm prisma:seed` limpia las tablas y crea 3 centros de costo, 4 empleados y 4 planillas. Los ids dependen de la
columna identity; el seed imprime los ids reales al terminar.

| Planilla | Escenario | Resultado de `enviar-sap` |
|---:|---|---|
| 1 | Aprobada y cuadrada (2026-09) | 200 |
| 2 | Borrador (2026-10) | 409 |
| 3 | Aprobada, descuadrada y con concepto duplicado (2026-09) | 422 |
| 4 | Ya `EnviadaSAP` (2026-08) | 409 |

Después de enviar la planilla 1, vuelva a ejecutar el seed para repetir la prueba.

## Parte 1: SQL Server

Archivo: `infra/script.sql`. Los nombres de tablas y columnas son los del enunciado (mapeados con `@map` en
Prisma), por lo que el script corre sobre la misma base que usa la API.

1. **Totales por centro de costo** (2026-09, solo «Aprobada»). Parte de `CentrosCosto` con `LEFT JOIN`, de modo que un centro sin movimientos aparece con 0.
2. **Planillas descuadradas:** agrupa por planilla y filtra con `HAVING` débitos ≠ créditos.
3. **Conceptos duplicados:** mismo empleado y concepto más de una vez en una planilla.
4. **`dbo.usp_AprobarPlanilla`:** aprueba una planilla con `TRY/CATCH` y transacción. Bloquea la fila con `UPDLOCK, HOLDLOCK` para evitar aprobaciones concurrentes y lanza errores propios:

| Error | Causa |
|---|---|
| 50001 | La planilla no existe |
| 50002 | El estado no es «Borrador» |
| 50003 | La planilla no tiene movimientos |
| 50004 | Débitos ≠ créditos |

## Parte 2: Backend

`POST /api/planillas/:id/enviar-sap`, con arquitectura hexagonal: Routes → Controller → Caso de uso → puertos
(repositorio, unidad de trabajo, `SapGateway`) con adaptadores Prisma y SAP simulado. También existe
`GET /api/planillas/:id`, que usa el front.

| Código | Cuándo |
|---:|---|
| 200 | Enviada a SAP; devuelve `sapReferencia` y `enviadaSapAt` |
| 400 | El `id` no es un entero positivo |
| 404 | La planilla no existe |
| 409 | No está «Aprobada», ya fue enviada, u otra solicitud la está enviando |
| 422 | Sin movimientos o descuadrada (débitos ≠ créditos) |
| 502 / 503 / 504 | SAP falló, circuit breaker abierto o SAP no respondió a tiempo |

**Decisiones clave**

- **Valida «Aprobada»** y, además, que la planilla tenga movimientos y débitos = créditos (calculado en centavos).
- **Transacción con Prisma:** la reserva, la llamada a SAP y el registro de la referencia corren en una sola transacción. Si SAP falla, se revierte y la planilla sigue «Aprobada»; `EnviadaSAP` nunca se guarda sin confirmación de SAP.
- **Protección contra doble envío:** pre-chequeo de estado (409 rápido) y reserva atómica `UPDATE ... WHERE Estado = 'Aprobada'`. Una solicitud concurrente ve 0 filas afectadas y recibe 409.
- **Idempotencia hacia SAP:** cada envío lleva `idempotencyKey = planilla-<id>`; si SAP procesó el mensaje pero falló el commit local, reintentar no duplica el asiento.
- **Circuit breaker** (opossum) alrededor de SAP, configurable por variables `CB_*`. Estado en `GET /api/health/circuit-breakers`.

## Parte 3: Frontend

Pantalla «Detalle de planilla» con:

- Tabla de movimientos con filtro por centro de costo (y subtotales cuando el filtro está activo).
- Totales de débitos y créditos, con aviso de planilla cuadrada o descuadrada.
- Botón «Enviar a SAP» deshabilitado si la planilla no está «Aprobada» o mientras se envía.
- Estados de carga (skeleton) y de error (mensaje del backend y «Reintentar»).
- Datos desde el propio endpoint del backend.

Se eliminó todo lo que no aplicaba (SDK genérico, autenticación y refresco de token, CRUD de categorías y
productos, tema, etc.). Quedan React, axios y TanStack Query.

## Supuestos

- `Periodo` es texto `YYYY-MM`. `Monto` es positivo; el signo lo da `Tipo` (`'D'` débito, `'C'` crédito).
- El centro de costo de un movimiento es el del empleado.
- Se agregaron `SapReferencia` y `EnviadaSapAt` a `Planillas` para conciliar con SAP y diagnosticar incidentes.
- SAP está simulado: un gateway mock con latencia y tasa de fallo configurables (`SAP_MOCK_*`).
- No hay autenticación ni autorización; el enunciado no las pide.
- Los montos se muestran en USD con formato `es-SV`.
- La llamada a SAP ocurre dentro de la transacción. Trade-off: la fila queda bloqueada hasta `CB_TIMEOUT_MS` como máximo; a mayor escala se usaría el patrón outbox con un worker.
- Las migraciones no corren dentro del contenedor de la API; se aplican como paso aparte.
- El front no tiene listado de planillas porque no existe endpoint para ello; se navega por id (`?id=`).
- Una planilla descuadrada puede estar «Aprobada» (como en el seed). El backend la rechaza con 422 al enviar.
- El stored procedure se entrega como script independiente; el backend no lo invoca, porque el enunciado solo pide el envío a SAP. Podría exponerse en un endpoint de aprobación con `prisma.$queryRaw`, mapeando los errores 50001 a 50004 a HTTP.

## Parte 4: Diagnóstico de incidente

**Reporte:** «La planilla de septiembre aparece como "Enviada a SAP", pero contabilidad no la ve en SAP.»

### 1. Preguntas al usuario

- ¿Qué planilla es exactamente (id y periodo)? Puede haber más de una de 2026-09.
- ¿Qué referencia SAP muestra la pantalla y cuándo se envió?
- ¿Cómo la busca contabilidad en SAP (referencia, fecha, sociedad)?
- ¿Se envió o modificó más de una vez, o alguien la tocó después?
- ¿En qué ambiente trabaja, y es el mismo que mira contabilidad?
- ¿Vio algún mensaje de error o demora al enviar?

### 2. Qué revisaría y en qué orden

1. **Frontend:** que el estado mostrado sea el real (respuesta de `GET /api/planillas/:id` en Network, sin caché) y que apunte al backend correcto.
2. **Backend:** logs del `POST /enviar-sap` de esa planilla: respuesta completa de SAP (código y cuerpo), `idempotencyKey`, estado del circuit breaker (`/api/health/circuit-breakers`) y qué gateway está activo (mock o real).
3. **Prisma:** que la transacción terminó en commit y que `registrarEnvioSap` guardó la referencia.
4. **SQL Server:** consulta directa a la fuente de verdad:
   ```sql
   SELECT PlanillaId, Estado, SapReferencia, EnviadaSapAt
   FROM dbo.Planillas WHERE Periodo = '2026-09';
   ```
   Un `EnviadaSAP` sin referencia o sin fecha indica un cambio fuera del flujo normal.
5. **SAP:** buscar el documento por referencia en el ambiente y la sociedad correctos, y revisar la cola de errores de integración.

### 3. Posibles causas raíz

1. **El envío no llegó a un SAP real.** El gateway simulado seguía activo en un ambiente productivo, o el backend apuntaba a un SAP de pruebas distinto del que consulta contabilidad. La referencia `SAP-…` existe en la base, pero no en el SAP correcto.
2. **SAP aceptó la solicitud y la rechazó después.** El documento quedó en una cola de errores (periodo contable cerrado, cuenta inexistente, sociedad incorrecta) y nuestro sistema nunca se enteró, porque solo registra la aceptación inicial.
3. **Estado modificado fuera del flujo.** Un `UPDATE` manual en la base o una restauración parcial dejó la planilla en `EnviadaSAP` sin envío real. También influye que la idempotencia del mock vive en memoria y se pierde al reiniciar el servidor.

### 4. Cómo documentaría el incidente

| Campo | Contenido |
|---|---|
| **Problema** | La planilla 2026-09 figura como «Enviada a SAP» pero no existe en SAP. Reportado por contabilidad el [fecha]. Impacto: planilla sin contabilizar. |
| **Causa** | Causa confirmada, con evidencia (log del backend, fila en SQL Server, respuesta de SAP). |
| **Solución** | Inmediata: devolver la planilla a «Aprobada» y reenviarla, apoyándose en la clave de idempotencia para no duplicar. Definitiva: validar el cuerpo de la respuesta de SAP y confirmar el documento antes de dejar `EnviadaSAP`. |
| **Prevención** | Prueba automatizada del caso, alerta para planillas `EnviadaSAP` sin referencia, y verificación del ambiente y el gateway en cada despliegue. |

## Bonus

- **A: Docker Compose.** SQL Server (`infra/mssql`) y la API (`backend`) tienen cada uno su `docker-compose.yml`, conectados por la red `mssql_network`. El Dockerfile es multi-stage y ejecuta los tests al construir la imagen. Detalle en [`backend/README.md`](backend/README.md#docker).