import { FastifyRequest, FastifyReply } from 'fastify';
import { StreamChatUseCase } from '../../application/use-cases/chat/StreamChatUseCase';
import { SendPromptRequest } from '../../application/dto/ChatDTO';

export class StreamChatController {
    constructor(private streamChatUseCase: StreamChatUseCase) {}

    async stream(request: FastifyRequest<{ Body: SendPromptRequest }>, reply: FastifyReply) {
        // Tomar control total del raw response para que Fastify no intente
        // enviar su propia respuesta cuando el handler retorne
        reply.hijack();
        const raw = reply.raw;

        // @fastify/cors inyecta los headers CORS en el hook onSend, que nunca
        // se ejecuta cuando usamos reply.raw. Los ponemos manualmente aquí.
        const origin = (request.headers.origin as string) || process.env.FRONTEND_URL || 'http://localhost:5173';
        raw.setHeader('Access-Control-Allow-Origin', origin);
        raw.setHeader('Access-Control-Allow-Credentials', 'true');

        raw.setHeader('Content-Type', 'text/event-stream');
        raw.setHeader('Cache-Control', 'no-cache');
        raw.setHeader('Connection', 'keep-alive');
        raw.setHeader('X-Accel-Buffering', 'no');
        raw.flushHeaders();

        try {
            const { conversationId, stream, onComplete } = await this.streamChatUseCase.execute(request.body);

            let fullResponse = '';

            for await (const chunk of stream) {
                fullResponse += chunk;
                raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            }

            await onComplete(fullResponse);

            raw.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
        } catch (error) {
            console.error('[Stream Chat] Error:', error);
            raw.write(`data: ${JSON.stringify({ error: 'Error al procesar la consulta. Intenta nuevamente.' })}\n\n`);
        } finally {
            raw.end();
        }
    }
}
