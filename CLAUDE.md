# AppAi — Contexto para Claude Code

> Este archivo es cargado automáticamente por Claude Code al inicio de cada sesión.
> Contiene el contexto completo del proyecto para no tener que re-derivar el estado desde cero.

---

## Resumen del proyecto

**AppAi** es una plataforma RAG (Retrieval-Augmented Generation) empresarial. Los usuarios suben documentos internos (PDF/TXT) → el sistema hace chunking + embeddings con Gemini → almacena en pgvector → el chat permite hacer preguntas en lenguaje natural respondidas con contexto de esos documentos.

**Stack:** Fastify 5 · TypeScript · Prisma 6 · PostgreSQL 16 + pgvector · React 19 · Vite 7 · LangChain · Google Gemini

---

## Estado actual del proyecto (2026-04-29 — sesión 9)

### Completado y funcional
- Auth completa: JWT, RBAC, 4 roles (ADMIN, GESTOR, INSTRUCTOR, EMPLEADO)
- Schema DB: 14 modelos (users, roles, user_roles, conversations, messages, documents, document_chunks, document_embeddings, ai_queries, audit_logs, models, llm_models, password_reset_tokens, **refresh_tokens**) + 2 columnas en users: `must_change_password`, `password_changed_at`
- Pipeline RAG completo: upload PDF → chunking (LangChain, 1000 chars overlap 200) → embeddings (gemini-embedding-001, 3072 dims) → pgvector → query → cosine search (top 5) → Gemini 2.5 Flash → respuesta Markdown
- Frontend: login, chat con sidebar, documentos, usuarios, perfil con foto (crop modal)
- Guardrails (3 capas): InputGuardrail → LLMCallbackHandler → OutputGuardrail
- Respuestas LLM en Markdown (renderizadas con react-markdown)
- **Email service:** `IEmailService` (domain) + `NodemailerEmailService` (infrastructure/email/) usando Mailtrap sandbox. Intercambiable: nueva impl + rewire en `routes/index.ts`.
- **Creación de usuario con contraseña autogenerada:** `CreateUser` genera password aleatoria, la hashea, envía email de bienvenida y la retorna en el response. Al crear, `must_change_password=true`. Modal con rol explícito (placeholder obliga selección, sin default EMPLEADO).
- **Flujo "Olvidé mi contraseña":** token con expiración 24h en tabla `password_reset_tokens`. Endpoints: `POST /api/auth/forgot-password` y `POST /api/auth/reset-password`. Páginas: `/forgot-password` y `/reset-password`.
- **CRUD usuarios completo:** Create, List, Update (`PUT /api/users/:id`), Delete, UpdateProfilePhoto. `UpdateUserUseCase` en `application/use-cases/users/UpdateUserUseCase.ts`. Modal de edición en `UsersPage` con pre-llenado; lápiz visible para ADMIN y GESTOR, basurero solo ADMIN.
- **RBAC corregido (sesión 3):** GESTOR sin acceso a documentos. Permisos separados: `LIST_USERS`, `UPDATE_USER` (ADMIN+GESTOR), `DELETE_USER` (ADMIN). `ProtectedRoute` acepta `allowedRoles` prop; `/documents` → ADMIN+INSTRUCTOR; `/users` → ADMIN+GESTOR. Sidebar: Documentos oculto para GESTOR y EMPLEADO; Usuarios visible para ADMIN y GESTOR.
- **Cambiar contraseña desde perfil:** endpoint `PUT /api/auth/change-password` (requiere JWT). Valida contraseña actual antes de cambiar. Al cambiar: `must_change_password=false`, `password_changed_at=now()`.
- **Banner en ProfilePage:** si `must_change_password=true`, muestra "Te quedan X días para cambiar tu contraseña" con plazo de 7 días desde `created_at`. Colores: amarillo → naranja (≤2 días) → rojo (vencida). Desaparece al cambiar contraseña sin re-login.
- **Login show/hide contraseña:** corregido en `Input.tsx` / `Input.module.css` (background:none, border:none, z-index, padding-right cuando isPassword).
- **TypeScript check correcto frontend:** usar `npx tsc --noEmit -p tsconfig.app.json` (el root tsconfig.json tiene `files:[]` y no chequea nada).
- Compilación TypeScript: 0 errores (backend y frontend)

### Implementado en sesión 3
- **Procesamiento automático de documentos:** `UploadDocumentUseCase` llama a `ProcessDocumentForAIUseCase` automáticamente. Un solo `POST /api/documents/upload` hace upload + chunking + embeddings. Frontend simplificado: un estado `'uploading'`, sin llamada separada a `process`. El endpoint `/ai/process-document` se mantiene para reprocesamiento manual de admin.
- **Rate limiting en `/api/chat`:** `@fastify/rate-limit` registrado con `global: false`. Límite de 30 req/min por usuario (keyGenerator decodifica `userId` del JWT). Respuesta 429 con mensaje en español.

