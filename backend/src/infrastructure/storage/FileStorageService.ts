import * as fs from 'fs/promises';
import * as path from 'path';

export class FileStorageService {
    private readonly basePath: string;

    constructor() {
        this.basePath = path.join(process.cwd(), 'storage', 'documents');
        this.ensureStorageDirectory();
    }

    private async ensureStorageDirectory() {
        try {
            await fs.mkdir(this.basePath, { recursive: true });
        } catch (error) {
            console.error('Failed to create storage directory', error);
        }
    }

    async save(filename: string, fileBuffer: Buffer): Promise<string> {
        await this.ensureStorageDirectory();
        
        const relativePath = `storage/documents/${filename}`;
        const absolutePath = path.join(this.basePath, filename);
        
        await fs.writeFile(absolutePath, fileBuffer);
        return relativePath;
    }

    async get(relativePath: string): Promise<Buffer> {
        // Obtenemos el nombre del archivo de la ruta (asumiendo formato storage/documents/filename)
        const filename = path.basename(relativePath);
        const absolutePath = path.join(this.basePath, filename);
        
        try {
            return await fs.readFile(absolutePath);
        } catch (error) {
            throw new Error(`File not found: ${relativePath}`);
        }
    }

    async delete(relativePath: string): Promise<void> {
        const filename = path.basename(relativePath);
        const absolutePath = path.join(this.basePath, filename);
        
        try {
            await fs.unlink(absolutePath);
        } catch (error) {
            // Ignore if file doesn't exist
            console.warn(`Could not delete file ${absolutePath}`, error);
        }
    }
}
