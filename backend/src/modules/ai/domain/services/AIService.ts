export interface AIService {
  /**
   * Generates an answer to a question based on the provided context.
   * @param context The context retrieved from the search.
   * @param question The user's question.
   * @returns A promise that resolves to the generated answer.
   */
  answerQuestion(context: string, question: string): Promise<string>;
}
