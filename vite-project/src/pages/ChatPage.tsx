import React, { useState } from 'react';
import { ChatArea } from '../features/chat/components/ChatArea';
import { UploadModal } from '../features/documents/components/UploadModal';

export const ChatPage: React.FC = () => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // This handleUpload function can be expanded later to 
    // actually send files to your RAG backend
    const handleUpload = (files: FileList | null) => {
        // Logic goes here
        console.log("Files to upload to RAG:", files);
    };

    return (
        <>
            <ChatArea onAttachClick={() => setIsUploadModalOpen(true)} />

            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={handleUpload}
            />
        </>
    );
};
