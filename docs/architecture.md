# Arquitectura y pipeline RAG

## Arquitectura resumida

```
Browser (React 19) ← http://localhost:5173
        ↓ HTTP/JSON + Bearer JWT          SSE streaming (chat)
Fastify 5 ← http://localhost:3000
    ├── AuthMiddleware      — verifica JWT Bearer → request.user
    ├── RoleGuard           — RBAC (ADMIN / GESTOR / INSTRUCTOR / EMPLEADO)
    ├── RequestContext      — AsyncLocalStorage: correlationId + header x-request-id
    ├── @fastify/compress   — gzip/brotli global (compatible con SSE hijack)
    ├── Rate Limit          — Redis distribuido, 30 req/min por userId en /api/chat y /api/chat/stream
    └── Módulo AI (pipeline RAG):
          InputGuardrail → Embedding (Gemini) → SemanticCache check (pgvector HNSW halfvec ≥ 0.92)
            ↳ HIT: respuesta cacheada como SSE chunk único
            ↳ MISS: VectorSearch HNSW (top 5 chunks) → LLMCallbackHandler [correlationId]
                    → LLM (Gemini 2.5 Flash, historial 10 msgs) → OutputGuardrail
                    → SSE stream + store cache async
                ↓ Prisma ORM
PostgreSQL 16 + pgvector 0.8.2 ← localhost:5432 (Docker)
    ├── 17 modelos (users, roles, conversations, messages, documents,
    │   document_chunks, document_embeddings, ai_queries, audit_logs,
    │   models, llm_models, password_reset_tokens, refresh_tokens, user_roles,
    │   ai_response_cache, ai_cache_stats, ai_job_history)
    ├── ai_response_cache   — semantic cache con HNSW halfvec(3072), TTL 24h
    ├── ai_cache_stats      — contadores hit/miss de caché por día/proveedor/modelo
    ├── ai_job_history      — historial de jobs BullMQ (duración, errores, intentos)
    └── Índices HNSW halfvec(3072) en document_embeddings y ai_response_cache
Redis 7 ← localhost:6379 (Docker)
    ├── BullMQ              — cola asíncrona de procesamiento de documentos (concurrency=2, retry×3)
    └── Rate limiting       — 2 conexiones ioredis separadas (queue / rate-limit)
                ↕
Google Gemini API (externa)              Mailtrap SMTP (externa — dev)
    ├── gemini-embedding-001 (3072 dims)  └── Emails de bienvenida y reset de contraseña
    └── gemini-2.5-flash (LLM)
```

## Pipeline RAG

1. **Ingesta (async)**: PDF subido vía `POST /api/documents/upload` → HTTP 201 inmediato + `status: 'pending'` → BullMQ encola el job → `DocumentWorker` procesa en background: chunking (1000 chars overlap 200) → embeddings Gemini 3072-dim → almacenados en pgvector. Frontend sondea `GET /api/documents/:id/status` cada 3s.
2. **Consulta con semantic cache**: pregunta → embedding → `ISemanticCache.get()` (cosine ≥ 0.92 en `ai_response_cache`) → **HIT**: respuesta inmediata sin LLM / **MISS**: búsqueda coseno HNSW en pgvector (top 5 chunks) → historial de los últimos 10 mensajes → LLM → `ISemanticCache.set()` async → respuesta Markdown
3. **Streaming**: `POST /api/chat/stream` emite Server-Sent Events. El frontend usa una cola de caracteres (`charQueueRef`) con timer adaptativo de 18 ms (4 chars/tick cola pequeña → 12 chars/tick cola grande) para smooth streaming. En HIT de cache: el chunk cacheado se emite como único evento SSE.

> **Rate limiting:** `/api/chat` y `/api/chat/stream` tienen límite de 30 requests/minuto por usuario (JWT userId), respaldado por Redis. Responde 429 si se supera.

> **Refresh Tokens:** Al hacer login se emite un refresh token (64-char hex, 7 días) almacenado en `refresh_tokens`. `POST /api/auth/refresh` rota el par (revoca el viejo, emite uno nuevo). El `apiClient.ts` intercepta automáticamente los 401 y refresca el token sin interrumpir las peticiones en vuelo.

> **Health check:** `GET /health` verifica DB + Redis en paralelo. Responde 200 `{ status: 'ok' }` o 503 `{ status: 'degraded' }` si alguno falla.
