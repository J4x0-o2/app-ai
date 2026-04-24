import { apiClient } from '../../../utils/apiClient';

export interface Document {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedBy: string;
    isActive: boolean;
    createdAt: string;
}

export const documentService = {
    // Sube el archivo; el backend hace chunking + embeddings automáticamente
    upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.postForm<Document>('/api/documents/upload', formData);
    },

    // Lista todos los documentos activos
    list: () => apiClient.get<Document[]>('/api/documents'),

    // Soft delete — marca el documento como eliminado en la DB
    delete: (id: string) => apiClient.delete<void>(`/api/documents/${id}`),
};