### Implementado en sesión 4
- **Refresh tokens (rotating):** al login se genera un refresh token (64-char hex, 7d expiry) guardado en tabla `refresh_tokens` (migración `20260427172226_add_refresh_tokens`). `POST /api/auth/refresh` rota el par (revoca viejo, emite nuevo). `POST /api/auth/logout` revoca todos los tokens del usuario (requiere JWT). `apiClient.ts` intercepta 401 → auto-refresh con promesa compartida para peticiones concurrentes → si falla, emite `CustomEvent('auth:session-expired')` y el `AuthProvider` hace logout. `LoginForm` pasa el `refreshToken` a `login()`. `Header.handleLogout` es async.
- **SSE streaming chat + historial:** endpoint `POST /api/chat/stream` emite Server-Sent Events. `GeminiAIService.streamAnswer()` usa LangChain `.stream()`. `StreamChatController` usa `reply.hijack()` + headers CORS manuales (el hook `onSend` de `@fastify/cors` no se ejecuta con `reply.raw` — bug corregido). `SendPromptToAI` y `StreamChatUseCase` cargan los últimos 10 mensajes y los inyectan en el prompt de Gemini para mantener contexto entre turnos.
- **Smooth streaming (cola de caracteres):** los chunks del LLM se encolan en `charQueueRef` y un timer de 18 ms los revela a ritmo constante. Velocidad adaptativa: 4 chars/tick (cola < 120) → 12 chars/tick (cola grande). `isLoading` y `streaming: false` se activan cuando la cola llega a 0 Y el HTTP stream terminó. En error/abort la cola se vuelca de golpe. Auto-scroll solo en cambio de número de mensajes (evita jank por re-render en cada tick).

### Implementado en sesión 5
- **Fix crash unhandledRejection en SSE:** `@google/generative-ai` crea internamente una promesa de teardown que rechaza fuera del contexto del `for await`. Aunque `StreamChatController` capturaba el error del iterador, la rejección original escapaba como `unhandledRejection` → Node 25 mataba el proceso. Fix doble: (1) `process.on('unhandledRejection')` en `server.ts` loguea y no crashea; (2) `yield*` en `AskAIQuestionUseCase.executeStream()` envuelto en try/catch para que el usuario vea un mensaje de error en cursiva en vez de que el stream se corte.

### Implementado en sesión 6 (2026-04-29)
- **Índice HNSW en pgvector:** migración `20260429000001_add_hnsw_and_cleanup_indexes`. pgvector HNSW soporta máx 2000 dims para `vector`; 3072 dims requiere cast a `halfvec(3072)`. Índice: `USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops) WITH (m=16, ef_construction=64)`. Query en `PGVectorSearchService` actualizada para usar el mismo cast → el planner usa el índice (O(log n) en vez de O(n)). pgvector instalado: **0.8.2**.
- **Índices de cleanup en refresh_tokens:** misma migración. `idx_refresh_tokens_expires_at` e `idx_refresh_tokens_user_revoked (user_id, revoked_at)` para que el DELETE nocturno no haga full-scan.
- **Cron cleanup refresh_tokens:** `node-cron` en `backend/src/infrastructure/jobs/RefreshTokenCleanupJob.ts`. Corre a las 3AM diarias, borra tokens expirados o revocados. Arranca en `server.ts` después de `server.listen()`.
- **BullMQ para procesamiento asíncrono de documentos:** Redis (docker-compose) + BullMQ. `IDocumentQueue` (domain interface, intercambiable) → `BullMQDocumentQueue` (infrastructure). `DocumentWorker` (concurrency=2, retry x3 exponential) actualiza `processing_status` en DB: `pending → processing → done | error`. `UploadDocumentUseCase` ahora inyecta `IDocumentQueue` en vez de `ProcessDocumentForAIUseCase` → responde inmediatamente, el worker procesa en background. Nuevo endpoint `GET /api/documents/:id/status`. Frontend: polling automático cada 3s mientras haya documentos `pending/processing`; columna "Estado" con badges de color en `DocumentsPage`.
- **`prismaClient.ts` documentado** para connection pool: `?connection_limit=25&pool_timeout=30` en DATABASE_URL cuando se esté listo para producción. Sin cambios de código requeridos.
- **`ProcessingStatus`** (`pending | processing | done | error`) añadido a entidad `Document` y al `DocumentRepository` interface (`updateProcessingStatus`).

