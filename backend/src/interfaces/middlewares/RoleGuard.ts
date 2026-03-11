import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware factory that returns a preHandler function.
 * Validates if the authenticated user has at least one of the allowed roles.
 * Must be used after AuthMiddleware.
 * 
 * @param allowedRoles Array of strings specifying the roles permitted to access the route.
 */
export const RoleGuard = (allowedRoles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user;

        if (!user) {
            // Should theoretically never happen if AuthMiddleware executed successfully before this.
            return reply.status(401).send({ error: 'User not authenticated' });
        }

        const userRoles = user.roles || [];
        
        // Find if the user has at least one matching role from the allowed roles
        const hasPermission = userRoles.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return reply.status(403).send({ error: 'Forbidden: Insufficient permissions' });
        }
    };
};
