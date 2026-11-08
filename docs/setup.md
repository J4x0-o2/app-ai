# Instalación y puesta en marcha

## Configuración inicial

### 1. Requisitos previos

| Herramienta | Versión mínima | Instalación |
|-------------|---------------|-------------|
| Node.js | 20.0.0 | [nodejs.org](https://nodejs.org) o [nvm](https://github.com/nvm-sh/nvm) |
| npm | 9.0.0 | Incluido con Node.js |
| Git | cualquiera | [git-scm.com](https://git-scm.com) |
| Docker | 24+ | Ver paso 2 |

> Se recomienda instalar Node.js via **nvm** para gestionar versiones fácilmente:
> ```bash
> nvm install 22
> nvm use 22
> ```

Verificar versiones instaladas:

```bash
node --version     # debe ser >= 20.0.0
npm --version      # debe ser >= 9.0.0
docker --version
docker compose version
```

### 2. Instalar Docker

- **Windows / macOS:** descarga e instala [Docker Desktop](https://www.docker.com/products/docker-desktop/).
- **Linux:** instala Docker Engine siguiendo la [guía oficial](https://docs.docker.com/engine/install/) para tu distribución y luego añade tu usuario al grupo `docker`:

```bash
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar, o ejecutar:
newgrp docker
```

Verificar que Docker funciona:

```bash
docker ps
```

### 3. Dependencias de compilación para `bcrypt`

`bcrypt` incluye código nativo que se compila durante `npm install`. Según tu sistema operativo:

| Sistema | Qué instalar |
|---------|-------------|
| **Windows** | [Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + Python 3 (o ejecutar `npm install --global windows-build-tools`) |
| **macOS** | Xcode Command Line Tools: `xcode-select --install` |
| **Linux (Debian/Ubuntu)** | `sudo apt install build-essential python3` |
| **Linux (Fedora/RHEL)** | `sudo dnf groupinstall "Development Tools" && sudo dnf install python3` |
| **Linux (Arch)** | `sudo pacman -S base-devel python` |

### 4. Clonar el repositorio

```bash
git clone https://github.com/J4x0-o2/app-ai.git AppAi
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

> `bcrypt` compila binarios nativos durante la instalación. Si falla, instala las herramientas de compilación de tu sistema operativo (ver tabla en el paso 3 de *Configuración inicial*), luego borra `node_modules` y vuelve a instalar.

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

## Solución de problemas

### `bcrypt` falla al compilar durante `npm install`

Instala las herramientas de compilación nativas de tu sistema (ver tabla en *Configuración inicial*, paso 3) y vuelve a instalar:

```bash
cd backend
rm -rf node_modules
npm install
```

En Windows también puedes intentar:

```powershell
npm install --global windows-build-tools   # requiere PowerShell como administrador
```

### Error de OpenSSL con Prisma

Prisma genera binarios que deben coincidir con la versión de OpenSSL del sistema. Si ves errores relacionados con OpenSSL al ejecutar `npx prisma generate` o al arrancar el servidor:

```bash
# Fuerza la regeneración de los binarios de Prisma
npx prisma generate
```

Si el problema persiste en Linux, asegúrate de tener OpenSSL 1.1 o 3 instalado según tu distribución. En macOS, instala OpenSSL via Homebrew: `brew install openssl`.

### `permission denied` con Docker (Linux)

```bash
sudo usermod -aG docker $USER
# Cierra sesión y vuelve a entrar, o ejecuta:
newgrp docker
```

### `ECONNREFUSED localhost:5432` — PostgreSQL no responde

El contenedor de PostgreSQL no está corriendo o tardó en iniciar:

```bash
cd vite-project
docker compose up -d
docker compose ps        # verificar que el estado sea "running"
docker compose logs postgres   # ver si hay errores de arranque
```

### Puerto ya en uso

**Linux / macOS:**
```bash
lsof -i :3000   # qué proceso usa el puerto 3000
lsof -i :5173   # qué proceso usa el puerto 5173
kill -9 <PID>
```

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Prisma `P1001: Can't reach database server`

1. Verificar que el contenedor Docker esté arriba: `docker compose ps`
2. Verificar la cadena de conexión en `backend/.env`
3. **Linux / macOS:** `nc -zv localhost 5432`
4. **Windows:** `Test-NetConnection -ComputerName localhost -Port 5432` (PowerShell)

### Docker Desktop no arranca (Windows / macOS)

- Asegúrate de tener la virtualización habilitada en la BIOS (Windows).
- En macOS Apple Silicon, Docker Desktop requiere Rosetta 2: `softwareupdate --install-rosetta`.
- Verifica que el servicio esté corriendo antes de ejecutar `docker compose up`.