### Implementado en sesión 7 (2026-04-29)
- **Validación de env vars con Zod:** `backend/src/config/env.ts` valida todas las variables al arranque. Si falta `DATABASE_URL`, `JWT_SECRET` o `GEMINI_API_KEY` el proceso termina con mensaje claro antes del primer request. `env` exportado se usa en `server.ts` y `routes/index.ts`.
- **Compresión HTTP (`@fastify/compress`):** registrado globalmente en `server.ts` (gzip/brotli). SSE no se ve afectado: `reply.hijack()` omite el hook `onSend` donde compress actúa.
- **Redis rate limiting distribuido:** dos conexiones Redis en `routes/index.ts` — `redisQueue` (`maxRetriesPerRequest: null`, requerido por BullMQ) y `redisRateLimit` (conexión normal para `@fastify/rate-limit`). `@fastify/rate-limit` registrado dentro de `routes` con `redis: redisRateLimit`. Límite 30 req/min por userId aplicado ahora a **ambos** endpoints: `/api/chat` y `/api/chat/stream`. `CHAT_RATE_LIMIT_CONFIG` extraído como constante compartida. Graceful shutdown cierra ambas conexiones.
- **Health check `/health`:** verifica DB (`SELECT 1`) + Redis (`PING`) en paralelo. Responde `200 { status: 'ok', checks: { database, redis } }` o `503 { status: 'degraded' }`. El endpoint `/health/db` se mantiene por compatibilidad.

### Implementado en sesión 8 (2026-04-29)
- **Semantic cache con pgvector:** tabla `ai_response_cache` (migración `20260429000003_add_semantic_cache`) con índice HNSW halfvec para búsqueda coseno. `ISemanticCache` (domain interface, intercambiable) → `PGVectorSemanticCache` (infrastructure). Threshold configurable vía `SEMANTIC_CACHE_THRESHOLD` (default 0.92), TTL vía `SEMANTIC_CACHE_TTL_HOURS` (default 24h). Integrado en `AskAIQuestionUseCase.execute()` y `executeStream()` — check antes del vector search para ahorrar también esa round-trip. En streaming: acumula chunks en loop manual (reemplaza `yield*`) y almacena en cache al completar. Cache hits loguean similarity score. Limpieza diaria 3AM ya incluida en `RefreshTokenCleanupJob`.
- **Zod v4 deprecation fix:** `result.error.flatten()` reemplazado por `result.error.issues.map(...)` en `env.ts`.

### Implementado en sesión 9 (2026-04-29)
- **Diagramas actualizados — AppAi_C4.drawio:**
  - *C4 Contenedores:* Redis 7 como contenedor separado (BullMQ queue + rate limiting, 2 conexiones ioredis)
  - *C4 Componentes Backend:* `BullMQDocumentQueue + DocumentWorker` e `IDocumentQueue` en Infrastructure; `PGVectorSemanticCache` e `ISemanticCache` en Infrastructure/Domain; `PGVectorSearchService` menciona HNSW halfvec(3072); Redis como sistema externo; PostgreSQL menciona `ai_response_cache`; bordes: BullMQ→Redis, BullMQ→PostgreSQL(updateProcessingStatus), SemanticCache→PostgreSQL
  - *C4 AI Pipeline (flujo RAG):* PGVectorSemanticCache dentro del boundary; `ai_response_cache` DB cylinder; flujo renumerado: ②embed → ③check cache → HIT return/MISS ④vector search → ⑤LLM → ⑥store async → ⑦persist msgs
- **Diagramas actualizados — AppAi_UML_Secuencia.drawio:**
  - *Flujo 3:* reescrito completo — participantes actualizados (BullMQ Queue, DocumentWorker, ProcessDocForAI); muestra upload síncrono (HTTP 201 inmediato) + enqueue + worker async (updateProcessingStatus processing→done) + polling frontend cada 3s
  - *Flujo 4 (SSE):* nota amarilla entre executeStream y vector search explicando semantic cache check: embed → ISemanticCache.get() → HIT yield cached (salta pasos 9-12) / MISS continúa → set() async al finalizar

### Deuda técnica pendiente
- Sin tests (unitarios ni integración) — ver sección Testing más abajo
- `npx prisma migrate deploy` pendiente para migración `20260429000003_add_semantic_cache` (requiere Docker corriendo)
- Documentos pre-existentes tienen `processing_status='pending'` — corregir con: `UPDATE documents SET processing_status = 'done' WHERE is_active = true;`
- Logging estructurado con `correlationId` por request (pino + AsyncLocalStorage)
- Endpoint `GET /api/auth/me` para validar token activo en recarga de página (sin leer localStorage)

---

## Arquitectura — Clean Architecture

Las dependencias apuntan siempre hacia adentro: **Interfaces → Application → Domain ← Infrastructure**

