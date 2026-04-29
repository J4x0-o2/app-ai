export type ProcessingStatus = 'pending' | 'processing' | 'done' | 'error';

export class Document {
    constructor(
        public readonly id: string,
        public name: string,
        public type: string,
        public size: number,
        public storagePath: string,
        public uploadedBy: string,
        public processingStatus: ProcessingStatus = 'pending',
        public isActive: boolean = true,
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date(),
        public deletedAt: Date | null = null,
        public deletedBy: string | null = null
    ) { }
}
