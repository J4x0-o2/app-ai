import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { routes } from './interfaces/routes';
import { errorHandler } from './shared/errors/errorHandler';

const server = fastify({
    logger: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB — mismo límite que el plugin multipart
});

server.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
});

// global: false → solo aplica a rutas que tengan config.rateLimit definido
server.register(rateLimit, { global: false });

server.setErrorHandler(errorHandler);

server.register(routes);

server.get('/ping', async (request, reply) => {
    return { status: 'ok', time: new Date().toISOString() };
});

const start = async () => {
    try {
        const port = Number(process.env.PORT) || 3000;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server started at http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