```
backend/src/
├── domain/          # Entidades puras, interfaces de repositorios y servicios
├── application/     # Use cases, DTOs, permisos RBAC
├── infrastructure/  # Prisma, JWT, bcrypt, FileStorage, pgvector queries
├── interfaces/      # Controllers Fastify, AuthMiddleware, RoleGuard, routes/index.ts
└── modules/ai/      # Módulo AI auto-contenido (su propia clean arch interna)
    ├── application/usecases/       # ProcessDocumentForAIUseCase, AskAIQuestionUseCase
    ├── application/guardrails/     # InputGuardrail, OutputGuardrail
    ├── infrastructure/langchain/   # GeminiEmbeddingService, GeminiAIService, PGVectorSearchService, RecursiveChunkingService, LLMCallbackHandler
    └── interfaces/controllers/     # AIController
```

**Reglas de arquitectura:**
- Nunca importar Fastify/Prisma desde domain o application
- Los use cases reciben repositorios por constructor (DI manual)
- El wiring completo ocurre en `backend/src/interfaces/routes/index.ts`
- Use cases en `application/use-cases/` (kebab-case) con subcarpetas: `auth/`, `users/`, `chat/`, `documents/`

---

## Módulo de Guardrails (implementado 2026-04-16)

Flujo completo:
```
pregunta usuario
  → [InputGuardrail] valida: longitud, prompt injection, jailbreak (ES+EN)
  → embedding (Gemini)
  → vector search (pgvector, cosine, top 5)
  → [LLMCallbackHandler] observa: latencia, tokens
  → LLM (Gemini 2.5 Flash)
  → [OutputGuardrail] valida: longitud, escape de rol, conocimiento externo
  → respuesta (fallback silencioso si falla OutputGuardrail)
```

Archivos:
- `backend/src/modules/ai/application/guardrails/InputGuardrail.ts`
- `backend/src/modules/ai/application/guardrails/OutputGuardrail.ts`
- `backend/src/modules/ai/infrastructure/langchain/LLMCallbackHandler.ts`

---

## Estructura de carpetas — Frontend

```
vite-project/src/
├── components/auth/ProtectedRoute.tsx
├── components/layout/Header.tsx + Sidebar.tsx
├── components/ui/Button, Input, Modal, Avatar, DropdownMenu
├── features/auth/       # LoginForm
├── features/chat/       # ChatArea, MessageInput, chatService
├── features/documents/  # DocumentItem, documentService
├── features/profile/    # UserSummary
├── features/users/      # UsersPage, CreateUserModal, userService
├── layouts/AuthLayout.tsx + DashboardLayout.tsx
├── pages/LoginPage, ChatPage, DocumentsPage, UsersPage, ProfilePage
├── store/authContext.tsx
└── utils/apiClient.ts
```

**Rutas:**
```
/            → redirect /login
/login       → AuthLayout > LoginPage > LoginForm
/chat        → ProtectedRoute > DashboardLayout > ChatPage > ChatArea
/chat/:id    → ProtectedRoute > DashboardLayout > ChatPage > ChatArea (historial)
/documents   → ProtectedRoute allowedRoles=[ADMIN,INSTRUCTOR] > DashboardLayout > DocumentsPage
/users       → ProtectedRoute allowedRoles=[ADMIN,GESTOR] > DashboardLayout > UsersPage
/profile     → ProtectedRoute > DashboardLayout > ProfilePage
*            → redirect /login
```

**ProtectedRoute:** acepta prop opcional `allowedRoles?: string[]`. Si el rol del usuario no está en la lista, redirige a `/chat`.

---

## Base de datos — Detalles importantes

- **Soft delete en documents**: `DELETE /api/documents/:id` setea `is_active=false`, `deleted_at`, `deleted_by`. El archivo físico permanece en `storage/documents/`.
- **Cascade delete en conversaciones**: borrar conversation elimina sus messages (FK CASCADE).
- **Cascade delete en documentos**: borrar document elimina document_chunks y document_embeddings.
- **pgvector**: extensión `vector` habilitada en PostgreSQL. Columna `document_embeddings.embedding` es `vector(3072)`.
- **profile_image**: guardado como base64 TEXT en la BD (no URL).
- **Transacción atómica**: cada chunk + su embedding se insertan en `$transaction` de Prisma para evitar estados inconsistentes.

