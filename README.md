# Contexto del Proyecto AppAI

Este documento proporciona una visión general rápida y concisa sobre el propósito, la arquitectura, las tecnologías y el estado actual del proyecto AppAI.

## Descripción General

AppAI es una aplicación web Full-Stack diseñada para ofrecer un sistema de gestión documental impulsado por inteligencia artificial. Utiliza un pipeline **RAG (Retrieval-Augmented Generation)** que permite a los usuarios subir documentos (como PDFs), fragmentarlos y generar vector embbedings. Posteriormente, los usuarios pueden interactuar con un Chat de IA protegido mediante autenticación para realizar consultas sobre sus documentos y obtener respuestas contextualizadas.

El sistema se apoya fuertemente en principios **SOLID** y **Arquitectura Limpia (Clean Architecture)** en el servidor para mantenerse modular, testeable e independiente de proveedores específicos de IA.

## Tecnologías Principales

### Backend (`/backend`)
El servidor está estructurado según los principios de la Arquitectura Limpia (capas: `domain`, `application`, `infrastructure`, `interfaces`) y emplea las siguientes tecnologías:
- **Entorno y Lenguaje:** Node.js con TypeScript.
- **Framework Web:** Fastify (incluye soporte para subida de archivos pesados con `@fastify/multipart` y CORS).
- **Base de Datos y ORM:** PostgreSQL con Prisma ORM.
- **Vector Database:** Extensión `pgvector` activada en PostgreSQL para almacenar embbedings de alta dimensionalidad (`vector(3072)`).
- **Inteligencia Artificial:** LangChain (Core, Community y TextSplitters) y la integración oficial para Google GenAI (Gemini) destinados a ingerir los textos y realizar los pipelines RAG. Además incluye utilidades como `pdf-parse`.
- **Seguridad y Retención:** JWT (JSON Web Tokens) y bcrypt para la encriptación de contraseñas y el manejo de sesiones.

### Frontend (`/vite-project`)
La interfaz gráfica es una Single Page Application (SPA):
- **Framework y Entorno:** React + TypeScript vitaminado por Vite.
- **Enrutamiento:** React Router DOM (Manejo de rutas públicas como el Login y protegidas como el Dashboard/Chat).
- **Manejo de Estado:** `authContext.tsx` nativo mediante React Context API para el manejo de sesiones de usuario.
- **UI e Iconos:** CSS Módulos / CSS puro y la biblioteca `lucide-react` para la iconografía interactiva.

## Estructura de Datos (Esquema Principal)

El ORM Prisma gestiona relaciones fundamentales para entender el ecosistema de negocio:
1. **Seguridad y Usuarios:** Tablas `users`, `roles`, `user_roles` y `audit_logs`.
2. **Gestión Documental y RAG:** 
   - Tablas de registro (`documents`).
   - Fragmentación (`document_chunks` como punteros de texto).
   - Embeddings de los fragmentos (`document_embeddings`).
3. **Chat e Interacciones AI:** `conversations`, `messages`, `models`/`llm_models` y un histórico totalitario en `ai_queries`.

## Estado Actual

El proyecto cuenta con las bases sólidas de autenticación, diseño de UI (en React) y un esquema de base de datos muy robusto ya preparado para IA. Sus features más críticas ya están planteadas en la capa de datos: carga de documentos, troceado y gestión de vectores de manera local usando LangChain y almacenamiento en PGVector. Además, expone sus rutas mediante Fastify y se conecta con un frontend RWD (Responsive Web Design) que consume las funcionalidades mediante un panel de usuario (Dashboard) y una interfaz de chat intuitiva.
