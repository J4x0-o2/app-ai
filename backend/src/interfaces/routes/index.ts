import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import prisma from '../../infrastructure/database/prismaClient';

import { UserController } from '../controllers/UserController';
import { ChatController } from '../controllers/ChatController';
import { SendPromptRequest } from '../../application/dto/ChatDTO';
import { CreateUserRequest } from '../../application/dto/UserDTO';

import { PrismaUserRepository } from '../../infrastructure/repositories/PrismaUserRepository';
import { PrismaDocumentRepository } from '../../infrastructure/repositories/PrismaDocumentRepository';
import { PrismaConversationRepository } from '../../infrastructure/repositories/PrismaConversationRepository';
import { FileStorageService } from '../../infrastructure/storage/FileStorageService';

import { CreateUser } from '../../application/use-cases/users/CreateUser';
import { DeleteUser } from '../../application/use-cases/users/DeleteUser';
import { UpdateProfilePhoto } from '../../application/use-cases/users/UpdateProfilePhoto';
import { ListUsersUseCase } from '../../application/use-cases/users/ListUsersUseCase';
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

// AI Module
import { RecursiveChunkingService } from '../../modules/ai/infrastructure/langchain/RecursiveChunkingService';
import { GeminiEmbeddingService } from '../../modules/ai/infrastructure/langchain/GeminiEmbeddingService';
import { PGVectorSearchService } from '../../modules/ai/infrastructure/langchain/PGVectorSearchService';
import { GeminiAIService } from '../../modules/ai/infrastructure/langchain/GeminiAIService';
import { ProcessDocumentForAIUseCase } from '../../modules/ai/application/usecases/ProcessDocumentForAIUseCase';
import { AskAIQuestionUseCase } from '../../modules/ai/application/usecases/AskAIQuestionUseCase';
import { AIController } from '../../modules/ai/interfaces/controllers/AIController';

// Auth System
import { PrismaAuthRepository } from '../../infrastructure/repositories/PrismaAuthRepository';
import { PasswordHasher } from '../../infrastructure/security/PasswordHasher';
import { JwtService } from '../../infrastructure/security/JwtService';
import { DatabaseAuthProvider } from '../../infrastructure/auth/DatabaseAuthProvider';
import { LoginUserUseCase } from '../../application/use-cases/auth/LoginUserUseCase';
import { LoginController } from '../controllers/auth/LoginController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import { GetUserRolesUseCase } from '../../application/auth/GetUserRolesUseCase';
import { PrismaRoleRepository } from '../../infrastructure/repositories/PrismaRoleRepository';
import { PERMISSIONS } from '../../application/auth/permissions';
import { RoleGuard } from '../middlewares/RoleGuard';

