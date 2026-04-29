export interface DocumentJobPayload {
  documentId: string;
  storagePath: string;
}

export interface IDocumentQueue {
  enqueue(payload: DocumentJobPayload): Promise<void>;
  close(): Promise<void>;
}
