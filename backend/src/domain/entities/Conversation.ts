import { Prompt } from './Prompt';

export class Conversation {
    constructor(
        public readonly id: string,
        public userId: string,
        public startedAt: Date,
        public prompts: Prompt[] = []
    ) { }
}
