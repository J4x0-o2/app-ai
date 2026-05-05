import './config/env'; // validates env vars at startup — exits if invalid
import 'dotenv/config';
import { env } from './config/env';
import fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import { routes } from './interfaces/routes';
import { errorHandler } from './shared/errors/errorHandler';
import { startRefreshTokenCleanupJob } from './infrastructure/jobs/RefreshTokenCleanupJob';
import { requestContext } from './shared/context/requestContext';

const server = fastify({
    logger: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB — mismo límite que el plugin multipart
});

server.register(cors, {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
});

// gzip/brotli para respuestas JSON grandes (documentos, historial de conversaciones)
// SSE no se ve afectado: reply.hijack() omite el hook onSend donde compress actúa
server.register(compress, { global: true });

server.setErrorHandler(errorHandler);

// Propaga el reqId de Fastify como header x-request-id y lo almacena en AsyncLocalStorage
// para que sea accesible desde cualquier capa (use cases, LLMCallbackHandler, workers).
server.addHook('onRequest', (request, reply, done) => {
    reply.header('x-request-id', request.id);
    requestContext.run({ correlationId: String(request.id) }, done);
});

server.register(routes);

server.get('/ping', async (request, reply) => {
    return { status: 'ok', time: new Date().toISOString() };
});

// Captura rechazos de promesas no manejadas (ej. errores internos de @google/generative-ai
// que escapan al try/catch del for-await en streaming). Loguea sin matar el proceso.
process.on('unhandledRejection', (reason) => {
    server.log.error({ reason }, '[UnhandledRejection] Caught — server continues running');
});

const start = async () => {
    try {
        await server.listen({ port: env.PORT, host: '0.0.0.0' });
        startRefreshTokenCleanupJob();
        console.log(`Server started at http://localhost:${env.PORT}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
