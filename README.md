# AppAi — Plataforma RAG Empresarial

Plataforma de consulta de documentos internos mediante IA generativa. Los usuarios suben documentos (PDF/TXT), el sistema los procesa con embeddings (Google Gemini → pgvector), y el chat responde preguntas usando los documentos como contexto (RAG).

**Stack:** Fastify 5 · TypeScript · Prisma 6 · PostgreSQL 16 + pgvector · React 19 · Vite 7 · LangChain · Google Gemini

---

## Estructura del repositorio

```
AppAi/
├── backend/               # API REST — Fastify 5 + TypeScript + Prisma
│   ├── prisma/            # Schema y migraciones
│   ├── src/               # Clean Architecture (domain/application/infrastructure/interfaces)
│   └── storage/documents/ # Archivos subidos por los usuarios
├── vite-project/          # Frontend React 19 + Vite 7
│   └── docker-compose.yml # PostgreSQL (pgvector) + pgAdmin
└── diagrams/              # Diagramas de arquitectura (.drawio)
```

---

## Configuración en Arch Linux

### 1. Dependencias del sistema

```bash
sudo pacman -Syu
sudo pacman -S git nodejs npm docker docker-compose base-devel python
```

> `base-devel` y `python` son necesarios para compilar `bcrypt` (módulo nativo vía `node-gyp`).
> Arch incluye Node.js v22+. Fastify 5 requiere Node.js >= 20.

Verificar versiones instaladas:

```bash
node --version     # debe ser >= 20.0.0
npm --version      # debe ser >= 9.0.0
docker --version
docker compose version
```

### 2. Configurar Docker

```bash
# Habilitar e iniciar el demonio Docker al arranque
sudo systemctl enable --now docker

# Agregar tu usuario al grupo docker (evita sudo en cada comando)
sudo usermod -aG docker $USER

# Aplicar el cambio de grupo sin cerrar sesión
newgrp docker
```

Verificar que Docker funciona sin sudo:

```bash
docker ps
```

### 3. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd AppAi
```

---

## Levantar la base de datos

El `docker-compose.yml` está en `vite-project/`. Levanta PostgreSQL 16 con pgvector y pgAdmin.

```bash
cd vite-project
docker compose up -d
```

Servicios disponibles:

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| PostgreSQL | `localhost:5432` | user: `appuser` / pass: `supersecurepassword` / db: `appdb` |
| Redis 7 | `localhost:6379` | sin contraseña (dev) |
| pgAdmin | `http://localhost:5050` | `admin@admin.com` / `admin123` |

Para conectar pgAdmin a la base de datos desde la UI:
- **Host**: `rag_postgres` (nombre del contenedor en la red Docker interna)
- **Puerto**: `5432`
- **Usuario**: `appuser`
- **Contraseña**: `supersecurepassword`
- **Base de datos**: `appdb`

Comandos útiles:

```bash
docker compose ps           # estado de los contenedores
docker compose stop         # detener sin borrar datos
docker compose down         # detener y eliminar contenedores (volumen persistente)
docker compose down -v      # PELIGRO: borra volumen y todos los datos
docker compose logs -f postgres   # ver logs de PostgreSQL
```

---

## Backend

### Variables de entorno

Crear el archivo `backend/.env`:

```env
DATABASE_URL="postgresql://appuser:supersecurepassword@localhost:5432/appdb?schema=public"
# En producción añadir: ?connection_limit=25&pool_timeout=30

JWT_SECRET="cambia_esto_por_un_secreto_seguro_y_largo"
JWT_EXPIRES_IN="1d"

GEMINI_API_KEY="tu_api_key_de_google_ai_studio"

FRONTEND_URL="http://localhost:5173"
REDIS_URL="redis://localhost:6379"

# Semantic cache (opcionales — defaults razonables)
SEMANTIC_CACHE_THRESHOLD=0.92   # similitud coseno mínima para cache hit (0–1)
SEMANTIC_CACHE_TTL_HOURS=24     # tiempo de vida de entradas del cache

# Email (Mailtrap sandbox — desarrollo)
SMTP_HOST="sandbox.smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="tu_smtp_user_de_mailtrap"
SMTP_PASS="tu_smtp_pass_de_mailtrap"
SMTP_FROM="noreply@appai.local"
```

