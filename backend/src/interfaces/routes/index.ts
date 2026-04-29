import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import IORedis from 'ioredis';
import prisma from '../../infrastructure/database/prismaClient';
import { env } from '../../config/env';

import { UserController } from '../controllers/UserController';
import { ChatController } from '../controllers/ChatController';
import { StreamChatController } from '../controllers/StreamChatController';
import { StreamChatUseCase } from '../../application/use-cases/chat/StreamChatUseCase';
import { SendPromptRequest } from '../../application/dto/ChatDTO';
import { CreateUserRequest, UpdateUserRequest } from '../../application/dto/UserDTO';

import { PrismaUserRepository } from '../../infrastructure/repositories/PrismaUserRepository';
import { PrismaDocumentRepository } from '../../infrastructure/repositories/PrismaDocumentRepository';
import { PrismaConversationRepository } from '../../infrastructure/repositories/PrismaConversationRepository';
import { FileStorageService } from '../../infrastructure/storage/FileStorageService';

import { CreateUser } from '../../application/use-cases/users/CreateUser';
import { DeleteUser } from '../../application/use-cases/users/DeleteUser';
import { UpdateProfilePhoto } from '../../application/use-cases/users/UpdateProfilePhoto';
import { ListUsersUseCase } from '../../application/use-cases/users/ListUsersUseCase';
import { UpdateUserUseCase } from '../../application/use-cases/users/UpdateUserUseCase';
import { SendPromptToAI } from '../../application/use-cases/chat/SendPromptToAI';
import { GetConversationHistory } from '../../application/use-cases/chat/GetConversationHistory';
import { ListConversationsUseCase } from '../../application/use-cases/chat/ListConversationsUseCase';
import { DeleteConversationUseCase } from '../../application/use-cases/chat/DeleteConversationUseCase';

// DMS Use Cases & Controllers
import { UploadDocumentUseCase } from '../../application/use-cases/documents/UploadDocumentUseCase';
import { ListDocumentsUseCase } from '../../application/use-cases/documents/ListDocumentsUseCase';
import { DeleteDocumentUseCase } from '../../application/use-cases/documents/DeleteDocumentUseCase';
import { DownloadDocumentUseCase } from '../../application/use-cases/documents/DownloadDocumentUseCase';

import { UploadDocumentController } from '../controllers/documents/UploadDocumentController';
import { ListDocumentsController } from '../controllers/documents/ListDocumentsController';
import { DeleteDocumentController } from '../controllers/documents/DeleteDocumentController';
import { DownloadDocumentController } from '../controllers/documents/DownloadDocumentController';
import { GetDocumentStatusController } from '../controllers/documents/GetDocumentStatusController';

// Queue + Worker
import { BullMQDocumentQueue } from '../../infrastructure/queue/BullMQDocumentQueue';
import { createDocumentWorker } from '../../infrastructure/workers/DocumentWorker';

// AI Module
import { RecursiveChunkingService } from '../../modules/ai/infrastructure/langchain/RecursiveChunkingService';
import { GeminiEmbeddingService } from '../../modules/ai/infrastructure/langchain/GeminiEmbeddingService';
import { PGVectorSearchService } from '../../modules/ai/infrastructure/langchain/PGVectorSearchService';
import { GeminiAIService } from '../../modules/ai/infrastructure/langchain/GeminiAIService';
import { ProcessDocumentForAIUseCase } from '../../modules/ai/application/usecases/ProcessDocumentForAIUseCase';
import { AskAIQuestionUseCase } from '../../modules/ai/application/usecases/AskAIQuestionUseCase';
import { AIController } from '../../modules/ai/interfaces/controllers/AIController';
import { PGVectorSemanticCache } from '../../modules/ai/infrastructure/cache/PGVectorSemanticCache';

