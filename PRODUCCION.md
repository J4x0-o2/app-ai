# AppAi — Roadmap hacia producción empresarial

> Análisis generado en sesión 5 (2026-04-28).
> Objetivo: sostener miles de usuarios concurrentes sin degradación ni caídas.

---

## Diagnóstico general

La app tiene una base sólida (Clean Architecture, RBAC, refresh tokens, rate limiting, SSE streaming). Lo que falta son las capas de **resiliencia, observabilidad y escala** que el código de producción empresarial exige.

---

## Prioridad CRÍTICA — sin esto la app se cae con carga real

### 1. Connection pool de base de datos

**Problema actual:** Prisma por defecto abre máximo 10 conexiones a PostgreSQL. Con 1000 usuarios simultáneos → los requests después de los primeros 10 esperan en cola. Si la espera supera `pool_timeout`, el request falla con error 500.

**Fix:**
```
DATABASE_URL="postgresql://...?connection_limit=25&pool_timeout=30"
```
Regla práctica para calcular `connection_limit`: `(RAM_instancia_MB / 25) - reserva_OS`.
Ejemplo: instancia 2GB → ~60 conexiones máx totales, repartidas entre instancias del backend.

**Concepto a entender:** *connection pooling* — cada conexión en PostgreSQL es un proceso del SO (~5-10MB RAM). No se pueden tener conexiones ilimitadas.

---

### 2. Procesamiento de documentos asíncrono (BullMQ + Redis)

**Problema actual:** `POST /api/documents/upload` ejecuta todo en el mismo request HTTP:
```
upload → chunking (sync) → N llamadas a Gemini Embeddings (3-10s c/u) → guardar en DB
```
Un PDF de 50 páginas puede tardar 2-3 minutos. Con 20 usuarios subiendo simultáneamente → el servidor deja de responder a todo lo demás.

**Fix — arquitectura de queue:**
```
POST /upload  →  guarda archivo  →  encola job (BullMQ)  →  responde 202 Accepted
worker.ts     →  procesa job     →  chunking + embeddings → actualiza estado en DB
frontend      →  polling GET /api/documents/:id/status (o WebSocket)
```

**Archivos a crear/modificar:**
- `backend/src/infrastructure/queue/documentQueue.ts` — definición de la queue
- `backend/src/workers/documentWorker.ts` — worker process independiente
- `backend/src/application/use-cases/documents/UploadDocumentUseCase.ts` — encolar en vez de procesar inline
- Agregar campo `processing_status: 'pending' | 'processing' | 'done' | 'error'` en tabla `documents`
- Nuevo endpoint `GET /api/documents/:id/status`

**Dependencias a instalar:** `bullmq`, `ioredis`

**Concepto a entender:** *task queue*, *worker processes*, *backpressure* — el patrón estándar para trabajo pesado asíncrono en Node.js.

---

### 3. Tests de carga como baseline

Sin métricas de baseline, cualquier decisión de infraestructura es ciega. Antes de escalar, medir con **k6** o **Artillery**:
```bash
k6 run --vus 100 --duration 30s load-test.js
```
Métricas clave a observar: p95 latency, error rate, DB connection wait time.

---

## Prioridad ALTA — experiencia degradada sin esto

### 4. Rate limiting distribuido con Redis

**Problema actual:** `@fastify/rate-limit` guarda contadores en memoria del proceso. Con múltiples instancias (PM2 cluster, Docker Swarm, Kubernetes), cada instancia tiene su propio contador → un usuario puede hacer 30×N req/min siendo N el número de instancias.

**Fix:**
```typescript
import Redis from 'ioredis';

server.register(rateLimit, {
  global: false,
  redis: new Redis(process.env.REDIS_URL),
});
```

**Concepto a entender:** *shared state en sistemas distribuidos* — Redis como store compartido entre procesos es el estándar de la industria para rate limiting, sesiones y caché.

---

### 5. Cleanup automático de refresh_tokens

**Problema actual:** cada login agrega una fila. Filas expiradas y revocadas nunca se borran. Con 1000 usuarios → millones de filas en semanas → queries de validación lentas.

**Fix — cron job:**
```sql
DELETE FROM refresh_tokens
WHERE expires_at < NOW() OR revoked_at IS NOT NULL;
```
Implementación: `node-cron` en el worker o un job de BullMQ con `repeat: { cron: '0 3 * * *' }` (3am diario).

Agregar también el índice:
```sql
CREATE INDEX ON refresh_tokens(expires_at);
CREATE INDEX ON refresh_tokens(user_id, revoked_at);
```

---

### 6. Índice HNSW en pgvector

**Problema actual:** la búsqueda cosine en `document_embeddings` es O(n) full-table-scan sin índice vectorial. Con 10,000 documentos × 100 chunks promedio = 1,000,000 vectores → cada query de chat compara contra 1M vectores.

