import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChunkingService } from "../../domain/services/ChunkingService";

export class RecursiveChunkingService implements ChunkingService {
  private splitter: RecursiveCharacterTextSplitter;

  constructor(chunkSize: number = 1000, chunkOverlap: number = 200) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });
  }

  async chunkText(text: string): Promise<string[]> {
    try {
      const documents = await this.splitter.createDocuments([text]);
      return documents.map((doc: any) => doc.pageContent);
    } catch (error) {
      console.error("Error splitting text into chunks:", error);
      throw new Error(`Failed to chunk text: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