### Migraciones existentes
1. `20260312191154_init_rag_schema` — Schema inicial completo
2. `20260324000000_update_embedding_dimensions` — Cambio `vector(768)` → `vector(3072)`
3. `add_phone_to_users` — Campo `phone VARCHAR(20)` en users
4. `profile_image_text` — `profile_image` de VARCHAR(512) a TEXT
5. `20260424164028_add_password_reset_tokens` — Tabla `password_reset_tokens` (token, user_id, expires_at, used_at)
6. `20260424183351_add_password_change_tracking` — `must_change_password BOOLEAN DEFAULT false` y `password_changed_at TIMESTAMPTZ NULL` en users
7. `20260427172226_add_refresh_tokens` — Tabla `refresh_tokens` (token, user_id, expires_at, revoked_at, created_at)
8. `20260429000001_add_hnsw_and_cleanup_indexes` — Índice HNSW halfvec en `document_embeddings.embedding` + índices de cleanup en `refresh_tokens`
9. `20260429000002_add_document_processing_status` — Columna `processing_status VARCHAR(20) DEFAULT 'pending'` en `documents`

---

## Variables de entorno

### `backend/.env`
```env
DATABASE_URL="postgresql://appuser:supersecurepassword@localhost:5432/appdb?schema=public"
# Para producción añadir: ?connection_limit=25&pool_timeout=30  (sin cambiar código)
JWT_SECRET="..."
JWT_EXPIRES_IN="1d"
GEMINI_API_KEY="..."
FRONTEND_URL="http://localhost:5173"
REDIS_URL="redis://localhost:6379"
```

### `vite-project/.env`
```env
VITE_API_URL=http://localhost:3000
```

---

## Docker (vite-project/docker-compose.yml)

```yaml
postgres:
  image: pgvector/pgvector:pg16
  container_name: rag_postgres
  ports: ["5432:5432"]
  env: POSTGRES_USER=appuser, POSTGRES_PASSWORD=supersecurepassword, POSTGRES_DB=appdb

pgadmin:
  image: dpage/pgadmin4
  container_name: app_pgadmin
  ports: ["5050:80"]
  env: admin@admin.com / admin123

redis:
  image: redis:7-alpine
  container_name: app_redis
  ports: ["6379:6379"]
  volumes: redis_data:/data
  command: redis-server --appendonly yes
```

Para conectar pgAdmin a PostgreSQL internamente: host = `rag_postgres` (nombre del contenedor en la red `app_network`).

---

## Comandos de desarrollo

```bash
# Base de datos
cd vite-project && docker compose up -d

# Backend
cd backend && npx tsx watch src/server.ts

# Frontend
cd vite-project && npm run dev
```

Scripts de Prisma:
```bash
npx prisma migrate deploy   # aplica migraciones
npx prisma generate         # regenera cliente
npx prisma studio           # GUI en localhost:5555
```

---

## Decisiones técnicas clave

| Decisión | Razón |
|----------|-------|
| `gemini-embedding-001` 3072 dims | Mayor calidad semántica vs `text-embedding-004` 768 dims |
| Transacción atómica chunk+embedding | Sin ella, un fallo de embedding deja chunks huérfanos |
| `CustomEvent('conversation-created')` | Comunicación entre Sidebar y ChatArea sin levantar estado al padre |
| Soft delete en documentos | Cumplimiento: los documentos eliminados no desaparecen físicamente |
| DI manual en `routes/index.ts` | Visibilidad total del wiring; apropiado para el tamaño actual |
| Módulo AI auto-contenido en `/modules/ai/` | Permite sustituir Gemini sin tocar el core de la app |
| Guardrails en capa Application | No en Infrastructure: son reglas de negocio, no detalles técnicos |
| `profile_image` como base64 TEXT | Sin servidor de archivos estáticos para imágenes; simple para el MVP |
| `react-markdown` en ChatArea | Solo para mensajes `role === 'assistant'`; el texto del usuario es plano |
| HNSW con cast `halfvec(3072)` | pgvector HNSW soporta máx 2000 dims para `vector`; halfvec llega a 4000. Cast en index y query, sin cambiar tipo de columna |
| `IDocumentQueue` en domain | BullMQ es un detalle de infra. Cambiar a SQS/RabbitMQ = nueva clase + 2 líneas en routes/index.ts |
| Worker en mismo proceso (dev) | En producción separar con `npx tsx src/worker.ts`. En dev corre en el mismo proceso iniciado desde routes/index.ts |
| Connection pool vía DATABASE_URL | Sin cambio de código: `?connection_limit=25&pool_timeout=30`. Documentado en prismaClient.ts |

---

## Patrones aplicados

**Backend:** Clean Architecture, Repository Pattern, Use Case Pattern (SRP), Provider Pattern (AuthProvider), DI manual, Observer (LLMCallbackHandler), Chain of Responsibility (guardrails)

**Frontend:** Feature-based structure, Context API (AuthContext), Service Layer (chatService, documentService, userService), Custom Events, CSS Modules

---

## Convenciones de código

**Backend:**
- Archivos de clases: `PascalCase.ts`
- Use cases: un archivo = un caso de uso, en `application/use-cases/{dominio}/`
- Errores: `ApplicationError` con `code` en SCREAMING_SNAKE_CASE
- Raw queries: solo para operaciones pgvector (`$executeRaw`, `$queryRaw`)
- Logs: prefijo `[AI Ingestion]`, `[AI Query]` para trazabilidad

