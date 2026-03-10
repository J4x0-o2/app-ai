import fastify from 'fastify';
import { routes } from './interfaces/routes';
import { errorHandler } from './shared/errors/errorHandler';

const server = fastify({ logger: true });

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