**Fix — migración SQL:**
```sql
CREATE INDEX ON document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```
Reduce la búsqueda de O(n) a O(log n) con pérdida de precisión mínima (>99% recall).

**Concepto a entender:** *Approximate Nearest Neighbor (ANN)* — HNSW vs IVFFlat. HNSW es superior para la mayoría de casos de uso: mejor recall, no requiere entrenamiento previo.

---

### 7. Compresión HTTP

Agregar `@fastify/compress` (gzip/brotli) para respuestas JSON grandes. Un impacto significativo en listas de documentos e historial de conversaciones largas.

```typescript
server.register(require('@fastify/compress'), { global: true });
```

---

## Prioridad MEDIA — calidad operacional

### 8. Validación de variables de entorno al arranque

Si falta `GEMINI_API_KEY` o `DATABASE_URL`, el servidor debe fallar rápido con mensaje claro, no silenciosamente en el primer request de un usuario.

**Fix con `zod`:**
```typescript
// backend/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  GEMINI_API_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```
Si alguna variable falta → `ZodError` en arranque → proceso muere con mensaje legible.

---

### 9. Health check endpoint `/health`

Necesario para load balancers, Kubernetes readiness probes y cualquier monitor de uptime.

```typescript
server.get('/health', async (request, reply) => {
  await prisma.$queryRaw`SELECT 1`; // verifica conexión DB
  return { status: 'ok', db: 'ok', uptime: process.uptime() };
});
```
Diferencia entre `/ping` (¿está el proceso vivo?) y `/health` (¿están todos los servicios dependientes funcionando?).

---

### 10. Logging con correlationId

En producción no hay consola. Cada request debe llevar un ID único (`x-request-id`) para poder trazar un error a través de todos los logs.

Fastify ya genera `reqId` automáticamente — solo hay que añadirlo como header de respuesta y propagarlo al LLMCallbackHandler:
```typescript
server.addHook('onRequest', (request, reply, done) => {
  reply.header('x-request-id', request.id);
  done();
});
```

---

### 11. Endpoint `/me`

Validar token activo en recarga de página sin leer localStorage. Reemplaza la lectura directa de `authContext` al montar la app.

---

## Prioridad BAJA — escala avanzada

### 12. CDN para el frontend

Vite genera nombres de archivo con hash → activos pueden cachearse indefinidamente. Un CDN (Cloudflare, gratis) delante del hosting del SPA reduce drásticamente la latencia para usuarios distribuidos geográficamente y descarga el servidor de servir estáticos.

Headers correctos para activos con hash:
```
Cache-Control: max-age=31536000, immutable
```

### 13. Caché de embeddings

Si un documento se reprocesa o se sube el mismo archivo dos veces, los embeddings se recalculan innecesariamente. Redis como caché con clave = `hash(chunk_text)`.

### 14. Tests unitarios e integración

Jest + Supertest. Prioridad: use cases de auth, guardrails, y el pipeline RAG completo contra una DB de test.

---

## Orden de implementación recomendado

| Paso | Qué implementar | Complejidad | Impacto |
|------|-----------------|-------------|---------|
| 1 | Índice HNSW en pgvector | Baja (1 migración SQL) | Alto |
| 2 | Tune `connection_limit` en `DATABASE_URL` | Baja (1 línea en `.env`) | Crítico |
| 3 | Cron cleanup `refresh_tokens` + índices | Baja | Media |
| 4 | Validación de env vars al arranque (zod) | Baja | Alta |
| 5 | Health check `/health` | Baja | Alta |
| 6 | Compresión HTTP (`@fastify/compress`) | Baja | Media |
| 7 | BullMQ para procesamiento de documentos | Alta (refactor) | Crítico |
| 8 | Redis para rate limiting distribuido | Media | Alta (multi-instancia) |
| 9 | Correlación de logs / observabilidad | Media | Alta |
| 10 | Tests | Alta | Largo plazo |

---

## Recursos para profundizar

| Tema | Recurso |
|------|---------|
| Bases de datos a escala | *Designing Data-Intensive Applications* — Martin Kleppmann |
| Task queues Node.js | Documentación oficial de BullMQ (bullmq.io) |
| Índices vectoriales | pgvector docs: HNSW vs IVFFlat |
| Fastify en producción | fastify.dev/docs/latest/Guides/Recommendations/ |
| Load testing | k6.io — Getting Started |
| Observabilidad | OpenTelemetry + Grafana stack (o Sentry para empezar más simple) |


project_appai_state.md — estado de la sesión 5 y toda la deuda técnica activa
project_production_roadmap.md — el orden de implementación acordado, para no tener que re-derivarlo la próxima sesión
user_profile.md — tu perfil como desarrollador (nivel técnico, que valoras entender los conceptos detrás del código)