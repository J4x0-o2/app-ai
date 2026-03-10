export class AIResponse {
    constructor(
        public readonly id: string,
        public promptId: string,
        public content: string,
        public modelUsed: string,
        public tokensUsed: number,
        public receivedAt: Date
    ) { }
}
