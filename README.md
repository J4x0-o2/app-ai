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

JWT_SECRET="cambia_esto_por_un_secreto_seguro_y_largo"
JWT_EXPIRES_IN="1d"

GEMINI_API_KEY="tu_api_key_de_google_ai_studio"

FRONTEND_URL="http://localhost:5173"
```

> Obtén tu `GEMINI_API_KEY` en [Google AI Studio](https://aistudio.google.com/). El modelo de embeddings usa `gemini-embedding-001` (vectores de 3072 dimensiones) y el LLM usa `gemini-2.5-flash`.

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
        ↓ HTTP + Bearer JWT
Fastify 5 ← http://localhost:3000
    ├── AuthMiddleware (verifica JWT)
    ├── RoleGuard (RBAC: ADMIN / GESTOR / INSTRUCTOR / EMPLEADO)
    └── Módulo AI (pipeline RAG):
          InputGuardrail → Embedding (Gemini) → VectorSearch (pgvector)
          → LLMCallbackHandler → LLM (Gemini) → OutputGuardrail
                ↓ Prisma ORM
PostgreSQL 16 + pgvector ← localhost:5432 (Docker)
                ↕
Google Gemini API (externa)
    ├── gemini-embedding-001  (vectores 3072 dims)
    └── gemini-2.5-flash      (respuestas LLM)
```

## Pipeline RAG

1. **Ingesta**: PDF/TXT subido → texto extraído → chunks (1000 tokens, overlap 200) → embeddings Gemini 3072-dim → almacenados en pgvector
2. **Consulta**: pregunta → embedding → búsqueda coseno en pgvector (top 5 chunks) → contexto inyectado al LLM → respuesta en Markdown

## RBAC — Roles y permisos

| Rol | CREATE_USER | UPLOAD_DOC | LIST_DOC | DELETE_DOC | DOWNLOAD_DOC | CHAT |
|-----|:-----------:|:----------:|:--------:|:----------:|:------------:|:----:|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GESTOR` | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| `INSTRUCTOR` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `EMPLEADO` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login → devuelve JWT + usuario |
| `POST` | `/api/users` | Crear usuario (ADMIN/GESTOR) |
| `GET` | `/api/users` | Listar usuarios (ADMIN/GESTOR) |
| `POST` | `/api/documents/upload` | Subir documento (multipart) |
| `GET` | `/api/documents` | Listar documentos activos |
| `DELETE` | `/api/documents/:id` | Soft delete de documento |
| `POST` | `/ai/process-document` | Procesar doc: chunking + embeddings → pgvector |
| `POST` | `/api/chat` | Enviar prompt → respuesta RAG |
| `GET` | `/api/conversations` | Listar conversaciones del usuario |
| `DELETE` | `/api/conversations/:id` | Eliminar conversación |
| `GET` | `/health/db` | Health check de la BD |