export const routes: FastifyPluginAsync = async (server: FastifyInstance) => {
    // Registramos plugin multipart
    await server.register(multipart, {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
        }
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
    const getUserRolesUseCase = new GetUserRolesUseCase(new PrismaRoleRepository()); // Bloque 2 Use case
    const authMiddleware = new AuthMiddleware(jwtService, getUserRolesUseCase);

    // ======================================
    // Use Cases & Providers
    // ======================================
    const databaseAuthProvider = new DatabaseAuthProvider(authRepository, passwordHasher, jwtService);
    const loginUserUseCase = new LoginUserUseCase(databaseAuthProvider);

    const createUser = new CreateUser(userRepository);
    const deleteUser = new DeleteUser(userRepository);
    const updateProfilePhoto = new UpdateProfilePhoto(userRepository);
    const listUsers = new ListUsersUseCase(userRepository);

    // Document Management Use Cases
    const uploadDocumentUseCase = new UploadDocumentUseCase(documentRepository, fileStorageService);
    const listDocumentsUseCase = new ListDocumentsUseCase(documentRepository);
    const deleteDocumentUseCase = new DeleteDocumentUseCase(documentRepository);
    const downloadDocumentUseCase = new DownloadDocumentUseCase(documentRepository, fileStorageService);

    // AI Use Cases (debe ir antes de SendPromptToAI que depende de askAIQuestionUseCase)
    const aiChunkingService = new RecursiveChunkingService();
    const aiEmbeddingService = new GeminiEmbeddingService();
    const aiVectorSearchService = new PGVectorSearchService();
    const aiServiceInstance = new GeminiAIService();

    const processDocumentUseCase = new ProcessDocumentForAIUseCase(aiChunkingService, aiEmbeddingService);
    const askAIQuestionUseCase = new AskAIQuestionUseCase(aiEmbeddingService, aiVectorSearchService, aiServiceInstance);

    const sendPromptToAI = new SendPromptToAI(conversationRepository, askAIQuestionUseCase);
    const getConversationHistory = new GetConversationHistory(conversationRepository);
    const listConversationsUseCase = new ListConversationsUseCase(conversationRepository);
    const deleteConversationUseCase = new DeleteConversationUseCase(conversationRepository);

    // ======================================
    // Controllers
    // ======================================
    const loginController = new LoginController(loginUserUseCase);

    const userController = new UserController(createUser, deleteUser, updateProfilePhoto, listUsers);
    const chatController = new ChatController(sendPromptToAI, getConversationHistory, listConversationsUseCase, deleteConversationUseCase);

    // Document Management Controllers
    const uploadDocumentController = new UploadDocumentController(uploadDocumentUseCase);
    const listDocumentsController = new ListDocumentsController(listDocumentsUseCase);
    const deleteDocumentController = new DeleteDocumentController(deleteDocumentUseCase);
    const downloadDocumentController = new DownloadDocumentController(downloadDocumentUseCase);

    const aiController = new AIController(processDocumentUseCase, askAIQuestionUseCase);

    // ======================================
    // Routes
    // ======================================
    server.get('/health/db', async (request, reply) => {
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
    
    // Rutas protegidas (Users)
    server.get('/api/users', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.CREATE_USER)] }, userController.list.bind(userController));
    server.post<{ Body: CreateUserRequest }>('/api/users', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.CREATE_USER)] }, userController.create.bind(userController));
    server.delete<{ Params: { id: string } }>('/api/users/:id', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.CREATE_USER)] }, userController.delete.bind(userController));
    server.patch<{ Params: { id: string }, Body: { photoUrl: string } }>('/api/users/:id/photo', { preHandler: [authMiddleware.handle] }, userController.updatePhoto.bind(userController));

    // Rutas protegidas (Documents)
    server.post('/api/documents/upload', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.UPLOAD_DOCUMENT)] }, uploadDocumentController.upload.bind(uploadDocumentController));
    server.get('/api/documents', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.LIST_DOCUMENTS)] }, listDocumentsController.list.bind(listDocumentsController));
    server.get<{ Params: { id: string } }>('/api/documents/:id', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.DOWNLOAD_DOCUMENT)] }, downloadDocumentController.download.bind(downloadDocumentController));
    server.delete<{ Params: { id: string } }>('/api/documents/:id', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.DELETE_DOCUMENT)] }, deleteDocumentController.delete.bind(deleteDocumentController));

    // Rutas protegidas (Chat / Conversations)
    server.post<{ Body: SendPromptRequest }>('/api/chat', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.CHAT_ACCESS)] }, chatController.sendPrompt.bind(chatController));
    server.get<{ Params: { conversationId: string }, Querystring: { userId: string } }>('/api/chat/:conversationId/history', { preHandler: [authMiddleware.handle, RoleGuard(PERMISSIONS.CHAT_ACCESS)] }, chatController.getHistory.bind(chatController));
    server.get('/api/conversations', { preHandler: [authMiddleware.handle] }, chatController.list.bind(chatController));
    server.delete<{ Params: { id: string } }>('/api/conversations/:id', { preHandler: [authMiddleware.handle] }, chatController.delete.bind(chatController));

    // AI Module Routes (RAG)
    server.post<{ Body: { documentId: string } }>('/ai/process-document', { preHandler: [authMiddleware.handle] }, aiController.processDocument.bind(aiController));
    server.post<{ Body: { question: string } }>('/ai/ask', { preHandler: [authMiddleware.handle] }, aiController.ask.bind(aiController));
};