**Frontend:**
- Componentes: `PascalCase.tsx` + `PascalCase.module.css`
- Servicios: `camelCase.ts` en `features/<domain>/services/`
- CSS variables en `:root` (design tokens): `--color-primary`, `--radius-md`, etc.

---

## Módulo de Email (implementado 2026-04-24)

**Proveedor actual:** Nodemailer + Mailtrap sandbox (desarrollo). Variables en `backend/.env`.

**Para cambiar proveedor:** crear nueva clase implementando `IEmailService` → cambiar wiring en `routes/index.ts`. El dominio y los use cases no se tocan.

Archivos:
- `backend/src/domain/services/IEmailService.ts` — interfaz
- `backend/src/infrastructure/email/NodemailerEmailService.ts` — implementación con templates HTML

## Flujo "Cambiar contraseña" desde perfil (implementado 2026-04-24)

```
usuario autenticado → PUT /api/auth/change-password { currentPassword, newPassword }
  → AuthMiddleware valida JWT → obtiene userId
  → ChangePasswordUseCase:
      → findPasswordHash(userId) → verifica currentPassword con bcrypt
      → hashea newPassword
      → updatePassword(userId, newHash) → sets must_change_password=false, password_changed_at=now()
  → 200 OK
```

Frontend: `ProfilePage.tsx` muestra formulario con 3 campos (actual, nueva, confirmar) + toggle ver/ocultar.
Al éxito: `clearMustChangePassword()` en authContext actualiza localStorage sin re-login.
Banner desaparece inmediatamente.

Archivos:
- `backend/src/application/use-cases/auth/ChangePasswordUseCase.ts`
- `backend/src/interfaces/controllers/auth/ChangePasswordController.ts`

---

## Flujo "Olvidé mi contraseña" (implementado 2026-04-24)

```
usuario → POST /api/auth/forgot-password (email)
  → busca usuario (silencioso si no existe)
  → genera token aleatorio 64-char hex, expira en 24h
  → guarda en password_reset_tokens
  → envía email con link: FRONTEND_URL/reset-password?token=xxx

usuario → /reset-password?token=xxx
  → POST /api/auth/reset-password (token, password)
  → valida token (existe, no expirado, no usado)
  → hashea nueva contraseña → actualiza users.password_hash
  → marca token como usado
```

Archivos nuevos:
- `backend/src/domain/entities/PasswordResetToken.ts`
- `backend/src/domain/repositories/IPasswordResetTokenRepository.ts`
- `backend/src/infrastructure/repositories/PrismaPasswordResetTokenRepository.ts`
- `backend/src/application/use-cases/auth/RequestPasswordResetUseCase.ts`
- `backend/src/application/use-cases/auth/ResetPasswordUseCase.ts`
- `backend/src/interfaces/controllers/auth/PasswordResetController.ts`
- `vite-project/src/features/auth/services/authService.ts`
- `vite-project/src/pages/ForgotPasswordPage.tsx`
- `vite-project/src/pages/ResetPasswordPage.tsx`

## Archivos clave sesión 4 (refresh tokens + SSE + smooth streaming)

**Nuevos — Backend:**
- `backend/src/domain/entities/RefreshToken.ts`
- `backend/src/domain/repositories/IRefreshTokenRepository.ts`
- `backend/src/infrastructure/repositories/PrismaRefreshTokenRepository.ts`
- `backend/src/application/use-cases/auth/RefreshTokenUseCase.ts`
- `backend/src/interfaces/controllers/auth/RefreshTokenController.ts`
- `backend/src/application/use-cases/chat/StreamChatUseCase.ts`
- `backend/src/interfaces/controllers/StreamChatController.ts`

**Modificados — Backend:**
- `backend/prisma/schema.prisma` — modelo `refresh_tokens` + relación en `users`
- `backend/src/application/dto/AuthDTO.ts` — `refreshToken` en `LoginResponse`
- `backend/src/infrastructure/auth/DatabaseAuthProvider.ts` — genera refresh token al login
- `backend/src/modules/ai/domain/services/AIService.ts` — `ChatMessage` type + `streamAnswer()`
- `backend/src/modules/ai/infrastructure/langchain/GeminiAIService.ts` — `buildPrompt()` con historial + `streamAnswer()`
- `backend/src/modules/ai/application/usecases/AskAIQuestionUseCase.ts` — acepta `history`, agrega `executeStream()`
- `backend/src/application/use-cases/chat/SendPromptToAI.ts` — inyecta historial en el prompt
- `backend/src/interfaces/routes/index.ts` — wiring de nuevos use cases + rutas `/refresh`, `/logout`, `/chat/stream`

