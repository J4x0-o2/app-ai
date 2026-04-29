import { apiClient } from '../../../utils/apiClient';

export type ProcessingStatus = 'pending' | 'processing' | 'done' | 'error';

export interface Document {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedBy: string;
    isActive: boolean;
    processingStatus: ProcessingStatus;
    createdAt: string;
}

export const documentService = {
    upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.postForm<Document>('/api/documents/upload', formData);
    },

    list: () => apiClient.get<Document[]>('/api/documents'),

    getStatus: (id: string) =>
        apiClient.get<{ id: string; status: ProcessingStatus }>(`/api/documents/${id}/status`),

    delete: (id: string) => apiClient.delete<void>(`/api/documents/${id}`),
};
