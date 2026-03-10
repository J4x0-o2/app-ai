export interface UploadDocumentRequest {
    userId: string;
    filename: string;
    fileType: string;
    sizeBytes: number;
    content: Buffer; // For mock purpose
}

export interface DocumentResponse {
    id: string;
    filename: string;
    fileType: string;
    sizeBytes: number;
    uploadedAt: Date;
    urlOrPath: string;
}