**Modificados — Frontend:**
- `vite-project/src/utils/apiClient.ts` — `refreshTokenStorage` + interceptor 401 → auto-refresh → `auth:session-expired`
- `vite-project/src/store/authContext.tsx` — almacena refresh token, escucha `auth:session-expired`, logout llama servidor
- `vite-project/src/features/auth/components/LoginForm.tsx` — pasa `refreshToken` a `login()`
- `vite-project/src/components/layout/Header.tsx` — `handleLogout` async
- `vite-project/src/features/chat/services/chatService.ts` — `streamMessage()` con `fetch` + `ReadableStream`
- `vite-project/src/features/chat/components/ChatArea.tsx` — cola `charQueueRef` + timer adaptativo (4/12 chars por tick)
- `vite-project/src/features/chat/components/ChatArea.module.css` — animación `.cursor`

**Bug corregido — CORS en SSE:** `@fastify/cors` inyecta headers en el hook `onSend`, que no se ejecuta al usar `reply.raw`. Fix: `reply.hijack()` + `Access-Control-Allow-Origin` / `Access-Control-Allow-Credentials` manuales en `StreamChatController`.

---

## Módulo de Queue — BullMQ + Redis (implementado sesión 6)

**Arquitectura intercambiable:** `IDocumentQueue` en domain — para cambiar de BullMQ a otro provider basta crear una nueva clase que implemente la interfaz y actualizar el wiring en `routes/index.ts`.

```
POST /api/documents/upload (~200ms)
  → UploadDocumentUseCase
      → guarda archivo en storage/
      → crea documento en DB (processing_status = 'pending')
      → IDocumentQueue.enqueue({ documentId, storagePath })
      → responde 201 inmediatamente

[Redis Queue]
      ↓
DocumentWorker (concurrency=2, retry x3 exponential)
  → updateProcessingStatus('processing')
  → ProcessDocumentForAIUseCase (chunking + embeddings)
  → updateProcessingStatus('done') | updateProcessingStatus('error')

GET /api/documents/:id/status → { id, status }
Frontend → polling cada 3s mientras haya pending/processing
```

Archivos nuevos:
- `backend/src/domain/services/IDocumentQueue.ts` — interfaz (`enqueue`, `close`)
- `backend/src/infrastructure/queue/BullMQDocumentQueue.ts` — implementación
- `backend/src/infrastructure/workers/DocumentWorker.ts` — worker (`createDocumentWorker`)
- `backend/src/interfaces/controllers/documents/GetDocumentStatusController.ts`

Archivos modificados:
- `backend/src/domain/entities/Document.ts` — `ProcessingStatus` type + campo `processingStatus`
- `backend/src/domain/repositories/DocumentRepository.ts` — `updateProcessingStatus()`
- `backend/src/infrastructure/repositories/PrismaDocumentRepository.ts` — implementa `updateProcessingStatus`, mapea `processing_status`
- `backend/src/infrastructure/database/prismaClient.ts` — comentado con instrucciones de pool
- `backend/src/application/use-cases/documents/UploadDocumentUseCase.ts` — inyecta `IDocumentQueue`
- `backend/src/interfaces/routes/index.ts` — wiring Redis + BullMQ + worker + hook onClose
- `vite-project/src/features/documents/services/documentService.ts` — `ProcessingStatus` type + `getStatus()`
- `vite-project/src/pages/DocumentsPage.tsx` — polling + columna Estado + `StatusBadge`

---

## Próximas funcionalidades sugeridas (roadmap)

1. ~~**Procesamiento automático al subir**~~ ✅ Implementado sesión 3
2. ~~**Refresh tokens**~~ ✅ Implementado sesión 4
3. ~~**Rate limiting**~~ ✅ Implementado sesión 3
4. ~~**SSE streaming chat**~~ ✅ Implementado sesión 4
5. ~~**Fix crash unhandledRejection SSE**~~ ✅ Implementado sesión 5
6. ~~**Índice HNSW pgvector**~~ ✅ Implementado sesión 6 (halfvec cast para 3072 dims)
7. ~~**Cron cleanup refresh_tokens**~~ ✅ Implementado sesión 6
8. ~~**BullMQ procesamiento asíncrono de documentos**~~ ✅ Implementado sesión 6
9. ~~**Validación env vars al arranque (zod)**~~ ✅ Implementado sesión 7
10. ~~**Health check `/health`**~~ ✅ Implementado sesión 7 (DB + Redis)
11. ~~**Compresión HTTP (`@fastify/compress`)**~~ ✅ Implementado sesión 7
12. ~~**Redis rate limiting distribuido**~~ ✅ Implementado sesión 7 (ambos endpoints chat)
13. ~~**Semantic cache con pgvector**~~ ✅ Implementado sesión 8 (ISemanticCache + PGVectorSemanticCache, HNSW halfvec, TTL 24h, cleanup 3AM)
14. ~~**Diagramas actualizados**~~ ✅ Sesión 9 (C4 + UML Secuencia reflejan sesiones 6-9)
15. **Endpoint `GET /api/auth/me`**: validar token activo en recarga de página (sin leer localStorage)
16. **Logging con correlationId**: pino + AsyncLocalStorage, necesario para trazabilidad en producción
17. **Tests Jest + Supertest**: prioritariamente use cases (cache HIT/MISS, guardrails) y endpoints de integración