// Auth System
import { PrismaAuthRepository } from '../../infrastructure/repositories/PrismaAuthRepository';
import { PasswordHasher } from '../../infrastructure/security/PasswordHasher';
import { JwtService } from '../../infrastructure/security/JwtService';
import { NodemailerEmailService } from '../../infrastructure/email/NodemailerEmailService';
import { PrismaPasswordResetTokenRepository } from '../../infrastructure/repositories/PrismaPasswordResetTokenRepository';
import { PrismaRefreshTokenRepository } from '../../infrastructure/repositories/PrismaRefreshTokenRepository';
import { RequestPasswordResetUseCase } from '../../application/use-cases/auth/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../../application/use-cases/auth/ResetPasswordUseCase';
import { ChangePasswordUseCase } from '../../application/use-cases/auth/ChangePasswordUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/RefreshTokenUseCase';
import { PasswordResetController } from '../controllers/auth/PasswordResetController';
import { ChangePasswordController } from '../controllers/auth/ChangePasswordController';
import { RefreshTokenController } from '../controllers/auth/RefreshTokenController';
import { DatabaseAuthProvider } from '../../infrastructure/auth/DatabaseAuthProvider';
import { LoginUserUseCase } from '../../application/use-cases/auth/LoginUserUseCase';
import { LoginController } from '../controllers/auth/LoginController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import { GetUserRolesUseCase } from '../../application/auth/GetUserRolesUseCase';
import { PrismaRoleRepository } from '../../infrastructure/repositories/PrismaRoleRepository';
import { PERMISSIONS } from '../../application/auth/permissions';
import { RoleGuard } from '../middlewares/RoleGuard';

// ======================================
// keyGenerator: extrae userId del JWT (sin verificar firma) como clave de rate limit.
// Fallback a IP si el token no está presente o es inválido.
// ======================================
function chatRateLimitKeyGenerator(request: any): string {
    const auth = request.headers.authorization as string | undefined;
    if (auth?.startsWith('Bearer ')) {
        try {
            const payload = JSON.parse(
                Buffer.from(auth.split('.')[1], 'base64url').toString()
            );
            if (payload.userId) return `rl:user:${payload.userId}`;
        } catch { /* fallback a IP */ }
    }
    return `rl:ip:${request.ip}`;
}

const CHAT_RATE_LIMIT_CONFIG = {
    max: 30,
    timeWindow: '1 minute',
    keyGenerator: chatRateLimitKeyGenerator,
    errorResponseBuilder: () => ({
        error: 'TooManyRequests',
        message: 'Has alcanzado el límite de 30 mensajes por minuto. Intenta de nuevo en un momento.',
    }),
};

