# API y permisos por rol

## RBAC — Roles y permisos

| Rol | CREATE_USER | LIST_USER | UPDATE_USER | DELETE_USER | UPLOAD_DOC | LIST_DOC | DELETE_DOC | DOWNLOAD_DOC | CHAT | DASHBOARD IA |
|-----|:-----------:|:---------:|:-----------:|:-----------:|:----------:|:--------:|:----------:|:------------:|:----:|:------------:|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GESTOR` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `INSTRUCTOR` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `EMPLEADO` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login → devuelve JWT + refreshToken + usuario |
| `POST` | `/api/auth/refresh` | Rotar refresh token → emite nuevo par JWT + refreshToken |
| `POST` | `/api/auth/logout` | Revocar todos los refresh tokens del usuario (requiere JWT) |
| `POST` | `/api/auth/forgot-password` | Solicitar reset de contraseña por email |
| `POST` | `/api/auth/reset-password` | Resetear contraseña con token (24h de validez) |
| `GET` | `/api/auth/me` | Obtener perfil del usuario autenticado desde BD (requiere JWT) |
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
| `GET` | `/api/admin/dashboard/overview` | Tarjetas resumen: queries, tokens, cache hit rate, usuarios activos, jobs (solo ADMIN) |
| `GET` | `/api/admin/dashboard/llm-usage` | Uso LLM por día — queries, tokens, latencia por proveedor/modelo (solo ADMIN) |
| `GET` | `/api/admin/dashboard/cache` | Stats de caché semántico — hits/misses por día con tasa de acierto (solo ADMIN) |
| `GET` | `/api/admin/dashboard/queue` | Jobs BullMQ — resumen diario + historial de fallos con error y documento (solo ADMIN) |
| `GET` | `/health` | Health check DB + Redis (200 ok / 503 degraded) |
| `GET` | `/health/db` | Health check solo BD (compatibilidad) |