> Obtén tu `GEMINI_API_KEY` en [Google AI Studio](https://aistudio.google.com/). El modelo de embeddings usa `gemini-embedding-001` (vectores de 3072 dimensiones) y el LLM usa `gemini-2.5-flash`.

> Para el email, crea una cuenta en [Mailtrap](https://mailtrap.io/) y usa las credenciales SMTP del inbox sandbox. Los emails (bienvenida, reset de contraseña) se capturan ahí sin enviarlos realmente.

### Instalar dependencias

```bash
cd backend
npm install
```

> `bcrypt` compila binarios nativos durante la instalación. Si falla, asegúrate de tener `base-devel` y `python` instalados (`sudo pacman -S base-devel python`), luego borra `node_modules` y vuelve a instalar.

### Inicializar la base de datos

```bash
# Aplicar todas las migraciones (crea las tablas en PostgreSQL)
npx prisma migrate deploy

# Regenerar el cliente Prisma (hacer siempre que cambie schema.prisma)
npx prisma generate
```

> Si `migrate deploy` falla con error de conexión, verifica que el contenedor Docker esté corriendo: `docker compose ps`

### Servidor de desarrollo

```bash
npx tsx watch src/server.ts
```

Disponible en `http://localhost:3000`. Verificar que funciona:

```bash
curl http://localhost:3000/health/db
# Respuesta esperada: {"status":"ok"}
```

### Scripts y comandos del backend

| Comando | Descripción |
|---------|-------------|
| `npx tsx watch src/server.ts` | Servidor con hot-reload (desarrollo) |
| `npx prisma migrate deploy` | Aplica migraciones pendientes a la BD |
| `npx prisma migrate dev --name <nombre>` | Crea y aplica una nueva migración (dev) |
| `npx prisma generate` | Regenera el cliente Prisma |
| `npx prisma studio` | GUI visual de la BD en `http://localhost:5555` |
| `npx prisma db push` | Sincroniza schema sin crear migración (solo dev) |

---

## Frontend

```bash
cd vite-project
npm install
npm run dev
```

Disponible en `http://localhost:5173`.

### Variable de entorno (opcional)

Por defecto el frontend usa `http://localhost:3000`. Si cambias el puerto del backend, crea `vite-project/.env`:

```env
VITE_API_URL=http://localhost:3000
```

### Scripts del frontend

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor Vite con HMR (desarrollo) |
| `npm run build` | Build de producción en `dist/` |
| `npm run lint` | ESLint sobre todos los archivos |
| `npm run preview` | Previsualizar el build de producción |

---

## Flujo completo de inicio

Necesitas tres terminales:

```bash
# Terminal 1 — Base de datos
cd AppAi/vite-project && docker compose up -d

# Terminal 2 — Backend (esperar a que la BD esté lista)
cd AppAi/backend && npx tsx watch src/server.ts

# Terminal 3 — Frontend
cd AppAi/vite-project && npm run dev
```

Acceder a la aplicación: `http://localhost:5173`

---

## Solución de problemas en Arch Linux

### `bcrypt` falla al compilar

```bash
sudo pacman -S base-devel python
cd backend && rm -rf node_modules && npm install
```

### Error de OpenSSL con Prisma

Arch usa OpenSSL 3. En caso de errores:

```bash
sudo pacman -S openssl
npx prisma generate   # fuerza regeneración de binarios
```

### `permission denied` con Docker

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### `ECONNREFUSED localhost:5432`

El contenedor de PostgreSQL no está corriendo:

```bash
cd vite-project && docker compose up -d
docker compose ps   # verificar estado
```

### Puerto ya en uso

```bash
ss -tlnp | grep :3000    # ver qué proceso usa el puerto 3000
ss -tlnp | grep :5173    # ver qué proceso usa el puerto 5173
kill -9 <PID>
```

### Prisma `P1001: Can't reach database server`

1. Verificar que el contenedor Docker esté arriba: `docker compose ps`
2. Verificar la cadena de conexión en `backend/.env`
3. Confirmar que `localhost:5432` es accesible: `nc -zv localhost 5432`

---

## Arquitectura resumida

```
Browser (React 19) ← http://localhost:5173
        ↓ HTTP/JSON + Bearer JWT          SSE streaming (chat)
Fastify 5 ← http://localhost:3000
    ├── AuthMiddleware (JWT + Refresh Tokens rotativos)
    ├── RoleGuard (RBAC: ADMIN / GESTOR / INSTRUCTOR / EMPLEADO)
    ├── @fastify/compress (gzip/brotli global)
    ├── Rate Limit distribuido (Redis, 30 req/min en /api/chat y /api/chat/stream)
    └── Módulo AI (pipeline RAG):
          InputGuardrail → Embedding (Gemini) → SemanticCache check (pgvector HNSW)
          → [MISS] VectorSearch (pgvector HNSW halfvec) → LLMCallbackHandler
          → LLM (Gemini 2.5 Flash) → OutputGuardrail → store cache async
          → SSE stream (POST /api/chat/stream) con historial de 10 mensajes
                ↓ Prisma ORM
PostgreSQL 16 + pgvector 0.8.2 ← localhost:5432 (Docker)
    ├── 14 modelos + ai_response_cache (semantic cache HNSW halfvec TTL 24h)
    └── Índice HNSW halfvec(3072) en document_embeddings y ai_response_cache
Redis 7 ← localhost:6379 (Docker)
    ├── BullMQ: cola asíncrona de procesamiento de documentos
    └── Rate limiting distribuido (2 conexiones ioredis separadas)
                ↕
Google Gemini API (externa)              Mailtrap SMTP (externa)
    ├── gemini-embedding-001 (3072 dims)  └── Welcome emails
    └── gemini-2.5-flash (LLM)               Reset de contraseña
```

## Pipeline RAG

1. **Ingesta (async)**: PDF subido vía `POST /api/documents/upload` → HTTP 201 inmediato + `status: 'pending'` → BullMQ encola el job → `DocumentWorker` procesa en background: chunking (1000 chars overlap 200) → embeddings Gemini 3072-dim → almacenados en pgvector. Frontend sondea `GET /api/documents/:id/status` cada 3s.
2. **Consulta con semantic cache**: pregunta → embedding → `ISemanticCache.get()` (cosine ≥ 0.92 en `ai_response_cache`) → **HIT**: respuesta inmediata sin LLM / **MISS**: búsqueda coseno HNSW en pgvector (top 5 chunks) → historial de los últimos 10 mensajes → LLM → `ISemanticCache.set()` async → respuesta Markdown
3. **Streaming**: `POST /api/chat/stream` emite Server-Sent Events. El frontend usa una cola de caracteres (`charQueueRef`) con timer adaptativo de 18 ms (4 chars/tick cola pequeña → 12 chars/tick cola grande) para smooth streaming. En HIT de cache: el chunk cacheado se emite como único evento SSE.

> **Rate limiting:** `/api/chat` y `/api/chat/stream` tienen límite de 30 requests/minuto por usuario (JWT userId), respaldado por Redis. Responde 429 si se supera.

> **Refresh Tokens:** Al hacer login se emite un refresh token (64-char hex, 7 días) almacenado en `refresh_tokens`. `POST /api/auth/refresh` rota el par (revoca el viejo, emite uno nuevo). El `apiClient.ts` intercepta automáticamente los 401 y refresca el token sin interrumpir las peticiones en vuelo.

> **Health check:** `GET /health` verifica DB + Redis en paralelo. Responde 200 `{ status: 'ok' }` o 503 `{ status: 'degraded' }` si alguno falla.

## RBAC — Roles y permisos

| Rol | CREATE_USER | LIST_USER | UPDATE_USER | DELETE_USER | UPLOAD_DOC | LIST_DOC | DELETE_DOC | DOWNLOAD_DOC | CHAT | VER DOCS | VER USUARIOS |
|-----|:-----------:|:---------:|:-----------:|:-----------:|:----------:|:--------:|:----------:|:------------:|:----:|:--------:|:------------:|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GESTOR` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| `INSTRUCTOR` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `EMPLEADO` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login → devuelve JWT + refreshToken + usuario |
| `POST` | `/api/auth/refresh` | Rotar refresh token → emite nuevo par JWT + refreshToken |
| `POST` | `/api/auth/logout` | Revocar todos los refresh tokens del usuario (requiere JWT) |
| `POST` | `/api/auth/forgot-password` | Solicitar reset de contraseña por email |
| `POST` | `/api/auth/reset-password` | Resetear contraseña con token (24h de validez) |
| `PUT` | `/api/auth/change-password` | Cambiar contraseña (requiere JWT + contraseña actual) |
| `POST` | `/api/users` | Crear usuario con contraseña autogenerada (ADMIN/GESTOR) |
| `GET` | `/api/users` | Listar usuarios (ADMIN/GESTOR) |
| `PUT` | `/api/users/:id` | Editar usuario (ADMIN/GESTOR) |
| `DELETE` | `/api/users/:id` | Desactivar usuario (ADMIN) |
| `PATCH` | `/api/users/:id/photo` | Actualizar foto de perfil |
| `POST` | `/api/documents/upload` | Subir documento → HTTP 201 inmediato + BullMQ async indexing (ADMIN/INSTRUCTOR) |
| `GET` | `/api/documents` | Listar documentos activos (ADMIN/GESTOR/INSTRUCTOR) |
| `GET` | `/api/documents/:id/status` | Estado de procesamiento: `pending \| processing \| done \| error` |
| `DELETE` | `/api/documents/:id` | Soft delete de documento (ADMIN/INSTRUCTOR) |
| `POST` | `/ai/process-document` | Reprocesar doc manualmente: chunking + embeddings → pgvector |
| `POST` | `/api/chat` | Enviar prompt → respuesta RAG completa con semantic cache (todos los roles) |
| `POST` | `/api/chat/stream` | Enviar prompt → respuesta RAG vía SSE streaming con semantic cache (todos los roles) |
| `GET` | `/api/conversations` | Listar conversaciones del usuario |
| `DELETE` | `/api/conversations/:id` | Eliminar conversación |
| `GET` | `/health` | Health check DB + Redis (200 ok / 503 degraded) |
| `GET` | `/health/db` | Health check solo BD (compatibilidad) |
