import { AIResponse } from './AIResponse';

export class Prompt {
    constructor(
        public readonly id: string,
        public conversationId: string,
        public userId: string,
        public content: string,
        public modelUsed: string,
        public sentAt: Date,
        public response?: AIResponse
    ) { }
}
