export interface CacheHit {
    response: string;
    similarity: number;
}

export interface ISemanticCache {
    get(embedding: number[]): Promise<CacheHit | null>;
    set(embedding: number[], question: string, response: string): Promise<void>;
}
