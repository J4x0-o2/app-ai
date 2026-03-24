import { AIQuery } from '../entities/AIQuery';

export interface AIQueryRepository {
  save(query: AIQuery): Promise<void>;
  findByUser(userId: string): Promise<AIQuery[]>;
  list(): Promise<AIQuery[]>;
}