export const routes: FastifyPluginAsync = async (server: FastifyInstance) => {
    // Registramos plugin multipart
    await server.register(multipart, {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
        }
    });

    // ======================================
    // Redis connections
    //
    // redisQueue: BullMQ requiere maxRetriesPerRequest: null para no rechazar
    //             promesas pendientes al reconectar.
    // redisRateLimit: conexión separada para @fastify/rate-limit. Sin
    //                 maxRetriesPerRequest: null para que los comandos
    //                 de rate-limit fallen rápido y no bloqueen requests.
    //
    // Para cambiar Redis a otro proveedor de rate-limit: implementar
    // IStore de @fastify/rate-limit y pasarlo en la opción `store`.
    // ======================================
    const redisQueue = new IORedis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
    });

    const redisRateLimit = new IORedis(env.REDIS_URL);

    // Rate limiting distribuido respaldado por Redis.
    // global: false → solo aplica a rutas con config.rateLimit explícito.
    await server.register(rateLimit, {
        global: false,
        redis: redisRateLimit,
    });

    // ======================================
    // Repositories & Services
    // ======================================
    const userRepository = new PrismaUserRepository();
    const documentRepository = new PrismaDocumentRepository();
    const conversationRepository = new PrismaConversationRepository();
    const authRepository = new PrismaAuthRepository();
    const fileStorageService = new FileStorageService();

    // ======================================
    // Security Services & Middleware
    // ======================================
    const passwordHasher = new PasswordHasher();
    const jwtService = new JwtService();
    const getUserRolesUseCase = new GetUserRolesUseCase(new PrismaRoleRepository());
    const authMiddleware = new AuthMiddleware(jwtService, getUserRolesUseCase);

    // ======================================
    // Use Cases & Providers
    // ======================================
    const emailService = new NodemailerEmailService();
    const passwordResetTokenRepository = new PrismaPasswordResetTokenRepository();
    const refreshTokenRepository = new PrismaRefreshTokenRepository();

    const databaseAuthProvider = new DatabaseAuthProvider(authRepository, passwordHasher, jwtService, refreshTokenRepository);
    const loginUserUseCase = new LoginUserUseCase(databaseAuthProvider);

    const createUser = new CreateUser(userRepository, passwordHasher, emailService);
    const requestPasswordReset = new RequestPasswordResetUseCase(userRepository, passwordResetTokenRepository, emailService);
    const resetPassword = new ResetPasswordUseCase(passwordResetTokenRepository, userRepository, passwordHasher);
    const changePassword = new ChangePasswordUseCase(userRepository, passwordHasher);
    const refreshToken = new RefreshTokenUseCase(refreshTokenRepository, userRepository, jwtService);
    const deleteUser = new DeleteUser(userRepository);
    const updateProfilePhoto = new UpdateProfilePhoto(userRepository);
    const listUsers = new ListUsersUseCase(userRepository);
    const updateUser = new UpdateUserUseCase(userRepository);

    // AI Use Cases — van antes de Document para que processDocumentUseCase esté disponible en upload
    const aiChunkingService = new RecursiveChunkingService();
    const aiEmbeddingService = new GeminiEmbeddingService();
    const aiVectorSearchService = new PGVectorSearchService();
    const aiServiceInstance = new GeminiAIService();

    const processDocumentUseCase = new ProcessDocumentForAIUseCase(aiChunkingService, aiEmbeddingService);
    const semanticCache = new PGVectorSemanticCache(
        env.SEMANTIC_CACHE_THRESHOLD,
        env.SEMANTIC_CACHE_TTL_HOURS
    );
    const askAIQuestionUseCase = new AskAIQuestionUseCase(aiEmbeddingService, aiVectorSearchService, aiServiceInstance, semanticCache);

    // Document queue + worker (BullMQ backed by Redis)
    const documentQueue = new BullMQDocumentQueue(redisQueue);
    const documentWorker = createDocumentWorker(processDocumentUseCase, documentRepository, redisQueue);

    // Graceful shutdown: drain queue and worker before closing the server
    server.addHook('onClose', async () => {
        await documentWorker.close();
        await documentQueue.close();
        await redisQueue.quit();
        await redisRateLimit.quit();
    });

    // Document Management Use Cases
    const uploadDocumentUseCase = new UploadDocumentUseCase(documentRepository, fileStorageService, documentQueue);
    const listDocumentsUseCase = new ListDocumentsUseCase(documentRepository);
    const deleteDocumentUseCase = new DeleteDocumentUseCase(documentRepository);
    const downloadDocumentUseCase = new DownloadDocumentUseCase(documentRepository, fileStorageService);

    const sendPromptToAI = new SendPromptToAI(conversationRepository, askAIQuestionUseCase);
    const streamChatUseCase = new StreamChatUseCase(conversationRepository, askAIQuestionUseCase);
    const getConversationHistory = new GetConversationHistory(conversationRepository);
    const listConversationsUseCase = new ListConversationsUseCase(conversationRepository);
    const deleteConversationUseCase = new DeleteConversationUseCase(conversationRepository);

    // ======================================
    // Controllers
    // ======================================
    const loginController = new LoginController(loginUserUseCase);
    const passwordResetController = new PasswordResetController(requestPasswordReset, resetPassword);
    const changePasswordController = new ChangePasswordController(changePassword);
    const refreshTokenController = new RefreshTokenController(refreshToken, refreshTokenRepository);

    const userController = new UserController(createUser, deleteUser, updateProfilePhoto, listUsers, updateUser);
    const chatController = new ChatController(sendPromptToAI, getConversationHistory, listConversationsUseCase, deleteConversationUseCase);
    const streamChatController = new StreamChatController(streamChatUseCase);

    // Document Management Controllers
    const uploadDocumentController = new UploadDocumentController(uploadDocumentUseCase);
    const listDocumentsController = new ListDocumentsController(listDocumentsUseCase);
    const deleteDocumentController = new DeleteDocumentController(deleteDocumentUseCase);
    const downloadDocumentController = new DownloadDocumentController(downloadDocumentUseCase);
    const getDocumentStatusController = new GetDocumentStatusController(documentRepository);

    const aiController = new AIController(processDocumentUseCase, askAIQuestionUseCase);

    // ======================================
    // Routes
    // ======================================

    // Health check completo: DB + Redis
    server.get('/health', async (_request, reply) => {
        const checks: Record<string, string> = {};
        let healthy = true;

        try {
            await prisma.$queryRaw`SELECT 1`;
            checks.database = 'ok';
        } catch {
            checks.database = 'error';
            healthy = false;
        }

        try {
            await redisRateLimit.ping();
            checks.redis = 'ok';
        } catch {
            checks.redis = 'error';
            healthy = false;
        }

        return reply
            .status(healthy ? 200 : 503)
            .send({ status: healthy ? 'ok' : 'degraded', checks });
    });

    server.get('/health/db', async (_request, reply) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return reply.status(200).send({ status: 'database connected' });
        } catch (error) {
            server.log.error(error);
            return reply.status(500).send({ status: 'database connection failed', error: String(error) });
        }
    });

    // API Pública
    server.post('/api/auth/login', loginController.login.bind(loginController));
    server.post<{ Body: { refreshToken: string } }>('/api/auth/refresh', refreshTokenController.refresh.bind(refreshTokenController));
    server.post('/api/auth/logout', { preHandler: [authMiddleware.handle] }, refreshTokenController.logout.bind(refreshTokenController));
    server.post<{ Body: { email: string } }>('/api/auth/forgot-password', passwordResetController.requestResetHandler.bind(passwordResetController));
    server.post<{ Body: { token: string; password: string } }>('/api/auth/reset-password', passwordResetController.resetPasswordHandler.bind(passwordResetController));
    server.put<{ Body: { currentPassword: string; newPassword: string } }>('/api/auth/change-password', { preHandler: [authMiddleware.handle] }, changePasswordController.handle.bind(changePasswordController));

    // Rutas protegidas (Users)
    server.get('/api/users', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.LIST_USERS)] }, userController.list.bind(userController));
    server.post<{ Body: CreateUserRequest }>('/api/users', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.CREATE_USER)] }, userController.create.bind(userController));
    server.put<{ Params: { id: string }, Body: UpdateUserRequest }>('/api/users/:id', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.UPDATE_USER)] }, userController.update.bind(userController));
    server.delete<{ Params: { id: string } }>('/api/users/:id', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.DELETE_USER)] }, userController.delete.bind(userController));
    server.patch<{ Params: { id: string }, Body: { photoUrl: string } }>('/api/users/:id/photo', { preHandler: [authMiddleware.handle] }, userController.updatePhoto.bind(userController));

    // Rutas protegidas (Documents)
    server.post('/api/documents/upload', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.UPLOAD_DOCUMENT)] }, uploadDocumentController.upload.bind(uploadDocumentController));
    server.get('/api/documents', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.LIST_DOCUMENTS)] }, listDocumentsController.list.bind(listDocumentsController));
    server.get<{ Params: { id: string } }>('/api/documents/:id/status', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.LIST_DOCUMENTS)] }, getDocumentStatusController.getStatus.bind(getDocumentStatusController));
    server.get<{ Params: { id: string } }>('/api/documents/:id', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.DOWNLOAD_DOCUMENT)] }, downloadDocumentController.download.bind(downloadDocumentController));
    server.delete<{ Params: { id: string } }>('/api/documents/:id', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.DELETE_DOCUMENT)] }, deleteDocumentController.delete.bind(deleteDocumentController));

    // Rutas protegidas (Chat / Conversations)
    server.post<{ Body: SendPromptRequest }>('/api/chat/stream', {
        config: { rateLimit: CHAT_RATE_LIMIT_CONFIG },
        preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.CHAT_ACCESS)],
    }, streamChatController.stream.bind(streamChatController));

    server.post<{ Body: SendPromptRequest }>('/api/chat', {
        config: { rateLimit: CHAT_RATE_LIMIT_CONFIG },
        preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.CHAT_ACCESS)],
    }, chatController.sendPrompt.bind(chatController));

    server.get<{ Params: { conversationId: string }, Querystring: { userId: string } }>('/api/chat/:conversationId/history', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.CHAT_ACCESS)] }, chatController.getHistory.bind(chatController));
    server.get('/api/conversations', { preHandler: [authMiddleware.handle] }, chatController.list.bind(chatController));
    server.delete<{ Params: { id: string } }>('/api/conversations/:id', { preHandler: [authMiddleware.handle] }, chatController.delete.bind(chatController));

    // AI Module Routes (RAG)
    server.post<{ Body: { documentId: string } }>('/ai/process-document', { preHandler: [authMiddleware.handle] }, aiController.processDocument.bind(aiController));
    server.post<{ Body: { question: string } }>('/ai/ask', { preHandler: [authMiddleware.handle] }, aiController.ask.bind(aiController));
};
