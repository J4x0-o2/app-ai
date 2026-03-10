import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { DomainError, ApplicationError, InfrastructureError } from './errors';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    request.log.error(error);

    if (error instanceof DomainError || error instanceof ApplicationError || error instanceof InfrastructureError) {
        return reply.status(400).send({
            error: error.name,
            message: error.message,
            code: error.code,
            context: error.context
        });
    }

    if (error.validation) {
        return reply.status(400).send({
            error: 'ValidationError',
            message: error.message
        });
    }

    return reply.status(500).send({
        error: 'InternalServerError',
        message: 'An unexpected error occurred'
    });
}
