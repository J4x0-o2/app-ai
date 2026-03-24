import { FastifyRequest, FastifyReply } from 'fastify';
import { ProcessDocumentForAIUseCase } from '../../application/usecases/ProcessDocumentForAIUseCase';
import { AskAIQuestionUseCase } from '../../application/usecases/AskAIQuestionUseCase';

export class AIController {
  constructor(
    private processDocumentUseCase: ProcessDocumentForAIUseCase,
    private askAIQuestionUseCase: AskAIQuestionUseCase
  ) {}

  async processDocument(request: FastifyRequest<{ Body: { documentId: string } }>, reply: FastifyReply) {
    try {
      const { documentId } = request.body;
      if (!documentId) {
        return reply.status(400).send({ error: 'documentId is required' });
      }

      await this.processDocumentUseCase.execute(documentId);
      
      return reply.status(200).send({ message: 'Document processed successfully for AI' });
    } catch (error) {
      console.error('Error in AIController.processDocument:', error);
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  }

  async ask(request: FastifyRequest<{ Body: { question: string } }>, reply: FastifyReply) {
    try {
      const { question } = request.body;
      if (!question) {
        return reply.status(400).send({ error: 'question is required' });
      }

      // Assuming we have access to user payload via auth middleware. 
      // Fastify standard is to put it on request.user, but we'll try to extract id if it exists
      const user = (request as any).user;
      const userId = user?.id || user?.userId;

      const answer = await this.askAIQuestionUseCase.execute(question, userId);

      return reply.status(200).send({ answer });
    } catch (error) {
      console.error('Error in AIController.ask:', error);
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  }
}
