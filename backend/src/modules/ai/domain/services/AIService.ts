export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AIService {
    answerQuestion(context: string, question: string, history?: ChatMessage[]): Promise<string>;
    streamAnswer(context: string, question: string, history?: ChatMessage[]): AsyncGenerator<string>;
}
