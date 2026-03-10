import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import prisma from '../../infrastructure/database/prismaClient';
import { AuthController } from '../controllers/AuthController';
import { UserController } from '../controllers/UserController';
import { DocumentController } from '../controllers/DocumentController';
import { ChatController } from '../controllers/ChatController';

import { MockUserRepository } from '../../infrastructure/repositories/MockUserRepository';
import { MockDocumentRepository } from '../../infrastructure/repositories/MockDocumentRepository';
import { MockConversationRepository } from '../../infrastructure/repositories/MockConversationRepository';
import { MockLangChainService } from '../../infrastructure/langchain/MockLangChainService';

import { AuthenticateUser } from '../../application/useCases/AuthenticateUser';
import { CreateUser } from '../../application/useCases/CreateUser';
import { DeleteUser } from '../../application/useCases/DeleteUser';
import { UpdateProfilePhoto } from '../../application/useCases/UpdateProfilePhoto';
import { UploadDocument } from '../../application/useCases/UploadDocument';
import { DeleteDocument } from '../../application/useCases/DeleteDocument';
import { SendPromptToAI } from '../../application/useCases/SendPromptToAI';
import { GetConversationHistory } from '../../application/useCases/GetConversationHistory';

export const routes: FastifyPluginAsync = async (server: FastifyInstance) => {
    const userRepository = new MockUserRepository();
    const documentRepository = new MockDocumentRepository();
    const conversationRepository = new MockConversationRepository();
    const langChainService = new MockLangChainService();

    const authenticateUser = new AuthenticateUser(userRepository);
    const createUser = new CreateUser(userRepository);
    const deleteUser = new DeleteUser(userRepository);
    const updateProfilePhoto = new UpdateProfilePhoto(userRepository);

    const uploadDocument = new UploadDocument(documentRepository);
    const deleteDoc = new DeleteDocument(documentRepository);

    const sendPromptToAI = new SendPromptToAI(conversationRepository, langChainService);
    const getConversationHistory = new GetConversationHistory(conversationRepository);

    const authController = new AuthController(authenticateUser);
    const userController = new UserController(createUser, deleteUser, updateProfilePhoto);
    const documentController = new DocumentController(uploadDocument, deleteDoc);
    const chatController = new ChatController(sendPromptToAI, getConversationHistory);

    server.get('/health/db', async (request, reply) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return reply.status(200).send({ status: 'database connected' });
        } catch (error) {
            server.log.error(error);
            return reply.status(500).send({ status: 'database connection failed', error: String(error) });
        }
    });

    server.post('/api/auth/login', authController.login.bind(authController));

    server.post('/api/users', userController.create.bind(userController));
    server.delete('/api/users/:id', userController.delete.bind(userController));
    server.patch('/api/users/:id/photo', userController.updatePhoto.bind(userController));

    server.post('/api/documents', documentController.upload.bind(documentController));
    server.delete('/api/documents/:id', documentController.delete.bind(documentController));

    server.post('/api/chat', chatController.sendPrompt.bind(chatController));
    server.get('/api/chat/:conversationId/history', chatController.getHistory.bind(chatController));
};
