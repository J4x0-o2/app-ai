export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  createdAt: Date;
}
