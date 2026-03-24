export interface ChunkingService {
  /**
   * Splits a document's text into smaller chunks.
   * @param text The complete text of the document.
   * @returns An array of text chunks.
   */
  chunkText(text: string): Promise<string[]>;
}
