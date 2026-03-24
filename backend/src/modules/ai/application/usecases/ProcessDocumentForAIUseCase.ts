import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import prisma from '../../../../infrastructure/database/prismaClient';
import { ChunkingService } from '../../domain/services/ChunkingService';
import { EmbeddingService } from '../../domain/services/EmbeddingService';

const EXPECTED_EMBEDDING_DIMENSIONS = 3072;

export class ProcessDocumentForAIUseCase {
  constructor(
    private chunkingService: ChunkingService,
    private embeddingService: EmbeddingService
  ) {}

  async execute(documentId: string): Promise<void> {
    console.log(`[AI Ingestion] Starting processing for document: ${documentId}`);

    const document = await prisma.documents.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    if (!document.storage_path) {
      throw new Error(`Document ${documentId} does not have a valid storage_path`);
    }

    console.log(`[AI Ingestion] Extracting text from: ${document.storage_path}`);
    const textContent = await this.extractText(document.storage_path, document.type ?? '');

    if (!textContent || textContent.trim().length === 0) {
      throw new Error(`Extracted text is empty for document ${documentId}`);
    }

    console.log(`[AI Ingestion] Chunking text...`);
    const chunks = await this.chunkingService.chunkText(textContent);
    console.log(`[AI Ingestion] Generated ${chunks.length} chunks`);

    // Delete any existing chunks/embeddings for this document before reprocessing
    await prisma.document_chunks.deleteMany({ where: { document_id: documentId } });

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      console.log(`[AI Ingestion] Processing chunk ${i + 1}/${chunks.length}`);

      const embedding = await this.embeddingService.generateEmbedding(chunkText);

      // Validate dimensions before attempting the DB write
      if (embedding.length !== EXPECTED_EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding dimension mismatch: expected ${EXPECTED_EMBEDDING_DIMENSIONS}, got ${embedding.length}. ` +
          `Check that the embedding model matches the vector column definition.`
        );
      }

      // Atomic: chunk + embedding are created together or not at all
      await prisma.$transaction(async (tx) => {
        const dbChunk = await tx.document_chunks.create({
          data: {
            document_id: documentId,
            content: chunkText,
            chunk_index: i,
          },
        });

        const embeddingString = `[${embedding.join(',')}]`;
        await tx.$executeRaw`
          INSERT INTO document_embeddings (id, chunk_id, embedding)
          VALUES (gen_random_uuid(), ${dbChunk.id}::uuid, ${embeddingString}::vector)
        `;
      });
    }

    console.log(`[AI Ingestion] Successfully processed document ${documentId}: ${chunks.length} chunks stored.`);
  }

  private async extractText(storagePath: string, mimeType: string): Promise<string> {
    const absolutePath = path.resolve(storagePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found at path: ${absolutePath}`);
    }

    const buffer = fs.readFileSync(absolutePath);

    if (mimeType === 'application/pdf' || absolutePath.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      return data.text;
    }

    return buffer.toString('utf-8');
  }
}
