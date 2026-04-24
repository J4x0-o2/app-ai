# AppAi — Contexto para Claude Code

> Este archivo es cargado automáticamente por Claude Code al inicio de cada sesión.
> Contiene el contexto completo del proyecto para no tener que re-derivar el estado desde cero.

---

## Resumen del proyecto

**AppAi** es una plataforma RAG (Retrieval-Augmented Generation) empresarial. Los usuarios suben documentos internos (PDF/TXT) → el sistema hace chunking + embeddings con Gemini → almacena en pgvector → el chat permite hacer preguntas en lenguaje natural respondidas con contexto de esos documentos.

**Stack:** Fastify 5 · TypeScript · Prisma 6 · PostgreSQL 16 + pgvector · React 19 · Vite 7 · LangChain · Google Gemini

---

## Estado actual del proyecto (2026-04-24)

### Completado y funcional
- Auth completa: JWT, RBAC, 4 roles (ADMIN, GESTOR, INSTRUCTOR, EMPLEADO)
- Schema DB: 12 modelos (users, roles, user_roles, conversations, messages, documents, document_chunks, document_embeddings, ai_queries, audit_logs, models, llm_models)
- Pipeline RAG completo: upload PDF → chunking (LangChain, 1000 chars overlap 200) → embeddings (gemini-embedding-001, 3072 dims) → pgvector → query → cosine search (top 5) → Gemini 2.5 Flash → respuesta Markdown
- Frontend: login, chat con sidebar, documentos, usuarios, perfil con foto (crop modal)
- Guardrails (3 capas): InputGuardrail → LLMCallbackHandler → OutputGuardrail
- Respuestas LLM en Markdown (renderizadas con react-markdown)
- Compilación TypeScript: 0 errores

### Deuda técnica pendiente
- Sin refresh tokens
- Sin rate limiting
- Sin tests (unitarios ni integración)
- Sin WebSockets (chat es REST puro, no streaming)
- Procesamiento de documento no es automático: requiere dos pasos separados (upload + process)

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
/documents   → ProtectedRoute > DashboardLayout > DocumentsPage
/users       → ProtectedRoute > DashboardLayout > UsersPage (solo ADMIN en sidebar)
/profile     → ProtectedRoute > DashboardLayout > ProfilePage
*            → redirect /login
```

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

---

## Variables de entorno

### `backend/.env`
```env
DATABASE_URL="postgresql://appuser:supersecurepassword@localhost:5432/appdb?schema=public"
JWT_SECRET="..."
JWT_EXPIRES_IN="1d"
GEMINI_API_KEY="..."
FRONTEND_URL="http://localhost:5173"
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

## Próximas funcionalidades sugeridas (roadmap)

1. **Procesamiento automático al subir**: en `UploadDocumentUseCase`, llamar a `ProcessDocumentForAIUseCase` automáticamente al final del upload
2. **Refresh tokens**: rotating refresh token para evitar re-login frecuente
3. **Rate limiting**: `fastify-rate-limit` en `/api/chat`
4. **WebSocket / SSE**: streaming de respuestas del LLM para mejor UX
5. **Tests**: Jest + Supertest, prioritariamente para use cases y guardrails
6. **Endpoint `/me`**: validar token activo en recarga de página (sin leer localStorage)
