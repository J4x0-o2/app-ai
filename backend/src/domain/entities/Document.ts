export class Document {
    constructor(
        public readonly id: string,
        public filename: string,
        public fileType: string,
        public sizeBytes: number,
        public uploadedByUserId: string,
        public uploadedAt: Date,
        public urlOrPath: string
    ) { }
}