## Roadmap hacia producción empresarial (miles de usuarios)

Ver análisis completo en la conversación de sesión 5. Prioridades ordenadas:

### Prioridad CRÍTICA (sin esto, la app se cae con carga real)
- **Connection pool tuneado:** ✅ Arquitectura lista (documentado en prismaClient.ts). Cuando se tenga servidor de producción: `DATABASE_URL?connection_limit=XX&pool_timeout=30`. XX = (RAM_instancia / 25MB) regla general.
- ~~**Procesamiento de documentos asíncrono:**~~ ✅ Implementado sesión 6 con BullMQ + Redis.
- ~~**Índice HNSW en pgvector:**~~ ✅ Implementado sesión 6 (halfvec cast).
- **Tests de carga antes de escalar:** sin métricas de baseline (k6 o Artillery), cualquier decisión de infraestructura es ciega.

### Prioridad ALTA (experiencia degradada sin esto)
- ~~**Redis para rate limiting distribuido:**~~ ✅ Implementado sesión 7. Dos conexiones Redis (separadas para BullMQ y rate-limit). `/api/chat` y `/api/chat/stream` limitados.
- ~~**Cleanup automático de refresh_tokens:**~~ ✅ Implementado sesión 6 (node-cron, 3AM diario).
- ~~**Compresión HTTP:**~~ ✅ Implementado sesión 7 (`@fastify/compress` global).
- ~~**Semantic cache:**~~ ✅ Implementado sesión 8 con pgvector (HNSW halfvec, threshold 0.92, TTL 24h). Reduce llamadas a Gemini en preguntas repetitivas.

### Prioridad MEDIA (calidad operacional)
- ~~**Variables de entorno validadas al arranque:**~~ ✅ Implementado sesión 7 (`env.ts` con Zod, `process.exit(1)` si inválido).
- ~~**Health check endpoint `/health`:**~~ ✅ Implementado sesión 7 (DB + Redis, `503` si degradado).
- **Logging estructurado de errores:** añadir `correlationId` en requests para poder trazar errores en producción.
- **Endpoint `/me`**: validar token activo en recarga de página (sin leer localStorage).
- **Tests unitarios/integración**: Jest + Supertest, prioritariamente use cases y guardrails.

### Prioridad BAJA (nice-to-have para escala)
- **CDN para archivos estáticos del frontend:** separar el hosting del backend del serving del SPA.
- **Caché de embeddings:** si el mismo documento se reprocesa, reusar embeddings existentes.
- **WebSockets en lugar de SSE:** para soporte bidireccional real y reconexión automática.

---

## Testing — Estrategia (sesión 9)

### Setup
```bash
cd backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

`jest.config.ts`:
```ts
export default { preset: 'ts-jest', testEnvironment: 'node' };
```

### Orden recomendado de escritura

**1. Use cases unitarios** — todo mockeado, sin DB ni Gemini:
```ts
// AskAIQuestionUseCase — cache HIT no llama LLM
const mockCache = { get: jest.fn().mockResolvedValue({ response: 'cached', similarity: 0.95 }), set: jest.fn() };
const uc = new AskAIQuestionUseCase(mockEmbed, mockSearch, mockLLM, mockCache);
expect(mockLLM.generateResponse).not.toHaveBeenCalled();

// AskAIQuestionUseCase — cache MISS llama LLM y guarda en cache
// InputGuardrail — rechaza prompt injection y jailbreak
// OutputGuardrail — rechaza respuestas que escapan el rol
```

**2. Integración con Supertest** — contra Docker real (no mockear la DB):
```ts
// GET /health → 200 { status: 'ok' }
// POST /api/auth/login con credenciales válidas → 200 con token
// POST /api/auth/login con credenciales inválidas → 401
// POST /api/chat sin JWT → 401
// POST /api/chat (mensajes 1-30) → 200; mensaje 31 → 429
// GET /api/documents/:id/status → 200 con status
```

**Regla:** no mockear la DB en tests de integración — usar el PostgreSQL de Docker real. Mocks de DB ocultan bugs de migración.
